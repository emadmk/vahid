/**
 * فایل سید کامل برای همه بخش‌های سیستم صرافی گلدن 2026
 * این فایل 2 نمونه داده برای هر بخش ایجاد می‌کند
 *
 * اجرا: node src/seeds/seedAll.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// ایمپورت مدل‌ها
const User = require('../models/User');
const Currency = require('../models/Currency');
const Settings = require('../models/Settings');
const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const Trade = require('../models/Trade');
const MarketOffer = require('../models/MarketOffer');
const Commission = require('../models/Commission');
const CustomerTier = require('../models/CustomerTier');
const Request = require('../models/Request');
const Notification = require('../models/Notification');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sarafi';

const seedDatabase = async () => {
  try {
    console.log('🔌 در حال اتصال به دیتابیس...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ اتصال برقرار شد');

    // پاک کردن داده‌های قبلی
    console.log('🗑️  در حال پاک کردن داده‌های قبلی...');
    await Promise.all([
      User.deleteMany({}),
      Currency.deleteMany({}),
      Settings.deleteMany({}),
      Wallet.deleteMany({}),
      WalletTransaction.deleteMany({}),
      Trade.deleteMany({}),
      MarketOffer.deleteMany({}),
      Commission.deleteMany({}),
      CustomerTier.deleteMany({}),
      Request.deleteMany({}),
      Notification.deleteMany({})
    ]);

    const hashedPassword = await bcrypt.hash('123456', 10);

    // ========== 1. تنظیمات سیستم ==========
    console.log('⚙️  ایجاد تنظیمات سیستم...');
    const settings = await Settings.create({
      siteName: 'صرافی گلدن 2026',
      siteDescription: 'صرافی معتبر خرید و فروش ارز',
      contactPhone: '09123456789',
      contactEmail: 'info@golden2026.com',
      contactAddress: 'تهران، خیابان ولیعصر',
      telegramLink: 'https://t.me/golden2026',
      instagramLink: 'https://instagram.com/golden2026',
      workingHours: 'شنبه تا پنجشنبه 9 صبح تا 6 عصر',
      commissionRate: 0.5,
      minTradeAmount: 100,
      maxTradeAmount: 100000
    });
    console.log('   ✓ تنظیمات سیستم ایجاد شد');

    // ========== 2. رده‌بندی مشتریان ==========
    console.log('🏆 ایجاد رده‌بندی مشتریان...');
    const tierA = await CustomerTier.create({
      name: 'مشتری طلایی',
      code: 'A',
      minScore: 1000,
      maxScore: null,
      benefits: {
        commissionDiscount: 30,
        prioritySupport: true,
        dedicatedManager: true,
        specialRates: true
      },
      color: '#FFD700',
      description: 'مشتریان ویژه با بیشترین مزایا'
    });

    const tierB = await CustomerTier.create({
      name: 'مشتری نقره‌ای',
      code: 'B',
      minScore: 500,
      maxScore: 999,
      benefits: {
        commissionDiscount: 15,
        prioritySupport: true,
        dedicatedManager: false,
        specialRates: false
      },
      color: '#C0C0C0',
      description: 'مشتریان فعال با مزایای خوب'
    });

    const tierC = await CustomerTier.create({
      name: 'مشتری برنزی',
      code: 'C',
      minScore: 100,
      maxScore: 499,
      benefits: {
        commissionDiscount: 5,
        prioritySupport: false,
        dedicatedManager: false,
        specialRates: false
      },
      color: '#CD7F32',
      description: 'مشتریان عادی'
    });
    console.log('   ✓ 3 رده مشتری ایجاد شد');

    // ========== 3. ارزها ==========
    console.log('💱 ایجاد ارزها...');
    const usd = await Currency.create({
      name: 'US Dollar',
      nameFa: 'دلار آمریکا',
      symbol: '🇺🇸',
      code: 'USD',
      buyRate: 625000,
      sellRate: 620000,
      isActive: true,
      order: 1
    });

    const eur = await Currency.create({
      name: 'Euro',
      nameFa: 'یورو',
      symbol: '🇪🇺',
      code: 'EUR',
      buyRate: 680000,
      sellRate: 675000,
      isActive: true,
      order: 2
    });

    const gbp = await Currency.create({
      name: 'British Pound',
      nameFa: 'پوند انگلیس',
      symbol: '🇬🇧',
      code: 'GBP',
      buyRate: 790000,
      sellRate: 785000,
      isActive: true,
      order: 3
    });

    const aed = await Currency.create({
      name: 'UAE Dirham',
      nameFa: 'درهم امارات',
      symbol: '🇦🇪',
      code: 'AED',
      buyRate: 170000,
      sellRate: 168000,
      isActive: true,
      order: 4
    });
    console.log('   ✓ 4 ارز ایجاد شد');

    // ========== 4. کاربران ==========
    console.log('👤 ایجاد کاربران...');

    // ادمین
    const admin = await User.create({
      firstName: 'مدیر',
      lastName: 'سیستم',
      email: 'admin@golden2026.com',
      phone: '09121111111',
      password: hashedPassword,
      role: 'admin',
      status: 'approved',
      isEmailVerified: true,
      score: 0,
      tier: 'A'
    });

    // صراف 1
    const sarafi1 = await User.create({
      firstName: 'علی',
      lastName: 'احمدی',
      email: 'sarafi1@golden2026.com',
      phone: '09122222222',
      password: hashedPassword,
      role: 'sarafi',
      status: 'approved',
      isEmailVerified: true,
      score: 5000,
      tier: 'A',
      sarafiStats: {
        score: 5000,
        activeCustomers: 25,
        totalVolume: 50000000000,
        successRate: 98.5,
        avgResponseTime: 15
      }
    });

    // صراف 2
    const sarafi2 = await User.create({
      firstName: 'محمد',
      lastName: 'رضایی',
      email: 'sarafi2@golden2026.com',
      phone: '09123333333',
      password: hashedPassword,
      role: 'sarafi',
      status: 'approved',
      isEmailVerified: true,
      score: 3000,
      tier: 'A',
      sarafiStats: {
        score: 3000,
        activeCustomers: 18,
        totalVolume: 30000000000,
        successRate: 96.2,
        avgResponseTime: 20
      }
    });

    // کاربر 1 - مشتری طلایی
    const user1 = await User.create({
      firstName: 'رضا',
      lastName: 'محمدی',
      email: 'user1@gmail.com',
      phone: '09124444444',
      password: hashedPassword,
      role: 'user',
      status: 'approved',
      isEmailVerified: true,
      score: 1500,
      tier: 'A',
      sarafi: sarafi1._id,
      sarafiApprovalStatus: 'approved',
      financialInfo: {
        totalTradeVolume: 15000000000,
        successfulTrades: 45,
        lastTradeDate: new Date(),
        averageTradeVolume: 333333333
      }
    });

    // کاربر 2 - مشتری نقره‌ای
    const user2 = await User.create({
      firstName: 'زهرا',
      lastName: 'کریمی',
      email: 'user2@gmail.com',
      phone: '09125555555',
      password: hashedPassword,
      role: 'user',
      status: 'approved',
      isEmailVerified: true,
      score: 750,
      tier: 'B',
      sarafi: sarafi1._id,
      sarafiApprovalStatus: 'approved',
      financialInfo: {
        totalTradeVolume: 7500000000,
        successfulTrades: 22,
        lastTradeDate: new Date(),
        averageTradeVolume: 340909090
      }
    });

    // کاربر 3 - مشتری برنزی
    const user3 = await User.create({
      firstName: 'امیر',
      lastName: 'حسینی',
      email: 'user3@gmail.com',
      phone: '09126666666',
      password: hashedPassword,
      role: 'user',
      status: 'approved',
      isEmailVerified: true,
      score: 250,
      tier: 'C',
      sarafi: sarafi2._id,
      sarafiApprovalStatus: 'approved',
      financialInfo: {
        totalTradeVolume: 2500000000,
        successfulTrades: 8,
        lastTradeDate: new Date(),
        averageTradeVolume: 312500000
      }
    });

    // کاربر 4 - مشتری جدید
    const user4 = await User.create({
      firstName: 'مریم',
      lastName: 'نوری',
      email: 'user4@gmail.com',
      phone: '09127777777',
      password: hashedPassword,
      role: 'user',
      status: 'approved',
      isEmailVerified: true,
      score: 50,
      tier: 'new',
      sarafi: sarafi2._id,
      sarafiApprovalStatus: 'pending'
    });
    console.log('   ✓ 7 کاربر ایجاد شد (1 ادمین، 2 صراف، 4 مشتری)');

    // ========== 5. قوانین کارمزد ==========
    console.log('💰 ایجاد قوانین کارمزد...');
    const commission1 = await Commission.create({
      name: 'کارمزد استاندارد دلار',
      type: 'percentage',
      currency: usd._id,
      tradeType: 'both',
      tiers: [
        { minAmount: 0, maxAmount: 100000000, rate: 0.5 },
        { minAmount: 100000001, maxAmount: 500000000, rate: 0.4 },
        { minAmount: 500000001, maxAmount: null, rate: 0.3 }
      ],
      minCommission: 50000,
      maxCommission: 50000000,
      isActive: true
    });

    const commission2 = await Commission.create({
      name: 'کارمزد استاندارد یورو',
      type: 'percentage',
      currency: eur._id,
      tradeType: 'both',
      tiers: [
        { minAmount: 0, maxAmount: 100000000, rate: 0.55 },
        { minAmount: 100000001, maxAmount: 500000000, rate: 0.45 },
        { minAmount: 500000001, maxAmount: null, rate: 0.35 }
      ],
      minCommission: 60000,
      maxCommission: 60000000,
      isActive: true
    });
    console.log('   ✓ 2 قانون کارمزد ایجاد شد');

    // ========== 6. کیف پول‌ها ==========
    console.log('👛 ایجاد کیف پول‌ها...');

    // کیف پول کاربر 1
    const wallet1Cash = await Wallet.create({
      user: user1._id,
      type: 'cash',
      balance: 50000000,
      isActive: true
    });

    const wallet1Credit = await Wallet.create({
      user: user1._id,
      type: 'credit',
      balance: 0,
      creditLimit: 500000000,
      usedCredit: 100000000,
      isActive: true
    });

    // کیف پول کاربر 2
    const wallet2Cash = await Wallet.create({
      user: user2._id,
      type: 'cash',
      balance: 25000000,
      isActive: true
    });

    const wallet2Credit = await Wallet.create({
      user: user2._id,
      type: 'credit',
      balance: 0,
      creditLimit: 200000000,
      usedCredit: 50000000,
      isActive: true
    });

    // کیف پول کاربر 3
    const wallet3Cash = await Wallet.create({
      user: user3._id,
      type: 'cash',
      balance: 10000000,
      isActive: true
    });

    const wallet3Credit = await Wallet.create({
      user: user3._id,
      type: 'credit',
      balance: 0,
      creditLimit: 50000000,
      usedCredit: 0,
      isActive: true
    });
    console.log('   ✓ 6 کیف پول ایجاد شد');

    // ========== 7. تراکنش‌های کیف پول ==========
    console.log('📝 ایجاد تراکنش‌های کیف پول...');
    await WalletTransaction.create({
      wallet: wallet1Cash._id,
      user: user1._id,
      type: 'deposit',
      amount: 50000000,
      balanceBefore: 0,
      balanceAfter: 50000000,
      referenceNumber: WalletTransaction.generateReferenceNumber(),
      description: 'واریز نقدی',
      status: 'completed'
    });

    await WalletTransaction.create({
      wallet: wallet1Credit._id,
      user: user1._id,
      type: 'credit_use',
      amount: 100000000,
      balanceBefore: 0,
      balanceAfter: 0,
      referenceNumber: WalletTransaction.generateReferenceNumber(),
      description: 'استفاده از اعتبار برای خرید',
      status: 'completed'
    });

    await WalletTransaction.create({
      wallet: wallet2Cash._id,
      user: user2._id,
      type: 'deposit',
      amount: 30000000,
      balanceBefore: 0,
      balanceAfter: 30000000,
      referenceNumber: WalletTransaction.generateReferenceNumber(),
      description: 'واریز نقدی',
      status: 'completed'
    });

    await WalletTransaction.create({
      wallet: wallet2Cash._id,
      user: user2._id,
      type: 'withdraw',
      amount: 5000000,
      balanceBefore: 30000000,
      balanceAfter: 25000000,
      referenceNumber: WalletTransaction.generateReferenceNumber(),
      description: 'برداشت نقدی',
      status: 'completed'
    });
    console.log('   ✓ 4 تراکنش کیف پول ایجاد شد');

    // ========== 8. معاملات ==========
    console.log('🔄 ایجاد معاملات...');
    const trade1 = await Trade.create({
      tradeNumber: Trade.generateTradeNumber(),
      customer: user1._id,
      sarafi: sarafi1._id,
      currency: usd._id,
      type: 'buy',
      amount: 1000,
      rate: 625000,
      totalAmount: 625000000,
      netAmount: 622500000,
      status: 'completed',
      sarafiDecision: {
        decision: 'instant',
        decidedAt: new Date()
      },
      currencyCollection: {
        status: 'collected',
        collectedAt: new Date(),
        collectedBy: sarafi1._id
      },
      rialCollection: {
        status: 'collected',
        collectedAt: new Date(),
        collectedBy: sarafi1._id
      },
      commission: {
        rate: 0.4,
        amount: 2500000,
        type: 'percentage'
      },
      paymentMethod: 'cash_wallet',
      paymentDetails: {
        cashAmount: 625000000,
        creditAmount: 0
      },
      completedAt: new Date()
    });

    const trade2 = await Trade.create({
      tradeNumber: Trade.generateTradeNumber(),
      customer: user2._id,
      sarafi: sarafi1._id,
      currency: eur._id,
      type: 'sell',
      amount: 500,
      rate: 675000,
      totalAmount: 337500000,
      netAmount: 335981250,
      status: 'awaiting_rial',
      sarafiDecision: {
        decision: 'instant',
        decidedAt: new Date()
      },
      currencyCollection: {
        status: 'collected',
        collectedAt: new Date(),
        collectedBy: sarafi1._id
      },
      rialCollection: {
        status: 'pending'
      },
      commission: {
        rate: 0.45,
        amount: 1518750,
        type: 'percentage'
      },
      paymentMethod: 'credit_wallet',
      paymentDetails: {
        cashAmount: 0,
        creditAmount: 337500000
      }
    });

    const trade3 = await Trade.create({
      tradeNumber: Trade.generateTradeNumber(),
      customer: user3._id,
      sarafi: sarafi2._id,
      currency: aed._id,
      type: 'buy',
      amount: 2000,
      rate: 170000,
      totalAmount: 340000000,
      netAmount: 338300000,
      status: 'pending',
      paymentMethod: 'cash_wallet',
      paymentDetails: {
        cashAmount: 340000000,
        creditAmount: 0
      }
    });

    const trade4 = await Trade.create({
      tradeNumber: Trade.generateTradeNumber(),
      customer: user1._id,
      sarafi: sarafi1._id,
      currency: gbp._id,
      type: 'buy',
      amount: 300,
      rate: 790000,
      totalAmount: 237000000,
      netAmount: 236052000,
      status: 'awaiting_currency',
      sarafiDecision: {
        decision: 'callback',
        decidedAt: new Date(),
        reason: 'تماس گرفته شد - مشتری تایید کرد'
      },
      currencyCollection: {
        status: 'pending'
      },
      commission: {
        rate: 0.4,
        amount: 948000,
        type: 'percentage'
      },
      paymentMethod: 'mixed',
      paymentDetails: {
        cashAmount: 100000000,
        creditAmount: 137000000
      }
    });
    console.log('   ✓ 4 معامله ایجاد شد');

    // ========== 9. پیشنهادات بازار ==========
    console.log('🏪 ایجاد پیشنهادات بازار...');
    await MarketOffer.create({
      offeredBy: user1._id,
      offeredByType: 'customer',
      sarafi: sarafi1._id,
      currency: usd._id,
      type: 'sell',
      amount: 2000,
      price: 622000,
      priceType: 'fixed',
      status: 'active',
      isPublic: true,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });

    await MarketOffer.create({
      offeredBy: user2._id,
      offeredByType: 'customer',
      sarafi: sarafi1._id,
      currency: eur._id,
      type: 'buy',
      amount: 1000,
      price: 678000,
      priceType: 'conditional',
      priceCondition: {
        operator: 'lte',
        targetPrice: 670000,
        triggered: false
      },
      status: 'active',
      isPublic: true,
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000)
    });

    await MarketOffer.create({
      offeredBy: sarafi2._id,
      offeredByType: 'sarafi',
      currency: aed._id,
      type: 'sell',
      amount: 5000,
      price: 169000,
      priceType: 'fixed',
      status: 'active',
      isPublic: true,
      priority: 1,
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000)
    });

    await MarketOffer.create({
      offeredBy: user1._id,
      offeredByType: 'customer',
      sarafi: sarafi1._id,
      currency: gbp._id,
      type: 'buy',
      amount: 500,
      price: 788000,
      priceType: 'fixed',
      status: 'filled',
      isPublic: true
    });
    console.log('   ✓ 4 پیشنهاد بازار ایجاد شد');

    // ========== 10. درخواست‌ها (سیستم قدیم) ==========
    console.log('📋 ایجاد درخواست‌ها (سیستم قدیم)...');
    await Request.create({
      user: user1._id,
      originalSarafi: sarafi1._id,
      currency: usd._id,
      type: 'buy',
      amount: 500,
      rate: 620000,
      totalPrice: 310000000,
      fee: 1550000,
      finalPrice: 311550000,
      timerExpiry: new Date(Date.now() + 60 * 60 * 1000),
      status: 'completed',
      visibility: 'private',
      completedAt: new Date()
    });

    await Request.create({
      user: user2._id,
      originalSarafi: sarafi1._id,
      currency: eur._id,
      type: 'sell',
      amount: 300,
      rate: 675000,
      totalPrice: 202500000,
      fee: 1012500,
      finalPrice: 203512500,
      timerExpiry: new Date(Date.now() + 60 * 60 * 1000),
      status: 'pending',
      visibility: 'private'
    });
    console.log('   ✓ 2 درخواست قدیم ایجاد شد');

    // ========== 11. اعلان‌ها ==========
    console.log('🔔 ایجاد اعلان‌ها...');
    await Notification.create({
      user: user1._id,
      title: 'معامله تکمیل شد',
      message: 'معامله خرید 1000 دلار با موفقیت تکمیل شد',
      type: 'request_completed',
      isRead: false
    });

    await Notification.create({
      user: user2._id,
      title: 'در انتظار وصول ریال',
      message: 'معامله فروش 500 یورو در انتظار وصول ریال است',
      type: 'system',
      isRead: false
    });

    await Notification.create({
      user: sarafi1._id,
      title: 'درخواست جدید',
      message: 'یک درخواست خرید جدید از مشتری دریافت شد',
      type: 'request_new',
      isRead: true
    });

    await Notification.create({
      user: admin._id,
      title: 'گزارش روزانه',
      message: '4 معامله جدید امروز ثبت شد',
      type: 'admin',
      isRead: false
    });
    console.log('   ✓ 4 اعلان ایجاد شد');

    // ========== خلاصه ==========
    console.log('\n' + '='.repeat(50));
    console.log('✅ سید دیتابیس با موفقیت انجام شد!');
    console.log('='.repeat(50));
    console.log('\n📊 خلاصه داده‌های ایجاد شده:');
    console.log('   • تنظیمات سیستم: 1');
    console.log('   • رده‌بندی مشتریان: 3 (A, B, C)');
    console.log('   • ارزها: 4 (دلار، یورو، پوند، درهم)');
    console.log('   • کاربران: 7 (1 ادمین، 2 صراف، 4 مشتری)');
    console.log('   • قوانین کارمزد: 2');
    console.log('   • کیف پول‌ها: 6');
    console.log('   • تراکنش‌های کیف پول: 4');
    console.log('   • معاملات: 4');
    console.log('   • پیشنهادات بازار: 4');
    console.log('   • درخواست‌ها (قدیم): 2');
    console.log('   • اعلان‌ها: 4');

    console.log('\n🔐 اطلاعات ورود:');
    console.log('   رمز عبور همه کاربران: 123456');
    console.log('   ─────────────────────────────');
    console.log('   ادمین:   admin@golden2026.com');
    console.log('   صراف 1:  sarafi1@golden2026.com');
    console.log('   صراف 2:  sarafi2@golden2026.com');
    console.log('   کاربر 1: user1@gmail.com (طلایی)');
    console.log('   کاربر 2: user2@gmail.com (نقره‌ای)');
    console.log('   کاربر 3: user3@gmail.com (برنزی)');
    console.log('   کاربر 4: user4@gmail.com (جدید)');

    await mongoose.connection.close();
    console.log('\n🔌 اتصال دیتابیس بسته شد');
    process.exit(0);

  } catch (error) {
    console.error('❌ خطا در سید دیتابیس:', error);
    process.exit(1);
  }
};

seedDatabase();
