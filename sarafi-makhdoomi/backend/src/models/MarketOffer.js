const mongoose = require('mongoose');

// مدل پیشنهاد بازار - خرید و فروش ارز توسط صراف‌ها و مشتریان
const marketOfferSchema = new mongoose.Schema({
  // نوع پیشنهاد
  type: {
    type: String,
    enum: ['buy', 'sell'], // خرید یا فروش
    required: true
  },

  // ارز مورد نظر
  currency: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Currency',
    required: true
  },

  // مقدار ارز
  amount: {
    type: Number,
    required: true,
    min: 0
  },

  // مقدار باقیمانده (برای پیشنهادهای جزئی تکمیل شده)
  remainingAmount: {
    type: Number,
    min: 0
  },

  // قیمت پیشنهادی (به ریال)
  price: {
    type: Number,
    required: true,
    min: 0
  },

  // نوع قیمت‌گذاری
  priceType: {
    type: String,
    enum: ['fixed', 'market', 'conditional'],
    default: 'fixed'
  },

  // شرط قیمت (برای سفارش‌های شرطی)
  priceCondition: {
    operator: {
      type: String,
      enum: ['gte', 'lte', 'eq'] // بزرگتر یا مساوی، کوچکتر یا مساوی، مساوی
    },
    targetPrice: Number,
    triggered: {
      type: Boolean,
      default: false
    },
    triggeredAt: Date
  },

  // ارائه‌دهنده پیشنهاد
  offeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // نوع ارائه‌دهنده
  offeredByType: {
    type: String,
    enum: ['customer', 'sarafi'],
    required: true
  },

  // صراف مرتبط (برای مشتریان)
  sarafi: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // وضعیت پیشنهاد
  status: {
    type: String,
    enum: [
      'pending',        // در انتظار
      'active',         // فعال در بازار
      'partially_filled', // جزئی تکمیل شده
      'filled',         // کامل تکمیل شده
      'cancelled',      // لغو شده
      'expired',        // منقضی شده
      'rejected'        // رد شده
    ],
    default: 'pending'
  },

  // اولویت نمایش
  priority: {
    type: Number,
    default: 0
  },

  // امتیاز ارائه‌دهنده در زمان ثبت
  offererScore: {
    type: Number,
    default: 0
  },

  // نمایش عمومی
  isPublic: {
    type: Boolean,
    default: true
  },

  // تاریخ انقضا
  expiresAt: {
    type: Date
  },

  // یادداشت
  notes: {
    type: String,
    maxlength: 500
  },

  // تاریخ فعال‌سازی
  activatedAt: Date,

  // تاریخ لغو
  cancelledAt: Date,

  // دلیل لغو
  cancellationReason: String,

  // تعداد مشاهده
  viewCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// ایندکس‌ها
marketOfferSchema.index({ currency: 1, status: 1, type: 1 });
marketOfferSchema.index({ offeredBy: 1, status: 1 });
marketOfferSchema.index({ sarafi: 1, status: 1 });
marketOfferSchema.index({ status: 1, createdAt: -1 });
marketOfferSchema.index({ price: 1, type: 1 });
marketOfferSchema.index({ priority: -1, createdAt: 1 }); // برای مرتب‌سازی اولویت

// قبل از ذخیره، مقدار باقیمانده را تنظیم کن
marketOfferSchema.pre('save', function(next) {
  if (this.isNew) {
    this.remainingAmount = this.amount;
  }
  next();
});

// متد برای بررسی شرط قیمت
marketOfferSchema.methods.checkPriceCondition = function(currentPrice) {
  if (this.priceType !== 'conditional' || !this.priceCondition) {
    return true;
  }

  const { operator, targetPrice } = this.priceCondition;

  switch (operator) {
    case 'gte':
      return currentPrice >= targetPrice;
    case 'lte':
      return currentPrice <= targetPrice;
    case 'eq':
      return currentPrice === targetPrice;
    default:
      return false;
  }
};

module.exports = mongoose.model('MarketOffer', marketOfferSchema);
