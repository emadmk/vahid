const express = require('express');
const router = express.Router();
const tradeService = require('../services/tradeService');
const commissionService = require('../services/commissionService');
const { protect, authorize } = require('../middlewares/auth');

// =============== روت‌های معامله فوری (Instant Trade) ===============

// ایجاد معامله فوری
router.post('/instant', protect, async (req, res) => {
  try {
    const { currencyId, side, amount, rate, validUntil, notes, paymentMethod, walletStatus, customerId } = req.body;

    // اعتبارسنجی
    if (!currencyId) {
      return res.status(400).json({ success: false, message: 'ارز انتخاب نشده است' });
    }
    if (!side || !['buy', 'sell'].includes(side)) {
      return res.status(400).json({ success: false, message: 'نوع معامله نامعتبر است' });
    }
    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'مقدار نامعتبر است' });
    }
    if (!rate || rate <= 0) {
      return res.status(400).json({ success: false, message: 'نرخ نامعتبر است' });
    }

    // دریافت صراف
    const sarafiId = req.user.role === 'sarafi' ? req.user._id : req.user.selectedSarafi;
    if (!sarafiId) {
      return res.status(400).json({ success: false, message: 'صراف مشخص نشده است. لطفا ابتدا صراف خود را انتخاب کنید.' });
    }

    const trade = await tradeService.createInstantTrade({
      currencyId,
      side,
      amount: parseFloat(amount),
      rate: parseFloat(rate),
      validUntil,
      notes,
      paymentMethod,
      walletStatus,
      customerId: customerId || req.user._id,
      sarafiId,
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      data: trade,
      message: 'سفارش فوری ثبت شد و منتظر تایید است'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// دریافت معاملات فوری کاربر
router.get('/my-instant-trades', protect, async (req, res) => {
  try {
    const { status, limit, skip } = req.query;

    const result = await tradeService.getInstantTrades({
      customerId: req.user._id,
      status,
      limit: parseInt(limit) || 20,
      skip: parseInt(skip) || 0
    });

    res.json({
      success: true,
      data: result.trades,
      total: result.total
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// تایید معامله فوری (صراف)
router.put('/instant/:id/approve', protect, authorize('sarafi'), async (req, res) => {
  try {
    const trade = await tradeService.approveInstantTrade(req.params.id, req.user._id);

    res.json({
      success: true,
      data: trade,
      message: 'معامله تایید شد'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// رد معامله فوری با دلیل (صراف)
router.put('/instant/:id/reject', protect, authorize('sarafi'), async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'دلیل رد الزامی است'
      });
    }

    const trade = await tradeService.rejectInstantTrade(req.params.id, req.user._id, reason);

    res.json({
      success: true,
      data: trade,
      message: 'معامله رد شد'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// لغو معامله فوری (کاربر)
router.put('/instant/:id/cancel', protect, async (req, res) => {
  try {
    const trade = await tradeService.cancelInstantTrade(req.params.id, req.user._id);

    res.json({
      success: true,
      data: trade,
      message: 'معامله لغو شد'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// دریافت معاملات فوری صراف
router.get('/sarafi/instant-trades', protect, authorize('sarafi'), async (req, res) => {
  try {
    const { status, limit, skip } = req.query;

    const result = await tradeService.getInstantTrades({
      sarafiId: req.user._id,
      status,
      limit: parseInt(limit) || 20,
      skip: parseInt(skip) || 0
    });

    res.json({
      success: true,
      trades: result.trades,
      data: result.trades,
      total: result.total
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// آمار پنل وصول صراف
router.get('/sarafi/settlement-stats', protect, authorize('sarafi'), async (req, res) => {
  try {
    const Trade = require('../models/Trade');

    const pendingCollection = await Trade.countDocuments({
      sarafi: req.user._id,
      tradeType: 'instant',
      status: 'pending_collection'
    });

    const pendingAccounting = await Trade.countDocuments({
      sarafi: req.user._id,
      tradeType: 'instant',
      status: 'pending_accounting'
    });

    // تفکیک ریالی و ارزی
    const rialPending = await Trade.aggregate([
      {
        $match: {
          sarafi: req.user._id,
          tradeType: 'instant',
          status: 'pending_collection',
          type: 'buy' // خرید ارز = وصول ریال
        }
      },
      {
        $group: {
          _id: null,
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    const currencyPending = await Trade.countDocuments({
      sarafi: req.user._id,
      tradeType: 'instant',
      status: 'pending_collection',
      type: 'sell' // فروش ارز = وصول ارز
    });

    // تعداد تسویه شده امروز
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const completedToday = await Trade.countDocuments({
      sarafi: req.user._id,
      tradeType: 'instant',
      status: 'completed',
      completedAt: { $gte: today }
    });

    // موارد عقب‌افتاده (بیش از 24 ساعت)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const overdueCount = await Trade.countDocuments({
      sarafi: req.user._id,
      tradeType: 'instant',
      status: 'pending_collection',
      createdAt: { $lt: yesterday }
    });

    res.json({
      success: true,
      data: {
        pendingRial: rialPending[0]?.totalAmount || 0,
        pendingCurrency: currencyPending,
        completedToday,
        overdueCount,
        pendingCollection,
        pendingAccounting
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// تایید وصول از پنل وصول (ارسال به حسابداری)
router.put('/instant/:id/confirm-collection', protect, authorize('sarafi'), async (req, res) => {
  try {
    const { collectionType, notes, referenceNumber } = req.body;
    const Trade = require('../models/Trade');
    const notificationService = require('../services/notificationService');

    const trade = await Trade.findById(req.params.id).populate('currency customer');

    if (!trade) {
      return res.status(404).json({
        success: false,
        message: 'معامله یافت نشد'
      });
    }

    if (trade.sarafi.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'دسترسی غیرمجاز'
      });
    }

    if (trade.status !== 'pending_collection') {
      return res.status(400).json({
        success: false,
        message: 'این معامله در وضعیت وصول نیست'
      });
    }

    // بروزرسانی وضعیت وصول
    if (collectionType === 'currency' || trade.type === 'sell') {
      trade.currencyCollection = {
        status: 'collected',
        collectedBy: req.user._id,
        collectedAt: new Date(),
        notes
      };
    } else {
      trade.rialCollection = {
        status: 'collected',
        collectedBy: req.user._id,
        collectedAt: new Date(),
        bankDetails: { trackingCode: referenceNumber },
        notes
      };
    }

    // تغییر وضعیت به در انتظار حسابداری
    trade.status = 'pending_accounting';
    await trade.save();

    // ارسال نوتیفیکیشن به حسابداری
    await notificationService.create({
      user: req.user._id, // یا ادمین حسابداری
      type: 'trade_pending_accounting',
      title: 'معامله جدید در انتظار تایید حسابداری',
      message: `معامله ${trade.tradeNumber} وصول شده و منتظر تایید حسابداری است`,
      relatedModel: 'Trade',
      relatedId: trade._id,
      severity: 'info',
      actionUrl: '/sarafi/accountant'
    });

    res.json({
      success: true,
      data: trade,
      message: 'وصول تایید شد و به حسابداری ارسال شد'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// تایید معامله توسط حسابداری (تکمیل معامله)
router.put('/instant/:id/accounting-approve', protect, authorize('sarafi'), async (req, res) => {
  try {
    const Trade = require('../models/Trade');
    const walletService = require('../services/walletService');
    const scoringService = require('../services/scoringService');
    const notificationService = require('../services/notificationService');

    const trade = await Trade.findById(req.params.id).populate('currency customer');

    if (!trade) {
      return res.status(404).json({
        success: false,
        message: 'معامله یافت نشد'
      });
    }

    if (trade.sarafi.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'دسترسی غیرمجاز'
      });
    }

    if (trade.status !== 'pending_accounting') {
      return res.status(400).json({
        success: false,
        message: 'این معامله در وضعیت حسابداری نیست'
      });
    }

    // بروزرسانی کیف پول بر اساس نوع معامله
    if (trade.type === 'sell') {
      // فروش ارز: کاربر ارز می‌دهد، ریال می‌گیرد
      // 1. برداشت ارز از کیف پول کاربر
      try {
        await walletService.withdrawCurrency(
          trade.customer._id,
          trade.currency._id,
          trade.amount,
          `فروش ${trade.amount} ${trade.currency.code} - معامله ${trade.tradeNumber}`,
          req.user._id
        );
      } catch (currencyError) {
        // اگر موجودی ارز کافی نیست، فقط لاگ کن و ادامه بده (ارز از قبل تحویل شده)
        console.log(`Currency withdrawal skipped: ${currencyError.message}`);
      }

      // 2. واریز ریال به کیف پول کاربر
      await walletService.deposit(
        trade.customer._id,
        trade.netAmount,
        `فروش ارز - معامله ${trade.tradeNumber}`,
        req.user._id
      );
    } else if (trade.type === 'buy') {
      // خرید ارز: کاربر ریال می‌دهد، ارز می‌گیرد
      // 1. برداشت ریال از کیف پول کاربر (اگر از کیف پول استفاده شده)
      if (trade.paymentMethod === 'cash_wallet' || trade.paymentMethod === 'mixed') {
        try {
          await walletService.withdraw(
            trade.customer._id,
            trade.netAmount,
            `خرید ارز - معامله ${trade.tradeNumber}`,
            req.user._id
          );
        } catch (rialError) {
          // اگر موجودی ریال کافی نیست، فقط لاگ کن (ریال از قبل پرداخت شده)
          console.log(`Rial withdrawal skipped: ${rialError.message}`);
        }
      }

      // 2. واریز ارز به کیف پول کاربر
      await walletService.depositCurrency(
        trade.customer._id,
        trade.currency._id,
        trade.amount,
        `خرید ${trade.amount} ${trade.currency.code} - معامله ${trade.tradeNumber}`,
        req.user._id
      );
    }

    // تکمیل معامله
    trade.status = 'completed';
    trade.completedAt = new Date();

    // اعمال امتیازات
    const customerScore = await scoringService.applyTradeScore(
      trade.customer._id,
      trade.totalAmount,
      false
    );

    const sarafiScore = await scoringService.applyTradeScore(
      trade.sarafi,
      trade.totalAmount,
      true
    );

    trade.scoring = {
      customerScoreAwarded: customerScore?.pointsEarned || 0,
      sarafiScoreAwarded: sarafiScore?.pointsEarned || 0,
      scoredAt: new Date()
    };

    await trade.save();

    // ارسال نوتیفیکیشن به مشتری
    await notificationService.create({
      user: trade.customer._id,
      type: 'trade_completed',
      title: 'معامله تکمیل شد',
      message: `معامله ${trade.tradeNumber} با موفقیت تکمیل شد`,
      relatedModel: 'Trade',
      relatedId: trade._id,
      severity: 'info',
      actionUrl: '/dashboard/instant-trade'
    });

    res.json({
      success: true,
      data: trade,
      message: 'معامله تایید و تکمیل شد'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// رد معامله توسط حسابداری
router.put('/instant/:id/accounting-reject', protect, authorize('sarafi'), async (req, res) => {
  try {
    const { reason } = req.body;
    const Trade = require('../models/Trade');
    const notificationService = require('../services/notificationService');

    if (!reason) {
      return res.status(400).json({
        success: false,
        message: 'دلیل رد الزامی است'
      });
    }

    const trade = await Trade.findById(req.params.id).populate('currency customer');

    if (!trade) {
      return res.status(404).json({
        success: false,
        message: 'معامله یافت نشد'
      });
    }

    if (trade.sarafi.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'دسترسی غیرمجاز'
      });
    }

    if (trade.status !== 'pending_accounting') {
      return res.status(400).json({
        success: false,
        message: 'این معامله در وضعیت حسابداری نیست'
      });
    }

    trade.status = 'rejected';
    trade.rejectionReason = `رد توسط حسابداری: ${reason}`;
    trade.rejectedBy = req.user._id;
    trade.rejectedAt = new Date();

    await trade.save();

    // ارسال نوتیفیکیشن به مشتری
    await notificationService.create({
      user: trade.customer._id,
      type: 'trade_rejected',
      title: 'معامله رد شد',
      message: `معامله ${trade.tradeNumber} توسط حسابداری رد شد. دلیل: ${reason}`,
      relatedModel: 'Trade',
      relatedId: trade._id,
      severity: 'warning',
      actionUrl: '/dashboard/instant-trade'
    });

    res.json({
      success: true,
      data: trade,
      message: 'معامله رد شد'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// =============== روت‌های مشتری ===============

// ایجاد معامله جدید
router.post('/', protect, async (req, res) => {
  try {
    const { type, currency, amount, rate } = req.body;

    const trade = await tradeService.createTrade({
      type,
      currency,
      amount,
      rate,
      customerId: req.user._id,
      sarafiId: req.user.selectedSarafi
    });

    res.status(201).json({
      success: true,
      data: trade,
      message: 'درخواست معامله ثبت شد'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// پیش‌نمایش کارمزد
router.post('/preview-commission', protect, async (req, res) => {
  try {
    const { type, currency, amount, rate } = req.body;
    const totalAmount = amount * rate;

    const preview = await commissionService.previewCommission(
      { type, currency, amount: totalAmount, sarafiId: req.user.selectedSarafi },
      req.user._id
    );

    res.json({
      success: true,
      data: preview
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// دریافت معاملات من
router.get('/my-trades', protect, async (req, res) => {
  try {
    const { status, limit, skip } = req.query;

    const result = await tradeService.getCustomerTrades(req.user._id, {
      status,
      limit: parseInt(limit) || 20,
      skip: parseInt(skip) || 0
    });

    res.json({
      success: true,
      data: result.trades,
      total: result.total
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// لغو معامله (مشتری)
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    const { reason } = req.body;

    const result = await tradeService.cancelTrade(
      req.params.id,
      reason,
      req.user._id,
      true // اعمال جریمه
    );

    res.json({
      success: true,
      data: result.trade,
      penalty: result.penaltyResult,
      message: 'معامله لغو شد. 100 امتیاز کسر و 1 بلک‌پوینت اضافه شد.'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// =============== روت‌های صراف ===============

// دریافت معاملات صراف
router.get('/sarafi/trades', protect, authorize('sarafi'), async (req, res) => {
  try {
    const { status, type, collectionType, limit, skip } = req.query;

    const result = await tradeService.getSarafiTrades(req.user._id, {
      status,
      type,
      collectionType,
      limit: parseInt(limit) || 20,
      skip: parseInt(skip) || 0
    });

    res.json({
      success: true,
      data: result.trades,
      total: result.total
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// آمار معاملات صراف
router.get('/sarafi/stats', protect, authorize('sarafi'), async (req, res) => {
  try {
    const { period } = req.query;

    const stats = await tradeService.getTradeStats(req.user._id, period);

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// تصمیم صراف (تایید/رد/تماس)
router.put('/sarafi/:id/decision', protect, authorize('sarafi'), async (req, res) => {
  try {
    const { decision, reason } = req.body;

    if (!['instant', 'callback', 'rejected'].includes(decision)) {
      return res.status(400).json({
        success: false,
        message: 'تصمیم نامعتبر است'
      });
    }

    const trade = await tradeService.sarafiDecision(
      req.params.id,
      decision,
      reason
    );

    const messages = {
      instant: 'معامله تایید و پردازش شد',
      callback: 'در انتظار تماس تلفنی',
      rejected: 'معامله رد شد'
    };

    res.json({
      success: true,
      data: trade,
      message: messages[decision]
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// تایید وصول ارز
router.put('/sarafi/:id/currency-collection', protect, authorize('sarafi'), async (req, res) => {
  try {
    const { notes } = req.body;

    const trade = await tradeService.confirmCurrencyCollection(
      req.params.id,
      req.user._id,
      notes
    );

    res.json({
      success: true,
      data: trade,
      message: 'وصول ارز تایید شد'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// تایید وصول ریال
router.put('/sarafi/:id/rial-collection', protect, authorize('sarafi'), async (req, res) => {
  try {
    const { bankDetails, notes } = req.body;

    const trade = await tradeService.confirmRialCollection(
      req.params.id,
      req.user._id,
      bankDetails,
      notes
    );

    res.json({
      success: true,
      data: trade,
      message: 'وصول ریال تایید شد'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// لغو معامله (صراف - بدون جریمه)
router.put('/sarafi/:id/cancel', protect, authorize('sarafi'), async (req, res) => {
  try {
    const { reason, applyPenalty } = req.body;

    const result = await tradeService.cancelTrade(
      req.params.id,
      reason,
      req.user._id,
      applyPenalty || false
    );

    res.json({
      success: true,
      data: result.trade,
      message: 'معامله لغو شد'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// آمار معاملات گروهی
router.get('/sarafi/group-trade-stats', protect, authorize('sarafi'), async (req, res) => {
  try {
    const Trade = require('../models/Trade');
    const mongoose = require('mongoose');
    const { period = '30d' } = req.query;

    // محاسبه تاریخ شروع
    const dateFilter = new Date();
    if (period === '7d') dateFilter.setDate(dateFilter.getDate() - 7);
    else if (period === '30d') dateFilter.setDate(dateFilter.getDate() - 30);
    else if (period === '90d') dateFilter.setDate(dateFilter.getDate() - 90);
    else if (period === '1y') dateFilter.setFullYear(dateFilter.getFullYear() - 1);

    // شروع امروز
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    // آمار معاملات گروهی که این صراف مجری (executor) بوده
    const executorStats = await Trade.aggregate([
      {
        $match: {
          sarafi: new mongoose.Types.ObjectId(req.user._id),
          isGroupTrade: true,
          status: 'completed',
          createdAt: { $gte: dateFilter }
        }
      },
      {
        $group: {
          _id: null,
          totalTrades: { $sum: 1 },
          totalVolume: { $sum: '$totalAmount' },
          totalCommission: { $sum: '$commission.amount' },
          buyCount: { $sum: { $cond: [{ $eq: ['$type', 'buy'] }, 1, 0] } },
          sellCount: { $sum: { $cond: [{ $eq: ['$type', 'sell'] }, 1, 0] } }
        }
      }
    ]);

    // آمار امروز
    const todayStats = await Trade.aggregate([
      {
        $match: {
          sarafi: new mongoose.Types.ObjectId(req.user._id),
          isGroupTrade: true,
          createdAt: { $gte: todayStart }
        }
      },
      {
        $group: {
          _id: null,
          todayTrades: { $sum: 1 },
          completedToday: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
          todayCommission: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, '$commission.amount', 0] } }
        }
      }
    ]);

    // معاملات گروهی تکمیل شده
    const completedTrades = await Trade.find({
      sarafi: req.user._id,
      isGroupTrade: true,
      status: 'completed',
      createdAt: { $gte: dateFilter }
    })
      .populate('currency', 'code nameFa')
      .populate('ownerSarafi', 'firstName lastName sarafiInfo.name sarafiInfo.alias')
      .populate('sharedCustomer', 'displayName')
      .sort({ createdAt: -1 })
      .limit(100);

    const stats = executorStats[0] || {};
    const today = todayStats[0] || {};

    res.json({
      success: true,
      data: {
        totalTrades: stats.totalTrades || 0,
        totalVolume: stats.totalVolume || 0,
        totalCommission: stats.totalCommission || 0,
        buyCount: stats.buyCount || 0,
        sellCount: stats.sellCount || 0,
        todayTrades: today.todayTrades || 0,
        completedToday: today.completedToday || 0,
        todayCommission: today.todayCommission || 0,
        trades: completedTrades
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
