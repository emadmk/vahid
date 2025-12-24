const mongoose = require('mongoose');

/**
 * مدل رسید وصول - ثبت وصول‌های ریالی و ارزی
 * طبق سند: حداقل ۱ فایل الزامی، روش وصول و نام صاحب حساب الزامی
 */
const receiptSchema = new mongoose.Schema({
  // شماره رسید یکتا
  receiptNumber: {
    type: String,
    unique: true,
    required: true
  },

  // معامله مرتبط
  trade: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trade',
    required: true
  },

  // نوع وصول
  type: {
    type: String,
    enum: ['rial', 'currency'], // ریالی یا ارزی
    required: true
  },

  // ارز (برای وصول ارزی)
  currency: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Currency'
  },

  // مبلغ وصول‌شده
  amount: {
    type: Number,
    required: true,
    min: 0
  },

  // تاریخ و ساعت وصول
  collectionDate: {
    type: Date,
    required: true,
    default: Date.now
  },

  // ========== روش وصول (الزامی) ==========
  collectionMethod: {
    type: String,
    enum: [
      'bank_transfer',   // واریز بانکی
      'cash',            // نقدی
      'hawala',          // حواله
      'check',           // چک
      'barter',          // تهاتر
      'swift',           // سوئیفت (برای ارزی)
      'internal_transfer', // انتقال داخلی
      'other'            // سایر
    ],
    required: true
  },

  // توضیح روش (الزامی اگر "سایر")
  methodDescription: {
    type: String,
    required: function() {
      return this.collectionMethod === 'other';
    }
  },

  // ========== مشخصات حساب/صاحب حساب (الزامی) ==========
  accountHolder: {
    // نام صاحب حساب (الزامی)
    name: {
      type: String,
      required: true
    },
    // بانک/مقصد
    bank: {
      type: String
    },
    // شماره حساب
    accountNumber: {
      type: String
    },
    // شماره شبا
    iban: {
      type: String
    }
  },

  // شماره پیگیری/مرجع (الزامی در روش‌های بانکی/حواله)
  trackingNumber: {
    type: String,
    required: function() {
      return ['bank_transfer', 'hawala', 'swift', 'check'].includes(this.collectionMethod);
    }
  },

  // مرجع حواله/سوئیفت (برای ارزی)
  swiftReference: {
    type: String
  },

  // ========== فایل‌ها (الزامی - حداقل ۱ فایل) ==========
  files: [{
    filename: {
      type: String,
      required: true
    },
    originalName: {
      type: String,
      required: true
    },
    mimetype: {
      type: String,
      required: true,
      enum: ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    },
    size: {
      type: Number,
      max: 10 * 1024 * 1024 // حداکثر 10 مگابایت
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // ========== وضعیت ==========
  status: {
    type: String,
    enum: [
      'draft',      // پیش‌نویس
      'submitted',  // ثبت شده
      'pending',    // در انتظار تایید
      'confirmed',  // تایید شده
      'rejected',   // رد شده
      'final'       // نهایی (غیرقابل تغییر)
    ],
    default: 'draft'
  },

  // دلیل رد
  rejectionReason: {
    type: String
  },

  // ========== کاربران مرتبط ==========

  // کاربر ثبت‌کننده
  createdBy: {
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

  // مشتری
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // تایید کننده
  confirmedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // تاریخ تایید
  confirmedAt: {
    type: Date
  },

  // ========== توضیحات ==========
  notes: {
    type: String,
    maxlength: 1000
  },

  // یادداشت‌های داخلی (حسابداری)
  accountingNotes: [{
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

  // ========== سند اصلاحی ==========
  // اگر این وصول اصلاح شده باشد
  isAmendment: {
    type: Boolean,
    default: false
  },

  // رسید اصلی (اگر این سند اصلاحی است)
  originalReceipt: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Receipt'
  },

  // رسید اصلاحی (اگر این رسید اصلاح شده)
  amendedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Receipt'
  },

  // دلیل اصلاح
  amendmentReason: {
    type: String
  },

  // ========== لاگ تغییرات ==========
  statusHistory: [{
    status: String,
    changedAt: {
      type: Date,
      default: Date.now
    },
    changedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String
  }],

  // متادیتا
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// ایندکس‌ها
receiptSchema.index({ receiptNumber: 1 });
receiptSchema.index({ trade: 1, type: 1 });
receiptSchema.index({ sarafi: 1, status: 1, createdAt: -1 });
receiptSchema.index({ customer: 1, status: 1 });
receiptSchema.index({ createdBy: 1, status: 1 });
receiptSchema.index({ status: 1, collectionDate: -1 });

// تولید شماره رسید یکتا
receiptSchema.statics.generateReceiptNumber = function(type) {
  const prefix = type === 'rial' ? 'RRC' : 'FXC'; // Rial Receipt Collection / FX Collection
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${year}${month}${day}-${random}`;
};

// اعتبارسنجی قبل از ذخیره
receiptSchema.pre('save', function(next) {
  // اگر وضعیت submitted یا بالاتر است، حداقل یک فایل الزامی است
  if (['submitted', 'pending', 'confirmed', 'final'].includes(this.status)) {
    if (!this.files || this.files.length === 0) {
      return next(new Error('حداقل یک فایل الزامی است'));
    }
  }

  // اگر وضعیت final است، تغییر ممنوع
  if (!this.isNew && this.isModified('status')) {
    const originalStatus = this._originalStatus;
    if (originalStatus === 'final' && this.status !== 'final') {
      return next(new Error('رسید نهایی شده قابل تغییر نیست. برای اصلاح از سند اصلاحی استفاده کنید.'));
    }
  }

  next();
});

// ذخیره وضعیت اصلی قبل از تغییر
receiptSchema.pre('init', function(doc) {
  this._originalStatus = doc.status;
});

// متد تغییر وضعیت با ثبت تاریخچه
receiptSchema.methods.changeStatus = async function(newStatus, userId, reason) {
  const oldStatus = this.status;
  this.status = newStatus;

  this.statusHistory.push({
    status: newStatus,
    changedAt: new Date(),
    changedBy: userId,
    reason: reason || `تغییر از ${oldStatus} به ${newStatus}`
  });

  if (newStatus === 'confirmed') {
    this.confirmedBy = userId;
    this.confirmedAt = new Date();
  }

  await this.save();
  return this;
};

// متد ایجاد سند اصلاحی
receiptSchema.methods.createAmendment = async function(amendmentData, userId) {
  if (this.status !== 'final') {
    throw new Error('فقط رسیدهای نهایی قابل اصلاح هستند');
  }

  const Receipt = mongoose.model('Receipt');

  const amendment = new Receipt({
    ...amendmentData,
    receiptNumber: await Receipt.generateReceiptNumber(this.type),
    trade: this.trade,
    type: this.type,
    currency: this.currency,
    sarafi: this.sarafi,
    customer: this.customer,
    isAmendment: true,
    originalReceipt: this._id,
    createdBy: userId,
    status: 'draft'
  });

  await amendment.save();

  // ثبت در رسید اصلی
  this.amendedBy = amendment._id;
  await this.save();

  return amendment;
};

module.exports = mongoose.model('Receipt', receiptSchema);
