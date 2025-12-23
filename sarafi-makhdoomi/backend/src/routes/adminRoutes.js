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
