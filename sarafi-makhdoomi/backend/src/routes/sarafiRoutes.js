const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  getMyCustomers,
  approveCustomer,
  unknownCustomer,
  rejectCustomer,
  getDashboard,
  getStats
} = require('../controllers/sarafiController');
const { protect, authorize } = require('../middlewares/auth');
const SarafiStaff = require('../models/SarafiStaff');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');

// همه روت‌ها نیاز به صراف دارند
router.use(protect, authorize('sarafi', 'admin'));

// پروفایل
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// داشبورد
router.get('/dashboard', getDashboard);
router.get('/stats', getStats);

// مدیریت مشتریان
router.get('/customers', getMyCustomers);
router.put('/customers/:id/approve', approveCustomer);
router.put('/customers/:id/unknown', unknownCustomer);
router.put('/customers/:id/reject', rejectCustomer);

// دریافت کیف پول مشتری
const walletService = require('../services/walletService');
router.get('/customers/:id/wallet', async (req, res) => {
  try {
    // بررسی دسترسی صراف به این مشتری
    const customer = await User.findOne({
      _id: req.params.id,
      selectedSarafi: req.user._id
    });

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'مشتری یافت نشد'
      });
    }

    const wallets = await walletService.getUserWallets(req.params.id);

    res.json({
      success: true,
      data: {
        cashBalance: wallets.cash?.balance || 0,
        creditLimit: wallets.credit?.creditLimit || 0,
        creditUsed: wallets.credit?.usedCredit || 0,
        availableCredit: (wallets.credit?.creditLimit || 0) - (wallets.credit?.usedCredit || 0),
        cash: wallets.cash,
        credit: wallets.credit
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// ==================== دعوت مشتری با رمز موقت ====================

const crypto = require('crypto');
const emailService = require('../services/emailService');

// تولید رمز موقت تصادفی
function generateTemporaryPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password + '!'; // اضافه کردن کاراکتر خاص برای امنیت
}

// دعوت مشتری جدید با رمز موقت
router.post('/invite-customer', async (req, res) => {
  try {
    const { email, firstName, lastName, phone, nationalCode, sendEmail = true } = req.body;

    // اعتبارسنجی
    if (!email || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        message: 'ایمیل، نام و نام خانوادگی الزامی است'
      });
    }

    // بررسی وجود کاربر
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({
        success: false,
        message: 'این ایمیل قبلا ثبت شده است'
      });
    }

    // تولید رمز موقت
    const temporaryPassword = generateTemporaryPassword();

    // ایجاد کاربر با رمز موقت
    user = await User.create({
      email,
      firstName,
      lastName,
      phone,
      nationalCode,
      password: temporaryPassword,
      role: 'user',
      status: 'approved',
      isEmailVerified: true,
      mustChangePassword: true,
      isTemporaryPassword: true,
      introducedBy: req.user._id,
      selectedSarafi: req.user._id
    });

    // ارسال ایمیل با رمز موقت
    if (sendEmail) {
      try {
        await emailService.sendTemporaryPassword(email, firstName, temporaryPassword);
      } catch (emailError) {
        console.error('خطا در ارسال ایمیل:', emailError);
      }
    }

    // ثبت لاگ
    await AuditLog.log({
      action: 'customer.invite',
      category: 'customer',
      user: req.user._id,
      userRole: 'sarafi',
      sarafi: req.user._id,
      targetType: 'User',
      targetId: user._id,
      description: `دعوت مشتری ${firstName} ${lastName} با رمز موقت`,
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      message: 'مشتری با موفقیت دعوت شد',
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone
        },
        temporaryPassword: sendEmail ? undefined : temporaryPassword // فقط اگر ایمیل ارسال نشد، رمز را برگردان
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// تولید رمز موقت جدید برای مشتری موجود
router.post('/customers/:id/reset-password', async (req, res) => {
  try {
    const { sendEmail = true } = req.body;

    const user = await User.findOne({
      _id: req.params.id,
      selectedSarafi: req.user._id,
      role: 'user'
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'مشتری یافت نشد'
      });
    }

    // تولید رمز موقت جدید
    const temporaryPassword = generateTemporaryPassword();

    user.password = temporaryPassword;
    user.mustChangePassword = true;
    user.isTemporaryPassword = true;
    await user.save();

    // ارسال ایمیل
    if (sendEmail) {
      try {
        await emailService.sendTemporaryPassword(user.email, user.firstName, temporaryPassword);
      } catch (emailError) {
        console.error('خطا در ارسال ایمیل:', emailError);
      }
    }

    // ثبت لاگ
    await AuditLog.log({
      action: 'customer.password_reset',
      category: 'customer',
      user: req.user._id,
      userRole: 'sarafi',
      sarafi: req.user._id,
      targetType: 'User',
      targetId: user._id,
      description: `بازنشانی رمز عبور مشتری ${user.firstName} ${user.lastName}`,
      severity: 'medium',
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'رمز عبور موقت جدید تولید شد',
      data: {
        temporaryPassword: sendEmail ? undefined : temporaryPassword
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ==================== مدیریت کارکنان ====================

// دریافت لیست کارکنان
router.get('/staff', async (req, res) => {
  try {
    const staff = await SarafiStaff.find({ sarafi: req.user._id })
      .populate('user', 'firstName lastName email phone')
      .sort({ createdAt: -1 });

    res.json({ success: true, data: staff });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// افزودن کارمند جدید
router.post('/staff', async (req, res) => {
  try {
    const { email, firstName, lastName, phone, role, permissions, password, mustChangePassword = true } = req.body;

    // بررسی وجود کاربر
    let user = await User.findOne({ email });
    let temporaryPassword = null;

    // تعیین نقش کاربر بر اساس نقش کارمندی
    const roleMapping = {
      rial_collector: 'staff_rial',
      currency_collector: 'staff_currency',
      accountant: 'accountant',
      manager: 'staff',
      operator: 'staff',
      sales_manager: 'staff'
    };
    const userRole = roleMapping[role] || 'staff';

    if (!user) {
      // استفاده از رمز ارسالی یا تولید رمز موقت
      temporaryPassword = password || generateTemporaryPassword();

      // ایجاد کاربر جدید
      user = await User.create({
        email,
        firstName,
        lastName,
        phone,
        password: temporaryPassword,
        role: userRole,
        parentSarafi: req.user._id, // صراف والد
        status: 'approved',
        isEmailVerified: true,
        mustChangePassword: mustChangePassword,
        isTemporaryPassword: !password // اگر رمز ارسال نشده، موقتی است
      });
    } else {
      // اگر کاربر وجود داشت، نقش و parentSarafi رو تنظیم کن
      user.role = userRole;
      user.parentSarafi = req.user._id;
      await user.save();
    }

    // بررسی تکراری نبودن
    const exists = await SarafiStaff.findOne({ sarafi: req.user._id, user: user._id });
    if (exists) {
      return res.status(400).json({ success: false, message: 'این کارمند قبلا اضافه شده است' });
    }

    const staff = await SarafiStaff.create({
      sarafi: req.user._id,
      user: user._id,
      role,
      permissions
    });

    await staff.populate('user', 'firstName lastName email phone');

    // ثبت لاگ
    await AuditLog.log({
      action: 'staff.create',
      category: 'staff',
      user: req.user._id,
      userRole: 'sarafi',
      sarafi: req.user._id,
      targetType: 'SarafiStaff',
      targetId: staff._id,
      description: `افزودن کارمند ${firstName} ${lastName} با نقش ${role}`,
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      data: {
        ...staff.toObject(),
        temporaryPassword: temporaryPassword // برگرداندن رمز موقت برای نمایش به صراف
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// به‌روزرسانی کارمند
router.put('/staff/:id', async (req, res) => {
  try {
    const { role, permissions, firstName, lastName, phone } = req.body;

    const staff = await SarafiStaff.findOne({
      _id: req.params.id,
      sarafi: req.user._id
    }).populate('user');

    if (!staff) {
      return res.status(404).json({ success: false, message: 'کارمند یافت نشد' });
    }

    // تعیین نقش کاربر بر اساس نقش کارمندی
    const roleMapping = {
      rial_collector: 'staff_rial',
      currency_collector: 'staff_currency',
      accountant: 'accountant',
      manager: 'staff',
      operator: 'staff',
      sales_manager: 'staff'
    };

    // به‌روزرسانی اطلاعات کاربر
    const userUpdates = {};
    if (firstName) userUpdates.firstName = firstName;
    if (lastName) userUpdates.lastName = lastName;
    if (phone) userUpdates.phone = phone;
    if (role) userUpdates.role = roleMapping[role] || 'staff'; // sync نقش کاربر

    if (Object.keys(userUpdates).length > 0) {
      await User.findByIdAndUpdate(staff.user._id, userUpdates);
    }

    // به‌روزرسانی نقش و دسترسی‌ها
    if (role) staff.role = role;
    if (permissions) staff.permissions = permissions;

    await staff.save();
    await staff.populate('user', 'firstName lastName email phone');

    // ثبت لاگ
    await AuditLog.log({
      action: 'staff.update',
      category: 'staff',
      user: req.user._id,
      userRole: 'sarafi',
      sarafi: req.user._id,
      targetType: 'SarafiStaff',
      targetId: staff._id,
      description: `به‌روزرسانی کارمند ${staff.user.firstName} ${staff.user.lastName}`,
      ipAddress: req.ip
    });

    res.json({ success: true, data: staff });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// تغییر وضعیت کارمند
router.put('/staff/:id/toggle-status', async (req, res) => {
  try {
    const staff = await SarafiStaff.findOne({
      _id: req.params.id,
      sarafi: req.user._id
    }).populate('user', 'firstName lastName');

    if (!staff) {
      return res.status(404).json({ success: false, message: 'کارمند یافت نشد' });
    }

    staff.isActive = !staff.isActive;
    await staff.save();

    // ثبت لاگ
    await AuditLog.log({
      action: staff.isActive ? 'staff.update' : 'staff.deactivate',
      category: 'staff',
      user: req.user._id,
      userRole: 'sarafi',
      sarafi: req.user._id,
      targetType: 'SarafiStaff',
      targetId: staff._id,
      description: `${staff.isActive ? 'فعال‌سازی' : 'غیرفعال‌سازی'} کارمند ${staff.user.firstName} ${staff.user.lastName}`,
      ipAddress: req.ip
    });

    res.json({ success: true, data: staff });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ریست رمز عبور کارمند
router.post('/staff/:id/reset-password', async (req, res) => {
  try {
    const { sendEmail = false } = req.body;

    const staff = await SarafiStaff.findOne({
      _id: req.params.id,
      sarafi: req.user._id
    }).populate('user');

    if (!staff) {
      return res.status(404).json({ success: false, message: 'کارمند یافت نشد' });
    }

    // تولید رمز موقت جدید
    const temporaryPassword = generateTemporaryPassword();

    // به‌روزرسانی رمز کاربر
    staff.user.password = temporaryPassword;
    staff.user.mustChangePassword = true;
    staff.user.isTemporaryPassword = true;
    await staff.user.save();

    // ارسال ایمیل (اختیاری)
    if (sendEmail) {
      try {
        await emailService.sendTemporaryPassword(staff.user.email, staff.user.firstName, temporaryPassword);
      } catch (emailError) {
        console.error('خطا در ارسال ایمیل:', emailError);
      }
    }

    // ثبت لاگ
    await AuditLog.log({
      action: 'staff.password_reset',
      category: 'staff',
      user: req.user._id,
      userRole: 'sarafi',
      sarafi: req.user._id,
      targetType: 'SarafiStaff',
      targetId: staff._id,
      description: `بازنشانی رمز عبور کارمند ${staff.user.firstName} ${staff.user.lastName}`,
      severity: 'medium',
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'رمز عبور موقت جدید تولید شد',
      data: {
        temporaryPassword: temporaryPassword // همیشه برمی‌گردانیم برای نمایش در مودال
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// حذف کارمند
router.delete('/staff/:id', async (req, res) => {
  try {
    const staff = await SarafiStaff.findOne({
      _id: req.params.id,
      sarafi: req.user._id
    }).populate('user', 'firstName lastName');

    if (!staff) {
      return res.status(404).json({ success: false, message: 'کارمند یافت نشد' });
    }

    const staffName = `${staff.user.firstName} ${staff.user.lastName}`;
    await staff.deleteOne();

    // ثبت لاگ
    await AuditLog.log({
      action: 'staff.deactivate',
      category: 'staff',
      user: req.user._id,
      userRole: 'sarafi',
      sarafi: req.user._id,
      targetType: 'SarafiStaff',
      targetId: staff._id,
      description: `حذف کارمند ${staffName}`,
      ipAddress: req.ip
    });

    res.json({ success: true, message: 'کارمند حذف شد' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ==================== لاگ عملیات ====================

// دریافت لاگ‌های صراف
router.get('/audit-logs', async (req, res) => {
  try {
    const { category, severity, action, startDate, endDate, limit = 50, page = 1 } = req.query;

    const query = { sarafi: req.user._id };

    if (category) query.category = category;
    if (severity) query.severity = severity;
    if (action) query.action = new RegExp(action, 'i');
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const logs = await AuditLog.find(query)
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// دریافت لاگ‌های پرخطر
router.get('/audit-logs/high-risk', async (req, res) => {
  try {
    const logs = await AuditLog.getHighRiskLogs(req.user._id, 50);
    res.json({ success: true, data: logs });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ==================== مدیریت ریسک ====================

const riskService = require('../services/riskService');

// دریافت خلاصه وضعیت ریسک
router.get('/risk-summary', async (req, res) => {
  try {
    const summary = await riskService.getSarafiRiskSummary(req.user._id);
    res.json({ success: true, data: summary });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// بررسی وضعیت بازار
router.get('/market-session', async (req, res) => {
  try {
    const session = await riskService.checkMarketSession();
    res.json({ success: true, data: session });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// محاسبه VWAP
router.get('/vwap/:currencyId', async (req, res) => {
  try {
    const { period } = req.query;
    const vwap = await riskService.calculateVWAP(req.params.currencyId, period || 'day');
    res.json({ success: true, data: vwap });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Pre-Trade Risk Check
router.post('/risk-check', async (req, res) => {
  try {
    const { customerId, currencyId, amount, totalAmount, orderType } = req.body;
    const result = await riskService.performPreTradeCheck({
      customerId,
      sarafiId: req.user._id,
      currencyId,
      amount,
      totalAmount,
      orderType
    });
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
