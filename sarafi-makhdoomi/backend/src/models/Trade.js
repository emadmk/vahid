const mongoose = require('mongoose');

// مدل معامله - ثبت معاملات انجام شده
const tradeSchema = new mongoose.Schema({
  // شماره معامله یکتا
  tradeNumber: {
    type: String,
    unique: true,
    required: true
  },

  // نوع معامله از دید مشتری
  type: {
    type: String,
    enum: ['buy', 'sell'], // مشتری خرید می‌کند یا می‌فروشد
    required: true
  },

  // ارز معامله شده
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

  // نرخ معامله (به ریال)
  rate: {
    type: Number,
    required: true,
    min: 0
  },

  // مبلغ کل (به ریال)
  totalAmount: {
    type: Number,
    required: true
  },

  // کارمزد
  commission: {
    amount: {
      type: Number,
      default: 0
    },
    rate: {
      type: Number, // درصد کارمزد
      default: 0
    },
    type: {
      type: String,
      enum: ['percentage', 'fixed'],
      default: 'percentage'
    }
  },

  // مبلغ نهایی پس از کارمزد
  netAmount: {
    type: Number,
    required: true
  },

  // مشتری
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // صراف
  sarafi: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // پیشنهاد مرتبط (در صورت وجود)
  marketOffer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'MarketOffer'
  },

  // درخواست مرتبط (در صورت وجود)
  request: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request'
  },

  // نوع پرداخت
  paymentMethod: {
    type: String,
    enum: ['cash_wallet', 'credit_wallet', 'mixed'],
    required: true
  },

  // جزئیات پرداخت
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

  // وضعیت معامله
  status: {
    type: String,
    enum: [
      'pending',           // در انتظار تایید
      'approved',          // تایید شده
      'processing',        // در حال پردازش
      'awaiting_currency', // در انتظار وصول ارز
      'awaiting_rial',     // در انتظار وصول ریال
      'completed',         // تکمیل شده
      'cancelled',         // لغو شده
      'disputed'           // اختلاف
    ],
    default: 'pending'
  },

  // مرحله تصمیم صراف
  sarafiDecision: {
    decision: {
      type: String,
      enum: ['instant', 'callback', 'rejected']
    },
    decidedAt: Date,
    reason: String
  },

  // وضعیت وصول ارز
  currencyCollection: {
    status: {
      type: String,
      enum: ['pending', 'collected', 'confirmed'],
      default: 'pending'
    },
    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    collectedAt: Date,
    confirmedAt: Date,
    notes: String
  },

  // وضعیت وصول ریال
  rialCollection: {
    status: {
      type: String,
      enum: ['pending', 'collected', 'confirmed'],
      default: 'pending'
    },
    collectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    collectedAt: Date,
    confirmedAt: Date,
    bankDetails: {
      bankName: String,
      accountNumber: String,
      trackingCode: String
    },
    notes: String
  },

  // امتیازات
  scoring: {
    customerScoreAwarded: {
      type: Number,
      default: 0
    },
    sarafiScoreAwarded: {
      type: Number,
      default: 0
    },
    scoredAt: Date
  },

  // تاریخ‌های مهم
  approvedAt: Date,
  completedAt: Date,
  cancelledAt: Date,

  // دلیل لغو
  cancellation: {
    reason: String,
    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    penaltyApplied: {
      type: Boolean,
      default: false
    },
    penaltyAmount: Number
  },

  // یادداشت‌ها
  notes: [{
    content: String,
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // متادیتا
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// ایندکس‌ها
tradeSchema.index({ tradeNumber: 1 });
tradeSchema.index({ customer: 1, status: 1, createdAt: -1 });
tradeSchema.index({ sarafi: 1, status: 1, createdAt: -1 });
tradeSchema.index({ status: 1, createdAt: -1 });
tradeSchema.index({ currency: 1, createdAt: -1 });
tradeSchema.index({ 'currencyCollection.status': 1 });
tradeSchema.index({ 'rialCollection.status': 1 });

// تولید شماره معامله یکتا
tradeSchema.statics.generateTradeNumber = function() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `TRD-${year}${month}${day}-${random}`;
};

// محاسبه امتیاز مشتری (1 امتیاز به ازای هر 100 میلیون ریال)
tradeSchema.methods.calculateCustomerScore = function() {
  return Math.floor(this.totalAmount / 100000000);
};

// محاسبه امتیاز صراف (1 امتیاز به ازای هر 10 میلیارد ریال)
tradeSchema.methods.calculateSarafiScore = function() {
  return Math.floor(this.totalAmount / 10000000000);
};

module.exports = mongoose.model('Trade', tradeSchema);
