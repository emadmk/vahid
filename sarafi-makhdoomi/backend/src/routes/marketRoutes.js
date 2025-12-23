const express = require('express');
const router = express.Router();
const marketService = require('../services/marketService');
const { protect, authorize } = require('../middleware/auth');

// =============== روت‌های عمومی ===============

// دریافت پیشنهادات بازار
router.get('/offers', async (req, res) => {
  try {
    const { type, currency, sarafi, sortBy, order, limit, skip } = req.query;

    const result = await marketService.getMarketOffers({
      type,
      currencyId: currency,
      sarafiId: sarafi,
      sortBy,
      order,
      limit: parseInt(limit) || 50,
      skip: parseInt(skip) || 0
    });

    res.json({
      success: true,
      data: result.offers,
      total: result.total
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// دریافت بهترین قیمت‌ها
router.get('/best-prices/:currencyId', async (req, res) => {
  try {
    const prices = await marketService.getBestPrices(req.params.currencyId);

    res.json({
      success: true,
      data: prices
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// آمار بازار
router.get('/stats', async (req, res) => {
  try {
    const { currency } = req.query;

    const stats = await marketService.getMarketStats(currency);

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

// قیمت پویا
router.get('/dynamic-price/:currencyId', async (req, res) => {
  try {
    const pricing = await marketService.calculateDynamicPrice(req.params.currencyId);

    res.json({
      success: true,
      data: pricing
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// =============== روت‌های احراز هویت شده ===============

// ایجاد پیشنهاد جدید
router.post('/offers', protect, async (req, res) => {
  try {
    const {
      type,
      currency,
      amount,
      price,
      priceType,
      priceCondition,
      isPublic,
      expiresAt,
      notes
    } = req.body;

    const offeredByType = req.user.role === 'sarafi' ? 'sarafi' : 'customer';

    const offer = await marketService.createOffer({
      type,
      currency,
      amount,
      price,
      priceType,
      priceCondition,
      offeredBy: req.user._id,
      offeredByType,
      sarafiId: offeredByType === 'customer' ? req.user.selectedSarafi : req.user._id,
      isPublic,
      expiresAt,
      notes
    });

    res.status(201).json({
      success: true,
      data: offer,
      message: 'پیشنهاد با موفقیت ثبت شد'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// پیشنهادات من
router.get('/my-offers', protect, async (req, res) => {
  try {
    const { status, type, limit, skip } = req.query;

    const result = await marketService.getUserOffers(req.user._id, {
      status,
      type,
      limit: parseInt(limit) || 20,
      skip: parseInt(skip) || 0
    });

    res.json({
      success: true,
      data: result.offers,
      total: result.total
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// پذیرش پیشنهاد
router.post('/offers/:id/accept', protect, async (req, res) => {
  try {
    const { amount } = req.body;

    const result = await marketService.acceptOffer(
      req.params.id,
      req.user._id,
      amount
    );

    res.json({
      success: true,
      data: result,
      message: 'پیشنهاد پذیرفته شد و معامله ایجاد گردید'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// لغو پیشنهاد
router.put('/offers/:id/cancel', protect, async (req, res) => {
  try {
    const { reason } = req.body;

    const offer = await marketService.cancelOffer(
      req.params.id,
      req.user._id,
      reason
    );

    res.json({
      success: true,
      data: offer,
      message: 'پیشنهاد لغو شد'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// =============== روت‌های صراف ===============

// ایجاد پیشنهاد شرطی
router.post('/conditional-offer', protect, authorize('sarafi'), async (req, res) => {
  try {
    const {
      type,
      currency,
      amount,
      price,
      priceCondition,
      isPublic,
      expiresAt,
      notes
    } = req.body;

    if (!priceCondition || !priceCondition.operator || !priceCondition.targetPrice) {
      return res.status(400).json({
        success: false,
        message: 'شرایط قیمت الزامی است'
      });
    }

    const offer = await marketService.createOffer({
      type,
      currency,
      amount,
      price,
      priceType: 'conditional',
      priceCondition,
      offeredBy: req.user._id,
      offeredByType: 'sarafi',
      sarafiId: req.user._id,
      isPublic,
      expiresAt,
      notes
    });

    res.status(201).json({
      success: true,
      data: offer,
      message: 'سفارش شرطی ثبت شد'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// بررسی سفارش‌های شرطی (برای cron job)
router.post('/check-conditional', protect, authorize('sarafi', 'admin'), async (req, res) => {
  try {
    const { currencyId, currentPrice } = req.body;

    const triggered = await marketService.checkConditionalOrders(currencyId, currentPrice);

    res.json({
      success: true,
      data: {
        triggeredCount: triggered.length,
        triggered
      }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// بررسی پیشنهادات منقضی
router.post('/cleanup-expired', protect, authorize('admin'), async (req, res) => {
  try {
    const expiredCount = await marketService.checkExpiredOffers();

    res.json({
      success: true,
      data: { expiredCount },
      message: `${expiredCount} پیشنهاد منقضی شده`
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
