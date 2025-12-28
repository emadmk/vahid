/**
 * Alert Service - سرویس هشدارها و اعلان‌ها
 * الهام از Institutional Trading
 */

const Notification = require('../models/Notification');
const User = require('../models/User');
const Settings = require('../models/Settings');

class AlertService {
  /**
   * انواع هشدارها
   */
  static ALERT_TYPES = {
    EXPOSURE_WARNING: 'exposure_warning',        // عبور از سقف تعهد
    EXPOSURE_CRITICAL: 'exposure_critical',      // نزدیک به سقف تعهد
    VOLATILITY_HIGH: 'volatility_high',          // نوسان شدید
    CIRCUIT_BREAKER: 'circuit_breaker',          // فعال شدن Circuit Breaker
    SETTLEMENT_DELAY: 'settlement_delay',        // تأخیر در وصول
    CUSTOMER_RISK: 'customer_risk',              // مشتری پرریسک
    CANCEL_FREQUENT: 'cancel_frequent',          // کنسلی مکرر
    CUTOFF_NEAR: 'cutoff_near',                 // نزدیک به Cut-Off
    ORDER_MATCHED: 'order_matched',              // سفارش Match شد
    ORDER_EXPIRED: 'order_expired',              // سفارش منقضی شد
    WALLET_LOW: 'wallet_low',                   // موجودی کم
    CREDIT_LIMIT: 'credit_limit',               // نزدیک به سقف اعتبار
    PRICE_ALERT: 'price_alert',                 // هشدار قیمت
    NEW_CUSTOMER: 'new_customer',               // مشتری جدید
    TRADE_COMPLETED: 'trade_completed',         // معامله تکمیل شد
    COLLECTION_PENDING: 'collection_pending'    // وصول در انتظار
  };

  /**
   * ایجاد هشدار جدید
   */
  async createAlert({
    userId,
    type,
    title,
    message,
    severity = 'info',  // info, warning, danger
    data = {},
    expiresAt = null
  }) {
    const notification = await Notification.create({
      user: userId,
      type,
      title,
      message,
      severity,
      data,
      expiresAt,
      isRead: false,
      createdAt: new Date()
    });

    // ارسال اعلان Real-time (اگر Socket.io موجود باشد)
    this.emitRealTimeAlert(userId, notification);

    return notification;
  }

  /**
   * ارسال هشدار به تمام کارکنان صرافی
   */
  async alertSarafiStaff(sarafiId, alertData) {
    const SarafiStaff = require('../models/SarafiStaff');
    const staffMembers = await SarafiStaff.find({
      sarafi: sarafiId,
      isActive: true
    }).populate('user');

    const alerts = [];
    for (const staff of staffMembers) {
      if (staff.user) {
        const alert = await this.createAlert({
          userId: staff.user._id,
          ...alertData
        });
        alerts.push(alert);
      }
    }

    // همچنین به خود صراف
    const sarafiAlert = await this.createAlert({
      userId: sarafiId,
      ...alertData
    });
    alerts.push(sarafiAlert);

    return alerts;
  }

  /**
   * هشدار عبور از سقف تعهد
   */
  async alertExposureLimit(sarafiId, exposureData) {
    const { currentExposure, maxExposure, percentage } = exposureData;

    let severity = 'info';
    let type = AlertService.ALERT_TYPES.EXPOSURE_WARNING;

    if (percentage >= 90) {
      severity = 'danger';
      type = AlertService.ALERT_TYPES.EXPOSURE_CRITICAL;
    } else if (percentage >= 70) {
      severity = 'warning';
    }

    return this.alertSarafiStaff(sarafiId, {
      type,
      title: 'هشدار سقف تعهد',
      message: `تعهد باز به ${percentage.toFixed(1)}% سقف مجاز رسیده است (${currentExposure.toLocaleString()} از ${maxExposure.toLocaleString()} ریال)`,
      severity,
      data: exposureData
    });
  }

  /**
   * هشدار نوسان شدید
   */
  async alertHighVolatility(sarafiId, volatilityData) {
    const { currencyCode, changePercent, threshold } = volatilityData;

    return this.alertSarafiStaff(sarafiId, {
      type: AlertService.ALERT_TYPES.VOLATILITY_HIGH,
      title: 'هشدار نوسان شدید',
      message: `قیمت ${currencyCode} با ${changePercent.toFixed(2)}% تغییر (بالاتر از آستانه ${threshold}%)`,
      severity: 'warning',
      data: volatilityData
    });
  }

  /**
   * هشدار Circuit Breaker
   */
  async alertCircuitBreaker(sarafiId, breakerData) {
    const { currencyCode, freezeDuration, triggeredAt } = breakerData;

    return this.alertSarafiStaff(sarafiId, {
      type: AlertService.ALERT_TYPES.CIRCUIT_BREAKER,
      title: 'Circuit Breaker فعال شد',
      message: `بازار ${currencyCode} برای ${freezeDuration} ثانیه متوقف شد`,
      severity: 'danger',
      data: breakerData
    });
  }

  /**
   * هشدار تأخیر در وصول
   */
  async alertSettlementDelay(sarafiId, settlementData) {
    const { tradeId, customerName, amount, dueDate } = settlementData;

    return this.alertSarafiStaff(sarafiId, {
      type: AlertService.ALERT_TYPES.SETTLEMENT_DELAY,
      title: 'تأخیر در وصول',
      message: `وصول ${amount.toLocaleString()} ریال از ${customerName} به تأخیر افتاده (سررسید: ${dueDate})`,
      severity: 'warning',
      data: settlementData
    });
  }

  /**
   * هشدار مشتری پرریسک
   */
  async alertCustomerRisk(sarafiId, customerData) {
    const { customerId, customerName, blackPoints, healthIndicator } = customerData;

    return this.alertSarafiStaff(sarafiId, {
      type: AlertService.ALERT_TYPES.CUSTOMER_RISK,
      title: 'مشتری پرریسک',
      message: `${customerName} با ${blackPoints} بلک‌پوینت در وضعیت ${healthIndicator.label}`,
      severity: healthIndicator.status === 'red' ? 'danger' : 'warning',
      data: customerData
    });
  }

  /**
   * هشدار کنسلی مکرر
   */
  async alertFrequentCancellation(sarafiId, customerData) {
    const { customerId, customerName, cancellationCount, cancellationRate } = customerData;

    return this.alertSarafiStaff(sarafiId, {
      type: AlertService.ALERT_TYPES.CANCEL_FREQUENT,
      title: 'کنسلی مکرر',
      message: `${customerName} با ${cancellationCount} کنسلی (نرخ ${(cancellationRate * 100).toFixed(1)}%)`,
      severity: 'warning',
      data: customerData
    });
  }

  /**
   * هشدار نزدیک به Cut-Off
   */
  async alertCutoffNear(sarafiId, cutoffData) {
    const { cutoffTime, remainingMinutes } = cutoffData;

    return this.alertSarafiStaff(sarafiId, {
      type: AlertService.ALERT_TYPES.CUTOFF_NEAR,
      title: 'نزدیک به Cut-Off',
      message: `${remainingMinutes} دقیقه تا Cut-Off تسویه (ساعت ${cutoffTime})`,
      severity: 'info',
      data: cutoffData
    });
  }

  /**
   * هشدار Match شدن سفارش
   */
  async alertOrderMatched(userId, orderData) {
    const { orderId, orderNumber, amount, price, currencyCode } = orderData;

    return this.createAlert({
      userId,
      type: AlertService.ALERT_TYPES.ORDER_MATCHED,
      title: 'سفارش Match شد',
      message: `سفارش ${orderNumber}: ${amount} ${currencyCode} با قیمت ${price.toLocaleString()} ریال`,
      severity: 'info',
      data: orderData
    });
  }

  /**
   * هشدار منقضی شدن سفارش
   */
  async alertOrderExpired(userId, orderData) {
    const { orderId, orderNumber, amount, currencyCode } = orderData;

    return this.createAlert({
      userId,
      type: AlertService.ALERT_TYPES.ORDER_EXPIRED,
      title: 'سفارش منقضی شد',
      message: `سفارش ${orderNumber}: ${amount} ${currencyCode} منقضی شد`,
      severity: 'warning',
      data: orderData
    });
  }

  /**
   * هشدار موجودی کم
   */
  async alertLowWallet(userId, walletData) {
    const { walletType, balance, threshold } = walletData;
    const walletLabel = walletType === 'cash' ? 'نقدی' : 'اعتباری';

    return this.createAlert({
      userId,
      type: AlertService.ALERT_TYPES.WALLET_LOW,
      title: 'موجودی کم',
      message: `موجودی کیف پول ${walletLabel} به ${balance.toLocaleString()} ریال رسیده است`,
      severity: 'warning',
      data: walletData
    });
  }

  /**
   * هشدار قیمت
   */
  async alertPriceTarget(userId, priceData) {
    const { currencyCode, targetPrice, currentPrice, direction } = priceData;
    const directionLabel = direction === 'above' ? 'بالاتر از' : 'پایین‌تر از';

    return this.createAlert({
      userId,
      type: AlertService.ALERT_TYPES.PRICE_ALERT,
      title: 'هشدار قیمت',
      message: `قیمت ${currencyCode} (${currentPrice.toLocaleString()}) ${directionLabel} هدف شما (${targetPrice.toLocaleString()})`,
      severity: 'info',
      data: priceData
    });
  }

  /**
   * هشدار مشتری جدید
   */
  async alertNewCustomer(sarafiId, customerData) {
    const { customerId, customerName } = customerData;

    return this.alertSarafiStaff(sarafiId, {
      type: AlertService.ALERT_TYPES.NEW_CUSTOMER,
      title: 'مشتری جدید',
      message: `${customerName} ثبت‌نام کرده و در انتظار تأیید است`,
      severity: 'info',
      data: customerData
    });
  }

  /**
   * دریافت هشدارهای خوانده نشده
   */
  async getUnreadAlerts(userId, limit = 20) {
    return Notification.find({
      user: userId,
      isRead: false,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(limit);
  }

  /**
   * علامت‌گذاری به عنوان خوانده شده
   */
  async markAsRead(notificationId, userId) {
    return Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
  }

  /**
   * علامت‌گذاری همه به عنوان خوانده شده
   */
  async markAllAsRead(userId) {
    return Notification.updateMany(
      { user: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
  }

  /**
   * حذف هشدارهای قدیمی
   */
  async cleanupOldAlerts(daysOld = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    return Notification.deleteMany({
      createdAt: { $lt: cutoffDate },
      isRead: true
    });
  }

  /**
   * ارسال هشدار Real-time (Placeholder برای Socket.io)
   */
  emitRealTimeAlert(userId, notification) {
    // این متد بعداً با Socket.io پیاده‌سازی می‌شود
    // global.io?.to(userId.toString()).emit('newAlert', notification);
    console.log(`[ALERT] User ${userId}: ${notification.title} - ${notification.message}`);
  }

  /**
   * دریافت خلاصه هشدارها
   */
  async getAlertsSummary(userId) {
    const unreadCount = await Notification.countDocuments({
      user: userId,
      isRead: false
    });

    const bySeverity = await Notification.aggregate([
      { $match: { user: userId, isRead: false } },
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]);

    return {
      unreadCount,
      bySeverity: {
        danger: bySeverity.find(s => s._id === 'danger')?.count || 0,
        warning: bySeverity.find(s => s._id === 'warning')?.count || 0,
        info: bySeverity.find(s => s._id === 'info')?.count || 0
      }
    };
  }
}

module.exports = new AlertService();
