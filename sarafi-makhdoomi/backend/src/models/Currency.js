const mongoose = require('mongoose');

const currencySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
    // unique: false - حذف شد چون code باید unique باشد نه name
  },
  nameFa: {
    type: String,
    required: true
  },
  symbol: {
    type: String,
    required: true
  },
  icon: String,
  code: {
    type: String,
    required: true,
    unique: true
  },

  // نرخ خرید (قیمتی که صرافی از مشتری می‌خرد)
  buyRate: {
    type: Number,
    required: true,
    default: 0
  },

  // نرخ فروش (قیمتی که صرافی به مشتری می‌فروشد)
  sellRate: {
    type: Number,
    required: true,
    default: 0
  },

  // واحد (مثلا هر 1 دلار یا هر 1 گرم طلا)
  unit: {
    type: String,
    default: '1'
  },

  // نوع ارز
  type: {
    type: String,
    enum: ['fiat', 'crypto', 'gold'],
    default: 'fiat'
  },

  // ترتیب نمایش
  order: {
    type: Number,
    default: 0
  },

  // فعال/غیرفعال
  isActive: {
    type: Boolean,
    default: true
  },

  // آخرین به‌روزرسانی نرخ
  lastRateUpdate: {
    type: Date,
    default: Date.now
  },

  // تاریخچه نرخ‌ها
  rateHistory: [{
    buyRate: Number,
    sellRate: Number,
    date: {
      type: Date,
      default: Date.now
    },
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Currency', currencySchema);
