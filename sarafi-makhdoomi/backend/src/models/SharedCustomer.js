const mongoose = require('mongoose');

/**
 * مدل مشتری اشتراک‌گذاری شده
 * برای ذخیره اطلاعات مشتریانی که توسط صراف‌ها با گروه به اشتراک گذاشته شده‌اند
 */
const sharedCustomerSchema = new mongoose.Schema({
  // گروه صراف
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SarafiGroup',
    required: true
  },

  // صراف مالک مشتری (صراف A)
  ownerSarafi: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // مشتری واقعی
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // نام مستعار برای نمایش به سایر صراف‌ها (برای حفظ حریم خصوصی)
  displayName: {
    type: String,
    required: true
  },

  // وضعیت اشتراک‌گذاری
  status: {
    type: String,
    enum: ['active', 'paused', 'expired', 'removed'],
    default: 'active'
  },

  // اطلاعات مشتری (به صورت ناشناس برای سایر صراف‌ها)
  customerInfo: {
    // نوع مشتری
    type: {
      type: String,
      enum: ['individual', 'business'],
      default: 'individual'
    },
    // رتبه اعتباری مشتری نزد صراف مالک (1-5)
    trustRating: {
      type: Number,
      min: 1,
      max: 5,
      default: 3
    },
    // آیا مشتری تایید شده است؟
    isVerified: {
      type: Boolean,
      default: false
    },
    // میانگین حجم معاملات (رنج)
    averageTradeVolume: {
      type: String,
      enum: ['low', 'medium', 'high', 'very_high'],
      default: 'medium'
    },
    // تعداد معاملات موفق با صراف مالک
    successfulTrades: {
      type: Number,
      default: 0
    }
  },

  // محدودیت‌های معامله
  tradeLimits: {
    // حداقل مبلغ معامله (ریال)
    minAmount: {
      type: Number,
      default: 0
    },
    // حداکثر مبلغ معامله (ریال)
    maxAmount: {
      type: Number
    },
    // ارزهای مجاز
    allowedCurrencies: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Currency'
    }],
    // نوع معامله مجاز
    allowedTypes: [{
      type: String,
      enum: ['buy', 'sell']
    }]
  },

  // اسپرد صراف مالک (درصد)
  ownerSpread: {
    buy: {
      type: Number,
      default: 0
    },
    sell: {
      type: Number,
      default: 0
    }
  },

  // آمار
  stats: {
    // تعداد کل معاملات از طریق این اشتراک‌گذاری
    totalTrades: {
      type: Number,
      default: 0
    },
    // مجموع حجم معاملات
    totalVolume: {
      type: Number,
      default: 0
    },
    // درآمد کل برای صراف مالک
    totalOwnerEarnings: {
      type: Number,
      default: 0
    },
    // آخرین معامله
    lastTradeAt: Date
  },

  // تاریخ انقضا (اختیاری)
  expiresAt: Date,

  // یادداشت‌ها (فقط برای صراف مالک)
  notes: String,

  // متادیتا
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// ایندکس‌ها
sharedCustomerSchema.index({ group: 1, status: 1 });
sharedCustomerSchema.index({ ownerSarafi: 1, status: 1 });
sharedCustomerSchema.index({ customer: 1 });
sharedCustomerSchema.index({ group: 1, ownerSarafi: 1, customer: 1 }, { unique: true });
sharedCustomerSchema.index({ status: 1, expiresAt: 1 });

// متد استاتیک: دریافت مشتریان اشتراکی یک گروه
sharedCustomerSchema.statics.getSharedCustomersForGroup = async function(groupId, excludeSarafiId = null) {
  const query = {
    group: groupId,
    status: 'active',
    $or: [
      { expiresAt: null },
      { expiresAt: { $gt: new Date() } }
    ]
  };

  if (excludeSarafiId) {
    query.ownerSarafi = { $ne: excludeSarafiId };
  }

  return this.find(query)
    .populate('ownerSarafi', 'firstName lastName sarafiInfo.name')
    .populate('tradeLimits.allowedCurrencies', 'name symbol code')
    .sort({ createdAt: -1 });
};

// متد استاتیک: دریافت مشتریان اشتراکی یک صراف
sharedCustomerSchema.statics.getSharedCustomersOfSarafi = async function(sarafiId, groupId = null) {
  const query = {
    ownerSarafi: sarafiId,
    status: { $in: ['active', 'paused'] }
  };

  if (groupId) {
    query.group = groupId;
  }

  return this.find(query)
    .populate('group', 'name')
    .populate('customer', 'firstName lastName phone')
    .sort({ createdAt: -1 });
};

// متد استاتیک: اشتراک‌گذاری یک مشتری
sharedCustomerSchema.statics.shareCustomer = async function(data) {
  const {
    groupId,
    ownerSarafiId,
    customerId,
    displayName,
    customerInfo,
    tradeLimits,
    ownerSpread,
    expiresAt,
    notes
  } = data;

  // بررسی تکراری نبودن
  const existing = await this.findOne({
    group: groupId,
    ownerSarafi: ownerSarafiId,
    customer: customerId,
    status: { $in: ['active', 'paused'] }
  });

  if (existing) {
    throw new Error('این مشتری قبلاً در این گروه به اشتراک گذاشته شده است');
  }

  const sharedCustomer = await this.create({
    group: groupId,
    ownerSarafi: ownerSarafiId,
    customer: customerId,
    displayName: displayName || `مشتری ${Date.now().toString(36).toUpperCase()}`,
    customerInfo,
    tradeLimits,
    ownerSpread,
    expiresAt,
    notes
  });

  return sharedCustomer;
};

// متد: به‌روزرسانی آمار پس از معامله
sharedCustomerSchema.methods.updateStatsAfterTrade = function(tradeAmount, ownerEarnings) {
  this.stats.totalTrades = (this.stats.totalTrades || 0) + 1;
  this.stats.totalVolume = (this.stats.totalVolume || 0) + tradeAmount;
  this.stats.totalOwnerEarnings = (this.stats.totalOwnerEarnings || 0) + ownerEarnings;
  this.stats.lastTradeAt = new Date();
  return this.save();
};

// متد: توقف موقت اشتراک‌گذاری
sharedCustomerSchema.methods.pause = function() {
  this.status = 'paused';
  return this.save();
};

// متد: ازسرگیری اشتراک‌گذاری
sharedCustomerSchema.methods.resume = function() {
  this.status = 'active';
  return this.save();
};

// متد: حذف اشتراک‌گذاری
sharedCustomerSchema.methods.remove = function() {
  this.status = 'removed';
  return this.save();
};

// Pre-save: بررسی انقضا
sharedCustomerSchema.pre('save', function(next) {
  if (this.expiresAt && this.expiresAt < new Date() && this.status === 'active') {
    this.status = 'expired';
  }
  next();
});

module.exports = mongoose.model('SharedCustomer', sharedCustomerSchema);
