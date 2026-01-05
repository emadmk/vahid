const mongoose = require('mongoose');

/**
 * مدل تسویه گروهی
 * برای مدیریت تسویه حساب بین صراف‌ها در معاملات گروهی
 *
 * جریان تسویه:
 * 1. صراف B (اجراکننده) معامله را با مشتری انجام می‌دهد
 * 2. صراف B باید از صراف A (مالک مشتری) وصول کند
 * 3. صراف A از مشتری واقعی وصول می‌کند
 */
const groupSettlementSchema = new mongoose.Schema({
  // شماره تسویه یکتا
  settlementNumber: {
    type: String,
    unique: true,
    required: true
  },

  // گروه مرتبط
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SarafiGroup',
    required: true
  },

  // معامله اصلی
  trade: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trade',
    required: true
  },

  // صراف مالک مشتری (A) - بدهکار به صراف اجراکننده
  ownerSarafi: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // صراف اجراکننده معامله (B) - طلبکار از صراف مالک
  executorSarafi: {
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

  // نوع معامله
  tradeType: {
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

  // مقدار ارز
  amount: {
    type: Number,
    required: true
  },

  // ========== نرخ‌ها ==========
  rates: {
    // نرخ پایه (نرخ بازار)
    baseRate: {
      type: Number,
      required: true
    },
    // اسپرد صراف مالک (A)
    ownerSpread: {
      type: Number,
      default: 0
    },
    // اسپرد صراف اجراکننده (B)
    executorSpread: {
      type: Number,
      default: 0
    },
    // نرخ نهایی برای مشتری
    customerRate: {
      type: Number,
      required: true
    },
    // نرخ تسویه بین صراف‌ها (A و B)
    interSarafiRate: {
      type: Number,
      required: true
    }
  },

  // ========== مبالغ ==========
  amounts: {
    // مبلغ کل معامله با مشتری (ریال)
    customerTotal: {
      type: Number,
      required: true
    },
    // مبلغ تسویه بین صراف‌ها (ریال)
    interSarafiTotal: {
      type: Number,
      required: true
    },
    // سود صراف مالک (A)
    ownerProfit: {
      type: Number,
      required: true
    },
    // سود صراف اجراکننده (B)
    executorProfit: {
      type: Number,
      required: true
    }
  },

  // ========== وضعیت تسویه صراف B با صراف A ==========
  executorSettlement: {
    status: {
      type: String,
      enum: ['pending', 'requested', 'in_progress', 'completed', 'disputed'],
      default: 'pending'
    },
    // تاریخ درخواست تسویه
    requestedAt: Date,
    // تاریخ تکمیل تسویه
    completedAt: Date,
    // روش تسویه
    method: {
      type: String,
      enum: ['wallet', 'bank_transfer', 'cash', 'netting'],
      default: 'wallet'
    },
    // جزئیات تسویه
    details: {
      bankName: String,
      accountNumber: String,
      trackingCode: String,
      notes: String
    },
    // تایید صراف مالک
    ownerConfirmed: {
      type: Boolean,
      default: false
    },
    ownerConfirmedAt: Date,
    // تایید صراف اجراکننده
    executorConfirmed: {
      type: Boolean,
      default: false
    },
    executorConfirmedAt: Date
  },

  // ========== وضعیت وصول از مشتری (توسط صراف A) ==========
  customerCollection: {
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'collected', 'failed'],
      default: 'pending'
    },
    // تاریخ وصول
    collectedAt: Date,
    // روش وصول
    method: {
      type: String,
      enum: ['cash', 'bank_transfer', 'wallet', 'credit']
    },
    // یادداشت
    notes: String
  },

  // ========== وضعیت کلی ==========
  status: {
    type: String,
    enum: [
      'pending',          // در انتظار
      'executor_settled', // صراف B تسویه کرد
      'customer_pending', // در انتظار وصول از مشتری
      'completed',        // تکمیل شده
      'disputed',         // اختلاف
      'cancelled'         // لغو شده
    ],
    default: 'pending'
  },

  // دلیل اختلاف
  disputeReason: String,
  disputeResolvedAt: Date,

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
groupSettlementSchema.index({ settlementNumber: 1 });
groupSettlementSchema.index({ group: 1, status: 1 });
groupSettlementSchema.index({ ownerSarafi: 1, status: 1 });
groupSettlementSchema.index({ executorSarafi: 1, status: 1 });
groupSettlementSchema.index({ trade: 1 });
groupSettlementSchema.index({ 'executorSettlement.status': 1 });
groupSettlementSchema.index({ 'customerCollection.status': 1 });
groupSettlementSchema.index({ createdAt: -1 });

// تولید شماره تسویه یکتا
groupSettlementSchema.statics.generateSettlementNumber = function() {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `GS-${year}${month}${day}-${random}`;
};

// متد استاتیک: ایجاد تسویه گروهی
groupSettlementSchema.statics.createSettlement = async function(data) {
  const {
    group,
    trade,
    ownerSarafi,
    executorSarafi,
    customer,
    tradeType,
    currency,
    amount,
    rates,
    amounts
  } = data;

  const settlementNumber = this.generateSettlementNumber();

  const settlement = await this.create({
    settlementNumber,
    group,
    trade,
    ownerSarafi,
    executorSarafi,
    customer,
    tradeType,
    currency,
    amount,
    rates,
    amounts
  });

  return settlement;
};

// متد استاتیک: دریافت تسویه‌های یک صراف
groupSettlementSchema.statics.getSettlementsForSarafi = async function(sarafiId, options = {}) {
  const { role, status, limit = 50, skip = 0 } = options;

  const query = {};

  if (role === 'owner') {
    query.ownerSarafi = sarafiId;
  } else if (role === 'executor') {
    query.executorSarafi = sarafiId;
  } else {
    query.$or = [
      { ownerSarafi: sarafiId },
      { executorSarafi: sarafiId }
    ];
  }

  if (status) {
    query.status = status;
  }

  return this.find(query)
    .populate('group', 'name')
    .populate('trade', 'tradeNumber')
    .populate('ownerSarafi', 'firstName lastName sarafiInfo.name')
    .populate('executorSarafi', 'firstName lastName sarafiInfo.name')
    .populate('currency', 'name symbol code')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

// متد: تایید تسویه توسط صراف
groupSettlementSchema.methods.confirmSettlement = function(sarafiId, isOwner) {
  if (isOwner) {
    if (this.ownerSarafi.toString() !== sarafiId.toString()) {
      throw new Error('شما مجاز به این عملیات نیستید');
    }
    this.executorSettlement.ownerConfirmed = true;
    this.executorSettlement.ownerConfirmedAt = new Date();
  } else {
    if (this.executorSarafi.toString() !== sarafiId.toString()) {
      throw new Error('شما مجاز به این عملیات نیستید');
    }
    this.executorSettlement.executorConfirmed = true;
    this.executorSettlement.executorConfirmedAt = new Date();
  }

  // اگر هر دو تایید کردند
  if (this.executorSettlement.ownerConfirmed && this.executorSettlement.executorConfirmed) {
    this.executorSettlement.status = 'completed';
    this.executorSettlement.completedAt = new Date();
    this.status = 'executor_settled';
  }

  return this.save();
};

// متد: ثبت وصول از مشتری
groupSettlementSchema.methods.recordCustomerCollection = function(data) {
  this.customerCollection.status = 'collected';
  this.customerCollection.collectedAt = new Date();
  this.customerCollection.method = data.method;
  this.customerCollection.notes = data.notes;
  this.status = 'completed';
  return this.save();
};

// متد: ثبت اختلاف
groupSettlementSchema.methods.raiseDispute = function(reason, userId) {
  this.status = 'disputed';
  this.disputeReason = reason;
  this.notes.push({
    content: `اختلاف ثبت شد: ${reason}`,
    addedBy: userId
  });
  return this.save();
};

// متد: حل اختلاف
groupSettlementSchema.methods.resolveDispute = function(resolution, userId) {
  this.status = 'pending';
  this.disputeResolvedAt = new Date();
  this.notes.push({
    content: `اختلاف حل شد: ${resolution}`,
    addedBy: userId
  });
  return this.save();
};

// متد استاتیک: محاسبه خالص بدهی بین دو صراف
groupSettlementSchema.statics.calculateNetBalance = async function(sarafi1Id, sarafi2Id, groupId = null) {
  const query = {
    status: { $in: ['pending', 'executor_settled'] },
    $or: [
      { ownerSarafi: sarafi1Id, executorSarafi: sarafi2Id },
      { ownerSarafi: sarafi2Id, executorSarafi: sarafi1Id }
    ]
  };

  if (groupId) {
    query.group = groupId;
  }

  const settlements = await this.find(query);

  let sarafi1Owes = 0; // مبلغی که صراف 1 به صراف 2 بدهکار است
  let sarafi2Owes = 0; // مبلغی که صراف 2 به صراف 1 بدهکار است

  settlements.forEach(settlement => {
    const amount = settlement.amounts.interSarafiTotal;
    if (settlement.ownerSarafi.toString() === sarafi1Id.toString()) {
      sarafi1Owes += amount;
    } else {
      sarafi2Owes += amount;
    }
  });

  const netBalance = sarafi1Owes - sarafi2Owes;

  return {
    sarafi1Owes,
    sarafi2Owes,
    netBalance, // مثبت = صراف 1 بدهکار، منفی = صراف 2 بدهکار
    settlements: settlements.length
  };
};

module.exports = mongoose.model('GroupSettlement', groupSettlementSchema);
