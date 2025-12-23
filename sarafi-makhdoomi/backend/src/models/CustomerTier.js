const mongoose = require('mongoose');

// مدل دسته‌بندی مشتریان - تعریف سطوح و امتیازات
const customerTierSchema = new mongoose.Schema({
  // کد دسته
  code: {
    type: String,
    enum: ['A', 'B', 'C', 'new'],
    required: true,
    unique: true
  },

  // نام دسته
  name: {
    type: String,
    required: true
  },

  // توضیحات
  description: {
    type: String
  },

  // حداقل امتیاز برای این دسته
  minScore: {
    type: Number,
    required: true,
    default: 0
  },

  // حداکثر امتیاز برای این دسته
  maxScore: {
    type: Number
  },

  // مزایا
  benefits: {
    // درصد تخفیف کارمزد
    commissionDiscount: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },

    // سقف اعتبار پیش‌فرض
    defaultCreditLimit: {
      type: Number,
      default: 0
    },

    // اولویت در صف
    queuePriority: {
      type: Number,
      default: 0
    },

    // دسترسی به پیشنهادات ویژه
    specialOffersAccess: {
      type: Boolean,
      default: false
    },

    // پشتیبانی اختصاصی
    dedicatedSupport: {
      type: Boolean,
      default: false
    },

    // نرخ ترجیحی
    preferentialRates: {
      type: Boolean,
      default: false
    }
  },

  // محدودیت‌ها
  restrictions: {
    // حداکثر معامله روزانه
    maxDailyTrades: {
      type: Number
    },

    // حداکثر مبلغ روزانه
    maxDailyAmount: {
      type: Number
    },

    // حداکثر اعتبار مجاز
    maxCreditLimit: {
      type: Number
    }
  },

  // رنگ نمایش در UI
  color: {
    type: String,
    default: '#D4AF37'
  },

  // آیکون
  icon: {
    type: String
  },

  // ترتیب نمایش
  displayOrder: {
    type: Number,
    default: 0
  },

  // فعال بودن
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// ایندکس‌ها
customerTierSchema.index({ code: 1 });
customerTierSchema.index({ minScore: 1, maxScore: 1 });

// متد یافتن دسته بر اساس امتیاز
customerTierSchema.statics.getTierByScore = async function(score) {
  const tier = await this.findOne({
    minScore: { $lte: score },
    $or: [
      { maxScore: { $gte: score } },
      { maxScore: null }
    ],
    isActive: true
  }).sort({ minScore: -1 });

  return tier;
};

// داده‌های پیش‌فرض
customerTierSchema.statics.initDefaultTiers = async function() {
  const defaultTiers = [
    {
      code: 'new',
      name: 'مشتری جدید',
      description: 'مشتریان تازه ثبت‌نام کرده',
      minScore: 0,
      maxScore: 99,
      benefits: {
        commissionDiscount: 0,
        defaultCreditLimit: 0,
        queuePriority: 0,
        specialOffersAccess: false,
        dedicatedSupport: false,
        preferentialRates: false
      },
      restrictions: {
        maxDailyTrades: 5,
        maxDailyAmount: 1000000000, // 1 میلیارد ریال
        maxCreditLimit: 0
      },
      color: '#6B7280',
      displayOrder: 0
    },
    {
      code: 'C',
      name: 'مشتری برنزی',
      description: 'مشتریان با امتیاز 100 تا 499',
      minScore: 100,
      maxScore: 499,
      benefits: {
        commissionDiscount: 5,
        defaultCreditLimit: 500000000, // 500 میلیون ریال
        queuePriority: 1,
        specialOffersAccess: false,
        dedicatedSupport: false,
        preferentialRates: false
      },
      restrictions: {
        maxDailyTrades: 10,
        maxDailyAmount: 5000000000, // 5 میلیارد ریال
        maxCreditLimit: 1000000000
      },
      color: '#CD7F32',
      displayOrder: 1
    },
    {
      code: 'B',
      name: 'مشتری نقره‌ای',
      description: 'مشتریان با امتیاز 500 تا 999',
      minScore: 500,
      maxScore: 999,
      benefits: {
        commissionDiscount: 10,
        defaultCreditLimit: 2000000000, // 2 میلیارد ریال
        queuePriority: 2,
        specialOffersAccess: true,
        dedicatedSupport: false,
        preferentialRates: false
      },
      restrictions: {
        maxDailyTrades: 20,
        maxDailyAmount: 20000000000, // 20 میلیارد ریال
        maxCreditLimit: 5000000000
      },
      color: '#C0C0C0',
      displayOrder: 2
    },
    {
      code: 'A',
      name: 'مشتری طلایی',
      description: 'مشتریان با امتیاز 1000 به بالا',
      minScore: 1000,
      maxScore: null,
      benefits: {
        commissionDiscount: 20,
        defaultCreditLimit: 10000000000, // 10 میلیارد ریال
        queuePriority: 3,
        specialOffersAccess: true,
        dedicatedSupport: true,
        preferentialRates: true
      },
      restrictions: {
        maxDailyTrades: null, // نامحدود
        maxDailyAmount: null,  // نامحدود
        maxCreditLimit: null
      },
      color: '#D4AF37',
      displayOrder: 3
    }
  ];

  for (const tierData of defaultTiers) {
    await this.findOneAndUpdate(
      { code: tierData.code },
      tierData,
      { upsert: true, new: true }
    );
  }
};

module.exports = mongoose.model('CustomerTier', customerTierSchema);
