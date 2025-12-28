const mongoose = require('mongoose');

// مدل کیف پول - هر مشتری دو کیف پول دارد: نقدی و اعتباری
const walletSchema = new mongoose.Schema({
  // صاحب کیف پول
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // نوع کیف پول
  type: {
    type: String,
    enum: ['cash', 'credit'], // نقدی یا اعتباری
    required: true
  },

  // موجودی فعلی (به ریال)
  balance: {
    type: Number,
    default: 0,
    min: 0
  },

  // سقف اعتبار (فقط برای کیف پول اعتباری)
  creditLimit: {
    type: Number,
    default: 0
  },

  // اعتبار مصرف شده (فقط برای کیف پول اعتباری)
  usedCredit: {
    type: Number,
    default: 0
  },

  // ========== Shadow Balance - مانده در تعهد ==========
  // مبلغ رزرو شده برای سفارش‌های باز (هنوز اجرا نشده)
  committedBalance: {
    type: Number,
    default: 0,
    min: 0
  },

  // تفکیک تعهدات بر اساس سفارش
  commitments: [{
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    amount: Number,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // وضعیت کیف پول
  isActive: {
    type: Boolean,
    default: true
  },

  // آخرین تراکنش
  lastTransaction: {
    type: Date
  },

  // صراف مدیریت‌کننده
  managedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// محاسبه اعتبار قابل استفاده
walletSchema.virtual('availableCredit').get(function() {
  if (this.type === 'credit') {
    return this.creditLimit - this.usedCredit;
  }
  return this.balance;
});

// ========== Shadow Balance Virtuals ==========
// محاسبه مانده قابل برداشت واقعی (کسر تعهدات)
walletSchema.virtual('availableBalance').get(function() {
  if (this.type === 'cash') {
    return Math.max(0, this.balance - this.committedBalance);
  }
  // برای اعتباری: سقف - مصرف‌شده - تعهدات
  return Math.max(0, this.creditLimit - this.usedCredit - this.committedBalance);
});

// مجموع در تعهد
walletSchema.virtual('totalCommitted').get(function() {
  return this.committedBalance || 0;
});

// متد رزرو مبلغ برای سفارش
walletSchema.methods.commitForOrder = async function(orderId, amount) {
  const availableBalance = this.type === 'cash'
    ? this.balance - this.committedBalance
    : this.creditLimit - this.usedCredit - this.committedBalance;

  if (amount > availableBalance) {
    throw new Error('موجودی قابل رزرو کافی نیست');
  }

  this.committedBalance += amount;
  this.commitments.push({
    orderId,
    amount,
    createdAt: new Date()
  });

  await this.save();
  return this;
};

// متد آزادسازی رزرو (هنگام لغو سفارش)
walletSchema.methods.releaseCommitment = async function(orderId) {
  const commitment = this.commitments.find(c =>
    c.orderId && c.orderId.toString() === orderId.toString()
  );

  if (commitment) {
    this.committedBalance = Math.max(0, this.committedBalance - commitment.amount);
    this.commitments = this.commitments.filter(c =>
      !c.orderId || c.orderId.toString() !== orderId.toString()
    );
    await this.save();
  }

  return this;
};

// متد اجرای تعهد (هنگام Match شدن سفارش)
walletSchema.methods.executeCommitment = async function(orderId, executedAmount) {
  const commitment = this.commitments.find(c =>
    c.orderId && c.orderId.toString() === orderId.toString()
  );

  if (commitment) {
    // کسر از تعهد
    this.committedBalance = Math.max(0, this.committedBalance - executedAmount);

    // کسر از موجودی واقعی
    if (this.type === 'cash') {
      this.balance = Math.max(0, this.balance - executedAmount);
    } else {
      this.usedCredit += executedAmount;
    }

    // بروزرسانی یا حذف تعهد
    if (commitment.amount <= executedAmount) {
      this.commitments = this.commitments.filter(c =>
        !c.orderId || c.orderId.toString() !== orderId.toString()
      );
    } else {
      commitment.amount -= executedAmount;
    }

    this.lastTransaction = new Date();
    await this.save();
  }

  return this;
};

// ایندکس برای جستجوی سریع
walletSchema.index({ user: 1, type: 1 }, { unique: true });

walletSchema.set('toJSON', { virtuals: true });
walletSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Wallet', walletSchema);
