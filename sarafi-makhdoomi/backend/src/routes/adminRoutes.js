const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  approveUser,
  rejectUser,
  suspendUser,
  changeUserRole,
  updateUser,
  deleteUser,
  getCurrencies,
  createCurrency,
  updateCurrency,
  deleteCurrency,
  updateRates,
  getSettings,
  updateSettings,
  getDashboardStats,
  getSarafiList,
  getUnknownUsers
} = require('../controllers/adminController');
const { protect, authorize } = require('../middlewares/auth');
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const walletService = require('../services/walletService');
const Trade = require('../models/Trade');
const CustomerTier = require('../models/CustomerTier');
const User = require('../models/User');
const Order = require('../models/Order');
const Receipt = require('../models/Receipt');
const AuditLog = require('../models/AuditLog');
const Spread = require('../models/Spread');
const Commission = require('../models/Commission');

// همه روت‌ها نیاز به ادمین دارند
router.use(protect, authorize('admin'));

// داشبورد
router.get('/dashboard', getDashboardStats);

// مدیریت کاربران
router.get('/users', getUsers);
router.get('/users/unknown', getUnknownUsers);
router.get('/users/:id', getUser);
router.put('/users/:id', updateUser);
router.put('/users/:id/approve', approveUser);
router.put('/users/:id/reject', rejectUser);
router.put('/users/:id/suspend', suspendUser);
router.put('/users/:id/role', changeUserRole);
router.delete('/users/:id', deleteUser);

// مدیریت ارزها
router.get('/currencies', getCurrencies);
router.post('/currencies', createCurrency);
router.put('/currencies/:id', updateCurrency);
router.delete('/currencies/:id', deleteCurrency);
router.put('/currencies/rates/batch', updateRates);

// تنظیمات
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

// ========== مدیریت کیف پول‌ها ==========

// دریافت همه کیف پول‌ها
router.get('/wallets', async (req, res) => {
  try {
    const { type, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (type) query.type = type;

    const skip = (page - 1) * limit;

    let wallets = await Wallet.find(query)
      .populate('user', 'firstName lastName phone email')
      .populate('managedBy', 'firstName lastName')
      .sort({ lastTransaction: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // فیلتر جستجو
    if (search) {
      wallets = wallets.filter(w =>
        w.user?.firstName?.includes(search) ||
        w.user?.lastName?.includes(search) ||
        w.user?.phone?.includes(search)
      );
    }

    const total = await Wallet.countDocuments(query);

    res.json({
      success: true,
      data: wallets,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// آمار کیف پول‌ها
router.get('/wallets/stats', async (req, res) => {
  try {
    const stats = await Wallet.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalBalance: { $sum: '$balance' },
          totalCreditLimit: { $sum: '$creditLimit' },
          totalUsedCredit: { $sum: '$usedCredit' }
        }
      }
    ]);

    const result = {
      totalWallets: 0,
      totalCashBalance: 0,
      totalCreditLimit: 0,
      totalUsedCredit: 0
    };

    stats.forEach(s => {
      result.totalWallets += s.count;
      if (s._id === 'cash') {
        result.totalCashBalance = s.totalBalance;
      } else {
        result.totalCreditLimit = s.totalCreditLimit;
        result.totalUsedCredit = s.totalUsedCredit;
      }
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// دریافت تراکنش‌های یک کیف پول
router.get('/wallets/:walletId/transactions', async (req, res) => {
  try {
    const transactions = await WalletTransaction.find({ wallet: req.params.walletId })
      .populate('processedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, data: transactions });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// واریز به کیف پول (ادمین)
router.post('/wallets/deposit', async (req, res) => {
  try {
    const { userId, amount, description } = req.body;

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'اطلاعات نامعتبر' });
    }

    const result = await walletService.deposit(userId, amount, description || 'واریز توسط ادمین', req.user._id);

    res.json({
      success: true,
      message: `مبلغ ${amount.toLocaleString()} ریال واریز شد`,
      data: result
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// برداشت از کیف پول (ادمین)
router.post('/wallets/withdraw', async (req, res) => {
  try {
    const { userId, amount, description } = req.body;

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'اطلاعات نامعتبر' });
    }

    const result = await walletService.withdraw(userId, amount, description || 'برداشت توسط ادمین', req.user._id);

    res.json({
      success: true,
      message: `مبلغ ${amount.toLocaleString()} ریال برداشت شد`,
      data: result
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// افزایش سقف اعتبار (ادمین)
router.post('/wallets/credit/increase', async (req, res) => {
  try {
    const { userId, amount } = req.body;

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'اطلاعات نامعتبر' });
    }

    const result = await walletService.increaseCreditLimit(userId, amount, req.user._id);

    res.json({
      success: true,
      message: `سقف اعتبار ${amount.toLocaleString()} ریال افزایش یافت`,
      data: result
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// کاهش سقف اعتبار (ادمین)
router.post('/wallets/credit/decrease', async (req, res) => {
  try {
    const { userId, amount } = req.body;

    if (!userId || !amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'اطلاعات نامعتبر' });
    }

    const result = await walletService.decreaseCreditLimit(userId, amount, req.user._id);

    res.json({
      success: true,
      message: `سقف اعتبار ${amount.toLocaleString()} ریال کاهش یافت`,
      data: result
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ========== مدیریت معاملات فوری ==========

// دریافت همه معاملات فوری
router.get('/instant-trades', async (req, res) => {
  try {
    const { status, type, sarafi, search, page = 1, limit = 20 } = req.query;
    const query = { tradeType: 'instant' };

    if (status) query.status = status;
    if (type) query.type = type;
    if (sarafi) query.sarafi = sarafi;

    const skip = (page - 1) * limit;

    let trades = await Trade.find(query)
      .populate('customer', 'firstName lastName phone')
      .populate('sarafi', 'firstName lastName phone sarafiName')
      .populate('currency', 'code name nameFa')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // فیلتر جستجو
    if (search) {
      trades = trades.filter(t =>
        t.tradeNumber?.includes(search) ||
        t.customer?.firstName?.includes(search) ||
        t.customer?.lastName?.includes(search) ||
        t.customer?.phone?.includes(search)
      );
    }

    const total = await Trade.countDocuments(query);

    res.json({
      success: true,
      data: trades,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// آمار معاملات فوری
router.get('/instant-trades/stats', async (req, res) => {
  try {
    const stats = await Trade.aggregate([
      { $match: { tradeType: 'instant' } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    const result = {
      total: 0,
      pending: 0,
      approved: 0,
      pending_collection: 0,
      pending_accounting: 0,
      completed: 0,
      rejected: 0,
      cancelled: 0,
      totalVolume: 0
    };

    stats.forEach(s => {
      result.total += s.count;
      result.totalVolume += s.totalAmount || 0;
      if (result[s._id] !== undefined) {
        result[s._id] = s.count;
      }
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ========== مدیریت معاملات ==========

// دریافت همه معاملات
router.get('/trades', async (req, res) => {
  try {
    const { status, type, sarafi, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (type) query.type = type;
    if (sarafi) query.sarafi = sarafi;

    const skip = (page - 1) * limit;

    let trades = await Trade.find(query)
      .populate('customer', 'firstName lastName phone')
      .populate('sarafi', 'firstName lastName phone sarafiName')
      .populate('currency', 'code name nameFa')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // فیلتر جستجو
    if (search) {
      trades = trades.filter(t =>
        t.tradeNumber?.includes(search) ||
        t.customer?.firstName?.includes(search) ||
        t.customer?.lastName?.includes(search) ||
        t.customer?.phone?.includes(search)
      );
    }

    const total = await Trade.countDocuments(query);

    res.json({
      success: true,
      data: trades,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// آمار معاملات
router.get('/trades/stats', async (req, res) => {
  try {
    const stats = await Trade.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    const result = {
      total: 0,
      pending: 0,
      processing: 0,
      completed: 0,
      cancelled: 0,
      totalVolume: 0
    };

    stats.forEach(s => {
      result.total += s.count;
      result.totalVolume += s.totalAmount || 0;
      if (s._id === 'pending') result.pending = s.count;
      if (s._id === 'processing' || s._id === 'approved' || s._id === 'awaiting_currency' || s._id === 'awaiting_rial') {
        result.processing += s.count;
      }
      if (s._id === 'completed') result.completed = s.count;
      if (s._id === 'cancelled') result.cancelled = s.count;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ========== مدیریت دسته‌بندی مشتریان ==========

// دریافت همه دسته‌بندی‌ها
router.get('/customer-tiers', async (req, res) => {
  try {
    const tiers = await CustomerTier.find({ isActive: true }).sort({ displayOrder: 1 });
    res.json({ success: true, data: tiers });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// آمار دسته‌بندی مشتریان
router.get('/customer-tiers/stats', async (req, res) => {
  try {
    // شمارش کاربران در هر سطح
    const userStats = await User.aggregate([
      { $match: { role: 'customer' } },
      {
        $group: {
          _id: '$scoring.tier',
          count: { $sum: 1 },
          avgScore: { $avg: '$scoring.score' }
        }
      }
    ]);

    const tiers = await CustomerTier.find({ isActive: true }).sort({ displayOrder: 1 });

    const result = {
      tiers: tiers.map(tier => {
        const stat = userStats.find(s => s._id === tier.code) || { count: 0, avgScore: 0 };
        return {
          code: tier.code,
          name: tier.name,
          color: tier.color,
          userCount: stat.count,
          avgScore: Math.round(stat.avgScore || 0)
        };
      }),
      totalCustomers: userStats.reduce((sum, s) => sum + s.count, 0)
    };

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ایجاد یا به‌روزرسانی دسته‌بندی
router.post('/customer-tiers', async (req, res) => {
  try {
    const tierData = req.body;
    const tier = await CustomerTier.findOneAndUpdate(
      { code: tierData.code },
      tierData,
      { upsert: true, new: true }
    );
    res.json({ success: true, data: tier });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// حذف دسته‌بندی
router.delete('/customer-tiers/:code', async (req, res) => {
  try {
    await CustomerTier.findOneAndUpdate(
      { code: req.params.code },
      { isActive: false }
    );
    res.json({ success: true, message: 'دسته‌بندی غیرفعال شد' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// مقداردهی اولیه دسته‌بندی‌ها
router.post('/customer-tiers/init', async (req, res) => {
  try {
    await CustomerTier.initDefaultTiers();
    res.json({ success: true, message: 'دسته‌بندی‌های پیش‌فرض ایجاد شدند' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ========== مدیریت صراف‌ها ==========

// دریافت لیست صراف‌ها
router.get('/sarafis', async (req, res) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const query = { role: 'sarafi' };

    if (status) query.status = status;

    const skip = (page - 1) * limit;

    let sarafis = await User.find(query)
      .select('firstName lastName phone email sarafiName status createdAt')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    if (search) {
      sarafis = sarafis.filter(s =>
        s.firstName?.includes(search) ||
        s.lastName?.includes(search) ||
        s.phone?.includes(search) ||
        s.sarafiName?.includes(search)
      );
    }

    const total = await User.countDocuments(query);

    res.json({
      success: true,
      data: sarafis,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ========== مدیریت کارمزدها ==========

// دریافت همه کارمزدها
router.get('/commissions', async (req, res) => {
  try {
    const { type, isActive, page = 1, limit = 20 } = req.query;
    const query = {};

    if (type) query.type = type;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const skip = (page - 1) * limit;

    const commissions = await Commission.find(query)
      .populate('currency', 'code nameFa')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Commission.countDocuments(query);

    res.json({
      success: true,
      data: commissions,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// آمار کارمزدها
router.get('/commissions/stats', async (req, res) => {
  try {
    const stats = await Commission.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          activeCount: { $sum: { $cond: ['$isActive', 1, 0] } }
        }
      }
    ]);

    const result = {
      total: stats.reduce((sum, s) => sum + s.count, 0),
      active: stats.reduce((sum, s) => sum + s.activeCount, 0),
      byType: stats.map(s => ({
        type: s._id,
        count: s.count,
        activeCount: s.activeCount
      }))
    };

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ایجاد کارمزد جدید
router.post('/commissions', async (req, res) => {
  try {
    const commission = await Commission.create(req.body);
    res.status(201).json({ success: true, data: commission });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// به‌روزرسانی کارمزد
router.put('/commissions/:id', async (req, res) => {
  try {
    const commission = await Commission.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true }
    );
    if (!commission) {
      return res.status(404).json({ success: false, message: 'کارمزد یافت نشد' });
    }
    res.json({ success: true, data: commission });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// حذف کارمزد
router.delete('/commissions/:id', async (req, res) => {
  try {
    const commission = await Commission.findByIdAndDelete(req.params.id);
    if (!commission) {
      return res.status(404).json({ success: false, message: 'کارمزد یافت نشد' });
    }
    res.json({ success: true, message: 'کارمزد حذف شد' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ========== مدیریت سفارشات ==========

// دریافت همه سفارشات
router.get('/orders', async (req, res) => {
  try {
    const { status, type, side, sarafi, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (type) query.type = type;
    if (side) query.side = side;
    if (sarafi) query.sarafi = sarafi;

    const skip = (page - 1) * limit;

    let orders = await Order.find(query)
      .populate('customer', 'firstName lastName phone')
      .populate('sarafi', 'firstName lastName phone sarafiName')
      .populate('currency', 'code name nameFa')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // فیلتر جستجو
    if (search) {
      orders = orders.filter(o =>
        o.orderNumber?.includes(search) ||
        o.customer?.firstName?.includes(search) ||
        o.customer?.lastName?.includes(search) ||
        o.customer?.phone?.includes(search)
      );
    }

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: orders,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// آمار سفارشات
router.get('/orders/stats', async (req, res) => {
  try {
    const stats = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalVolume: { $sum: '$totalValue' }
        }
      }
    ]);

    const result = {
      total: 0,
      pending: 0,
      active: 0,
      filled: 0,
      cancelled: 0,
      expired: 0,
      totalVolume: 0
    };

    stats.forEach(s => {
      result.total += s.count;
      result.totalVolume += s.totalVolume || 0;
      if (s._id === 'pending') result.pending = s.count;
      if (s._id === 'active') result.active = s.count;
      if (s._id === 'filled' || s._id === 'partially_filled') result.filled += s.count;
      if (s._id === 'cancelled') result.cancelled = s.count;
      if (s._id === 'expired') result.expired = s.count;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// لغو سفارش توسط ادمین
router.put('/orders/:id/cancel', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, message: 'سفارش یافت نشد' });
    }

    if (!['pending', 'active'].includes(order.status)) {
      return res.status(400).json({ success: false, message: 'این سفارش قابل لغو نیست' });
    }

    order.status = 'cancelled';
    order.cancelledAt = new Date();
    order.cancelledBy = req.user._id;
    order.cancelReason = req.body.reason || 'لغو توسط ادمین';
    await order.save();

    // ثبت در لاگ
    await AuditLog.create({
      sarafi: order.sarafi,
      action: 'order_cancelled',
      actor: req.user._id,
      target: order._id,
      targetModel: 'Order',
      details: { reason: order.cancelReason },
      severity: 'medium'
    });

    res.json({ success: true, message: 'سفارش لغو شد', data: order });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ========== مدیریت رسیدها ==========

// دریافت همه رسیدها
router.get('/receipts', async (req, res) => {
  try {
    const { status, type, paymentMethod, sarafi, search, page = 1, limit = 20 } = req.query;
    const query = {};

    if (status) query.status = status;
    if (type) query.type = type;
    if (paymentMethod) query.paymentMethod = paymentMethod;
    if (sarafi) query.sarafi = sarafi;

    const skip = (page - 1) * limit;

    let receipts = await Receipt.find(query)
      .populate('customer', 'firstName lastName phone')
      .populate('sarafi', 'firstName lastName phone sarafiName')
      .populate('currency', 'code name nameFa')
      .populate('collector', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // فیلتر جستجو
    if (search) {
      receipts = receipts.filter(r =>
        r.receiptNumber?.includes(search) ||
        r.customer?.firstName?.includes(search) ||
        r.customer?.lastName?.includes(search) ||
        r.customer?.phone?.includes(search)
      );
    }

    const total = await Receipt.countDocuments(query);

    res.json({
      success: true,
      data: receipts,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// آمار رسیدها
router.get('/receipts/stats', async (req, res) => {
  try {
    const stats = await Receipt.aggregate([
      {
        $group: {
          _id: { type: '$type', status: '$status' },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const result = {
      total: 0,
      rial: { pending: 0, confirmed: 0, rejected: 0, totalAmount: 0 },
      currency: { pending: 0, confirmed: 0, rejected: 0, totalAmount: 0 }
    };

    stats.forEach(s => {
      result.total += s.count;
      const type = s._id.type === 'rial' ? 'rial' : 'currency';
      const status = s._id.status;
      if (result[type][status] !== undefined) {
        result[type][status] += s.count;
        result[type].totalAmount += s.totalAmount || 0;
      }
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// تایید یا رد رسید توسط ادمین
router.put('/receipts/:id/status', async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    const receipt = await Receipt.findById(req.params.id);

    if (!receipt) {
      return res.status(404).json({ success: false, message: 'رسید یافت نشد' });
    }

    if (receipt.status !== 'pending') {
      return res.status(400).json({ success: false, message: 'این رسید قبلاً بررسی شده است' });
    }

    receipt.status = status;
    if (status === 'confirmed') {
      receipt.confirmedAt = new Date();
      receipt.confirmedBy = req.user._id;
    } else if (status === 'rejected') {
      receipt.rejectedAt = new Date();
      receipt.rejectedBy = req.user._id;
      receipt.rejectionReason = rejectionReason;
    }
    await receipt.save();

    // ثبت در لاگ
    await AuditLog.create({
      sarafi: receipt.sarafi,
      action: status === 'confirmed' ? 'receipt_confirmed' : 'receipt_rejected',
      actor: req.user._id,
      target: receipt._id,
      targetModel: 'Receipt',
      details: { status, rejectionReason },
      severity: 'medium'
    });

    res.json({ success: true, message: `رسید ${status === 'confirmed' ? 'تایید' : 'رد'} شد`, data: receipt });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ========== لاگ عملیات ==========

// دریافت همه لاگ‌های عملیات
router.get('/audit-logs', async (req, res) => {
  try {
    const { action, severity, sarafi, actor, search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (action) query.action = action;
    if (severity) query.severity = severity;
    if (sarafi) query.sarafi = sarafi;
    if (actor) query.actor = actor;

    const skip = (page - 1) * limit;

    let logs = await AuditLog.find(query)
      .populate('sarafi', 'firstName lastName sarafiName')
      .populate('actor', 'firstName lastName phone role')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // فیلتر جستجو
    if (search) {
      logs = logs.filter(l =>
        l.action?.includes(search) ||
        l.actor?.firstName?.includes(search) ||
        l.actor?.lastName?.includes(search) ||
        l.ipAddress?.includes(search)
      );
    }

    const total = await AuditLog.countDocuments(query);

    res.json({
      success: true,
      data: logs,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// آمار لاگ‌ها
router.get('/audit-logs/stats', async (req, res) => {
  try {
    const stats = await AuditLog.aggregate([
      {
        $group: {
          _id: '$severity',
          count: { $sum: 1 }
        }
      }
    ]);

    const result = {
      total: 0,
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };

    stats.forEach(s => {
      result.total += s.count;
      if (result[s._id] !== undefined) {
        result[s._id] = s.count;
      }
    });

    // لاگ‌های پرخطر اخیر
    const highRiskLogs = await AuditLog.find({ severity: { $in: ['high', 'critical'] } })
      .populate('sarafi', 'firstName lastName sarafiName')
      .populate('actor', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(10);

    result.recentHighRisk = highRiskLogs;

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ========== مدیریت اسپردها ==========

// دریافت همه اسپردها
router.get('/spreads', async (req, res) => {
  try {
    const { sarafi, currency, isActive, page = 1, limit = 20 } = req.query;
    const query = {};

    if (sarafi) query.sarafi = sarafi;
    if (currency) query.currency = currency;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const skip = (page - 1) * limit;

    const spreads = await Spread.find(query)
      .populate('sarafi', 'firstName lastName sarafiName')
      .populate('currency', 'code name nameFa')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Spread.countDocuments(query);

    res.json({
      success: true,
      data: spreads,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// آمار اسپردها
router.get('/spreads/stats', async (req, res) => {
  try {
    const stats = await Spread.aggregate([
      {
        $group: {
          _id: '$sarafi',
          count: { $sum: 1 },
          activeCount: { $sum: { $cond: ['$isActive', 1, 0] } }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'sarafiInfo'
        }
      },
      { $unwind: '$sarafiInfo' }
    ]);

    const result = {
      totalSpreads: stats.reduce((sum, s) => sum + s.count, 0),
      totalActive: stats.reduce((sum, s) => sum + s.activeCount, 0),
      bySarafi: stats.map(s => ({
        sarafiId: s._id,
        sarafiName: s.sarafiInfo.sarafiName || `${s.sarafiInfo.firstName} ${s.sarafiInfo.lastName}`,
        count: s.count,
        activeCount: s.activeCount
      }))
    };

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// فعال/غیرفعال کردن اسپرد
router.put('/spreads/:id/toggle', async (req, res) => {
  try {
    const spread = await Spread.findById(req.params.id);
    if (!spread) {
      return res.status(404).json({ success: false, message: 'اسپرد یافت نشد' });
    }

    spread.isActive = !spread.isActive;
    await spread.save();

    // ثبت لاگ
    await AuditLog.create({
      sarafi: spread.sarafi,
      action: spread.isActive ? 'spread_activated' : 'spread_deactivated',
      actor: req.user._id,
      target: spread._id,
      targetModel: 'Spread',
      details: { isActive: spread.isActive },
      severity: 'medium'
    });

    res.json({ success: true, message: `اسپرد ${spread.isActive ? 'فعال' : 'غیرفعال'} شد`, data: spread });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// حذف اسپرد
router.delete('/spreads/:id', async (req, res) => {
  try {
    const spread = await Spread.findById(req.params.id);
    if (!spread) {
      return res.status(404).json({ success: false, message: 'اسپرد یافت نشد' });
    }

    // ثبت لاگ قبل از حذف
    await AuditLog.create({
      sarafi: spread.sarafi,
      action: 'spread_deleted',
      actor: req.user._id,
      target: spread._id,
      targetModel: 'Spread',
      details: { deletedSpread: spread.toObject() },
      severity: 'high'
    });

    await spread.deleteOne();

    res.json({ success: true, message: 'اسپرد حذف شد' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ============================================
// روت‌های اسکرپر نرخ (TGJU و تلگرام)
// ============================================
const tgjuScraperService = require('../services/tgjuScraperService');
const telegramScraperService = require('../services/rateScraperServiceSimple');
const { runNow, getScraperService, startRateScraperJob } = require('../jobs/rateScraperJob');
const Settings = require('../models/Settings');

// دریافت تنظیمات اسکرپر
router.get('/rate-scraper/settings', async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    res.json({
      success: true,
      data: settings.rateScraperSettings || {}
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// به‌روزرسانی تنظیمات اسکرپر
router.put('/rate-scraper/settings', async (req, res) => {
  try {
    const {
      enabled, source, intervalMinutes, activeCurrencies,
      dollarChannel, goldChannel, conversionRates, buySpread, sellSpread
    } = req.body;

    const updateData = {};
    if (enabled !== undefined) updateData['rateScraperSettings.enabled'] = enabled;
    if (source) updateData['rateScraperSettings.source'] = source;
    if (intervalMinutes) updateData['rateScraperSettings.intervalMinutes'] = intervalMinutes;
    if (activeCurrencies) updateData['rateScraperSettings.activeCurrencies'] = activeCurrencies;
    if (dollarChannel) updateData['rateScraperSettings.dollarChannel'] = dollarChannel;
    if (goldChannel) updateData['rateScraperSettings.goldChannel'] = goldChannel;
    if (conversionRates) updateData['rateScraperSettings.conversionRates'] = conversionRates;
    if (buySpread !== undefined) updateData['rateScraperSettings.buySpread'] = buySpread;
    if (sellSpread !== undefined) updateData['rateScraperSettings.sellSpread'] = sellSpread;

    await Settings.findOneAndUpdate({}, updateData);

    // ریستارت job با تنظیمات جدید
    await startRateScraperJob();

    res.json({
      success: true,
      message: 'تنظیمات ذخیره شد'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// اجرای دستی اسکرپر
router.post('/rate-scraper/run', async (req, res) => {
  try {
    const result = await runNow();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// تست اتصال به TGJU
router.post('/rate-scraper/test-tgju', async (req, res) => {
  try {
    const result = await tgjuScraperService.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// دریافت لیست کدهای موجود
router.get('/rate-scraper/available-codes', async (req, res) => {
  try {
    const codes = tgjuScraperService.getAvailableCodes();
    res.json({ success: true, data: codes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// تست خواندن کانال تلگرام
router.post('/rate-scraper/test-channel', async (req, res) => {
  try {
    const { channelUsername } = req.body;

    if (!channelUsername) {
      return res.status(400).json({ success: false, message: 'نام کانال الزامی است' });
    }

    const message = await telegramScraperService.getLastMessage(channelUsername);

    if (!message) {
      return res.json({ success: false, message: 'پیامی یافت نشد' });
    }

    const dollarRate = telegramScraperService.parseDollarRate(message);
    const goldRate = telegramScraperService.parseGoldRate(message);

    res.json({
      success: true,
      data: {
        message: message.substring(0, 500),
        parsedDollarRate: dollarRate,
        parsedGoldRate: goldRate
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;

// روت عمومی برای لیست صراف‌ها
const publicRouter = express.Router();
publicRouter.get('/sarafis', getSarafiList);

module.exports.publicRouter = publicRouter;
