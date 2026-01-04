const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth');
const Order = require('../models/Order');
const Currency = require('../models/Currency');
const Spread = require('../models/Spread');
const AuditLog = require('../models/AuditLog');

// ========== روت‌های عمومی بازار ==========

// دریافت Order Book یک ارز (ناشناس)
router.get('/book/:currencyId', async (req, res) => {
  try {
    const { currencyId } = req.params;
    const { limit = 20 } = req.query;

    const orderBook = await Order.getOrderBook(currencyId, parseInt(limit));

    res.json({
      success: true,
      data: orderBook
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// دریافت Market Tape (معاملات اخیر - ناشناس)
router.get('/tape/:currencyId', async (req, res) => {
  try {
    const { currencyId } = req.params;
    const { limit = 50 } = req.query;

    const recentTrades = await Order.find({
      currency: currencyId,
      status: 'filled'
    })
      .select('side amount averageFilledPrice completedAt')
      .sort({ completedAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: recentTrades.map(t => ({
        side: t.side,
        amount: t.amount,
        price: t.averageFilledPrice,
        time: t.completedAt
      }))
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ========== روت‌های نیازمند احراز هویت ==========
router.use(protect);

// ایجاد سفارش جدید
router.post('/', async (req, res) => {
  try {
    const {
      side,
      orderType,
      currencyId,
      amount,
      price,
      stopPrice,
      paymentSource,
      autoExecute,
      timeInForce,
      expiresAt,
      notes
    } = req.body;

    // بررسی ارز
    const currency = await Currency.findById(currencyId);
    if (!currency || !currency.isActive) {
      return res.status(400).json({ success: false, message: 'ارز نامعتبر است' });
    }

    // دریافت صراف کاربر
    const sarafiId = req.user.role === 'sarafi' ? req.user._id : req.user.selectedSarafi;
    if (!sarafiId) {
      return res.status(400).json({ success: false, message: 'صراف مشخص نشده است' });
    }

    // دریافت اسپرد و محاسبه قیمت نهایی
    const spread = await Spread.getActiveSpread(sarafiId, currencyId);
    let finalPrice = price;
    let spreadApplied = 0;
    let marketPrice = currency.buyRate; // یا sellRate بسته به side

    if (spread && orderType !== 'market') {
      const priceCalc = spread.calculateFinalPrice(
        side === 'buy' ? currency.sellRate : currency.buyRate,
        side,
        req.user.tier || 'new',
        amount
      );
      finalPrice = priceCalc.finalPrice;
      spreadApplied = priceCalc.spreadAmount;
      marketPrice = side === 'buy' ? currency.sellRate : currency.buyRate;
    }

    // ایجاد سفارش
    const order = new Order({
      orderNumber: Order.generateOrderNumber(),
      side,
      orderType: orderType || 'limit',
      currency: currencyId,
      amount,
      price: price || finalPrice,
      stopPrice,
      createdBy: req.user._id,
      createdByType: req.user.role === 'sarafi' ? 'sarafi' : 'customer',
      sarafi: sarafiId,
      customer: req.user.role !== 'sarafi' ? req.user._id : null,
      paymentSource: paymentSource || 'cash',
      autoExecute: autoExecute || false,
      priority: req.user.tier === 'A' ? 3 : req.user.tier === 'B' ? 2 : req.user.tier === 'C' ? 1 : 0,
      userScoreAtCreation: req.user.score || 0,
      timeInForce: timeInForce || 'GTC',
      expiresAt,
      notes,
      marketPriceAtCreation: marketPrice,
      spreadApplied,
      finalPrice,
      status: autoExecute ? 'open' : 'pending'
    });

    // Pre-Trade Risk Check
    const riskCheck = await order.performRiskCheck(
      true, // TODO: بررسی سقف مشتری
      req.user.blackPoints < 5, // بررسی بلک‌پوینت
      true, // TODO: بررسی نوسان
      true  // TODO: بررسی Exposure صراف
    );

    if (!riskCheck.passed) {
      order.status = 'rejected';
      await order.save();
      return res.status(400).json({
        success: false,
        message: `سفارش رد شد: ${riskCheck.failureReason}`,
        data: order
      });
    }

    await order.save();

    // ثبت لاگ
    await AuditLog.log({
      action: 'order.create',
      category: 'order',
      user: req.user._id,
      userRole: req.user.role,
      sarafi: sarafiId,
      targetType: 'Order',
      targetId: order._id,
      targetReference: order.orderNumber,
      description: `ایجاد سفارش ${side === 'buy' ? 'خرید' : 'فروش'} ${amount} ${currency.code}`,
      newValues: { side, orderType, amount, price: order.price },
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      data: order,
      message: 'سفارش ثبت شد'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// دریافت سفارش‌های من
router.get('/my', async (req, res) => {
  try {
    const { status, side, limit = 20, skip = 0 } = req.query;

    const query = { createdBy: req.user._id };
    if (status) query.status = status;
    if (side) query.side = side;

    const orders = await Order.find(query)
      .populate('currency', 'code name nameFa')
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: orders,
      total
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Alias برای سازگاری
router.get('/my-orders', async (req, res) => {
  try {
    const { status, side, limit = 20, skip = 0 } = req.query;

    const query = { createdBy: req.user._id };
    if (status) query.status = status;
    if (side) query.side = side;

    const orders = await Order.find(query)
      .populate('currency', 'code name nameFa')
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: orders,
      total
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// لغو سفارش
router.put('/:id/cancel', async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ success: false, message: 'سفارش یافت نشد' });
    }

    // بررسی مالکیت
    if (order.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'دسترسی غیرمجاز' });
    }

    await order.cancel(req.user._id, reason);

    // ثبت لاگ
    await AuditLog.log({
      action: 'order.cancel',
      category: 'order',
      user: req.user._id,
      userRole: req.user.role,
      sarafi: order.sarafi,
      targetType: 'Order',
      targetId: order._id,
      targetReference: order.orderNumber,
      description: `لغو سفارش ${order.orderNumber}`,
      reason,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      data: order,
      message: 'سفارش لغو شد'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ========== روت‌های صراف ==========

// دریافت همه سفارش‌های صراف
router.get('/sarafi/all', authorize('sarafi'), async (req, res) => {
  try {
    const { status, side, customerId, limit = 50, skip = 0 } = req.query;

    const query = { sarafi: req.user._id };
    if (status) query.status = status;
    if (side) query.side = side;
    if (customerId) query.customer = customerId;

    const orders = await Order.find(query)
      .populate('currency', 'code name nameFa')
      .populate('customer', 'firstName lastName phone')
      .populate('createdBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit));

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: orders,
      total
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// تایید سفارش (توسط صراف)
router.put('/sarafi/:id/approve', authorize('sarafi'), async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      sarafi: req.user._id,
      status: 'pending'
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'سفارش یافت نشد' });
    }

    order.status = 'open';
    order.activatedAt = new Date();
    await order.save();

    // ثبت لاگ
    await AuditLog.log({
      action: 'order.update',
      category: 'order',
      user: req.user._id,
      userRole: 'sarafi',
      sarafi: req.user._id,
      targetType: 'Order',
      targetId: order._id,
      targetReference: order.orderNumber,
      description: `تایید و فعال‌سازی سفارش ${order.orderNumber}`,
      previousValues: { status: 'pending' },
      newValues: { status: 'open' },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      data: order,
      message: 'سفارش تایید و فعال شد'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// رد سفارش (توسط صراف)
router.put('/sarafi/:id/reject', authorize('sarafi'), async (req, res) => {
  try {
    const { reason } = req.body;
    const order = await Order.findOne({
      _id: req.params.id,
      sarafi: req.user._id,
      status: 'pending'
    });

    if (!order) {
      return res.status(404).json({ success: false, message: 'سفارش یافت نشد' });
    }

    order.status = 'rejected';
    order.cancellationReason = reason;
    order.cancelledBy = req.user._id;
    order.cancelledAt = new Date();
    await order.save();

    // ثبت لاگ
    await AuditLog.log({
      action: 'order.cancel',
      category: 'order',
      user: req.user._id,
      userRole: 'sarafi',
      sarafi: req.user._id,
      targetType: 'Order',
      targetId: order._id,
      targetReference: order.orderNumber,
      description: `رد سفارش ${order.orderNumber}`,
      reason,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      data: order,
      message: 'سفارش رد شد'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// آمار سفارش‌های صراف
router.get('/sarafi/stats', authorize('sarafi'), async (req, res) => {
  try {
    const stats = await Order.aggregate([
      { $match: { sarafi: req.user._id } },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const result = {
      total: 0,
      open: 0,
      filled: 0,
      cancelled: 0,
      pending: 0
    };

    stats.forEach(s => {
      result.total += s.count;
      if (s._id === 'open' || s._id === 'partially_filled') result.open += s.count;
      if (s._id === 'filled') result.filled = s.count;
      if (s._id === 'cancelled' || s._id === 'rejected') result.cancelled += s.count;
      if (s._id === 'pending' || s._id === 'pending_credit') result.pending += s.count;
    });

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
