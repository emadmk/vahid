const mongoose = require('mongoose');

/**
 * مدل سفارش - Order Book
 * انواع سفارش: Market Order, Limit Order, Conditional Order
 * طراحی شده برای بازار صرافی با قابلیت Match
 */
const orderSchema = new mongoose.Schema({
  // شماره سفارش یکتا
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },

  // نوع سفارش از دید کاربر
  side: {
    type: String,
    enum: ['buy', 'sell'], // خرید یا فروش
    required: true
  },

  // نوع سفارش
  orderType: {
    type: String,
    enum: [
      'market',       // اجرای فوری با قیمت بازار
      'limit',        // اجرا در قیمت مشخص
      'conditional',  // اجرا با شرط قیمت (Stop Order)
      'stop_limit'    // Stop-Limit Order
    ],
    default: 'limit'
  },

  // ارز
  currency: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Currency',
    required: true
  },

  // مقدار
  amount: {
    type: Number,
    required: true,
    min: 0
  },

  // مقدار باقیمانده
  remainingAmount: {
    type: Number,
    min: 0
  },

  // مقدار اجرا شده
  filledAmount: {
    type: Number,
    default: 0,
    min: 0
  },

  // ========== قیمت ==========

  // قیمت سفارش (برای Limit)
  price: {
    type: Number,
    min: 0,
    required: function() {
      return ['limit', 'stop_limit'].includes(this.orderType);
    }
  },

  // قیمت Stop (برای Conditional و Stop-Limit)
  stopPrice: {
    type: Number,
    min: 0,
    required: function() {
      return ['conditional', 'stop_limit'].includes(this.orderType);
    }
  },

  // قیمت متوسط اجرا
  averageFilledPrice: {
    type: Number,
    default: 0
  },

  // ========== شرایط ==========

  // شرط اجرا
  condition: {
    // نوع شرط
    type: {
      type: String,
      enum: ['gte', 'lte'], // بزرگتر مساوی، کوچکتر مساوی
    },
    // آیا شرط فعال شده
    triggered: {
      type: Boolean,
      default: false
    },
    // تاریخ فعال شدن شرط
    triggeredAt: Date
  },

  // ========== کاربران ==========

  // ثبت‌کننده سفارش
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // نوع ثبت‌کننده
  createdByType: {
    type: String,
    enum: ['customer', 'sarafi', 'staff'],
    required: true
  },

  // صراف مربوطه
  sarafi: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // مشتری (اگر سفارش توسط مشتری ثبت شده)
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // ========== منبع پرداخت ==========
  paymentSource: {
    type: String,
    enum: ['cash', 'credit', 'mixed'],
    default: 'cash'
  },

  paymentDetails: {
    cashAmount: {
      type: Number,
      default: 0
    },
    creditAmount: {
      type: Number,
      default: 0
    }
  },

  // ========== وضعیت ==========
  status: {
    type: String,
    enum: [
      'pending',           // در انتظار تایید
      'pending_credit',    // در انتظار تایید اعتبار
      'open',              // فعال در بازار
      'partially_filled',  // جزئی اجرا شده
      'filled',            // کامل اجرا شده
      'cancelled',         // لغو شده
      'rejected',          // رد شده
      'expired'            // منقضی شده
    ],
    default: 'pending'
  },

  // ========== تنظیمات اجرا ==========

  // اجرای خودکار (بدون نیاز به تایید)
  autoExecute: {
    type: Boolean,
    default: false
  },

  // اولویت (بر اساس Tier مشتری)
  priority: {
    type: Number,
    default: 0
  },

  // امتیاز کاربر در زمان ثبت
  userScoreAtCreation: {
    type: Number,
    default: 0
  },

  // ========== زمان ==========

  // تاریخ انقضا
  expiresAt: {
    type: Date
  },

  // نوع اعتبار زمانی
  timeInForce: {
    type: String,
    enum: [
      'GTC',  // Good Till Cancel
      'IOC',  // Immediate Or Cancel
      'FOK',  // Fill Or Kill
      'DAY'   // روزانه
    ],
    default: 'GTC'
  },

  // تاریخ فعال‌سازی در بازار
  activatedAt: Date,

  // تاریخ اتمام
  completedAt: Date,

  // تاریخ لغو
  cancelledAt: Date,

  // ========== Match‌ها ==========
  fills: [{
    // سفارش طرف مقابل
    matchedOrder: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    // معامله ایجاد شده
    trade: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trade'
    },
    amount: Number,
    price: Number,
    filledAt: {
      type: Date,
      default: Date.now
    }
  }],

  // ========== یادداشت و لغو ==========
  notes: {
    type: String,
    maxlength: 500
  },

  cancellationReason: String,

  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // ========== Pre-Trade Risk Check ==========
  riskCheck: {
    passed: {
      type: Boolean,
      default: false
    },
    checkedAt: Date,
    details: {
      customerLimit: Boolean,
      blackPointCheck: Boolean,
      volatilityCheck: Boolean,
      exposureCheck: Boolean
    },
    failureReason: String
  },

  // ========== قیمت‌های محاسبه شده ==========

  // قیمت بازار در زمان ثبت
  marketPriceAtCreation: Number,

  // اسپرد اعمال شده
  spreadApplied: Number,

  // قیمت نهایی مصرف‌کننده
  finalPrice: Number,

  // ========== متادیتا ==========
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// ایندکس‌ها
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ sarafi: 1, status: 1, side: 1, createdAt: -1 });
orderSchema.index({ customer: 1, status: 1, createdAt: -1 });
orderSchema.index({ currency: 1, status: 1, side: 1, price: 1 });
orderSchema.index({ status: 1, orderType: 1, createdAt: 1 });
orderSchema.index({ priority: -1, createdAt: 1 }); // برای مرتب‌سازی Order Book
orderSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// تولید شماره سفارش یکتا
orderSchema.statics.generateOrderNumber = function() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${year}${month}${day}-${random}`;
};

// قبل از ذخیره
orderSchema.pre('save', function(next) {
  if (this.isNew) {
    this.remainingAmount = this.amount;
  }
  next();
});

// متد اجرای جزئی
orderSchema.methods.partialFill = async function(fillAmount, fillPrice, matchedOrderId, tradeId) {
  this.filledAmount += fillAmount;
  this.remainingAmount = this.amount - this.filledAmount;

  // محاسبه قیمت متوسط
  const totalFilled = this.fills.reduce((sum, f) => sum + (f.amount * f.price), 0) + (fillAmount * fillPrice);
  this.averageFilledPrice = totalFilled / this.filledAmount;

  this.fills.push({
    matchedOrder: matchedOrderId,
    trade: tradeId,
    amount: fillAmount,
    price: fillPrice,
    filledAt: new Date()
  });

  if (this.remainingAmount === 0) {
    this.status = 'filled';
    this.completedAt = new Date();
  } else {
    this.status = 'partially_filled';
  }

  await this.save();
  return this;
};

// متد لغو سفارش
orderSchema.methods.cancel = async function(userId, reason) {
  if (['filled', 'cancelled', 'expired'].includes(this.status)) {
    throw new Error('این سفارش قابل لغو نیست');
  }

  this.status = 'cancelled';
  this.cancelledAt = new Date();
  this.cancelledBy = userId;
  this.cancellationReason = reason;

  await this.save();
  return this;
};

// متد Pre-Trade Risk Check
orderSchema.methods.performRiskCheck = async function(customerLimitOk, blackPointOk, volatilityOk, exposureOk) {
  this.riskCheck = {
    passed: customerLimitOk && blackPointOk && volatilityOk && exposureOk,
    checkedAt: new Date(),
    details: {
      customerLimit: customerLimitOk,
      blackPointCheck: blackPointOk,
      volatilityCheck: volatilityOk,
      exposureCheck: exposureOk
    }
  };

  if (!this.riskCheck.passed) {
    const failures = [];
    if (!customerLimitOk) failures.push('سقف مجاز مشتری');
    if (!blackPointOk) failures.push('بلک‌پوینت بالا');
    if (!volatilityOk) failures.push('نوسان شدید بازار');
    if (!exposureOk) failures.push('تعهد باز صراف');
    this.riskCheck.failureReason = failures.join('، ');
  }

  await this.save();
  return this.riskCheck;
};

// استاتیک: دریافت Order Book
orderSchema.statics.getOrderBook = async function(currencyId, limit = 20) {
  const [buyOrders, sellOrders] = await Promise.all([
    // سفارش‌های خرید - قیمت بالاتر اولویت دارد
    this.find({
      currency: currencyId,
      side: 'buy',
      status: { $in: ['open', 'partially_filled'] },
      orderType: 'limit'
    })
      .select('price remainingAmount priority createdAt')
      .sort({ price: -1, priority: -1, createdAt: 1 })
      .limit(limit),

    // سفارش‌های فروش - قیمت پایین‌تر اولویت دارد
    this.find({
      currency: currencyId,
      side: 'sell',
      status: { $in: ['open', 'partially_filled'] },
      orderType: 'limit'
    })
      .select('price remainingAmount priority createdAt')
      .sort({ price: 1, priority: -1, createdAt: 1 })
      .limit(limit)
  ]);

  // محاسبه عمق بازار
  const buyDepth = buyOrders.reduce((sum, o) => sum + o.remainingAmount, 0);
  const sellDepth = sellOrders.reduce((sum, o) => sum + o.remainingAmount, 0);

  return {
    buyOrders: buyOrders.map(o => ({
      price: o.price,
      amount: o.remainingAmount
    })),
    sellOrders: sellOrders.map(o => ({
      price: o.price,
      amount: o.remainingAmount
    })),
    depth: {
      buy: buyDepth,
      sell: sellDepth
    },
    spread: sellOrders.length > 0 && buyOrders.length > 0
      ? sellOrders[0].price - buyOrders[0].price
      : null
  };
};

module.exports = mongoose.model('Order', orderSchema);
