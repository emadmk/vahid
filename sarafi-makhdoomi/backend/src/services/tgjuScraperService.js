const axios = require('axios');
const Settings = require('../models/Settings');
const Currency = require('../models/Currency');

/**
 * سرویس اسکرپر TGJU برای دریافت نرخ ارز، طلا و کریپتو از سایت tgju.org
 */
class TgjuScraperService {
  constructor() {
    // آدرس صفحات مختلف TGJU
    this.urls = {
      currency: 'https://www.tgju.org/currency',
      gold: 'https://www.tgju.org/gold-chart',
      coin: 'https://www.tgju.org/coin',
      crypto: 'https://www.tgju.org/crypto'
    };

    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

    // نگاشت کدهای TGJU به کدهای سیستم - ارزها
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

    // نگاشت طلا و نقره (از صفحه /gold-chart)
    this.goldMapping = {
      // طلا
      'geram18': 'GOLD_18K',      // طلای 18 عیار
      'geram24': 'GOLD_24K',      // طلای 24 عیار
      'gold_740k': 'GOLD_750',    // طلای 750 (18 عیار)
      'mesghal': 'MESGHAL',       // مثقال طلا
      // نقره
      'silver_999': 'SILVER_999', // نقره 999
      'silver_925': 'SILVER_925'  // نقره 925
    };

    // نگاشت سکه (از صفحه /coin)
    this.coinMapping = {
      'sekee': 'COIN_EMAMI',      // سکه امامی
      'sekeb': 'COIN_BAHAR',      // سکه بهار آزادی
      'nim': 'COIN_NIM',          // نیم سکه
      'rob': 'COIN_ROB',          // ربع سکه
      'gerami': 'COIN_GERAMI'     // سکه یک گرمی
    };

    // نگاشت کریپتو
    this.cryptoMapping = {
      'crypto-bitcoin': 'BTC',
      'crypto-ethereum': 'ETH',
      'crypto-tether': 'USDT',
      'crypto-binance-coin': 'BNB',
      'crypto-ripple': 'XRP',
      'crypto-cardano': 'ADA',
      'crypto-dogecoin': 'DOGE',
      'crypto-solana': 'SOL',
      'crypto-polkadot': 'DOT',
      'crypto-litecoin': 'LTC',
      // فرمت‌های جایگزین
      'bitcoin': 'BTC',
      'ethereum': 'ETH',
      'tether': 'USDT'
    };
  }

  /**
   * دریافت HTML از یک صفحه
   */
  async fetchPage(url) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': this.userAgent,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'fa-IR,fa;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        timeout: 15000
      });
      return response.data;
    } catch (error) {
      console.error(`❌ خطا در دریافت ${url}:`, error.message);
      return null;
    }
  }

  /**
   * استخراج قیمت‌ها از HTML
   */
  parseRates(html, mapping) {
    const rates = {};

    if (!html) return rates;

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

        if (mapping[marketRow] && !isNaN(price) && price > 0) {
          rates[mapping[marketRow]] = price;
        }
      }
    }

    return rates;
  }

  /**
   * دریافت نرخ‌های ارز از صفحه TGJU
   */
  async fetchCurrencyRates() {
    console.log('🔄 در حال دریافت نرخ‌های ارز از TGJU...');
    const html = await this.fetchPage(this.urls.currency);
    const rates = this.parseRates(html, this.currencyMapping);
    console.log(`  ✅ ${Object.keys(rates).length} نرخ ارز دریافت شد`);
    return rates;
  }

  /**
   * دریافت نرخ‌های طلا و نقره (از صفحه gold-chart)
   */
  async fetchGoldRates() {
    console.log('🔄 در حال دریافت نرخ‌های طلا و نقره از TGJU...');
    const html = await this.fetchPage(this.urls.gold);
    const rates = this.parseRates(html, this.goldMapping);
    console.log(`  ✅ ${Object.keys(rates).length} نرخ طلا/نقره دریافت شد`);
    return rates;
  }

  /**
   * دریافت نرخ‌های سکه (از صفحه coin)
   */
  async fetchCoinRates() {
    console.log('🔄 در حال دریافت نرخ‌های سکه از TGJU...');
    const html = await this.fetchPage(this.urls.coin);
    const rates = this.parseRates(html, this.coinMapping);
    console.log(`  ✅ ${Object.keys(rates).length} نرخ سکه دریافت شد`);
    return rates;
  }

  /**
   * دریافت نرخ‌های کریپتو - ساختار متفاوت از ارز و طلا
   * در صفحه کریپتو: data-market-p="crypto-bitcoin-irr">118,176,118,800</div>
   */
  async fetchCryptoRates() {
    console.log('🔄 در حال دریافت نرخ‌های کریپتو از TGJU...');
    const html = await this.fetchPage(this.urls.crypto);
    const rates = {};

    if (!html) {
      console.log('  ⚠️ صفحه کریپتو دریافت نشد');
      return rates;
    }

    // نگاشت کریپتو برای صفحه crypto
    const cryptoIrrMapping = {
      'crypto-bitcoin-irr': 'BTC',
      'crypto-ethereum-irr': 'ETH',
      'crypto-tether-irr': 'USDT',
      'crypto-binance-coin-irr': 'BNB',
      'crypto-ripple-irr': 'XRP',
      'crypto-cardano-irr': 'ADA',
      'crypto-dogecoin-irr': 'DOGE',
      'crypto-solana-irr': 'SOL',
      'crypto-polkadot-new-irr': 'DOT',
      'crypto-litecoin-irr': 'LTC'
    };

    // الگو: data-market-p="crypto-bitcoin-irr" >118,176,118,800</div>
    for (const [dataKey, code] of Object.entries(cryptoIrrMapping)) {
      // جستجوی الگو با regex
      const regex = new RegExp(`data-market-p="${dataKey}"[^>]*>([\\d,]+)<`, 'i');
      const match = html.match(regex);

      if (match && match[1]) {
        const priceStr = match[1].replace(/,/g, '');
        const price = parseInt(priceStr);

        if (!isNaN(price) && price > 0) {
          rates[code] = price;
        }
      }
    }

    console.log(`  ✅ ${Object.keys(rates).length} نرخ کریپتو دریافت شد`);
    return rates;
  }

  /**
   * دریافت همه نرخ‌ها
   */
  async fetchRates() {
    try {
      console.log('🚀 در حال دریافت همه نرخ‌ها از TGJU...');

      // دریافت همزمان از چهار صفحه
      const [currencyRates, goldRates, coinRates, cryptoRates] = await Promise.all([
        this.fetchCurrencyRates(),
        this.fetchGoldRates(),
        this.fetchCoinRates(),
        this.fetchCryptoRates()
      ]);

      // ترکیب همه نرخ‌ها
      const allRates = {
        ...currencyRates,
        ...goldRates,
        ...coinRates,
        ...cryptoRates
      };

      console.log(`✅ مجموع ${Object.keys(allRates).length} نرخ دریافت شد از TGJU`);

      // لاگ جزئیات
      for (const [code, rate] of Object.entries(allRates)) {
        console.log(`  📊 ${code}: ${rate.toLocaleString()}`);
      }

      return allRates;
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
        console.log(`✅ ${code}: خرید ${buyRate.toLocaleString()} / فروش ${sellRate.toLocaleString()}`);
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
      const activeCurrencies = scraperSettings.activeCurrencies || [
        'USD', 'EUR', 'GBP', 'AED', 'TRY', 'CAD',
        'GOLD_18K', 'COIN_EMAMI', 'COIN_BAHAR',
        'USDT', 'BTC', 'ETH'
      ];

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
      console.log(`✅ به‌روزرسانی تمام شد - ${updatedCount} نرخ در ${duration} ثانیه`);

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

  /**
   * لیست کدهای موجود
   */
  getAvailableCodes() {
    return {
      currencies: Object.values(this.currencyMapping),
      gold: Object.values(this.goldMapping),
      coins: Object.values(this.coinMapping),
      crypto: Object.values(this.cryptoMapping)
    };
  }
}

const tgjuScraperService = new TgjuScraperService();
module.exports = tgjuScraperService;
