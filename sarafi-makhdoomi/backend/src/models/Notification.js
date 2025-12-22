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
      'request_new',           // درخواست جدید
      'request_accepted',      // درخواست پذیرفته شد
      'request_rejected',      // درخواست رد شد
      'request_completed',     // درخواست تکمیل شد
      'request_public',        // درخواست عمومی شد
      'request_private',       // درخواست خصوصی شد
      'user_approved',         // کاربر تایید شد
      'user_rejected',         // کاربر رد شد
      'sarafi_approved',       // صراف تایید شد
      'timer_warning',         // هشدار تایمر
      'system',                // سیستمی
      'admin'                  // از طرف ادمین
    ],
    default: 'system'
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
