const express = require('express');
const router = express.Router();
const tradeService = require('../services/tradeService');
const commissionService = require('../services/commissionService');
const { protect, authorize } = require('../middlewares/auth');

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

module.exports = router;
