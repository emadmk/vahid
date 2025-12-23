const axios = require('axios');
const Settings = require('../models/Settings');
const Currency = require('../models/Currency');

/**
 * سرویس اسکرپر TGJU برای دریافت نرخ ارز از سایت tgju.org
 */
class TgjuScraperService {
  constructor() {
    this.currencyUrl = 'https://www.tgju.org/currency';
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    // نگاشت کدهای TGJU به کدهای سیستم
    this.currencyMapping = {
      'price_dollar_rl': 'USD',
      'price_eur': 'EUR',
      'price_gbp': 'GBP',
      'price_aed': 'AED',
      'price_try': 'TRY',
      'price_cad': 'CAD',
      'price_aud': 'AUD',
      'price_chf': 'CHF',
      'price_cny': 'CNY',
      'price_jpy': 'JPY',
      'price_sar': 'SAR',
      'price_kwd': 'KWD',
      'price_qar': 'QAR',
      'price_omr': 'OMR',
      'price_bhd': 'BHD',
      'price_inr': 'INR',
      'price_pkr': 'PKR',
      'price_afn': 'AFN',
      'price_iqd': 'IQD',
      'price_rub': 'RUB',
      'price_azn': 'AZN',
      'price_gel': 'GEL',
      'price_tmt': 'TMT'
    };
  }

  /**
   * دریافت نرخ‌های ارز از صفحه TGJU
   */
  async fetchRates() {
    try {
      console.log('🔄 در حال دریافت نرخ‌ها از TGJU...');

      const response = await axios.get(this.currencyUrl, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'fa-IR,fa;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache'
        },
        timeout: 15000
      });

      const html = response.data;
      const rates = {};

      // پیدا کردن همه خطوطی که شامل data-market-row و data-price هستن
      const lines = html.split('\n');

      for (const line of lines) {
        // استخراج data-market-row
        const rowMatch = line.match(/data-market-row="([^"]+)"/);
        // استخراج data-price
        const priceMatch = line.match(/data-price="([^"]+)"/);

        if (rowMatch && priceMatch) {
          const marketRow = rowMatch[1];
          const priceStr = priceMatch[1];

          // حذف کاما از قیمت
          const price = parseInt(priceStr.replace(/,/g, ''));

          if (this.currencyMapping[marketRow] && !isNaN(price) && price > 0) {
            rates[this.currencyMapping[marketRow]] = price;
            console.log(`  📊 ${marketRow} -> ${this.currencyMapping[marketRow]}: ${price.toLocaleString()}`);
          }
        }
      }

      console.log(`✅ ${Object.keys(rates).length} نرخ ارز دریافت شد از TGJU`);
      return rates;
    } catch (error) {
      console.error('❌ خطا در دریافت نرخ‌ها از TGJU:', error.message);
      throw error;
    }
  }

  /**
   * به‌روزرسانی نرخ ارز در دیتابیس
   */
  async updateCurrencyRate(code, rate, spread = { buy: 0, sell: 0 }) {
    try {
      // محاسبه نرخ خرید و فروش با اعمال اسپرد
      const buyRate = Math.round(rate * (1 - spread.buy / 100));
      const sellRate = Math.round(rate * (1 + spread.sell / 100));

      const currency = await Currency.findOneAndUpdate(
        { code },
        {
          buyRate,
          sellRate,
          lastRateUpdate: new Date(),
          $push: {
            rateHistory: {
              $each: [{ buyRate, sellRate, date: new Date() }],
              $slice: -100
            }
          }
        },
        { new: true }
      );

      if (currency) {
        console.log(`✅ ${code}: ${buyRate.toLocaleString()} / ${sellRate.toLocaleString()}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`❌ خطا در به‌روزرسانی ${code}:`, error.message);
      return false;
    }
  }

  /**
   * اجرای کامل اسکرپر
   */
  async run() {
    console.log('🚀 شروع به‌روزرسانی نرخ‌ها از TGJU...');
    const startTime = Date.now();

    try {
      const settings = await Settings.getSettings();
      const scraperSettings = settings.rateScraperSettings;

      if (!scraperSettings?.enabled) {
        console.log('⏸️ اسکرپر غیرفعال است');
        return { success: false, message: 'اسکرپر غیرفعال است' };
      }

      const spread = {
        buy: scraperSettings.buySpread || 0,
        sell: scraperSettings.sellSpread || 0
      };

      // دریافت نرخ‌ها از TGJU
      const rates = await this.fetchRates();

      if (Object.keys(rates).length === 0) {
        throw new Error('هیچ نرخی از TGJU دریافت نشد');
      }

      // به‌روزرسانی نرخ‌ها در دیتابیس
      let updatedCount = 0;
      const activeCurrencies = scraperSettings.activeCurrencies || ['USD', 'EUR', 'GBP', 'AED', 'TRY', 'CAD'];

      for (const code of activeCurrencies) {
        if (rates[code]) {
          const updated = await this.updateCurrencyRate(code, rates[code], spread);
          if (updated) updatedCount++;
        }
      }

      // ثبت زمان آخرین اجرا
      await Settings.findOneAndUpdate({}, {
        'rateScraperSettings.lastRun': new Date(),
        'rateScraperSettings.lastError': null
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`✅ به‌روزرسانی تمام شد - ${updatedCount} ارز در ${duration} ثانیه`);

      return {
        success: true,
        updatedCount,
        rates,
        duration
      };

    } catch (error) {
      console.error('❌ خطا در اسکرپر TGJU:', error.message);

      await Settings.findOneAndUpdate({}, {
        'rateScraperSettings.lastRun': new Date(),
        'rateScraperSettings.lastError': error.message
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * تست اتصال به TGJU
   */
  async testConnection() {
    try {
      const rates = await this.fetchRates();
      return {
        success: true,
        message: `اتصال موفق - ${Object.keys(rates).length} نرخ دریافت شد`,
        rates
      };
    } catch (error) {
      return {
        success: false,
        message: `خطا در اتصال: ${error.message}`
      };
    }
  }
}

const tgjuScraperService = new TgjuScraperService();
module.exports = tgjuScraperService;
