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
// روت‌های اسکرپر نرخ از تلگرام
// ============================================
const rateScraperService = require('../services/rateScraperService');
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
      enabled, intervalMinutes, telegramApiId, telegramApiHash,
      dollarChannel, goldChannel, conversionRates, buySpread, sellSpread
    } = req.body;

    const updateData = {};
    if (enabled !== undefined) updateData['rateScraperSettings.enabled'] = enabled;
    if (intervalMinutes) updateData['rateScraperSettings.intervalMinutes'] = intervalMinutes;
    if (telegramApiId) updateData['rateScraperSettings.telegramApiId'] = telegramApiId;
    if (telegramApiHash) updateData['rateScraperSettings.telegramApiHash'] = telegramApiHash;
    if (dollarChannel) updateData['rateScraperSettings.dollarChannel'] = dollarChannel;
    if (goldChannel) updateData['rateScraperSettings.goldChannel'] = goldChannel;
    if (conversionRates) updateData['rateScraperSettings.conversionRates'] = conversionRates;
    if (buySpread !== undefined) updateData['rateScraperSettings.buySpread'] = buySpread;
    if (sellSpread !== undefined) updateData['rateScraperSettings.sellSpread'] = sellSpread;

    await Settings.findOneAndUpdate({}, updateData);

    // اگه بازه تغییر کرد، job رو ریستارت کن
    if (intervalMinutes) {
      const { updateInterval } = require('../jobs/rateScraperJob');
      await updateInterval(intervalMinutes);
    }

    res.json({
      success: true,
      message: 'تنظیمات ذخیره شد'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// شروع احراز هویت تلگرام
router.post('/rate-scraper/auth/start', async (req, res) => {
  try {
    const { apiId, apiHash, phoneNumber } = req.body;

    if (!apiId || !apiHash || !phoneNumber) {
      return res.status(400).json({ success: false, message: 'اطلاعات ناقص است' });
    }

    // ذخیره API credentials
    await Settings.findOneAndUpdate({}, {
      'rateScraperSettings.telegramApiId': apiId,
      'rateScraperSettings.telegramApiHash': apiHash
    });

    const result = await rateScraperService.startAuth(apiId, apiHash, phoneNumber);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// تایید کد احراز هویت
router.post('/rate-scraper/auth/verify', async (req, res) => {
  try {
    const { phoneNumber, phoneCodeHash, code } = req.body;

    if (!phoneNumber || !phoneCodeHash || !code) {
      return res.status(400).json({ success: false, message: 'اطلاعات ناقص است' });
    }

    const settings = await Settings.getSettings();
    const { telegramApiId, telegramApiHash } = settings.rateScraperSettings || {};

    if (!telegramApiId || !telegramApiHash) {
      return res.status(400).json({ success: false, message: 'ابتدا API تنظیم شود' });
    }

    const result = await rateScraperService.verifyCode(
      telegramApiId, telegramApiHash, phoneNumber, phoneCodeHash, code
    );
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// اجرای دستی اسکرپر
router.post('/rate-scraper/run', async (req, res) => {
  try {
    const result = await rateScraperService.run();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// تست خواندن کانال
router.post('/rate-scraper/test-channel', async (req, res) => {
  try {
    const { channelUsername } = req.body;

    if (!channelUsername) {
      return res.status(400).json({ success: false, message: 'نام کانال الزامی است' });
    }

    const settings = await Settings.getSettings();
    const { telegramApiId, telegramApiHash, telegramSession } = settings.rateScraperSettings || {};

    if (!telegramSession) {
      return res.status(400).json({ success: false, message: 'ابتدا به تلگرام لاگین کنید' });
    }

    // اتصال اگه نیست
    if (!rateScraperService.isConnected) {
      await rateScraperService.connect(telegramApiId, telegramApiHash, telegramSession);
    }

    const message = await rateScraperService.getLastMessage(channelUsername);

    if (!message) {
      return res.json({ success: false, message: 'پیامی یافت نشد' });
    }

    // تلاش برای پارس نرخ
    const dollarRate = rateScraperService.parseDollarRate(message);
    const goldRate = rateScraperService.parseGoldRate(message);

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
