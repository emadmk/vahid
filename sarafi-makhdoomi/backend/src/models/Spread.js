const mongoose = require('mongoose');

/**
 * مدل اسپرد صراف - تعریف اختلاف قیمت خرید و فروش
 * سطح تعریف: ارز / بازار / خرید-فروش / Tier مشتری
 * نوع: ثابت یا درصدی
 */
const spreadSchema = new mongoose.Schema({
  // صراف
  sarafi: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // ارز
  currency: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Currency',
    required: true
  },

  // نوع معامله
  tradeType: {
    type: String,
    enum: ['buy', 'sell', 'both'], // خرید، فروش، یا هر دو
    default: 'both'
  },

  // نوع اسپرد
  spreadType: {
    type: String,
    enum: ['fixed', 'percentage'], // ثابت یا درصدی
    default: 'percentage'
  },

  // مقدار اسپرد خرید
  buySpread: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },

  // مقدار اسپرد فروش
  sellSpread: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },

  // ========== اسپرد بر اساس Tier مشتری ==========
  tierSpread: {
    // مشتری جدید
    new: {
      buySpread: { type: Number, default: 0 },
      sellSpread: { type: Number, default: 0 }
    },
    // مشتری C (برنزی)
    C: {
      buySpread: { type: Number, default: 0 },
      sellSpread: { type: Number, default: 0 }
    },
    // مشتری B (نقره‌ای)
    B: {
      buySpread: { type: Number, default: 0 },
      sellSpread: { type: Number, default: 0 }
    },
    // مشتری A (طلایی)
    A: {
      buySpread: { type: Number, default: 0 },
      sellSpread: { type: Number, default: 0 }
    }
  },

  // آیا اسپرد بر اساس Tier فعال است
  useTierSpread: {
    type: Boolean,
    default: false
  },

  // ========== محدودیت‌های حجم ==========
  // اسپرد برای معاملات بزرگ متفاوت است
  volumeBasedSpread: [{
    minAmount: Number,      // حداقل مبلغ
    maxAmount: Number,      // حداکثر مبلغ
    buySpread: Number,
    sellSpread: Number
  }],

  // آیا اسپرد حجمی فعال است
  useVolumeSpread: {
    type: Boolean,
    default: false
  },

  // ========== محدودیت‌های زمانی ==========
  // اسپرد در ساعات خاص متفاوت است
  timeBasedSpread: [{
    startTime: String,      // مثال: "09:00"
    endTime: String,        // مثال: "17:00"
    buySpread: Number,
    sellSpread: Number,
    daysOfWeek: [Number]    // روزهای هفته (0-6)
  }],

  // آیا اسپرد زمانی فعال است
  useTimeSpread: {
    type: Boolean,
    default: false
  },

  // ========== وضعیت ==========
  isActive: {
    type: Boolean,
    default: true
  },

  // اولویت (برای وقتی چند اسپرد تعریف شده)
  priority: {
    type: Number,
    default: 0
  },

  // ========== تنظیمات اضافی ==========

  // حداقل اسپرد (برای جلوگیری از ضرر)
  minSpread: {
    type: Number,
    default: 0
  },

  // حداکثر اسپرد (برای کنترل قیمت)
  maxSpread: {
    type: Number
  },

  // یادداشت
  notes: {
    type: String,
    maxlength: 500
  },

  // ========== لاگ تغییرات (Audit) ==========
  changeHistory: [{
    field: String,
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    changedAt: {
      type: Date,
      default: Date.now
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String
  }],

  // ایجاد کننده
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // آخرین ویرایش کننده
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// ایندکس‌ها
spreadSchema.index({ sarafi: 1, currency: 1 }, { unique: true });
spreadSchema.index({ sarafi: 1, isActive: 1 });
spreadSchema.index({ currency: 1, isActive: 1 });

// متد محاسبه قیمت نهایی مشتری
spreadSchema.methods.calculateFinalPrice = function(marketPrice, tradeType, customerTier, amount, currentTime) {
  let spreadValue = 0;

  // 1. اسپرد پایه
  spreadValue = tradeType === 'buy' ? this.buySpread : this.sellSpread;

  // 2. اگر اسپرد Tier فعال است
  if (this.useTierSpread && this.tierSpread[customerTier]) {
    const tierSpread = this.tierSpread[customerTier];
    spreadValue = tradeType === 'buy' ? tierSpread.buySpread : tierSpread.sellSpread;
  }

  // 3. اگر اسپرد حجمی فعال است
  if (this.useVolumeSpread && this.volumeBasedSpread.length > 0) {
    const volumeSpread = this.volumeBasedSpread.find(vs =>
      amount >= vs.minAmount && (!vs.maxAmount || amount <= vs.maxAmount)
    );
    if (volumeSpread) {
      spreadValue = tradeType === 'buy' ? volumeSpread.buySpread : volumeSpread.sellSpread;
    }
  }

  // 4. اگر اسپرد زمانی فعال است
  if (this.useTimeSpread && this.timeBasedSpread.length > 0 && currentTime) {
    const now = currentTime || new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentDay = now.getDay();
    const currentTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

    const timeSpread = this.timeBasedSpread.find(ts => {
      const inTimeRange = currentTimeStr >= ts.startTime && currentTimeStr <= ts.endTime;
      const inDayRange = !ts.daysOfWeek || ts.daysOfWeek.length === 0 || ts.daysOfWeek.includes(currentDay);
      return inTimeRange && inDayRange;
    });

    if (timeSpread) {
      spreadValue = tradeType === 'buy' ? timeSpread.buySpread : timeSpread.sellSpread;
    }
  }

  // 5. اعمال محدودیت‌ها
  if (this.minSpread && spreadValue < this.minSpread) {
    spreadValue = this.minSpread;
  }
  if (this.maxSpread && spreadValue > this.maxSpread) {
    spreadValue = this.maxSpread;
  }

  // 6. محاسبه قیمت نهایی
  let spreadAmount = 0;
  if (this.spreadType === 'percentage') {
    spreadAmount = marketPrice * (spreadValue / 100);
  } else {
    spreadAmount = spreadValue;
  }

  // برای خرید: قیمت بازار + اسپرد
  // برای فروش: قیمت بازار - اسپرد
  const finalPrice = tradeType === 'buy'
    ? marketPrice + spreadAmount
    : marketPrice - spreadAmount;

  return {
    marketPrice,
    spreadValue,
    spreadAmount,
    spreadType: this.spreadType,
    finalPrice,
    tradeType
  };
};

// متد استاتیک برای دریافت اسپرد فعال یک ارز
spreadSchema.statics.getActiveSpread = async function(sarafiId, currencyId) {
  return this.findOne({
    sarafi: sarafiId,
    currency: currencyId,
    isActive: true
  }).sort({ priority: -1 });
};

// ذخیره تغییرات در لاگ
spreadSchema.pre('save', function(next) {
  if (!this.isNew && this.isModified()) {
    const modifiedPaths = this.modifiedPaths();
    const fieldsToTrack = ['buySpread', 'sellSpread', 'spreadType', 'tierSpread', 'isActive'];

    modifiedPaths.forEach(path => {
      if (fieldsToTrack.includes(path)) {
        this.changeHistory.push({
          field: path,
          oldValue: this._original ? this._original[path] : null,
          newValue: this[path],
          changedAt: new Date(),
          changedBy: this.lastModifiedBy
        });
      }
    });
  }
  next();
});

module.exports = mongoose.model('Spread', spreadSchema);
