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
    // گروه‌بندی نقش‌ها: کارکنان صرافی شامل staff_rial, staff_currency, accountant
    const roleGroups = {
      sarafi: ['sarafi', 'staff_rial', 'staff_currency', 'accountant', 'staff'],
      admin: ['admin'],
      user: ['user']
    };

    // اگر نقش فعلی در لیست مجاز باشد
    let hasAccess = roles.includes(req.user.role);

    // یا اگر گروه نقش در لیست مجاز باشد
    if (!hasAccess) {
      for (const role of roles) {
        if (roleGroups[role] && roleGroups[role].includes(req.user.role)) {
          hasAccess = true;
          break;
        }
      }
    }

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'شما اجازه دسترسی به این بخش را ندارید'
      });
    }
    next();
  };
};

// دریافت صراف والد (برای کارکنان)
exports.getSarafiId = (user) => {
  if (user.role === 'sarafi') {
    return user._id;
  }
  // برای کارکنان، صراف والد را برگردان
  if (['staff_rial', 'staff_currency', 'accountant', 'staff'].includes(user.role)) {
    return user.parentSarafi || user._id;
  }
  return user._id;
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
