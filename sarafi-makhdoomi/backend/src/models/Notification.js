const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // کاربر دریافت‌کننده
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // عنوان
  title: {
    type: String,
    required: true
  },

  // متن
  message: {
    type: String,
    required: true
  },

  // نوع اعلان
  type: {
    type: String,
    enum: [
      // درخواست‌ها
      'request_new',           // درخواست جدید
      'request_accepted',      // درخواست پذیرفته شد
      'request_rejected',      // درخواست رد شد
      'request_completed',     // درخواست تکمیل شد
      'request_public',        // درخواست عمومی شد
      'request_private',       // درخواست خصوصی شد
      // کاربران
      'user_approved',         // کاربر تایید شد
      'user_rejected',         // کاربر رد شد
      'sarafi_approved',       // صراف تایید شد
      'new_customer',          // مشتری جدید
      // سیستم
      'timer_warning',         // هشدار تایمر
      'system',                // سیستمی
      'admin',                 // از طرف ادمین
      // ========== هشدارهای ریسک ==========
      'exposure_warning',      // هشدار سقف تعهد
      'exposure_critical',     // بحران سقف تعهد
      'volatility_high',       // نوسان شدید
      'circuit_breaker',       // Circuit Breaker
      'settlement_delay',      // تأخیر وصول
      'customer_risk',         // مشتری پرریسک
      'cancel_frequent',       // کنسلی مکرر
      'cutoff_near',          // نزدیک Cut-Off
      // ========== سفارش‌ها ==========
      'order_matched',         // سفارش Match شد
      'order_expired',         // سفارش منقضی شد
      'order_cancelled',       // سفارش لغو شد
      // ========== کیف پول ==========
      'wallet_low',            // موجودی کم
      'credit_limit',          // نزدیک سقف اعتبار
      'wallet_charged',        // شارژ کیف پول
      // ========== قیمت ==========
      'price_alert',           // هشدار قیمت
      // ========== معاملات ==========
      'trade_new',             // معامله جدید
      'trade_approved',        // معامله تایید شد
      'trade_rejected',        // معامله رد شد
      'trade_completed',       // معامله تکمیل شد
      'trade_pending_accounting', // در انتظار حسابداری
      'collection_pending'     // وصول در انتظار
    ],
    default: 'system'
  },

  // شدت هشدار
  severity: {
    type: String,
    enum: ['info', 'warning', 'danger'],
    default: 'info'
  },

  // داده‌های اضافی
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },

  // زمان انقضا
  expiresAt: {
    type: Date
  },

  // لینک مرتبط
  link: String,

  // درخواست مرتبط
  request: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request'
  },

  // خوانده شده
  isRead: {
    type: Boolean,
    default: false
  },

  // زمان خوانده شدن
  readAt: Date,

  // کانال‌های ارسال
  channels: {
    inApp: {
      type: Boolean,
      default: true
    },
    email: {
      type: Boolean,
      default: false
    },
    telegram: {
      type: Boolean,
      default: false
    },
    sms: {
      type: Boolean,
      default: false
    }
  },

  // وضعیت ارسال
  deliveryStatus: {
    email: {
      sent: Boolean,
      sentAt: Date,
      error: String
    },
    telegram: {
      sent: Boolean,
      sentAt: Date,
      error: String
    },
    sms: {
      sent: Boolean,
      sentAt: Date,
      error: String
    }
  }
}, {
  timestamps: true
});

// ایندکس
notificationSchema.index({ user: 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
