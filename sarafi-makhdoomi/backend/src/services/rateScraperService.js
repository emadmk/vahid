const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');
const { Api } = require('telegram');
const Settings = require('../models/Settings');
const Currency = require('../models/Currency');

class RateScraperService {
  constructor() {
    this.client = null;
    this.isConnected = false;
  }

  // اتصال به تلگرام
  async connect(apiId, apiHash, sessionString = '') {
    try {
      const session = new StringSession(sessionString);
      this.client = new TelegramClient(session, parseInt(apiId), apiHash, {
        connectionRetries: 5,
        useWSS: true
      });

      await this.client.start({
        phoneNumber: async () => {
          throw new Error('PHONE_REQUIRED');
        },
        password: async () => {
          throw new Error('PASSWORD_REQUIRED');
        },
        phoneCode: async () => {
          throw new Error('CODE_REQUIRED');
        },
        onError: (err) => console.error('Telegram error:', err)
      });

      this.isConnected = true;

      // ذخیره سشن جدید
      const newSession = this.client.session.save();
      await Settings.findOneAndUpdate({}, {
        'rateScraperSettings.telegramSession': newSession
      });

      console.log('✅ متصل به تلگرام شد');
      return { success: true, session: newSession };
    } catch (error) {
      if (error.message === 'PHONE_REQUIRED') {
        return { success: false, needsAuth: true };
      }
      console.error('❌ خطا در اتصال به تلگرام:', error.message);
      return { success: false, error: error.message };
    }
  }

  // شروع فرآیند احراز هویت
  async startAuth(apiId, apiHash, phoneNumber) {
    try {
      const session = new StringSession('');
      this.client = new TelegramClient(session, parseInt(apiId), apiHash, {
        connectionRetries: 5
      });

      await this.client.connect();

      const result = await this.client.sendCode(
        { apiId: parseInt(apiId), apiHash },
        phoneNumber
      );

      return {
        success: true,
        phoneCodeHash: result.phoneCodeHash,
        message: 'کد تایید به تلگرام شما ارسال شد'
      };
    } catch (error) {
      console.error('❌ خطا در ارسال کد:', error.message);
      return { success: false, error: error.message };
    }
  }

  // تایید کد و لاگین
  async verifyCode(apiId, apiHash, phoneNumber, phoneCodeHash, code) {
    try {
      if (!this.client) {
        const session = new StringSession('');
        this.client = new TelegramClient(session, parseInt(apiId), apiHash, {
          connectionRetries: 5
        });
        await this.client.connect();
      }

      await this.client.invoke(
        new Api.auth.SignIn({
          phoneNumber,
          phoneCodeHash,
          phoneCode: code
        })
      );

      this.isConnected = true;
      const sessionString = this.client.session.save();

      // ذخیره سشن
      await Settings.findOneAndUpdate({}, {
        'rateScraperSettings.telegramSession': sessionString
      });

      console.log('✅ لاگین موفق به تلگرام');
      return { success: true, session: sessionString };
    } catch (error) {
      console.error('❌ خطا در تایید کد:', error.message);
      return { success: false, error: error.message };
    }
  }

  // خواندن آخرین پیام از کانال
  async getLastMessage(channelUsername) {
    if (!this.client || !this.isConnected) {
      throw new Error('ابتدا به تلگرام متصل شوید');
    }

    try {
      const channel = await this.client.getEntity(channelUsername);
      const messages = await this.client.getMessages(channel, { limit: 5 });

      // برگرداندن آخرین پیام متنی
      for (const msg of messages) {
        if (msg.message && msg.message.trim()) {
          return msg.message;
        }
      }

      return null;
    } catch (error) {
      console.error(`❌ خطا در خواندن کانال ${channelUsername}:`, error.message);
      throw error;
    }
  }

  // پارس کردن نرخ دلار از پیام
  parseDollarRate(message) {
    try {
      // حذف کاراکترهای اضافی
      const cleanMessage = message.replace(/,/g, '').replace(/٬/g, '');

      // الگوهای مختلف برای استخراج قیمت
      const patterns = [
        // الگوی "خرید: 65000 فروش: 65500"
        /خرید[:\s]*(\d+)[^\d]*فروش[:\s]*(\d+)/i,
        // الگوی "65000 - 65500" یا "65000-65500"
        /(\d{4,6})\s*[-–]\s*(\d{4,6})/,
        // الگوی "فروش 65500 خرید 65000"
        /فروش[:\s]*(\d+)[^\d]*خرید[:\s]*(\d+)/i,
        // الگوی ساده - یک عدد
        /(\d{4,6})/g
      ];

      for (const pattern of patterns) {
        const match = cleanMessage.match(pattern);
        if (match) {
          if (match[2]) {
            // دو عدد پیدا شد (خرید و فروش)
            const rate1 = parseInt(match[1]);
            const rate2 = parseInt(match[2]);
            return {
              buyRate: Math.min(rate1, rate2),
              sellRate: Math.max(rate1, rate2)
            };
          } else if (match[1]) {
            // فقط یک عدد
            const rate = parseInt(match[1]);
            return { buyRate: rate, sellRate: rate };
          }
        }
      }

      // اگه همه الگوها فیل شد، تمام اعداد رو پیدا کن
      const allNumbers = cleanMessage.match(/\d{4,6}/g);
      if (allNumbers && allNumbers.length > 0) {
        const rates = allNumbers.map(n => parseInt(n)).filter(n => n > 10000 && n < 200000);
        if (rates.length >= 2) {
          return {
            buyRate: Math.min(...rates),
            sellRate: Math.max(...rates)
          };
        } else if (rates.length === 1) {
          return { buyRate: rates[0], sellRate: rates[0] };
        }
      }

      return null;
    } catch (error) {
      console.error('❌ خطا در پارس نرخ دلار:', error.message);
      return null;
    }
  }

  // پارس کردن نرخ طلا از پیام
  parseGoldRate(message) {
    try {
      const cleanMessage = message.replace(/,/g, '').replace(/٬/g, '');

      // الگوهای مختلف برای استخراج قیمت طلا (معمولاً میلیونی)
      const patterns = [
        // الگوی "طلا 18: 3,500,000"
        /طلا\s*18[:\s]*(\d+)/i,
        // الگوی "گرم 18 عیار: 3500000"
        /گرم\s*18[:\s]*(\d+)/i,
        // الگوی با حروف فارسی عدد
        /(\d{6,9})/g
      ];

      for (const pattern of patterns) {
        const match = cleanMessage.match(pattern);
        if (match && match[1]) {
          const rate = parseInt(match[1]);
          if (rate > 1000000 && rate < 100000000) {
            return { buyRate: rate, sellRate: rate };
          }
        }
      }

      // پیدا کردن اعداد بزرگ (طلا معمولاً میلیونی هست)
      const allNumbers = cleanMessage.match(/\d{6,9}/g);
      if (allNumbers && allNumbers.length > 0) {
        const rates = allNumbers.map(n => parseInt(n)).filter(n => n > 1000000 && n < 100000000);
        if (rates.length >= 2) {
          return {
            buyRate: Math.min(...rates),
            sellRate: Math.max(...rates)
          };
        } else if (rates.length === 1) {
          return { buyRate: rates[0], sellRate: rates[0] };
        }
      }

      return null;
    } catch (error) {
      console.error('❌ خطا در پارس نرخ طلا:', error.message);
      return null;
    }
  }

  // به‌روزرسانی نرخ ارز در دیتابیس
  async updateCurrencyRate(code, buyRate, sellRate, spread = { buy: 0, sell: 0 }) {
    try {
      // اعمال اسپرد
      const adjustedBuyRate = Math.round(buyRate * (1 - spread.buy / 100));
      const adjustedSellRate = Math.round(sellRate * (1 + spread.sell / 100));

      const currency = await Currency.findOneAndUpdate(
        { code },
        {
          buyRate: adjustedBuyRate,
          sellRate: adjustedSellRate,
          lastRateUpdate: new Date(),
          $push: {
            rateHistory: {
              $each: [{ buyRate: adjustedBuyRate, sellRate: adjustedSellRate, date: new Date() }],
              $slice: -100 // فقط 100 تای آخر
            }
          }
        },
        { new: true }
      );

      if (currency) {
        console.log(`✅ نرخ ${code} به‌روزرسانی شد: خرید ${adjustedBuyRate.toLocaleString()} - فروش ${adjustedSellRate.toLocaleString()}`);
      }

      return currency;
    } catch (error) {
      console.error(`❌ خطا در به‌روزرسانی نرخ ${code}:`, error.message);
      throw error;
    }
  }

  // به‌روزرسانی نرخ سایر ارزها بر اساس دلار
  async updateDerivedRates(usdBuyRate, usdSellRate, conversionRates, spread) {
    const currencies = [
      { code: 'EUR', factor: conversionRates.usdToEur },
      { code: 'GBP', factor: conversionRates.usdToGbp },
      { code: 'AED', factor: conversionRates.usdToAed },
      { code: 'CAD', factor: conversionRates.usdToCad },
      { code: 'TRY', factor: conversionRates.usdToTry }
    ];

    for (const { code, factor } of currencies) {
      if (factor && factor > 0) {
        // برای ارزهایی که ضریب کمتر از 1 دارن (مثل یورو)، تقسیم میکنیم
        // برای ارزهایی که ضریب بیشتر از 1 دارن (مثل درهم)، ضرب میکنیم
        let buyRate, sellRate;

        if (factor < 1) {
          // یورو، پوند: قیمت ریالی بالاتره
          buyRate = Math.round(usdBuyRate / factor);
          sellRate = Math.round(usdSellRate / factor);
        } else {
          // درهم، لیر: قیمت ریالی پایین‌تره
          buyRate = Math.round(usdBuyRate / factor);
          sellRate = Math.round(usdSellRate / factor);
        }

        await this.updateCurrencyRate(code, buyRate, sellRate, spread);
      }
    }
  }

  // اجرای کامل اسکرپر
  async run() {
    console.log('🔄 شروع به‌روزرسانی نرخ‌ها از تلگرام...');

    try {
      const settings = await Settings.getSettings();
      const scraperSettings = settings.rateScraperSettings;

      if (!scraperSettings?.enabled) {
        console.log('⏸️ اسکرپر غیرفعال است');
        return { success: false, message: 'اسکرپر غیرفعال است' };
      }

      if (!scraperSettings.telegramApiId || !scraperSettings.telegramApiHash) {
        throw new Error('API ID و API Hash تلگرام تنظیم نشده');
      }

      // اتصال به تلگرام
      if (!this.isConnected) {
        const connectResult = await this.connect(
          scraperSettings.telegramApiId,
          scraperSettings.telegramApiHash,
          scraperSettings.telegramSession || ''
        );

        if (!connectResult.success) {
          throw new Error(connectResult.error || 'خطا در اتصال به تلگرام');
        }
      }

      const spread = {
        buy: scraperSettings.buySpread || 0,
        sell: scraperSettings.sellSpread || 0
      };

      // خواندن و پارس نرخ دلار
      if (scraperSettings.dollarChannel) {
        const dollarMessage = await this.getLastMessage(scraperSettings.dollarChannel);
        if (dollarMessage) {
          console.log('📝 پیام دلار:', dollarMessage.substring(0, 100));
          const dollarRate = this.parseDollarRate(dollarMessage);

          if (dollarRate) {
            await this.updateCurrencyRate('USD', dollarRate.buyRate, dollarRate.sellRate, spread);

            // به‌روزرسانی سایر ارزها بر اساس دلار
            if (scraperSettings.conversionRates) {
              await this.updateDerivedRates(
                dollarRate.buyRate,
                dollarRate.sellRate,
                scraperSettings.conversionRates,
                spread
              );
            }
          } else {
            console.log('⚠️ نتوانستم نرخ دلار را از پیام استخراج کنم');
          }
        }
      }

      // خواندن و پارس نرخ طلا
      if (scraperSettings.goldChannel) {
        const goldMessage = await this.getLastMessage(scraperSettings.goldChannel);
        if (goldMessage) {
          console.log('📝 پیام طلا:', goldMessage.substring(0, 100));
          const goldRate = this.parseGoldRate(goldMessage);

          if (goldRate) {
            await this.updateCurrencyRate('GOLD', goldRate.buyRate, goldRate.sellRate, spread);
          } else {
            console.log('⚠️ نتوانستم نرخ طلا را از پیام استخراج کنم');
          }
        }
      }

      // ثبت زمان آخرین اجرا
      await Settings.findOneAndUpdate({}, {
        'rateScraperSettings.lastRun': new Date(),
        'rateScraperSettings.lastError': null
      });

      console.log('✅ به‌روزرسانی نرخ‌ها تمام شد');
      return { success: true };

    } catch (error) {
      console.error('❌ خطا در اسکرپر:', error.message);

      // ثبت خطا
      await Settings.findOneAndUpdate({}, {
        'rateScraperSettings.lastRun': new Date(),
        'rateScraperSettings.lastError': error.message
      });

      return { success: false, error: error.message };
    }
  }

  // قطع اتصال
  async disconnect() {
    if (this.client) {
      await this.client.disconnect();
      this.isConnected = false;
      console.log('🔌 اتصال تلگرام قطع شد');
    }
  }
}

// Singleton instance
const rateScraperService = new RateScraperService();
module.exports = rateScraperService;
