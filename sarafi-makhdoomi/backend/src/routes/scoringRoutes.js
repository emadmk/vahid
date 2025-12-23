const express = require('express');
const router = express.Router();
const scoringService = require('../services/scoringService');
const { protect, authorize } = require('../middleware/auth');

// =============== روت‌های مشتری ===============

// وضعیت امتیاز من
router.get('/my-score', protect, async (req, res) => {
  try {
    const status = await scoringService.getUserScoreStatus(req.user._id);

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// لیدربورد مشتریان
router.get('/leaderboard/customers', async (req, res) => {
  try {
    const { limit } = req.query;

    const leaderboard = await scoringService.getLeaderboard(
      'customer',
      parseInt(limit) || 10
    );

    res.json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// لیدربورد صراف‌ها
router.get('/leaderboard/sarafis', async (req, res) => {
  try {
    const { limit } = req.query;

    const leaderboard = await scoringService.getLeaderboard(
      'sarafi',
      parseInt(limit) || 10
    );

    res.json({
      success: true,
      data: leaderboard
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// =============== روت‌های صراف ===============

// گزارش امتیازات مشتریان
router.get('/sarafi/customers-report', protect, authorize('sarafi'), async (req, res) => {
  try {
    const { sortBy, order, limit, skip } = req.query;

    const report = await scoringService.getCustomerScoreReport(req.user._id, {
      sortBy,
      order,
      limit: parseInt(limit) || 50,
      skip: parseInt(skip) || 0
    });

    res.json({
      success: true,
      data: report.customers,
      total: report.total,
      stats: report.stats
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// وضعیت امتیاز مشتری خاص
router.get('/sarafi/customer/:customerId', protect, authorize('sarafi'), async (req, res) => {
  try {
    const status = await scoringService.getUserScoreStatus(req.params.customerId);

    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// تعلیق مشتری
router.post('/sarafi/suspend/:customerId', protect, authorize('sarafi'), async (req, res) => {
  try {
    const { reason, duration } = req.body;

    // تبدیل duration به میلی‌ثانیه
    let durationMs = null;
    if (duration) {
      const durationMap = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
        'permanent': null
      };
      durationMs = durationMap[duration];
    }

    const result = await scoringService.suspendUser(
      req.params.customerId,
      reason,
      durationMs,
      req.user._id
    );

    res.json({
      success: true,
      data: result,
      message: 'مشتری تعلیق شد'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// رفع تعلیق مشتری
router.post('/sarafi/unsuspend/:customerId', protect, authorize('sarafi'), async (req, res) => {
  try {
    const result = await scoringService.unsuspendUser(req.params.customerId);

    res.json({
      success: true,
      data: result,
      message: 'تعلیق مشتری برداشته شد'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// =============== روت‌های ادمین ===============

// تعلیق کاربر (ادمین)
router.post('/admin/suspend/:userId', protect, authorize('admin'), async (req, res) => {
  try {
    const { reason, duration } = req.body;

    let durationMs = null;
    if (duration) {
      const durationMap = {
        '1h': 60 * 60 * 1000,
        '24h': 24 * 60 * 60 * 1000,
        '7d': 7 * 24 * 60 * 60 * 1000,
        '30d': 30 * 24 * 60 * 60 * 1000,
        'permanent': null
      };
      durationMs = durationMap[duration];
    }

    const result = await scoringService.suspendUser(
      req.params.userId,
      reason,
      durationMs,
      req.user._id
    );

    res.json({
      success: true,
      data: result,
      message: 'کاربر تعلیق شد'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// رفع تعلیق (ادمین)
router.post('/admin/unsuspend/:userId', protect, authorize('admin'), async (req, res) => {
  try {
    const result = await scoringService.unsuspendUser(req.params.userId);

    res.json({
      success: true,
      data: result,
      message: 'تعلیق کاربر برداشته شد'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
