/**
 * اسکریپت ایمپورت ارزها به دیتابیس
 * این ارزها با اسکرپر TGJU همخوانی دارند
 *
 * اجرا: node scripts/seedCurrencies.js
 */

require('dotenv').config();
const mongoose = require('mongoose');

// اتصال به دیتابیس
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sarafi_makhdoomi';

// لیست ارزها - همخوان با TGJU
const currencies = [
  // ارزها
  { code: 'USD', name: 'دلار آمریکا', nameFa: 'دلار آمریکا', symbol: '$', type: 'fiat', icon: '🇺🇸', order: 1, unit: '1' },
  { code: 'EUR', name: 'یورو', nameFa: 'یورو', symbol: '€', type: 'fiat', icon: '🇪🇺', order: 2, unit: '1' },
  { code: 'GBP', name: 'پوند انگلیس', nameFa: 'پوند انگلیس', symbol: '£', type: 'fiat', icon: '🇬🇧', order: 3, unit: '1' },
  { code: 'AED', name: 'درهم امارات', nameFa: 'درهم امارات', symbol: 'د.إ', type: 'fiat', icon: '🇦🇪', order: 4, unit: '1' },
  { code: 'TRY', name: 'لیر ترکیه', nameFa: 'لیر ترکیه', symbol: '₺', type: 'fiat', icon: '🇹🇷', order: 5, unit: '1' },
  { code: 'CAD', name: 'دلار کانادا', nameFa: 'دلار کانادا', symbol: 'C$', type: 'fiat', icon: '🇨🇦', order: 6, unit: '1' },
  { code: 'AUD', name: 'دلار استرالیا', nameFa: 'دلار استرالیا', symbol: 'A$', type: 'fiat', icon: '🇦🇺', order: 7, unit: '1' },
  { code: 'CHF', name: 'فرانک سوئیس', nameFa: 'فرانک سوئیس', symbol: 'Fr', type: 'fiat', icon: '🇨🇭', order: 8, unit: '1' },
  { code: 'CNY', name: 'یوان چین', nameFa: 'یوان چین', symbol: '¥', type: 'fiat', icon: '🇨🇳', order: 9, unit: '1' },
  { code: 'JPY', name: 'ین ژاپن', nameFa: 'ین ژاپن', symbol: '¥', type: 'fiat', icon: '🇯🇵', order: 10, unit: '100' },
  { code: 'SAR', name: 'ریال سعودی', nameFa: 'ریال سعودی', symbol: '﷼', type: 'fiat', icon: '🇸🇦', order: 11, unit: '1' },
  { code: 'KWD', name: 'دینار کویت', nameFa: 'دینار کویت', symbol: 'د.ك', type: 'fiat', icon: '🇰🇼', order: 12, unit: '1' },
  { code: 'QAR', name: 'ریال قطر', nameFa: 'ریال قطر', symbol: '﷼', type: 'fiat', icon: '🇶🇦', order: 13, unit: '1' },
  { code: 'OMR', name: 'ریال عمان', nameFa: 'ریال عمان', symbol: '﷼', type: 'fiat', icon: '🇴🇲', order: 14, unit: '1' },
  { code: 'BHD', name: 'دینار بحرین', nameFa: 'دینار بحرین', symbol: '.د.ب', type: 'fiat', icon: '🇧🇭', order: 15, unit: '1' },
  { code: 'RUB', name: 'روبل روسیه', nameFa: 'روبل روسیه', symbol: '₽', type: 'fiat', icon: '🇷🇺', order: 16, unit: '1' },
  { code: 'INR', name: 'روپیه هند', nameFa: 'روپیه هند', symbol: '₹', type: 'fiat', icon: '🇮🇳', order: 17, unit: '1' },
  { code: 'PKR', name: 'روپیه پاکستان', nameFa: 'روپیه پاکستان', symbol: '₨', type: 'fiat', icon: '🇵🇰', order: 18, unit: '1' },
  { code: 'AFN', name: 'افغانی', nameFa: 'افغانی', symbol: '؋', type: 'fiat', icon: '🇦🇫', order: 19, unit: '1' },
  { code: 'IQD', name: 'دینار عراق', nameFa: 'دینار عراق', symbol: 'ع.د', type: 'fiat', icon: '🇮🇶', order: 20, unit: '1' },
  { code: 'AZN', name: 'منات آذربایجان', nameFa: 'منات آذربایجان', symbol: '₼', type: 'fiat', icon: '🇦🇿', order: 21, unit: '1' },
  { code: 'GEL', name: 'لاری گرجستان', nameFa: 'لاری گرجستان', symbol: '₾', type: 'fiat', icon: '🇬🇪', order: 22, unit: '1' },
  { code: 'TMT', name: 'منات ترکمنستان', nameFa: 'منات ترکمنستان', symbol: 'm', type: 'fiat', icon: '🇹🇲', order: 23, unit: '1' },

  // طلا و سکه
  { code: 'GOLD_18K', name: 'طلای ۱۸ عیار', nameFa: 'طلای ۱۸ عیار (گرم)', symbol: '🪙', type: 'gold', icon: '🪙', order: 101, unit: 'گرم' },
  { code: 'GOLD_24K', name: 'طلای ۲۴ عیار', nameFa: 'طلای ۲۴ عیار (گرم)', symbol: '🏆', type: 'gold', icon: '🏆', order: 102, unit: 'گرم' },
  { code: 'GOLD_750', name: 'طلای ۷۵۰', nameFa: 'طلای ۷۵۰ (گرم)', symbol: '💛', type: 'gold', icon: '💛', order: 103, unit: 'گرم' },
  { code: 'MESGHAL', name: 'مثقال طلا', nameFa: 'مثقال طلا', symbol: '⚖️', type: 'gold', icon: '⚖️', order: 104, unit: 'مثقال' },
  { code: 'COIN_EMAMI', name: 'سکه امامی', nameFa: 'سکه امامی', symbol: '🥇', type: 'gold', icon: '🥇', order: 105, unit: 'عدد' },
  { code: 'COIN_BAHAR', name: 'سکه بهار', nameFa: 'سکه بهار آزادی', symbol: '🌸', type: 'gold', icon: '🌸', order: 106, unit: 'عدد' },
  { code: 'COIN_NIM', name: 'نیم سکه', nameFa: 'نیم سکه', symbol: '🔶', type: 'gold', icon: '🔶', order: 107, unit: 'عدد' },
  { code: 'COIN_ROB', name: 'ربع سکه', nameFa: 'ربع سکه', symbol: '🔸', type: 'gold', icon: '🔸', order: 108, unit: 'عدد' },
  { code: 'COIN_GERAMI', name: 'سکه گرمی', nameFa: 'سکه گرمی', symbol: '💠', type: 'gold', icon: '💠', order: 109, unit: 'عدد' },
  { code: 'SILVER_999', name: 'نقره ۹۹۹', nameFa: 'نقره ۹۹۹ (گرم)', symbol: '🥈', type: 'gold', icon: '🥈', order: 110, unit: 'گرم' },
  { code: 'SILVER_925', name: 'نقره ۹۲۵', nameFa: 'نقره ۹۲۵ (گرم)', symbol: '⚪', type: 'gold', icon: '⚪', order: 111, unit: 'گرم' },
  { code: 'GOLD_OUNCE', name: 'انس طلا', nameFa: 'انس طلا (جهانی)', symbol: '🌍', type: 'gold', icon: '🌍', order: 112, unit: 'انس' },
  { code: 'SILVER_OUNCE', name: 'انس نقره', nameFa: 'انس نقره (جهانی)', symbol: '🌐', type: 'gold', icon: '🌐', order: 113, unit: 'انس' },

  // کریپتو
  { code: 'USDT', name: 'تتر', nameFa: 'تتر (USDT)', symbol: '₮', type: 'crypto', icon: '💵', order: 201, unit: '1' },
  { code: 'BTC', name: 'بیت‌کوین', nameFa: 'بیت‌کوین', symbol: '₿', type: 'crypto', icon: '₿', order: 202, unit: '1' },
  { code: 'ETH', name: 'اتریوم', nameFa: 'اتریوم', symbol: 'Ξ', type: 'crypto', icon: 'Ξ', order: 203, unit: '1' },
];

async function seedCurrencies() {
  try {
    console.log('🔌 اتصال به دیتابیس...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ اتصال برقرار شد');

    const db = mongoose.connection.db;
    const collection = db.collection('currencies');

    // حذف index های اشتباهی
    console.log('🔧 بررسی و حذف index های قدیمی...');
    try {
      const indexes = await collection.indexes();
      console.log('   Index های فعلی:', indexes.map(i => i.name).join(', '));

      // حذف همه index ها به جز _id
      for (const index of indexes) {
        if (index.name !== '_id_') {
          try {
            await collection.dropIndex(index.name);
            console.log(`   ✅ حذف index: ${index.name}`);
          } catch (e) {
            console.log(`   ⚠️ نتوانست index ${index.name} را حذف کند: ${e.message}`);
          }
        }
      }
    } catch (e) {
      console.log('   ⚠️ خطا در بررسی index ها:', e.message);
    }

    // حذف همه ارزهای قبلی
    console.log('🗑️ حذف ارزهای قبلی...');
    await collection.deleteMany({});
    console.log('✅ ارزهای قبلی حذف شدند');

    // ایجاد index صحیح فقط روی code
    console.log('🔧 ایجاد index جدید روی code...');
    await collection.createIndex({ code: 1 }, { unique: true });
    console.log('✅ Index جدید ایجاد شد');

    // درج ارزهای جدید
    console.log('📥 درج ارزهای جدید...');
    const docsToInsert = currencies.map(c => ({
      ...c,
      buyRate: 0,
      sellRate: 0,
      isActive: true,
      lastRateUpdate: new Date(),
      rateHistory: [],
      createdAt: new Date(),
      updatedAt: new Date()
    }));

    const result = await collection.insertMany(docsToInsert);
    console.log(`✅ ${result.insertedCount} ارز با موفقیت اضافه شدند`);

    // نمایش لیست
    console.log('\n📋 لیست ارزها:');
    console.log('═══════════════════════════════════════');

    const grouped = {
      fiat: currencies.filter(c => c.type === 'fiat'),
      gold: currencies.filter(c => c.type === 'gold'),
      crypto: currencies.filter(c => c.type === 'crypto')
    };

    console.log(`\n💵 ارزها (${grouped.fiat.length}):`);
    grouped.fiat.forEach(c => console.log(`   ${c.icon} ${c.code} - ${c.nameFa}`));

    console.log(`\n🪙 طلا و سکه (${grouped.gold.length}):`);
    grouped.gold.forEach(c => console.log(`   ${c.icon} ${c.code} - ${c.nameFa}`));

    console.log(`\n₿ کریپتو (${grouped.crypto.length}):`);
    grouped.crypto.forEach(c => console.log(`   ${c.icon} ${c.code} - ${c.nameFa}`));

    console.log('\n═══════════════════════════════════════');
    console.log('✅ عملیات با موفقیت انجام شد!');
    console.log('💡 حالا از پنل ادمین اسکرپر را اجرا کنید تا قیمت‌ها به‌روز شوند.');

  } catch (error) {
    console.error('❌ خطا:', error.message);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 اتصال بسته شد');
    process.exit(0);
  }
}

seedCurrencies();
