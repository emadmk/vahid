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

userSchema.set('toJSON', { virtuals: true });
userSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('User', userSchema);
