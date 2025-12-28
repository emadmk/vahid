const mongoose = require('mongoose');

const sarafiRateSchema = new mongoose.Schema({
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

  // نرخ خرید (قیمتی که صراف از مشتری می‌خرد)
  buyRate: {
    type: Number,
    required: true
  },

  // نرخ فروش (قیمتی که صراف به مشتری می‌فروشد)
  sellRate: {
    type: Number,
    required: true
  },

  // زمان اعتبار نرخ (اختیاری)
  validUntil: {
    type: Date,
    default: null
  },

  // فعال/غیرفعال
  isActive: {
    type: Boolean,
    default: true
  },

  // آخرین به‌روزرسانی
  lastUpdate: {
    type: Date,
    default: Date.now
  },

  // ثبت‌کننده (می‌تواند صراف یا کارمند باشد)
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // یادداشت
  notes: String
}, {
  timestamps: true
});

// ایندکس‌ها
sarafiRateSchema.index({ sarafi: 1, currency: 1 }, { unique: true });
sarafiRateSchema.index({ sarafi: 1, isActive: 1 });
sarafiRateSchema.index({ lastUpdate: -1 });

// متد استاتیک برای دریافت نرخ صراف
sarafiRateSchema.statics.getRate = async function(sarafiId, currencyId) {
  return await this.findOne({
    sarafi: sarafiId,
    currency: currencyId,
    isActive: true
  }).populate('currency', 'code nameFa symbol');
};

// متد استاتیک برای دریافت همه نرخ‌های یک صراف
sarafiRateSchema.statics.getAllRates = async function(sarafiId) {
  return await this.find({
    sarafi: sarafiId,
    isActive: true
  }).populate('currency', 'code nameFa symbol icon');
};

module.exports = mongoose.model('SarafiRate', sarafiRateSchema);
