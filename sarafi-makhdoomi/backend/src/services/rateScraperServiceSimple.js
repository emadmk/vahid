const axios = require('axios');
const Settings = require('../models/Settings');
const Currency = require('../models/Currency');

class RateScraperServiceSimple {
  constructor() {
    this.baseUrl = 'https://t.me/s/';
  }

  // خواندن آخرین پیام از کانال عمومی تلگرام
  async getLastMessage(channelUsername) {
    try {
      const url = `${this.baseUrl}${channelUsername}`;
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 10000
      });

      const html = response.data;

      // استخراج پیام‌ها از HTML
      const messageRegex = /<div class="tgme_widget_message_text[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
      const messages = [];
      let match;

      while ((match = messageRegex.exec(html)) !== null) {
        // حذف تگ‌های HTML
        let text = match[1]
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&#(\d+);/g, (m, code) => String.fromCharCode(code))
          .trim();

        if (text) {
          messages.push(text);
        }
      }

      // برگرداندن آخرین پیام
      return messages.length > 0 ? messages[messages.length - 1] : null;
    } catch (error) {
      console.error(`❌ خطا در خواندن کانال ${channelUsername}:`, error.message);
      throw error;
    }
  }

  // پارس کردن نرخ دلار از پیام
  parseDollarRate(message) {
    try {
      // تبدیل اعداد فارسی به انگلیسی
      const persianToEnglish = (str) => {
        const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        return str.replace(/[۰-۹]/g, (d) => persianDigits.indexOf(d));
      };

      let cleanMessage = persianToEnglish(message);
      cleanMessage = cleanMessage.replace(/,/g, '').replace(/٬/g, '').replace(/،/g, '');

      console.log('🔍 پیام پاکسازی شده:', cleanMessage);

      // الگوهای مختلف برای استخراج قیمت دلار (5-6 رقمی)
      const patterns = [
        // الگوی "خرید: 65000 فروش: 65500"
        /خرید[:\s]*(\d{5,6})[^\d]*فروش[:\s]*(\d{5,6})/i,
        // الگوی "فروش: 65500 خرید: 65000"
        /فروش[:\s]*(\d{5,6})[^\d]*خرید[:\s]*(\d{5,6})/i,
        // الگوی "135000 فروش" - عدد قبل از فروش
        /(\d{5,6})\s*فروش/i,
        // الگوی "135000 خرید" - عدد قبل از خرید
        /(\d{5,6})\s*خرید/i,
        // الگوی "65000 - 65500" یا "65000/65500"
        /(\d{5,6})\s*[-–\/]\s*(\d{5,6})/,
        // الگوی "دلار 65000"
        /دلار[:\s]*(\d{5,6})/i,
        // الگوی ساده - اعداد 5-6 رقمی در محدوده قیمت دلار
        /\b(\d{5,6})\b/g
      ];

      for (const pattern of patterns) {
        const match = cleanMessage.match(pattern);
        if (match) {
          console.log('✅ الگو مطابقت داد:', pattern, 'نتیجه:', match);
          if (match[2]) {
            const rate1 = parseInt(match[1]);
            const rate2 = parseInt(match[2]);
            // اعتبارسنجی محدوده نرخ دلار
            if (rate1 > 30000 && rate1 < 200000 && rate2 > 30000 && rate2 < 200000) {
              return {
                buyRate: Math.min(rate1, rate2),
                sellRate: Math.max(rate1, rate2)
              };
            }
          } else if (match[1]) {
            const rate = parseInt(match[1]);
            if (rate > 30000 && rate < 200000) {
              return { buyRate: rate, sellRate: rate };
            }
          }
        }
      }

      // پیدا کردن همه اعداد 5-6 رقمی
      const allNumbers = cleanMessage.match(/\b\d{5,6}\b/g);
      console.log('🔢 اعداد پیدا شده:', allNumbers);
      if (allNumbers && allNumbers.length > 0) {
        const validRates = allNumbers
          .map(n => parseInt(n))
          .filter(n => n > 30000 && n < 200000);

        console.log('✅ نرخ‌های معتبر:', validRates);

        if (validRates.length >= 2) {
          return {
            buyRate: Math.min(...validRates),
            sellRate: Math.max(...validRates)
          };
        } else if (validRates.length === 1) {
          return { buyRate: validRates[0], sellRate: validRates[0] };
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
      const persianToEnglish = (str) => {
        const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        return str.replace(/[۰-۹]/g, (d) => persianDigits.indexOf(d));
      };

      let cleanMessage = persianToEnglish(message);
      cleanMessage = cleanMessage.replace(/,/g, '').replace(/٬/g, '').replace(/،/g, '');

      // الگوهای مختلف برای استخراج قیمت طلا (معمولاً 7-8 رقمی برای گرمی)
      const patterns = [
        // الگوی "طلا 18 عیار: 3500000"
        /طلا[^0-9]*18[^0-9]*عیار[:\s]*(\d{6,9})/i,
        // الگوی "گرم 18: 3500000"
        /گرم[^0-9]*18[:\s]*(\d{6,9})/i,
        // الگوی "18 عیار: 3500000"
        /18\s*عیار[:\s]*(\d{6,9})/i,
        // اعداد 7-8 رقمی (نرخ طلا)
        /\b(\d{7,8})\b/g
      ];

      for (const pattern of patterns) {
        const match = cleanMessage.match(pattern);
        if (match && match[1]) {
          const rate = parseInt(match[1]);
          // اعتبارسنجی محدوده نرخ طلا (حدود 2-10 میلیون)
          if (rate > 2000000 && rate < 15000000) {
            return { buyRate: rate, sellRate: rate };
          }
        }
      }

      // پیدا کردن اعداد 7-8 رقمی
      const allNumbers = cleanMessage.match(/\b\d{7,8}\b/g);
      if (allNumbers && allNumbers.length > 0) {
        const validRates = allNumbers
          .map(n => parseInt(n))
          .filter(n => n > 2000000 && n < 15000000);

        if (validRates.length >= 2) {
          return {
            buyRate: Math.min(...validRates),
            sellRate: Math.max(...validRates)
          };
        } else if (validRates.length === 1) {
          return { buyRate: validRates[0], sellRate: validRates[0] };
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
              $slice: -100
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
      { code: 'EUR', factor: conversionRates?.usdToEur || 0.92 },
      { code: 'GBP', factor: conversionRates?.usdToGbp || 0.79 },
      { code: 'AED', factor: conversionRates?.usdToAed || 3.67 },
      { code: 'CAD', factor: conversionRates?.usdToCad || 1.36 },
      { code: 'TRY', factor: conversionRates?.usdToTry || 32.5 }
    ];

    for (const { code, factor } of currencies) {
      if (factor && factor > 0) {
        const buyRate = Math.round(usdBuyRate / factor);
        const sellRate = Math.round(usdSellRate / factor);
        await this.updateCurrencyRate(code, buyRate, sellRate, spread);
      }
    }
  }

  // اجرای کامل اسکرپر
  async run() {
    console.log('🔄 شروع به‌روزرسانی نرخ‌ها از تلگرام (روش ساده)...');

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

      let dollarUpdated = false;
      let goldUpdated = false;

      // خواندن و پارس نرخ دلار
      if (scraperSettings.dollarChannel) {
        try {
          const dollarMessage = await this.getLastMessage(scraperSettings.dollarChannel);
          if (dollarMessage) {
            console.log('📝 پیام دلار:', dollarMessage.substring(0, 100));
            const dollarRate = this.parseDollarRate(dollarMessage);

            if (dollarRate) {
              await this.updateCurrencyRate('USD', dollarRate.buyRate, dollarRate.sellRate, spread);
              dollarUpdated = true;

              // به‌روزرسانی سایر ارزها
              if (scraperSettings.conversionRates) {
                await this.updateDerivedRates(
                  dollarRate.buyRate,
                  dollarRate.sellRate,
                  scraperSettings.conversionRates,
                  spread
                );
              }
            } else {
              console.log('⚠️ نتوانستم نرخ دلار را استخراج کنم');
            }
          }
        } catch (e) {
          console.error('❌ خطا در خواندن کانال دلار:', e.message);
        }
      }

      // خواندن و پارس نرخ طلا
      if (scraperSettings.goldChannel) {
        try {
          const goldMessage = await this.getLastMessage(scraperSettings.goldChannel);
          if (goldMessage) {
            console.log('📝 پیام طلا:', goldMessage.substring(0, 100));
            const goldRate = this.parseGoldRate(goldMessage);

            if (goldRate) {
              // کد طلا رو چک کن - ممکنه GOLD یا GOLD18 باشه
              await this.updateCurrencyRate('GOLD18', goldRate.buyRate, goldRate.sellRate, spread);
              goldUpdated = true;
            } else {
              console.log('⚠️ نتوانستم نرخ طلا را استخراج کنم');
            }
          }
        } catch (e) {
          console.error('❌ خطا در خواندن کانال طلا:', e.message);
        }
      }

      // ثبت زمان آخرین اجرا
      await Settings.findOneAndUpdate({}, {
        'rateScraperSettings.lastRun': new Date(),
        'rateScraperSettings.lastError': dollarUpdated || goldUpdated ? null : 'نرخی استخراج نشد'
      });

      console.log('✅ به‌روزرسانی نرخ‌ها تمام شد');
      return {
        success: true,
        dollarUpdated,
        goldUpdated
      };

    } catch (error) {
      console.error('❌ خطا در اسکرپر:', error.message);

      await Settings.findOneAndUpdate({}, {
        'rateScraperSettings.lastRun': new Date(),
        'rateScraperSettings.lastError': error.message
      });

      return { success: false, error: error.message };
    }
  }
}

const rateScraperServiceSimple = new RateScraperServiceSimple();
module.exports = rateScraperServiceSimple;
