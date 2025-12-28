const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const userSchema = new mongoose.Schema({
  // اطلاعات پایه
  firstName: {
    type: String,
    required: [true, 'نام الزامی است'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'نام خانوادگی الزامی است'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'ایمیل الزامی است'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'ایمیل معتبر نیست']
  },
  phone: {
    type: String,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'رمز عبور الزامی است'],
    minlength: 6,
    select: false
  },

  // الزام تغییر رمز در اولین ورود
  mustChangePassword: {
    type: Boolean,
    default: false
  },

  // رمز موقت (توسط صراف تعیین شده)
  isTemporaryPassword: {
    type: Boolean,
    default: false
  },

  // تاریخ آخرین تغییر رمز
  passwordChangedAt: Date,

  // معرفی‌کننده (صراف)
  introducedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // نقش کاربر
  role: {
    type: String,
    enum: ['user', 'sarafi', 'admin'],
    default: 'user'
  },

  // وضعیت تایید
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'suspended'],
    default: 'pending'
  },

  // برای کاربر عادی - صراف انتخاب شده
  selectedSarafi: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // وضعیت تایید توسط صراف
  sarafiApprovalStatus: {
    type: String,
    enum: ['pending', 'approved', 'unknown', 'rejected'],
    default: 'pending'
  },

  // علت رد (در صورت رد شدن)
  rejectionReason: String,

  // مدارک احراز هویت (اختیاری فعلا)
  documents: {
    nationalCard: String,
    selfie: String,
    address: String
  },

  // کد ملی
  nationalCode: String,

  // آدرس
  address: String,
  city: String,

  // تلگرام
  telegramChatId: String,
  telegramUsername: String,
  telegramNotifications: {
    type: Boolean,
    default: false
  },

  // تایید ایمیل
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  emailOtp: String,
  emailOtpExpire: Date,

  // تایید موبایل
  isPhoneVerified: {
    type: Boolean,
    default: false
  },
  phoneOtp: String,
  phoneOtpExpire: Date,

  // ریست پسورد
  resetPasswordToken: String,
  resetPasswordExpire: Date,

  // اطلاعات صراف (اگر نقش صراف باشد)
  sarafiInfo: {
    businessName: String,
    businessLicense: String,
    businessAddress: String,
    businessPhone: String,
    workingHours: String,
    description: String,
    logo: String
  },

  // آمار
  totalRequests: {
    type: Number,
    default: 0
  },
  completedRequests: {
    type: Number,
    default: 0
  },

  // آخرین فعالیت
  lastActivity: Date,

  // ========== فیلدهای جدید سیستم امتیازدهی ==========

  // امتیاز کاربر
  score: {
    type: Number,
    default: 0,
    min: 0
  },

  // امتیاز منفی (بلک‌پوینت)
  blackPoints: {
    type: Number,
    default: 0,
    min: 0
  },

  // دسته‌بندی مشتری
  tier: {
    type: String,
    enum: ['A', 'B', 'C', 'new'],
    default: 'new'
  },

  // تعداد لغوها
  cancellationCount: {
    type: Number,
    default: 0
  },

  // ========== وضعیت تعلیق ==========

  suspension: {
    isSuspended: {
      type: Boolean,
      default: false
    },
    suspendedAt: Date,
    suspendedUntil: Date,
    reason: String,
    suspendedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },

  // ========== اطلاعات مالی مشتری ==========

  financialInfo: {
    // حجم کل معاملات (به ریال)
    totalTradeVolume: {
      type: Number,
      default: 0
    },
    // تعداد معاملات موفق
    successfulTrades: {
      type: Number,
      default: 0
    },
    // آخرین معامله
    lastTradeDate: Date,
    // میانگین حجم معاملات
    averageTradeVolume: {
      type: Number,
      default: 0
    }
  },

  // ========== اطلاعات اضافی صراف ==========

  sarafiStats: {
    // امتیاز صراف (1 امتیاز به ازای هر 10 میلیارد ریال)
    score: {
      type: Number,
      default: 0
    },
    // تعداد مشتریان فعال
    activeCustomers: {
      type: Number,
      default: 0
    },
    // حجم کل معاملات
    totalVolume: {
      type: Number,
      default: 0
    },
    // نرخ موفقیت معاملات
    successRate: {
      type: Number,
      default: 100
    },
    // میانگین زمان پاسخگویی (به دقیقه)
    avgResponseTime: {
      type: Number,
      default: 0
    }
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// هش کردن پسورد قبل از ذخیره
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// مقایسه پسورد
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// ساخت توکن JWT
userSchema.methods.getSignedJwtToken = function() {
  return jwt.sign({ id: this._id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// ساخت OTP
userSchema.methods.generateOtp = function(type = 'email') {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  if (type === 'email') {
    this.emailOtp = otp;
    this.emailOtpExpire = Date.now() + 10 * 60 * 1000; // 10 دقیقه
  } else {
    this.phoneOtp = otp;
    this.phoneOtpExpire = Date.now() + 10 * 60 * 1000;
  }

  return otp;
};

// نام کامل
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// بررسی تعلیق
userSchema.virtual('isCurrentlySuspended').get(function() {
  if (!this.suspension?.isSuspended) return false;
  if (!this.suspension.suspendedUntil) return true;
  return new Date() < this.suspension.suspendedUntil;
});

// ========== Client Health Indicator ==========
// شاخص سلامت مشتری - سبز/زرد/قرمز
userSchema.virtual('healthIndicator').get(function() {
  // محاسبه امتیاز سلامت (0-100)
  let healthScore = 100;

  // کسر امتیاز بر اساس بلک‌پوینت
  healthScore -= this.blackPoints * 10;

  // کسر امتیاز بر اساس تعداد لغوها
  healthScore -= this.cancellationCount * 5;

  // کسر امتیاز اگر تعلیق شده
  if (this.isCurrentlySuspended) {
    healthScore -= 50;
  }

  // بررسی نسبت لغو به معاملات
  if (this.totalRequests > 0) {
    const cancelRate = this.cancellationCount / this.totalRequests;
    if (cancelRate > 0.3) healthScore -= 20;
    else if (cancelRate > 0.1) healthScore -= 10;
  }

  // تعیین رنگ
  healthScore = Math.max(0, Math.min(100, healthScore));

  let status, color, label;
  if (healthScore >= 70) {
    status = 'green';
    color = '#22c55e';
    label = 'خوش‌حساب';
  } else if (healthScore >= 40) {
    status = 'yellow';
    color = '#eab308';
    label = 'نیاز به توجه';
  } else {
    status = 'red';
    color = '#ef4444';
    label = 'پرریسک';
  }

  return {
    score: healthScore,
    status,
    color,
    label,
    factors: {
      blackPoints: this.blackPoints,
      cancellationCount: this.cancellationCount,
      isSuspended: this.isCurrentlySuspended,
      tier: this.tier
    }
  };
});

// متد به‌روزرسانی دسته بر اساس امتیاز
userSchema.methods.updateTier = async function() {
  let newTier = 'new';

  if (this.score >= 1000) {
    newTier = 'A';
  } else if (this.score >= 500) {
    newTier = 'B';
  } else if (this.score >= 100) {
    newTier = 'C';
  }

  if (this.tier !== newTier) {
    this.tier = newTier;
    await this.save();
  }

  return newTier;
};

// متد اضافه کردن امتیاز
userSchema.methods.addScore = async function(points) {
  this.score += points;
  await this.updateTier();
  return this.score;
};

// متد کم کردن امتیاز و اضافه کردن بلک‌پوینت (برای لغو)
userSchema.methods.applyCancellationPenalty = async function() {
  // کم کردن 100 امتیاز
  this.score = Math.max(0, this.score - 100);
  // اضافه کردن 1 بلک‌پوینت
  this.blackPoints += 1;
  // افزایش تعداد لغوها
  this.cancellationCount += 1;

  await this.updateTier();
  return {
    newScore: this.score,
    blackPoints: this.blackPoints,
    tier: this.tier
  };
};

// متد تعلیق کاربر
userSchema.methods.suspend = async function(reason, duration, suspendedBy) {
  this.suspension = {
    isSuspended: true,
    suspendedAt: new Date(),
    suspendedUntil: duration ? new Date(Date.now() + duration) : null,
    reason,
    suspendedBy
  };
  await this.save();
};

// متد رفع تعلیق
userSchema.methods.unsuspend = async function() {
  this.suspension = {
    isSuspended: false,
    suspendedAt: null,
    suspendedUntil: null,
    reason: null,
    suspendedBy: null
  };
  await this.save();
};

// متد به‌روزرسانی آمار مالی
userSchema.methods.updateFinancialStats = async function(tradeAmount) {
  const stats = this.financialInfo;
  stats.totalTradeVolume += tradeAmount;
  stats.successfulTrades += 1;
  stats.lastTradeDate = new Date();
  stats.averageTradeVolume = stats.totalTradeVolume / stats.successfulTrades;

  // محاسبه امتیاز جدید (1 امتیاز به ازای هر 100 میلیون ریال)
  const newPoints = Math.floor(tradeAmount / 100000000);
  if (newPoints > 0) {
    await this.addScore(newPoints);
  }

  await this.save();
};

// متد به‌روزرسانی آمار صراف
userSchema.methods.updateSarafiStats = async function(tradeAmount) {
  if (this.role !== 'sarafi') return;

  const stats = this.sarafiStats;
  stats.totalVolume += tradeAmount;

  // محاسبه امتیاز صراف (1 امتیاز به ازای هر 10 میلیارد ریال)
  stats.score = Math.floor(stats.totalVolume / 10000000000);

  await this.save();
};

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', userSchema);
