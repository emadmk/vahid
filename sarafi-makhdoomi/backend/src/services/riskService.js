/**
 * Risk Service - سرویس مدیریت ریسک
 * شامل: Pre-Trade Risk Check, Circuit Breaker, Exposure Limit
 */

const Settings = require('../models/Settings');
const User = require('../models/User');
const Order = require('../models/Order');
const Trade = require('../models/Trade');
const Currency = require('../models/Currency');

class RiskService {
  /**
   * Pre-Trade Risk Check - بررسی قبل از ثبت سفارش
   * @param {Object} params - پارامترهای بررسی
   * @returns {Object} - نتیجه بررسی
   */
  async performPreTradeCheck({ customerId, sarafiId, currencyId, amount, totalAmount, orderType }) {
    const settings = await Settings.getSettings();
    const riskSettings = settings.riskSettings || {};
    const preTrade = riskSettings.preTrade || {};

    if (!preTrade.enabled) {
      return { passed: true, checks: {} };
    }

    const customer = await User.findById(customerId);
    if (!customer) {
      return { passed: false, reason: 'مشتری یافت نشد', checks: {} };
    }

    const checks = {
      customerLimit: true,
      blackPointCheck: true,
      volatilityCheck: true,
      exposureCheck: true
    };
    const failures = [];

    // 1. بررسی سقف مجاز مشتری
    if (preTrade.checkCustomerLimit) {
      const customerLimit = await this.getCustomerLimit(customerId);
      if (totalAmount > customerLimit) {
        checks.customerLimit = false;
        failures.push(`سقف مجاز مشتری (${customerLimit.toLocaleString()} ریال)`);
      }
    }

    // 2. بررسی بلک‌پوینت
    if (preTrade.checkBlackPoints) {
      const maxBlackPoints = preTrade.maxBlackPoints || 100;
      if (customer.blackPoints > maxBlackPoints) {
        checks.blackPointCheck = false;
        failures.push(`بلک‌پوینت بالا (${customer.blackPoints})`);
      }
    }

    // 3. بررسی نوسان بازار
    if (preTrade.checkVolatility) {
      const volatilityCheck = await this.checkMarketVolatility(currencyId);
      if (!volatilityCheck.isStable) {
        checks.volatilityCheck = false;
        failures.push(`نوسان شدید بازار (${volatilityCheck.changePercent.toFixed(2)}%)`);
      }
    }

    // 4. بررسی Exposure صراف
    if (preTrade.checkExposure) {
      const exposureCheck = await this.checkExposureLimit(sarafiId, currencyId, totalAmount);
      if (!exposureCheck.withinLimit) {
        checks.exposureCheck = false;
        failures.push(`عبور از سقف تعهد صراف`);
      }
    }

    const passed = Object.values(checks).every(v => v);

    return {
      passed,
      checks,
      failures,
      reason: failures.length > 0 ? failures.join('، ') : null,
      customer: {
        tier: customer.tier,
        score: customer.score,
        blackPoints: customer.blackPoints,
        healthIndicator: customer.healthIndicator
      }
    };
  }

  /**
   * دریافت سقف مجاز مشتری بر اساس Tier
   */
  async getCustomerLimit(customerId) {
    const customer = await User.findById(customerId);
    if (!customer) return 0;

    // سقف بر اساس Tier
    const tierLimits = {
      'A': 50000000000,   // 50 میلیارد ریال
      'B': 20000000000,   // 20 میلیارد ریال
      'C': 5000000000,    // 5 میلیارد ریال
      'new': 1000000000   // 1 میلیارد ریال
    };

    return tierLimits[customer.tier] || tierLimits.new;
  }

  /**
   * بررسی نوسان بازار
   */
  async checkMarketVolatility(currencyId) {
    const settings = await Settings.getSettings();
    const circuitBreaker = settings.riskSettings?.circuitBreaker || {};

    if (!circuitBreaker.enabled) {
      return { isStable: true, changePercent: 0 };
    }

    // بررسی Circuit Breaker فعال
    if (circuitBreaker.isTriggered) {
      const triggeredAt = new Date(circuitBreaker.triggeredAt);
      const freezeDuration = (circuitBreaker.freezeDuration || 30) * 1000;

      if (Date.now() - triggeredAt.getTime() < freezeDuration) {
        return {
          isStable: false,
          changePercent: circuitBreaker.priceChangeThreshold,
          reason: 'Circuit Breaker فعال است',
          resumeAt: new Date(triggeredAt.getTime() + freezeDuration)
        };
      }
    }

    // بررسی تغییرات قیمت اخیر
    const currency = await Currency.findById(currencyId);
    if (!currency) {
      return { isStable: true, changePercent: 0 };
    }

    const timeWindow = (circuitBreaker.timeWindow || 60) * 1000;
    const threshold = circuitBreaker.priceChangeThreshold || 5;

    // محاسبه تغییر قیمت
    const priceHistory = currency.priceHistory || [];
    const recentPrices = priceHistory.filter(p =>
      Date.now() - new Date(p.timestamp).getTime() < timeWindow
    );

    if (recentPrices.length < 2) {
      return { isStable: true, changePercent: 0 };
    }

    const prices = recentPrices.map(p => p.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const changePercent = ((maxPrice - minPrice) / minPrice) * 100;

    const isStable = changePercent < threshold;

    // فعال‌سازی Circuit Breaker اگر نوسان شدید
    if (!isStable) {
      await this.triggerCircuitBreaker(currencyId, changePercent);
    }

    return {
      isStable,
      changePercent,
      threshold,
      minPrice,
      maxPrice
    };
  }

  /**
   * فعال‌سازی Circuit Breaker
   */
  async triggerCircuitBreaker(currencyId, changePercent) {
    const settings = await Settings.getSettings();

    settings.riskSettings.circuitBreaker.isTriggered = true;
    settings.riskSettings.circuitBreaker.triggeredAt = new Date();
    settings.riskSettings.circuitBreaker.triggeredCurrency = currencyId;

    await settings.save();

    // ثبت لاگ
    console.log(`[CIRCUIT BREAKER] Triggered for currency ${currencyId}, change: ${changePercent.toFixed(2)}%`);

    return {
      triggered: true,
      currencyId,
      changePercent,
      freezeDuration: settings.riskSettings.circuitBreaker.freezeDuration
    };
  }

  /**
   * بررسی سقف Exposure صراف
   */
  async checkExposureLimit(sarafiId, currencyId, additionalAmount) {
    const settings = await Settings.getSettings();
    const exposureSettings = settings.riskSettings?.exposureLimit || {};

    if (!exposureSettings.enabled) {
      return { withinLimit: true, currentExposure: 0 };
    }

    // محاسبه تعهد باز فعلی صراف
    const openOrders = await Order.find({
      sarafi: sarafiId,
      status: { $in: ['open', 'partially_filled', 'pending'] }
    });

    let totalExposure = 0;
    let currencyExposure = 0;

    for (const order of openOrders) {
      const orderValue = order.remainingAmount * (order.price || order.finalPrice || 0);
      totalExposure += orderValue;

      if (order.currency.toString() === currencyId.toString()) {
        currencyExposure += orderValue;
      }
    }

    // بررسی سقف کل
    const maxTotal = exposureSettings.maxTotalExposure || 100000000000;
    const withinTotalLimit = (totalExposure + additionalAmount) <= maxTotal;

    // بررسی سقف ارز خاص
    const currencyLimits = exposureSettings.maxCurrencyExposure || {};
    const maxCurrency = currencyLimits[currencyId] || maxTotal;
    const withinCurrencyLimit = (currencyExposure + additionalAmount) <= maxCurrency;

    return {
      withinLimit: withinTotalLimit && withinCurrencyLimit,
      currentExposure: totalExposure,
      currencyExposure,
      maxTotalExposure: maxTotal,
      maxCurrencyExposure: maxCurrency,
      remainingTotal: maxTotal - totalExposure,
      remainingCurrency: maxCurrency - currencyExposure,
      action: exposureSettings.actionOnLimit || 'block_new_orders'
    };
  }

  /**
   * بررسی وضعیت Session بازار
   */
  async checkMarketSession() {
    const settings = await Settings.getSettings();
    const session = settings.sessionSettings || {};

    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const currentDay = now.getDay();

    // بررسی روز کاری
    const workingDays = session.workingDays || [0, 1, 2, 3, 4, 5];
    if (!workingDays.includes(currentDay)) {
      return {
        isOpen: false,
        reason: 'روز غیرکاری',
        nextOpen: this.getNextWorkingDay(workingDays)
      };
    }

    // بررسی تعطیلات
    const holidays = session.holidays || [];
    const todayStr = now.toISOString().split('T')[0];
    const isHoliday = holidays.some(h =>
      new Date(h.date).toISOString().split('T')[0] === todayStr
    );
    if (isHoliday) {
      return {
        isOpen: false,
        reason: 'تعطیل رسمی'
      };
    }

    // بررسی ساعت کاری
    const openTime = session.marketOpenTime || '08:00';
    const closeTime = session.marketCloseTime || '18:00';
    const cutoff = session.settlementCutoff || '16:00';

    const isOpen = currentTime >= openTime && currentTime <= closeTime;
    const isBeforeCutoff = currentTime < cutoff;

    return {
      isOpen,
      currentTime,
      openTime,
      closeTime,
      cutoff,
      isBeforeCutoff,
      settlementType: session.settlementType || 'T+0',
      willSettleToday: isOpen && isBeforeCutoff
    };
  }

  getNextWorkingDay(workingDays) {
    const now = new Date();
    let nextDay = now.getDay() + 1;

    for (let i = 0; i < 7; i++) {
      if (workingDays.includes(nextDay % 7)) {
        const result = new Date(now);
        result.setDate(result.getDate() + i + 1);
        return result;
      }
      nextDay++;
    }

    return null;
  }

  /**
   * محاسبه VWAP (Volume Weighted Average Price)
   */
  async calculateVWAP(currencyId, period = 'day') {
    let startDate;
    const now = new Date();

    switch (period) {
      case 'day':
        startDate = new Date(now.setHours(0, 0, 0, 0));
        break;
      case 'week':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case 'month':
        startDate = new Date(now.setMonth(now.getMonth() - 1));
        break;
      default:
        startDate = new Date(now.setHours(0, 0, 0, 0));
    }

    const trades = await Trade.find({
      currency: currencyId,
      status: 'completed',
      createdAt: { $gte: startDate }
    });

    if (trades.length === 0) {
      return { vwap: 0, totalVolume: 0, tradeCount: 0 };
    }

    let totalVolumePrice = 0;
    let totalVolume = 0;

    for (const trade of trades) {
      const volume = trade.amount;
      const price = trade.rate;
      totalVolumePrice += volume * price;
      totalVolume += volume;
    }

    const vwap = totalVolume > 0 ? totalVolumePrice / totalVolume : 0;

    return {
      vwap,
      totalVolume,
      tradeCount: trades.length,
      period,
      startDate
    };
  }

  /**
   * دریافت خلاصه وضعیت ریسک صراف
   */
  async getSarafiRiskSummary(sarafiId) {
    try {
      // دریافت exposure با مقادیر پیش‌فرض
      let exposure = { currentExposure: 0, maxTotalExposure: 100000000000, remainingTotal: 100000000000 };
      try {
        exposure = await this.checkExposureLimit(sarafiId, null, 0);
      } catch (e) {
        console.log('Exposure check skipped:', e.message);
      }

      // دریافت session
      let session = { isOpen: true, isBeforeCutoff: true };
      try {
        session = await this.checkMarketSession();
      } catch (e) {
        console.log('Session check skipped:', e.message);
      }

      // دریافت تنظیمات
      let settings = { riskSettings: {} };
      try {
        settings = await Settings.getSettings();
      } catch (e) {
        console.log('Settings fetch skipped:', e.message);
      }

      // تعداد سفارش‌های باز
      let openOrdersCount = 0;
      try {
        openOrdersCount = await Order.countDocuments({
          sarafi: sarafiId,
          status: { $in: ['open', 'partially_filled', 'pending', 'active'] }
        });
      } catch (e) {
        console.log('Order count skipped:', e.message);
      }

      // مشتریان پرریسک
      let highRiskCustomers = 0;
      try {
        highRiskCustomers = await User.countDocuments({
          selectedSarafi: sarafiId,
          role: { $in: ['user', 'customer'] },
          blackPoints: { $gt: 50 }
        });
      } catch (e) {
        console.log('High risk customer count skipped:', e.message);
      }

      const maxExposure = exposure.maxTotalExposure || 100000000000;
      const currentExposure = exposure.currentExposure || 0;

      return {
        exposure: {
          current: currentExposure,
          max: maxExposure,
          percentage: maxExposure > 0 ? (currentExposure / maxExposure) * 100 : 0,
          remaining: exposure.remainingTotal || (maxExposure - currentExposure)
        },
        session,
        circuitBreaker: settings.riskSettings?.circuitBreaker || { enabled: false },
        openOrders: openOrdersCount,
        highRiskCustomers,
        alerts: this.generateRiskAlerts({
          exposure: { ...exposure, maxTotalExposure: maxExposure, currentExposure },
          session,
          openOrdersCount,
          highRiskCustomers
        })
      };
    } catch (error) {
      console.error('Risk summary error:', error);
      // برگرداندن مقادیر پیش‌فرض در صورت خطا
      return {
        exposure: { current: 0, max: 100000000000, percentage: 0, remaining: 100000000000 },
        session: { isOpen: true, isBeforeCutoff: true },
        circuitBreaker: { enabled: false },
        openOrders: 0,
        highRiskCustomers: 0,
        alerts: []
      };
    }
  }

  /**
   * تولید هشدارهای ریسک
   */
  generateRiskAlerts({ exposure, session, openOrdersCount, highRiskCustomers }) {
    const alerts = [];

    // هشدار Exposure بالا
    const exposurePercent = (exposure.currentExposure / exposure.maxTotalExposure) * 100;
    if (exposurePercent > 90) {
      alerts.push({
        type: 'danger',
        title: 'سقف تعهد',
        message: `تعهد باز به ${exposurePercent.toFixed(1)}% سقف مجاز رسیده است`
      });
    } else if (exposurePercent > 70) {
      alerts.push({
        type: 'warning',
        title: 'سقف تعهد',
        message: `تعهد باز ${exposurePercent.toFixed(1)}% سقف مجاز است`
      });
    }

    // هشدار Cut-Off
    if (session.isOpen && !session.isBeforeCutoff) {
      alerts.push({
        type: 'warning',
        title: 'Cut-Off',
        message: 'زمان Cut-Off گذشته، سفارش‌های جدید به روز بعد موکول می‌شوند'
      });
    }

    // هشدار تعطیلی بازار
    if (!session.isOpen) {
      alerts.push({
        type: 'info',
        title: 'وضعیت بازار',
        message: session.reason || 'بازار بسته است'
      });
    }

    // هشدار مشتریان پرریسک
    if (highRiskCustomers > 0) {
      alerts.push({
        type: 'warning',
        title: 'مشتریان پرریسک',
        message: `${highRiskCustomers} مشتری پرریسک دارید`
      });
    }

    return alerts;
  }
}

module.exports = new RiskService();
