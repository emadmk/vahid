const User = require('../models/User');
const emailService = require('../services/emailService');
const walletService = require('../services/walletService');

// ثبت‌نام
exports.register = async (req, res, next) => {
  try {
    const { firstName, lastName, email, password, phone, role, selectedSarafi } = req.body;

    // بررسی وجود کاربر
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'این ایمیل قبلا ثبت شده است'
      });
    }

    // ایجاد کاربر
    const user = await User.create({
      firstName,
      lastName,
      email,
      password,
      phone,
      role: role === 'sarafi' ? 'sarafi' : 'user',
      selectedSarafi: role !== 'sarafi' ? selectedSarafi : undefined,
      status: 'pending'
    });

    // ایجاد OTP و ارسال ایمیل
    const otp = user.generateOtp('email');
    await user.save();

    await emailService.sendOtp(email, otp);

    res.status(201).json({
      success: true,
      message: 'ثبت‌نام با موفقیت انجام شد. کد تایید به ایمیل شما ارسال شد.',
      data: {
        userId: user._id,
        email: user.email
      }
    });
  } catch (error) {
    next(error);
  }
};

// تایید ایمیل با OTP
exports.verifyEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({
      email,
      emailOtp: otp,
      emailOtpExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'کد تایید نامعتبر یا منقضی شده است'
      });
    }

    user.isEmailVerified = true;
    user.emailOtp = undefined;
    user.emailOtpExpire = undefined;
    await user.save();

    // ایجاد کیف پول‌ها برای کاربران عادی
    if (user.role === 'user') {
      try {
        await walletService.createWalletsForUser(user._id, user.selectedSarafi);
      } catch (walletError) {
        console.error('خطا در ایجاد کیف پول:', walletError);
      }
    }

    // ارسال ایمیل خوش‌آمدگویی
    await emailService.sendWelcome(user.email, user.firstName);

    // ایجاد توکن
    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      message: 'ایمیل با موفقیت تایید شد',
      token,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          status: user.status
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// ارسال مجدد OTP
exports.resendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'کاربر یافت نشد'
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: 'ایمیل قبلا تایید شده است'
      });
    }

    const otp = user.generateOtp('email');
    await user.save();

    await emailService.sendOtp(email, otp);

    res.status(200).json({
      success: true,
      message: 'کد تایید مجددا ارسال شد'
    });
  } catch (error) {
    next(error);
  }
};

// ورود
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'لطفا ایمیل و رمز عبور را وارد کنید'
      });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'ایمیل یا رمز عبور اشتباه است'
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'ایمیل یا رمز عبور اشتباه است'
      });
    }

    if (!user.isEmailVerified) {
      // ارسال مجدد OTP
      const otp = user.generateOtp('email');
      await user.save();
      await emailService.sendOtp(email, otp);

      return res.status(403).json({
        success: false,
        message: 'لطفا ابتدا ایمیل خود را تایید کنید. کد جدید ارسال شد.',
        requireVerification: true,
        email: user.email
      });
    }

    // آپدیت آخرین فعالیت
    user.lastActivity = Date.now();
    await user.save();

    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      token,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
          isEmailVerified: user.isEmailVerified,
          telegramNotifications: user.telegramNotifications
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

// دریافت اطلاعات کاربر فعلی
exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('selectedSarafi', 'firstName lastName sarafiInfo');

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// آپدیت پروفایل
exports.updateProfile = async (req, res, next) => {
  try {
    const allowedFields = ['firstName', 'lastName', 'phone', 'address', 'city', 'nationalCode'];
    const updateData = {};

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const user = await User.findByIdAndUpdate(req.user.id, updateData, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      message: 'پروفایل با موفقیت بروزرسانی شد',
      data: user
    });
  } catch (error) {
    next(error);
  }
};

// تغییر رمز عبور
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user.id).select('+password');

    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'رمز عبور فعلی اشتباه است'
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'رمز عبور با موفقیت تغییر کرد'
    });
  } catch (error) {
    next(error);
  }
};

// فراموشی رمز عبور
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'کاربری با این ایمیل یافت نشد'
      });
    }

    const otp = user.generateOtp('email');
    await user.save();

    await emailService.sendOtp(email, otp);

    res.status(200).json({
      success: true,
      message: 'کد بازیابی به ایمیل شما ارسال شد'
    });
  } catch (error) {
    next(error);
  }
};

// ریست رمز عبور
exports.resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({
      email,
      emailOtp: otp,
      emailOtpExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'کد نامعتبر یا منقضی شده است'
      });
    }

    user.password = newPassword;
    user.emailOtp = undefined;
    user.emailOtpExpire = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'رمز عبور با موفقیت تغییر کرد'
    });
  } catch (error) {
    next(error);
  }
};

// خروج (برای پاک کردن توکن در سمت کلاینت)
exports.logout = async (req, res, next) => {
  res.status(200).json({
    success: true,
    message: 'با موفقیت خارج شدید'
  });
};
