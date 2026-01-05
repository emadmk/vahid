const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth');
const Trade = require('../models/Trade');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');

// همه روت‌ها نیاز به احراز هویت دارند
router.use(protect);

/**
 * دریافت لیست تسویه‌ها
 * GET /api/settlements/list
 */
router.get('/list', authorize('sarafi', 'admin'), async (req, res) => {
  try {
    const { status, type, customerId, dateFrom, dateTo, limit = 50, page = 1 } = req.query;

    // هم معاملات خودی و هم معاملات قبول شده از گروه
    const query = {
      $or: [
        { sarafi: req.user._id },
        { executorSarafi: req.user._id }
      ],
      status: { $nin: ['cancelled'] }
    };

    // فیلتر بر اساس وضعیت تسویه
    if (status === 'pending') {
      query.settlementStatus = { $in: ['pending', 'partial'] };
    } else if (status === 'completed') {
      query.settlementStatus = 'completed';
    } else if (status === 'overdue') {
      query.settlementStatus = 'overdue';
    }

    // فیلتر بر اساس نوع (ریالی یا ارزی)
    if (type === 'rial') {
      query.type = 'buy'; // خرید ارز = پرداخت ریالی توسط مشتری
    } else if (type === 'currency') {
      query.type = 'sell'; // فروش ارز = پرداخت ارزی توسط مشتری
    }

    if (customerId) {
      query.customer = customerId;
    }

    if (dateFrom || dateTo) {
      query.createdAt = {};
      if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
      if (dateTo) query.createdAt.$lte = new Date(dateTo);
    }

    const trades = await Trade.find(query)
      .populate('customer', 'firstName lastName phone email tier')
      .populate('currency', 'code nameFa symbol')
      .populate('ownerSarafi', 'firstName lastName sarafiInfo.name sarafiInfo.alias')
      .populate('executorSarafi', 'firstName lastName sarafiInfo.name sarafiInfo.alias')
      .populate('sharedCustomer', 'displayName customerNickname')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // تبدیل به فرمت Settlement - برای معاملات گروهی اسم مشتری مخفی شود
    const settlements = trades.map(trade => {
      // برای معاملات گروهی، اطلاعات مشتری مخفی شود
      let customerInfo = trade.customer;
      if (trade.isGroupTrade || trade.executorSarafi) {
        customerInfo = {
          _id: trade.customer?._id,
          firstName: trade.sharedCustomer?.displayName || 'مشتری',
          lastName: 'گروهی',
          phone: '***',
          email: '***'
        };
      }

      return {
        _id: trade._id,
        tradeNumber: trade.tradeNumber,
        customer: customerInfo,
        isGroupTrade: trade.isGroupTrade || !!trade.executorSarafi,
        ownerSarafi: trade.ownerSarafi,
        type: trade.type === 'buy' ? 'rial' : 'currency',
        currency: trade.currency,
        amount: trade.type === 'buy' ? trade.totalAmount : trade.amount,
        totalAmount: trade.totalAmount,
        currencyAmount: trade.amount,
        rate: trade.rate,
        dueDate: trade.settlementDueDate || trade.createdAt,
        status: trade.settlementStatus || 'pending',
        paidAmount: trade.paidAmount || 0,
        remainingAmount: (trade.type === 'buy' ? trade.totalAmount : trade.amount) - (trade.paidAmount || 0),
        trade: trade,
        createdAt: trade.createdAt
      };
    });

    const total = await Trade.countDocuments(query);

    res.json({
      success: true,
      data: settlements,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * آمار تسویه‌ها
 * GET /api/settlements/stats
 */
router.get('/stats', authorize('sarafi', 'admin'), async (req, res) => {
  try {
    const sarafiId = req.user._id;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // وصول ریالی معوق
    const pendingRialAgg = await Trade.aggregate([
      {
        $match: {
          sarafi: sarafiId,
          type: 'buy',
          settlementStatus: { $in: ['pending', 'partial', null] },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          total: { $sum: { $subtract: ['$totalAmount', { $ifNull: ['$paidAmount', 0] }] } }
        }
      }
    ]);

    // وصول ارزی معوق
    const pendingCurrencyCount = await Trade.countDocuments({
      sarafi: sarafiId,
      type: 'sell',
      settlementStatus: { $in: ['pending', 'partial', null] },
      status: 'completed'
    });

    // تسویه امروز
    const completedToday = await Trade.countDocuments({
      sarafi: sarafiId,
      settlementStatus: 'completed',
      updatedAt: { $gte: today }
    });

    // تاخیر وصول
    const overdueCount = await Trade.countDocuments({
      sarafi: sarafiId,
      settlementStatus: { $in: ['pending', 'partial', 'overdue'] },
      settlementDueDate: { $lt: new Date() }
    });

    res.json({
      success: true,
      data: {
        pendingRial: pendingRialAgg[0]?.total || 0,
        pendingCurrency: pendingCurrencyCount,
        completedToday,
        overdueCount
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * ثبت تسویه
 * POST /api/settlements/:tradeId/confirm
 */
router.post('/:tradeId/confirm', authorize('sarafi', 'admin'), async (req, res) => {
  try {
    const { amount, paymentMethod, referenceNumber, notes } = req.body;

    // هم صراف اصلی و هم صراف اجراکننده می‌توانند تایید کنند
    const trade = await Trade.findOne({
      _id: req.params.tradeId,
      $or: [
        { sarafi: req.user._id },
        { executorSarafi: req.user._id }
      ]
    }).populate('customer', 'firstName lastName')
      .populate('sharedCustomer', 'displayName');

    if (!trade) {
      return res.status(404).json({ success: false, message: 'معامله یافت نشد' });
    }

    // بررسی مبلغ
    const expectedAmount = trade.type === 'buy' ? trade.totalAmount : trade.amount;
    const currentPaid = trade.paidAmount || 0;
    const remaining = expectedAmount - currentPaid;

    if (amount > remaining) {
      return res.status(400).json({
        success: false,
        message: `مبلغ بیش از باقیمانده است (${remaining})`
      });
    }

    // به‌روزرسانی معامله
    trade.paidAmount = currentPaid + parseFloat(amount);
    trade.settlementHistory = trade.settlementHistory || [];
    trade.settlementHistory.push({
      amount: parseFloat(amount),
      paymentMethod,
      referenceNumber,
      notes,
      confirmedBy: req.user._id,
      confirmedAt: new Date()
    });

    // تعیین وضعیت
    if (trade.paidAmount >= expectedAmount) {
      trade.settlementStatus = 'completed';
      trade.settledAt = new Date();
    } else {
      trade.settlementStatus = 'partial';
    }

    await trade.save();

    // به‌روزرسانی کیف پول صراف
    if (trade.type === 'buy') {
      // دریافت ریال از مشتری
      await Wallet.updateOne(
        { user: req.user._id, type: 'cash' },
        { $inc: { balance: parseFloat(amount) } }
      );
    } else {
      // دریافت ارز از مشتری
      await Wallet.updateOne(
        { user: req.user._id, currency: trade.currency },
        { $inc: { balance: parseFloat(amount) } }
      );
    }

    // به‌روزرسانی کیف پول مشتری
    if (trade.customer) {
      if (trade.type === 'buy') {
        await Wallet.updateOne(
          { user: trade.customer._id, type: 'cash' },
          { $inc: { balance: -parseFloat(amount) } }
        );
      } else {
        await Wallet.updateOne(
          { user: trade.customer._id, currency: trade.currency },
          { $inc: { balance: -parseFloat(amount) } }
        );
      }
    }

    // ثبت لاگ
    await AuditLog.log({
      action: 'settlement.confirm',
      category: 'settlement',
      user: req.user._id,
      userRole: 'sarafi',
      sarafi: req.user._id,
      targetType: 'Trade',
      targetId: trade._id,
      targetReference: trade.tradeNumber,
      description: `ثبت تسویه ${amount} ${trade.type === 'buy' ? 'ریال' : trade.currency?.code} برای ${trade.customer?.firstName} ${trade.customer?.lastName}`,
      newValues: { amount, paymentMethod, referenceNumber },
      ipAddress: req.ip
    });

    // ارسال اعلان به مشتری
    if (trade.customer) {
      await Notification.create({
        user: trade.customer._id,
        type: trade.settlementStatus === 'completed' ? 'trade_completed' : 'collection_pending',
        title: trade.settlementStatus === 'completed' ? 'تسویه کامل' : 'وصول جزئی',
        message: `مبلغ ${amount.toLocaleString()} ${trade.type === 'buy' ? 'ریال' : ''} برای معامله ${trade.tradeNumber} ثبت شد`,
        severity: 'info',
        data: { tradeId: trade._id, amount }
      });
    }

    res.json({
      success: true,
      data: trade,
      message: trade.settlementStatus === 'completed' ? 'تسویه کامل ثبت شد' : 'وصول جزئی ثبت شد'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * ثبت تاخیر
 * PUT /api/settlements/:tradeId/overdue
 */
router.put('/:tradeId/overdue', authorize('sarafi', 'admin'), async (req, res) => {
  try {
    // هم صراف اصلی و هم صراف اجراکننده می‌توانند تاخیر ثبت کنند
    const trade = await Trade.findOneAndUpdate(
      {
        _id: req.params.tradeId,
        $or: [
          { sarafi: req.user._id },
          { executorSarafi: req.user._id }
        ]
      },
      {
        settlementStatus: 'overdue'
      },
      { new: true }
    ).populate('customer', 'firstName lastName');

    if (!trade) {
      return res.status(404).json({ success: false, message: 'معامله یافت نشد' });
    }

    // اضافه کردن بلک‌پوینت به مشتری
    if (trade.customer) {
      await User.findByIdAndUpdate(trade.customer._id, {
        $inc: { blackPoints: 1 }
      });

      // اعلان به مشتری
      await Notification.create({
        user: trade.customer._id,
        type: 'settlement_delay',
        title: 'تاخیر در تسویه',
        message: `معامله ${trade.tradeNumber} به تاخیر افتاده است. لطفا هرچه سریع‌تر تسویه کنید.`,
        severity: 'warning',
        data: { tradeId: trade._id }
      });
    }

    // ثبت لاگ
    await AuditLog.log({
      action: 'settlement.overdue',
      category: 'settlement',
      severity: 'warning',
      user: req.user._id,
      userRole: 'sarafi',
      sarafi: req.user._id,
      targetType: 'Trade',
      targetId: trade._id,
      targetReference: trade.tradeNumber,
      description: `ثبت تاخیر تسویه برای ${trade.customer?.firstName} ${trade.customer?.lastName}`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      data: trade,
      message: 'تاخیر ثبت شد'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * گزارش تسویه‌ها
 * GET /api/settlements/report
 */
router.get('/report', authorize('sarafi', 'admin'), async (req, res) => {
  try {
    const { dateFrom, dateTo, groupBy = 'day' } = req.query;

    const matchStage = {
      sarafi: req.user._id,
      settlementStatus: 'completed'
    };

    if (dateFrom || dateTo) {
      matchStage.settledAt = {};
      if (dateFrom) matchStage.settledAt.$gte = new Date(dateFrom);
      if (dateTo) matchStage.settledAt.$lte = new Date(dateTo);
    }

    let dateFormat;
    switch (groupBy) {
      case 'day':
        dateFormat = '%Y-%m-%d';
        break;
      case 'week':
        dateFormat = '%Y-W%V';
        break;
      case 'month':
        dateFormat = '%Y-%m';
        break;
      default:
        dateFormat = '%Y-%m-%d';
    }

    const report = await Trade.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: dateFormat, date: '$settledAt' } },
            type: '$type'
          },
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
          totalPaid: { $sum: '$paidAmount' }
        }
      },
      { $sort: { '_id.date': -1 } }
    ]);

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
