const jwt = require('jsonwebtoken');
const User = require('../models/User');

// محافظت از روت‌ها
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'برای دسترسی به این بخش باید وارد شوید'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id);

    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'کاربر یافت نشد'
      });
    }

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'توکن نامعتبر است'
    });
  }
};

// بررسی نقش
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'شما اجازه دسترسی به این بخش را ندارید'
      });
    }
    next();
  };
};

// بررسی تایید شدن کاربر
exports.requireApproved = async (req, res, next) => {
  if (req.user.status !== 'approved') {
    return res.status(403).json({
      success: false,
      message: 'حساب شما هنوز تایید نشده است'
    });
  }
  next();
};

// بررسی تایید ایمیل
exports.requireEmailVerified = async (req, res, next) => {
  if (!req.user.isEmailVerified) {
    return res.status(403).json({
      success: false,
      message: 'لطفا ابتدا ایمیل خود را تایید کنید'
    });
  }
  next();
};
