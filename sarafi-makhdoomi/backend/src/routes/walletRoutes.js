const express = require('express');
const router = express.Router();
const walletService = require('../services/walletService');
const { protect, authorize } = require('../middleware/auth');

// دریافت کیف پول‌های کاربر
router.get('/my-wallets', protect, async (req, res) => {
  try {
    const wallets = await walletService.getUserWallets(req.user._id);

    res.json({
      success: true,
      data: wallets
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// گزارش مالی کاربر
router.get('/financial-report', protect, async (req, res) => {
  try {
    const report = await walletService.getFinancialReport(req.user._id);

    res.json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// تاریخچه تراکنش‌ها
router.get('/transactions', protect, async (req, res) => {
  try {
    const { type, startDate, endDate, limit, skip } = req.query;

    const result = await walletService.getTransactionHistory(req.user._id, {
      type,
      startDate,
      endDate,
      limit: parseInt(limit) || 50,
      skip: parseInt(skip) || 0
    });

    res.json({
      success: true,
      data: result.transactions,
      total: result.total
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// بررسی امکان خرید
router.post('/check-purchase', protect, async (req, res) => {
  try {
    const { amount } = req.body;

    const availability = await walletService.checkPurchaseAvailability(
      req.user._id,
      amount
    );

    res.json({
      success: true,
      data: availability
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// =============== روت‌های صراف ===============

// دریافت کیف پول‌های مشتری (صراف)
router.get('/customer/:customerId', protect, authorize('sarafi'), async (req, res) => {
  try {
    const wallets = await walletService.getUserWallets(req.params.customerId);

    res.json({
      success: true,
      data: wallets
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// واریز به کیف پول مشتری (صراف)
router.post('/deposit', protect, authorize('sarafi'), async (req, res) => {
  try {
    const { customerId, amount, description } = req.body;

    const result = await walletService.deposit(
      customerId,
      amount,
      description,
      req.user._id
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// برداشت از کیف پول مشتری (صراف)
router.post('/withdraw', protect, authorize('sarafi'), async (req, res) => {
  try {
    const { customerId, amount, description } = req.body;

    const result = await walletService.withdraw(
      customerId,
      amount,
      description,
      req.user._id
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// افزایش سقف اعتبار (صراف)
router.post('/credit/increase', protect, authorize('sarafi'), async (req, res) => {
  try {
    const { customerId, amount } = req.body;

    const result = await walletService.increaseCreditLimit(
      customerId,
      amount,
      req.user._id
    );

    res.json({
      success: true,
      data: result,
      message: `سقف اعتبار به ${result.wallet.creditLimit.toLocaleString()} ریال افزایش یافت`
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// کاهش سقف اعتبار (صراف)
router.post('/credit/decrease', protect, authorize('sarafi'), async (req, res) => {
  try {
    const { customerId, amount } = req.body;

    const result = await walletService.decreaseCreditLimit(
      customerId,
      amount,
      req.user._id
    );

    res.json({
      success: true,
      data: result,
      message: `سقف اعتبار به ${result.wallet.creditLimit.toLocaleString()} ریال کاهش یافت`
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// بازپرداخت اعتبار (صراف)
router.post('/credit/repay', protect, authorize('sarafi'), async (req, res) => {
  try {
    const { customerId, amount, description } = req.body;

    const result = await walletService.repayCredit(
      customerId,
      amount,
      description,
      req.user._id
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

// تاریخچه تراکنش‌های مشتری (صراف)
router.get('/customer/:customerId/transactions', protect, authorize('sarafi'), async (req, res) => {
  try {
    const { type, startDate, endDate, limit, skip } = req.query;

    const result = await walletService.getTransactionHistory(req.params.customerId, {
      type,
      startDate,
      endDate,
      limit: parseInt(limit) || 50,
      skip: parseInt(skip) || 0
    });

    res.json({
      success: true,
      data: result.transactions,
      total: result.total
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;
