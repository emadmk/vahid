const User = require('../models/User');
const Request = require('../models/Request');
const Currency = require('../models/Currency');
const Settings = require('../models/Settings');
const notificationService = require('../services/notificationService');
const emailService = require('../services/emailService');

// ========== مدیریت کاربران ==========

// دریافت همه کاربران
exports.getUsers = async (req, res, next) => {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query;

    const query = {};
    if (role) query.role = role;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const users = await User.find(query)
      .select('-password')
      .populate('selectedSarafi', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: users.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: users
    });
  } catch (error) {
    next(error);
  }
};

// دریافت یک کاربر
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('selectedSarafi', 'firstName lastName sarafiInfo');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'کاربر یافت نشد'
      });
    }

    // دریافت آمار درخواست‌های کاربر
    const requestStats = await Request.aggregate([
      { $match: { user: user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        user,
        requestStats
      }
    });
  } catch (error) {
    next(error);
  }
};

// تایید کاربر
exports.approveUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'کاربر یافت نشد'
      });
    }

    user.status = 'approved';
    user.rejectionReason = undefined;
    await user.save();

    // اعلان و ایمیل
    await notificationService.notifyUserApproved(user);
    await emailService.sendApproval(user.email, user.firstName);

    res.status(200).json({
      success: true,
      message: 'کاربر با موفقیت تایید شد',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// رد کاربر
exports.rejectUser = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'کاربر یافت نشد'
      });
    }

    user.status = 'rejected';
    user.rejectionReason = reason;
    await user.save();

    // اعلان و ایمیل
    await notificationService.notifyUserRejected(user, reason);
    await emailService.sendRejection(user.email, user.firstName, reason);

    res.status(200).json({
      success: true,
      message: 'کاربر رد شد',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// تعلیق کاربر
exports.suspendUser = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'کاربر یافت نشد'
      });
    }

    user.status = 'suspended';
    user.rejectionReason = reason;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'کاربر تعلیق شد',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// تغییر نقش کاربر
exports.changeUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'کاربر یافت نشد'
      });
    }

    if (!['user', 'sarafi', 'admin'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'نقش نامعتبر'
      });
    }

    user.role = role;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'نقش کاربر تغییر کرد',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// ویرایش کاربر
exports.updateUser = async (req, res, next) => {
  try {
    const allowedFields = [
      'firstName', 'lastName', 'phone', 'address', 'city',
      'nationalCode', 'status', 'role', 'sarafiInfo'
    ];

    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true
    }).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'کاربر یافت نشد'
      });
    }

    res.status(200).json({
      success: true,
      message: 'اطلاعات کاربر بروزرسانی شد',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// حذف کاربر
exports.deleteUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'کاربر یافت نشد'
      });
    }

    // بررسی درخواست‌های فعال
    const activeRequests = await Request.countDocuments({
      user: user._id,
      status: { $nin: ['completed', 'cancelled', 'rejected'] }
    });

    if (activeRequests > 0) {
      return res.status(400).json({
        success: false,
        message: 'این کاربر درخواست‌های فعال دارد و قابل حذف نیست'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'کاربر حذف شد'
    });
  } catch (error) {
    next(error);
  }
};

// ========== مدیریت ارزها ==========

// دریافت همه ارزها
exports.getCurrencies = async (req, res, next) => {
  try {
    const currencies = await Currency.find().sort({ order: 1 });

    res.status(200).json({
      success: true,
      count: currencies.length,
      data: currencies
    });
  } catch (error) {
    next(error);
  }
};

// ایجاد ارز جدید
exports.createCurrency = async (req, res, next) => {
  try {
    const currency = await Currency.create(req.body);

    res.status(201).json({
      success: true,
      message: 'ارز جدید اضافه شد',
      data: currency
    });
  } catch (error) {
    next(error);
  }
};

// بروزرسانی ارز
exports.updateCurrency = async (req, res, next) => {
  try {
    const currency = await Currency.findById(req.params.id);

    if (!currency) {
      return res.status(404).json({
        success: false,
        message: 'ارز یافت نشد'
      });
    }

    // ذخیره تاریخچه نرخ
    if (req.body.buyRate !== undefined || req.body.sellRate !== undefined) {
      currency.rateHistory.push({
        buyRate: currency.buyRate,
        sellRate: currency.sellRate,
        date: new Date(),
        updatedBy: req.user._id
      });
      currency.lastRateUpdate = new Date();
    }

    Object.assign(currency, req.body);
    await currency.save();

    res.status(200).json({
      success: true,
      message: 'ارز بروزرسانی شد',
      data: currency
    });
  } catch (error) {
    next(error);
  }
};

// حذف ارز
exports.deleteCurrency = async (req, res, next) => {
  try {
    // بررسی استفاده در درخواست‌ها
    const usedInRequests = await Request.countDocuments({
      currency: req.params.id
    });

    if (usedInRequests > 0) {
      return res.status(400).json({
        success: false,
        message: 'این ارز در درخواست‌ها استفاده شده و قابل حذف نیست. می‌توانید آن را غیرفعال کنید.'
      });
    }

    await Currency.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'ارز حذف شد'
    });
  } catch (error) {
    next(error);
  }
};

// بروزرسانی دسته‌ای نرخ‌ها
exports.updateRates = async (req, res, next) => {
  try {
    const { rates } = req.body; // [{id, buyRate, sellRate}, ...]

    for (const rate of rates) {
      const currency = await Currency.findById(rate.id);
      if (currency) {
        currency.rateHistory.push({
          buyRate: currency.buyRate,
          sellRate: currency.sellRate,
          date: new Date(),
          updatedBy: req.user._id
        });
        currency.buyRate = rate.buyRate;
        currency.sellRate = rate.sellRate;
        currency.lastRateUpdate = new Date();
        await currency.save();
      }
    }

    res.status(200).json({
      success: true,
      message: 'نرخ‌ها بروزرسانی شدند'
    });
  } catch (error) {
    next(error);
  }
};

// ========== تنظیمات ==========

// دریافت تنظیمات
exports.getSettings = async (req, res, next) => {
  try {
    const settings = await Settings.getSettings();

    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// بروزرسانی تنظیمات
exports.updateSettings = async (req, res, next) => {
  try {
    let settings = await Settings.findOne();

    if (!settings) {
      settings = await Settings.create(req.body);
    } else {
      Object.assign(settings, req.body);
      await settings.save();
    }

    res.status(200).json({
      success: true,
      message: 'تنظیمات بروزرسانی شد',
      data: settings
    });
  } catch (error) {
    next(error);
  }
};

// ========== داشبورد ==========

// آمار کلی
exports.getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    // تعداد کاربران
    const totalUsers = await User.countDocuments({ role: 'user' });
    const pendingUsers = await User.countDocuments({ role: 'user', status: 'pending' });
    const totalSarafis = await User.countDocuments({ role: 'sarafi' });
    const pendingSarafis = await User.countDocuments({ role: 'sarafi', status: 'pending' });

    // تعداد درخواست‌ها
    const totalRequests = await Request.countDocuments();
    const pendingRequests = await Request.countDocuments({ status: 'pending' });
    const publicRequests = await Request.countDocuments({ visibility: 'public', status: 'public' });
    const completedRequests = await Request.countDocuments({ status: 'completed' });

    // درخواست‌های امروز
    const todayRequests = await Request.countDocuments({ createdAt: { $gte: today } });

    // درخواست‌های این ماه
    const monthRequests = await Request.countDocuments({ createdAt: { $gte: thisMonth } });

    // مجموع تراکنش‌ها
    const transactionSum = await Request.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$finalPrice' } } }
    ]);

    // آخرین درخواست‌ها
    const recentRequests = await Request.find()
      .populate('user', 'firstName lastName')
      .populate('currency', 'nameFa symbol')
      .sort({ createdAt: -1 })
      .limit(5);

    // آخرین کاربران
    const recentUsers = await User.find()
      .select('firstName lastName email role status createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        users: {
          total: totalUsers,
          pending: pendingUsers
        },
        sarafis: {
          total: totalSarafis,
          pending: pendingSarafis
        },
        requests: {
          total: totalRequests,
          pending: pendingRequests,
          public: publicRequests,
          completed: completedRequests,
          today: todayRequests,
          thisMonth: monthRequests
        },
        transactions: {
          total: transactionSum[0]?.total || 0
        },
        recentRequests,
        recentUsers
      }
    });
  } catch (error) {
    next(error);
  }
};

// لیست صراف‌ها (برای انتخاب در ثبت‌نام)
exports.getSarafiList = async (req, res, next) => {
  try {
    const sarafis = await User.find({ role: 'sarafi', status: 'approved' })
      .select('firstName lastName sarafiInfo');

    res.status(200).json({
      success: true,
      data: sarafis
    });
  } catch (error) {
    next(error);
  }
};

// کاربران در انتظار تایید صراف (نمیشناسم زده شده)
exports.getUnknownUsers = async (req, res, next) => {
  try {
    const users = await User.find({
      role: 'user',
      sarafiApprovalStatus: 'unknown'
    })
      .select('-password')
      .populate('selectedSarafi', 'firstName lastName');

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    next(error);
  }
};
