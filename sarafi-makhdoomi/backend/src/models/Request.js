const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  // کاربر درخواست‌دهنده
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // صراف اصلی کاربر
  originalSarafi: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // صراف پذیرنده (ممکنه صراف دیگه‌ای از بخش عمومی قبول کنه)
  acceptedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // نوع درخواست
  type: {
    type: String,
    enum: ['buy', 'sell'],
    required: true
  },

  // ارز
  currency: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Currency',
    required: true
  },

  // مبلغ ارز
  amount: {
    type: Number,
    required: true
  },

  // نرخ در زمان ثبت
  rate: {
    type: Number,
    required: true
  },

  // مبلغ کل به ریال
  totalPrice: {
    type: Number,
    required: true
  },

  // کارمزد
  fee: {
    type: Number,
    default: 0
  },

  // مبلغ نهایی
  finalPrice: {
    type: Number,
    required: true
  },

  // وضعیت درخواست
  status: {
    type: String,
    enum: [
      'pending',           // در انتظار بررسی صراف
      'waiting_public',    // در انتظار انتشار عمومی (تایمر)
      'public',            // منتشر شده در بخش عمومی
      'private',           // پذیرفته شده بصورت خصوصی
      'accepted',          // پذیرفته شده
      'in_progress',       // در حال انجام
      'completed',         // تکمیل شده
      'cancelled',         // لغو شده
      'rejected',          // رد شده
      'expired'            // منقضی شده
    ],
    default: 'pending'
  },

  // تنظیمات نمایش
  visibility: {
    type: String,
    enum: ['private', 'public', 'pending'],
    default: 'pending'
  },

  // زمان ثبت درخواست
  createdAt: {
    type: Date,
    default: Date.now
  },

  // زمان انقضای تایمر (1 ساعت بعد از ثبت)
  timerExpiry: {
    type: Date,
    required: true
  },

  // آیا تایمر منقضی شده
  timerExpired: {
    type: Boolean,
    default: false
  },

  // زمان تصمیم صراف
  sarafiDecisionAt: Date,

  // زمان پذیرش
  acceptedAt: Date,

  // زمان تکمیل
  completedAt: Date,

  // علت رد
  rejectionReason: String,

  // علت لغو
  cancellationReason: String,

  // یادداشت‌ها
  notes: String,

  // یادداشت داخلی (فقط صراف می‌بیند)
  internalNotes: String,

  // اطلاعات تماس کاربر (برای صراف)
  contactInfo: {
    phone: String,
    email: String,
    preferredContact: {
      type: String,
      enum: ['phone', 'email', 'telegram'],
      default: 'phone'
    }
  },

  // تاریخچه وضعیت
  statusHistory: [{
    status: String,
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    date: {
      type: Date,
      default: Date.now
    }
  }],

  // اعلان‌های ارسال شده
  notificationsSent: {
    timerWarning: Boolean,
    publicNotification: Boolean,
    acceptedNotification: Boolean,
    completedNotification: Boolean
  }
}, {
  timestamps: true
});

// ایندکس‌ها برای جستجوی سریع
requestSchema.index({ user: 1, status: 1 });
requestSchema.index({ originalSarafi: 1, status: 1 });
requestSchema.index({ visibility: 1, status: 1 });
requestSchema.index({ timerExpiry: 1, timerExpired: 1 });
requestSchema.index({ createdAt: -1 });

// محاسبه مبلغ قبل از ذخیره
requestSchema.pre('save', function(next) {
  if (this.isModified('amount') || this.isModified('rate') || this.isModified('fee')) {
    this.totalPrice = this.amount * this.rate;
    this.finalPrice = this.totalPrice + this.fee;
  }
  next();
});

module.exports = mongoose.model('Request', requestSchema);
