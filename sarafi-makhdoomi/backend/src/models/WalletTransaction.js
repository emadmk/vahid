const mongoose = require('mongoose');

// مدل تراکنش کیف پول - ثبت تمام عملیات مالی
const walletTransactionSchema = new mongoose.Schema({
  // کیف پول مربوطه
  wallet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Wallet',
    required: true
  },

  // کاربر
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // نوع تراکنش
  type: {
    type: String,
    enum: [
      'deposit',           // واریز نقدی
      'withdraw',          // برداشت نقدی
      'credit_use',        // استفاده از اعتبار
      'credit_repay',      // بازپرداخت اعتبار
      'credit_increase',   // افزایش سقف اعتبار
      'credit_decrease',   // کاهش سقف اعتبار
      'trade_buy',         // خرید ارز
      'trade_sell',        // فروش ارز
      'commission',        // کارمزد
      'penalty',           // جریمه
      'refund',            // استرداد
      'transfer_in',       // انتقال ورودی
      'transfer_out'       // انتقال خروجی
    ],
    required: true
  },

  // مبلغ (به ریال)
  amount: {
    type: Number,
    required: true
  },

  // موجودی قبلی
  balanceBefore: {
    type: Number,
    required: true
  },

  // موجودی بعدی
  balanceAfter: {
    type: Number,
    required: true
  },

  // ارز مرتبط (در صورت وجود)
  currency: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Currency'
  },

  // معامله مرتبط (در صورت وجود)
  trade: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trade'
  },

  // درخواست مرتبط (در صورت وجود)
  request: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Request'
  },

  // توضیحات
  description: {
    type: String,
    maxlength: 500
  },

  // شماره مرجع یکتا
  referenceNumber: {
    type: String,
    unique: true,
    required: true
  },

  // وضعیت تراکنش
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'reversed'],
    default: 'completed'
  },

  // صراف انجام‌دهنده
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // متادیتا
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// ایندکس‌ها برای جستجوی سریع
walletTransactionSchema.index({ wallet: 1, createdAt: -1 });
walletTransactionSchema.index({ user: 1, createdAt: -1 });
walletTransactionSchema.index({ referenceNumber: 1 });
walletTransactionSchema.index({ trade: 1 });
walletTransactionSchema.index({ type: 1, createdAt: -1 });

// تولید شماره مرجع یکتا
walletTransactionSchema.statics.generateReferenceNumber = function() {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `TXN-${timestamp}-${random}`.toUpperCase();
};

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);
