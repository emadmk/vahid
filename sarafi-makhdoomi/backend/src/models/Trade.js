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
      'pending',              // در انتظار تایید صراف
      'approved',             // تایید صراف
      'pending_collection',   // در انتظار وصول
      'pending_accounting',   // در انتظار تایید حسابداری
      'processing',           // در حال پردازش
      'awaiting_currency',    // در انتظار وصول ارز
      'awaiting_rial',        // در انتظار وصول ریال
      'completed',            // تکمیل شده
      'cancelled',            // لغو شده
      'rejected',             // رد شده
      'expired',              // منقضی شده
      'disputed'              // اختلاف
    ],
    default: 'pending'
  },

  // نوع معامله (فوری یا حرفه‌ای)
  tradeType: {
    type: String,
    enum: ['instant', 'pro'],
    default: 'instant'
  },

  // تاریخ انقضای سفارش
  validUntil: {
    type: Date
  },

  // وضعیت کیف پول
  walletStatus: {
    status: {
      type: String,
      enum: ['ok', 'mixed', 'insufficient']
    },
    message: String,
    paymentMethod: String,
    cashAmount: Number,
    creditAmount: Number,
    shortage: Number
  },

  // دلیل رد
  rejectionReason: String,
  rejectedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  rejectedAt: Date,

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
  },

  // ========== فیلدهای معامله گروهی ==========

  // آیا این یک معامله گروهی است؟
  isGroupTrade: {
    type: Boolean,
    default: false
  },

  // گروه مرتبط (برای معاملات گروهی)
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SarafiGroup'
  },

  // مشتری اشتراکی (برای معاملات گروهی)
  sharedCustomer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SharedCustomer'
  },

  // صراف مالک مشتری - صراف A (برای معاملات گروهی)
  ownerSarafi: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // صراف اجراکننده - صراف B (برای معاملات گروهی - همان sarafi فعلی)
  // sarafi فیلد موجود نقش اجراکننده را دارد

  // اطلاعات اسپرد معامله گروهی
  groupTradeDetails: {
    // نرخ پایه (بدون اسپرد)
    baseRate: Number,
    // اسپرد صراف مالک (A) - درصد
    ownerSpreadPercent: Number,
    // مبلغ اسپرد صراف مالک (A) - ریال
    ownerSpreadAmount: Number,
    // اسپرد صراف اجراکننده (B) - درصد
    executorSpreadPercent: Number,
    // مبلغ اسپرد صراف اجراکننده (B) - ریال
    executorSpreadAmount: Number,
    // نرخ تسویه بین صراف‌ها
    interSarafiRate: Number,
    // سود صراف مالک
    ownerProfit: Number,
    // سود صراف اجراکننده
    executorProfit: Number
  },

  // تسویه گروهی مرتبط
  groupSettlement: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GroupSettlement'
  },

  // وضعیت تسویه گروهی
  groupSettlementStatus: {
    type: String,
    enum: ['pending', 'executor_settled', 'completed', 'disputed'],
    default: 'pending'
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
// ایندکس‌های معامله گروهی
tradeSchema.index({ isGroupTrade: 1, status: 1 });
tradeSchema.index({ group: 1, status: 1 });
tradeSchema.index({ ownerSarafi: 1, status: 1 });
tradeSchema.index({ sharedCustomer: 1 });
tradeSchema.index({ groupSettlementStatus: 1 });

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
