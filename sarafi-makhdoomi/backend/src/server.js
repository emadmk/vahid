require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const path = require('path');

const connectDB = require('./config/db');
const errorHandler = require('./middlewares/errorHandler');
const startTimerJob = require('./jobs/timerJob');
const { startRateScraperJob } = require('./jobs/rateScraperJob');
const telegramBot = require('./bot/index');

// روت‌ها
const authRoutes = require('./routes/authRoutes');
const requestRoutes = require('./routes/requestRoutes');
const adminRoutes = require('./routes/adminRoutes');
const sarafiRoutes = require('./routes/sarafiRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const publicRoutes = require('./routes/publicRoutes');
// روت‌های جدید سیستم معاملات
const walletRoutes = require('./routes/walletRoutes');
const tradeRoutes = require('./routes/tradeRoutes');
const marketRoutes = require('./routes/marketRoutes');
const scoringRoutes = require('./routes/scoringRoutes');

const app = express();

// اتصال به دیتابیس
connectDB();

// Middlewares
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 دقیقه
  max: 100,
  message: {
    success: false,
    message: 'تعداد درخواست‌های شما بیش از حد مجاز است. لطفا کمی صبر کنید.'
  }
});
app.use('/api', limiter);

// فایل‌های استاتیک
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// روت‌ها
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/sarafi', sarafiRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/public', publicRoutes);
// روت‌های جدید سیستم معاملات
app.use('/api/wallets', walletRoutes);
app.use('/api/trades', tradeRoutes);
app.use('/api/market', marketRoutes);
app.use('/api/scoring', scoringRoutes);

// روت سلامت
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'سرور فعال است',
    timestamp: new Date().toISOString()
  });
});

// Error Handler
app.use(errorHandler);

// شروع سرور
const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, async () => {
  console.log(`🚀 سرور روی پورت ${PORT} راه‌اندازی شد`);

  // شروع job تایمر
  startTimerJob();

  // شروع job اسکرپر نرخ
  startRateScraperJob();

  // راه‌اندازی ربات تلگرام
  await telegramBot.init();

  // ایجاد ارزهای پیش‌فرض
  await initializeCurrencies();

  // ایجاد ادمین پیش‌فرض
  await initializeAdmin();

  // ایجاد دسته‌بندی‌های مشتریان
  await initializeCustomerTiers();

  // ایجاد قوانین کارمزد پیش‌فرض
  await initializeCommissionRules();
});

// ایجاد ارزهای پیش‌فرض
async function initializeCurrencies() {
  const Currency = require('./models/Currency');

  const defaultCurrencies = [
    { name: 'USD', nameFa: 'دلار آمریکا', symbol: '🇺🇸', code: 'USD', buyRate: 50000, sellRate: 51000, type: 'fiat', order: 1 },
    { name: 'EUR', nameFa: 'یورو', symbol: '🇪🇺', code: 'EUR', buyRate: 55000, sellRate: 56000, type: 'fiat', order: 2 },
    { name: 'AED', nameFa: 'درهم امارات', symbol: '🇦🇪', code: 'AED', buyRate: 13000, sellRate: 14000, type: 'fiat', order: 3 },
    { name: 'TRY', nameFa: 'لیر ترکیه', symbol: '🇹🇷', code: 'TRY', buyRate: 1500, sellRate: 1600, type: 'fiat', order: 4 },
    { name: 'GBP', nameFa: 'پوند انگلیس', symbol: '🇬🇧', code: 'GBP', buyRate: 65000, sellRate: 66000, type: 'fiat', order: 5 },
    { name: 'GOLD', nameFa: 'طلای 18 عیار', symbol: '🥇', code: 'GOLD18', buyRate: 2500000, sellRate: 2550000, type: 'gold', unit: 'گرم', order: 6 },
    { name: 'USDT', nameFa: 'تتر', symbol: '💲', code: 'USDT', buyRate: 50000, sellRate: 51000, type: 'crypto', order: 7 }
  ];

  for (const curr of defaultCurrencies) {
    const exists = await Currency.findOne({ code: curr.code });
    if (!exists) {
      await Currency.create(curr);
      console.log(`✅ ارز ${curr.nameFa} ایجاد شد`);
    }
  }
}

// ایجاد ادمین پیش‌فرض
async function initializeAdmin() {
  const User = require('./models/User');

  const adminExists = await User.findOne({ role: 'admin' });
  if (!adminExists) {
    await User.create({
      firstName: 'ادمین',
      lastName: 'سیستم',
      email: 'admin@sarafi.com',
      password: 'Admin@123456',
      role: 'admin',
      status: 'approved',
      isEmailVerified: true
    });
    console.log('✅ ادمین پیش‌فرض ایجاد شد: admin@sarafi.com / Admin@123456');
  }
}

// ایجاد دسته‌بندی‌های مشتریان
async function initializeCustomerTiers() {
  const CustomerTier = require('./models/CustomerTier');
  await CustomerTier.initDefaultTiers();
  console.log('✅ دسته‌بندی‌های مشتریان ایجاد شد');
}

// ایجاد قوانین کارمزد پیش‌فرض
async function initializeCommissionRules() {
  const commissionService = require('./services/commissionService');
  await commissionService.initDefaultRules();
  console.log('✅ قوانین کارمزد پیش‌فرض ایجاد شد');
}

// مدیریت خطاهای پردازش نشده
process.on('unhandledRejection', (err) => {
  console.error('❌ خطای پردازش نشده:', err);
  server.close(() => process.exit(1));
});
