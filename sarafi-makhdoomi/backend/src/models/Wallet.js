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

// ایندکس برای جستجوی سریع
walletSchema.index({ user: 1, type: 1 }, { unique: true });

walletSchema.set('toJSON', { virtuals: true });
walletSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Wallet', walletSchema);
