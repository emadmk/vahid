const mongoose = require('mongoose');

const sarafiRateHistorySchema = new mongoose.Schema({
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

  // نرخ قبلی
  previousBuyRate: Number,
  previousSellRate: Number,

  // نرخ جدید
  newBuyRate: {
    type: Number,
    required: true
  },
  newSellRate: {
    type: Number,
    required: true
  },

  // درصد تغییر
  buyRateChange: Number,
  sellRateChange: Number,

  // تغییردهنده
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // نقش تغییردهنده
  changedByRole: {
    type: String,
    enum: ['sarafi', 'staff', 'admin'],
    default: 'sarafi'
  },

  // دلیل تغییر (اختیاری)
  reason: String,

  // آدرس IP
  ipAddress: String
}, {
  timestamps: true
});

// ایندکس‌ها
sarafiRateHistorySchema.index({ sarafi: 1, createdAt: -1 });
sarafiRateHistorySchema.index({ currency: 1, createdAt: -1 });
sarafiRateHistorySchema.index({ sarafi: 1, currency: 1, createdAt: -1 });

// محاسبه درصد تغییر قبل از ذخیره
sarafiRateHistorySchema.pre('save', function(next) {
  if (this.previousBuyRate && this.previousBuyRate > 0) {
    this.buyRateChange = ((this.newBuyRate - this.previousBuyRate) / this.previousBuyRate) * 100;
  }
  if (this.previousSellRate && this.previousSellRate > 0) {
    this.sellRateChange = ((this.newSellRate - this.previousSellRate) / this.previousSellRate) * 100;
  }
  next();
});

module.exports = mongoose.model('SarafiRateHistory', sarafiRateHistorySchema);
