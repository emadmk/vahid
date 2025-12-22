const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // لاگ برای توسعه‌دهنده
  console.error(err);

  // خطای Mongoose - آی‌دی نامعتبر
  if (err.name === 'CastError') {
    error.message = 'منبع مورد نظر یافت نشد';
    error.statusCode = 404;
  }

  // خطای Mongoose - کلید تکراری
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const fieldNames = {
      email: 'ایمیل',
      phone: 'شماره موبایل',
      code: 'کد'
    };
    error.message = `${fieldNames[field] || field} قبلا ثبت شده است`;
    error.statusCode = 400;
  }

  // خطای Mongoose - اعتبارسنجی
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(val => val.message);
    error.message = messages.join('، ');
    error.statusCode = 400;
  }

  // خطای JWT
  if (err.name === 'JsonWebTokenError') {
    error.message = 'توکن نامعتبر است';
    error.statusCode = 401;
  }

  // توکن منقضی شده
  if (err.name === 'TokenExpiredError') {
    error.message = 'توکن منقضی شده است';
    error.statusCode = 401;
  }

  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message || 'خطای سرور'
  });
};

module.exports = errorHandler;
