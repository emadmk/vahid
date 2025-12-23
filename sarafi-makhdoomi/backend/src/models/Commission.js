const mongoose = require('mongoose');

// مدل کارمزد - تعریف قوانین کارمزد
const commissionSchema = new mongoose.Schema({
  // نام قانون کارمزد
  name: {
    type: String,
    required: true
  },

  // توضیحات
  description: {
    type: String
  },

  // صراف (اگر null باشد، قانون عمومی است)
  sarafi: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // ارز (اگر null باشد، برای همه ارزها اعمال می‌شود)
  currency: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Currency'
  },

  // نوع معامله
  tradeType: {
    type: String,
    enum: ['buy', 'sell', 'both'],
    default: 'both'
  },

  // نوع کارمزد
  commissionType: {
    type: String,
    enum: ['percentage', 'fixed', 'tiered'],
    default: 'percentage'
  },

  // نرخ کارمزد (درصد)
  rate: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },

  // مبلغ ثابت (برای نوع fixed)
  fixedAmount: {
    type: Number,
    default: 0,
    min: 0
  },

  // قوانین پلکانی (برای نوع tiered)
  tiers: [{
    minAmount: {
      type: Number,
      required: true
    },
    maxAmount: {
      type: Number
    },
    rate: {
      type: Number,
      required: true
    },
    fixedAmount: {
      type: Number,
      default: 0
    }
  }],

  // حداقل کارمزد
  minCommission: {
    type: Number,
    default: 0
  },

  // حداکثر کارمزد
  maxCommission: {
    type: Number
  },

  // شرایط اعمال
  conditions: {
    // حداقل مبلغ معامله
    minTradeAmount: {
      type: Number,
      default: 0
    },
    // حداکثر مبلغ معامله
    maxTradeAmount: {
      type: Number
    },
    // دسته مشتری
    customerTiers: [{
      type: String,
      enum: ['A', 'B', 'C', 'new']
    }],
    // روزهای هفته
    daysOfWeek: [{
      type: Number,
      min: 0,
      max: 6
    }],
    // ساعات فعال
    activeHours: {
      start: Number, // 0-23
      end: Number    // 0-23
    }
  },

  // اولویت (برای تعیین اینکه کدام قانون اول اعمال شود)
  priority: {
    type: Number,
    default: 0
  },

  // وضعیت
  isActive: {
    type: Boolean,
    default: true
  },

  // تاریخ شروع اعتبار
  validFrom: {
    type: Date
  },

  // تاریخ پایان اعتبار
  validUntil: {
    type: Date
  }
}, {
  timestamps: true
});

// ایندکس‌ها
commissionSchema.index({ sarafi: 1, currency: 1, isActive: 1 });
commissionSchema.index({ isActive: 1, priority: -1 });
commissionSchema.index({ tradeType: 1 });

// متد محاسبه کارمزد
commissionSchema.methods.calculateCommission = function(amount) {
  let commission = 0;

  switch (this.commissionType) {
    case 'percentage':
      commission = (amount * this.rate) / 100;
      break;

    case 'fixed':
      commission = this.fixedAmount;
      break;

    case 'tiered':
      // یافتن پله مناسب
      const tier = this.tiers.find(t => {
        return amount >= t.minAmount && (!t.maxAmount || amount <= t.maxAmount);
      });

      if (tier) {
        commission = (amount * tier.rate) / 100 + tier.fixedAmount;
      }
      break;
  }

  // اعمال حداقل و حداکثر
  if (this.minCommission && commission < this.minCommission) {
    commission = this.minCommission;
  }

  if (this.maxCommission && commission > this.maxCommission) {
    commission = this.maxCommission;
  }

  return Math.round(commission);
};

// متد بررسی شرایط اعمال
commissionSchema.methods.isApplicable = function(trade, customer) {
  const { conditions } = this;

  // بررسی مبلغ معامله
  if (conditions.minTradeAmount && trade.totalAmount < conditions.minTradeAmount) {
    return false;
  }

  if (conditions.maxTradeAmount && trade.totalAmount > conditions.maxTradeAmount) {
    return false;
  }

  // بررسی دسته مشتری
  if (conditions.customerTiers && conditions.customerTiers.length > 0) {
    if (!conditions.customerTiers.includes(customer.tier)) {
      return false;
    }
  }

  // بررسی روز هفته
  if (conditions.daysOfWeek && conditions.daysOfWeek.length > 0) {
    const today = new Date().getDay();
    if (!conditions.daysOfWeek.includes(today)) {
      return false;
    }
  }

  // بررسی ساعت
  if (conditions.activeHours && conditions.activeHours.start !== undefined) {
    const hour = new Date().getHours();
    if (hour < conditions.activeHours.start || hour >= conditions.activeHours.end) {
      return false;
    }
  }

  // بررسی تاریخ اعتبار
  const now = new Date();
  if (this.validFrom && now < this.validFrom) {
    return false;
  }

  if (this.validUntil && now > this.validUntil) {
    return false;
  }

  return true;
};

module.exports = mongoose.model('Commission', commissionSchema);
