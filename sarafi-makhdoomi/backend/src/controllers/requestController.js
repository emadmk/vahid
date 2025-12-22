const Request = require('../models/Request');
const Currency = require('../models/Currency');
const User = require('../models/User');
const Settings = require('../models/Settings');
const notificationService = require('../services/notificationService');

// ایجاد درخواست جدید
exports.createRequest = async (req, res, next) => {
  try {
    const { type, currencyId, amount, notes, preferredContact } = req.body;
    const user = req.user;

    // بررسی تایید شدن کاربر
    if (user.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'حساب شما هنوز تایید نشده است'
      });
    }

    // دریافت ارز
    const currency = await Currency.findById(currencyId);
    if (!currency || !currency.isActive) {
      return res.status(404).json({
        success: false,
        message: 'ارز یافت نشد یا غیرفعال است'
      });
    }

    // دریافت تنظیمات
    const settings = await Settings.getSettings();

    // محاسبه نرخ بر اساس نوع درخواست
    const rate = type === 'buy' ? currency.sellRate : currency.buyRate;

    // محاسبه مبالغ
    const totalPrice = amount * rate;

    // محاسبه کارمزد
    let fee = 0;
    if (settings.feeSettings.type === 'percentage') {
      fee = (totalPrice * settings.feeSettings.value) / 100;
    } else {
      fee = settings.feeSettings.value;
    }

    // اعمال حداقل و حداکثر کارمزد
    if (settings.feeSettings.minFee > 0 && fee < settings.feeSettings.minFee) {
      fee = settings.feeSettings.minFee;
    }
    if (settings.feeSettings.maxFee > 0 && fee > settings.feeSettings.maxFee) {
      fee = settings.feeSettings.maxFee;
    }

    const finalPrice = totalPrice + fee;

    // زمان انقضای تایمر
    const timerDuration = settings.requestSettings.timerDuration || 60;
    const timerExpiry = new Date(Date.now() + timerDuration * 60 * 1000);

    // ایجاد درخواست
    const request = await Request.create({
      user: user._id,
      originalSarafi: user.selectedSarafi,
      type,
      currency: currency._id,
      amount,
      rate,
      totalPrice,
      fee,
      finalPrice,
      status: 'pending',
      visibility: 'pending',
      timerExpiry,
      notes,
      contactInfo: {
        phone: user.phone,
        email: user.email,
        preferredContact: preferredContact || 'phone'
      },
      statusHistory: [{
        status: 'pending',
        changedBy: user._id,
        date: new Date()
      }]
    });

    // آپدیت آمار کاربر
    user.totalRequests += 1;
    await user.save();

    // اعلان به صراف
    if (user.selectedSarafi) {
      const sarafi = await User.findById(user.selectedSarafi);
      if (sarafi) {
        await notificationService.notifyNewRequest(request, user, sarafi);
      }
    }

    // populate کردن اطلاعات
    await request.populate('currency', 'name nameFa symbol code');

    res.status(201).json({
      success: true,
      message: 'درخواست با موفقیت ثبت شد',
      data: request
    });
  } catch (error) {
    next(error);
  }
};

// دریافت درخواست‌های کاربر
exports.getMyRequests = async (req, res, next) => {
  try {
    const { status, type, page = 1, limit = 10 } = req.query;

    const query = { user: req.user._id };
    if (status) query.status = status;
    if (type) query.type = type;

    const skip = (page - 1) * limit;

    const requests = await Request.find(query)
      .populate('currency', 'name nameFa symbol code')
      .populate('originalSarafi', 'firstName lastName sarafiInfo')
      .populate('acceptedBy', 'firstName lastName sarafiInfo')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Request.countDocuments(query);

    res.status(200).json({
      success: true,
      count: requests.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: requests
    });
  } catch (error) {
    next(error);
  }
};

// دریافت یک درخواست
exports.getRequest = async (req, res, next) => {
  try {
    const request = await Request.findById(req.params.id)
      .populate('currency', 'name nameFa symbol code')
      .populate('user', 'firstName lastName phone email')
      .populate('originalSarafi', 'firstName lastName sarafiInfo')
      .populate('acceptedBy', 'firstName lastName sarafiInfo');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'درخواست یافت نشد'
      });
    }

    // بررسی دسترسی
    const isOwner = request.user._id.toString() === req.user._id.toString();
    const isSarafi = req.user.role === 'sarafi';
    const isAdmin = req.user.role === 'admin';
    const isAssignedSarafi = request.originalSarafi?._id.toString() === req.user._id.toString();
    const isAcceptedSarafi = request.acceptedBy?._id.toString() === req.user._id.toString();

    if (!isOwner && !isAdmin && !isAssignedSarafi && !isAcceptedSarafi) {
      // اگر عمومی باشه همه صراف‌ها می‌تونن ببینن
      if (request.visibility !== 'public' || !isSarafi) {
        return res.status(403).json({
          success: false,
          message: 'شما اجازه دسترسی به این درخواست را ندارید'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: request
    });
  } catch (error) {
    next(error);
  }
};

// لغو درخواست توسط کاربر
exports.cancelRequest = async (req, res, next) => {
  try {
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'درخواست یافت نشد'
      });
    }

    if (request.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'شما اجازه لغو این درخواست را ندارید'
      });
    }

    // فقط درخواست‌های در انتظار قابل لغو هستند
    if (!['pending', 'waiting_public', 'public'].includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: 'این درخواست قابل لغو نیست'
      });
    }

    request.status = 'cancelled';
    request.cancellationReason = req.body.reason || 'لغو توسط کاربر';
    request.statusHistory.push({
      status: 'cancelled',
      changedBy: req.user._id,
      reason: request.cancellationReason,
      date: new Date()
    });
    await request.save();

    res.status(200).json({
      success: true,
      message: 'درخواست با موفقیت لغو شد',
      data: request
    });
  } catch (error) {
    next(error);
  }
};

// دریافت درخواست‌های عمومی
exports.getPublicRequests = async (req, res, next) => {
  try {
    const { type, currencyId, page = 1, limit = 20 } = req.query;

    const query = {
      visibility: 'public',
      status: { $in: ['public', 'waiting_public'] }
    };

    if (type) query.type = type;
    if (currencyId) query.currency = currencyId;

    const skip = (page - 1) * limit;

    const requests = await Request.find(query)
      .populate('currency', 'name nameFa symbol code')
      .select('-contactInfo -internalNotes')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Request.countDocuments(query);

    res.status(200).json({
      success: true,
      count: requests.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: requests
    });
  } catch (error) {
    next(error);
  }
};

// ========== عملیات صراف ==========

// دریافت درخواست‌های صراف
exports.getSarafiRequests = async (req, res, next) => {
  try {
    const { status, type, visibility, page = 1, limit = 10 } = req.query;

    const query = {
      $or: [
        { originalSarafi: req.user._id },
        { acceptedBy: req.user._id }
      ]
    };

    if (status) query.status = status;
    if (type) query.type = type;
    if (visibility) query.visibility = visibility;

    const skip = (page - 1) * limit;

    const requests = await Request.find(query)
      .populate('currency', 'name nameFa symbol code')
      .populate('user', 'firstName lastName phone email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Request.countDocuments(query);

    res.status(200).json({
      success: true,
      count: requests.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: requests
    });
  } catch (error) {
    next(error);
  }
};

// تصمیم صراف: عمومی یا خصوصی
exports.setRequestVisibility = async (req, res, next) => {
  try {
    const { visibility } = req.body; // 'public' or 'private'
    const request = await Request.findById(req.params.id).populate('user');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'درخواست یافت نشد'
      });
    }

    // بررسی دسترسی
    if (request.originalSarafi.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'شما اجازه تغییر این درخواست را ندارید'
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'این درخواست قبلا پردازش شده است'
      });
    }

    request.visibility = visibility;
    request.sarafiDecisionAt = new Date();

    if (visibility === 'public') {
      request.status = 'public';
      await notificationService.notifyRequestPublic(request, request.user);
    } else {
      request.status = 'private';
      request.acceptedBy = req.user._id;
      await notificationService.notifyRequestPrivate(request, request.user, req.user);
    }

    request.statusHistory.push({
      status: request.status,
      changedBy: req.user._id,
      date: new Date()
    });

    await request.save();

    res.status(200).json({
      success: true,
      message: visibility === 'public' ? 'درخواست به بخش عمومی منتقل شد' : 'درخواست بصورت خصوصی در پیگیری شماست',
      data: request
    });
  } catch (error) {
    next(error);
  }
};

// پذیرش درخواست عمومی
exports.acceptPublicRequest = async (req, res, next) => {
  try {
    const request = await Request.findById(req.params.id).populate('user');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'درخواست یافت نشد'
      });
    }

    if (request.visibility !== 'public' || request.status !== 'public') {
      return res.status(400).json({
        success: false,
        message: 'این درخواست عمومی نیست یا قبلا پذیرفته شده'
      });
    }

    request.acceptedBy = req.user._id;
    request.acceptedAt = new Date();
    request.status = 'accepted';
    request.statusHistory.push({
      status: 'accepted',
      changedBy: req.user._id,
      date: new Date()
    });

    await request.save();

    // اعلان به کاربر
    await notificationService.notifyRequestAccepted(request, request.user, req.user);

    res.status(200).json({
      success: true,
      message: 'درخواست با موفقیت پذیرفته شد',
      data: request
    });
  } catch (error) {
    next(error);
  }
};

// تغییر وضعیت به در حال انجام
exports.setInProgress = async (req, res, next) => {
  try {
    const request = await Request.findById(req.params.id);

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'درخواست یافت نشد'
      });
    }

    // بررسی دسترسی
    const isAssigned = request.acceptedBy?.toString() === req.user._id.toString() ||
                       request.originalSarafi?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isAssigned && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'شما اجازه تغییر این درخواست را ندارید'
      });
    }

    if (!['accepted', 'private'].includes(request.status)) {
      return res.status(400).json({
        success: false,
        message: 'وضعیت فعلی درخواست اجازه این تغییر را نمی‌دهد'
      });
    }

    request.status = 'in_progress';
    request.internalNotes = req.body.notes || request.internalNotes;
    request.statusHistory.push({
      status: 'in_progress',
      changedBy: req.user._id,
      date: new Date()
    });

    await request.save();

    res.status(200).json({
      success: true,
      message: 'درخواست در حال انجام است',
      data: request
    });
  } catch (error) {
    next(error);
  }
};

// تکمیل درخواست
exports.completeRequest = async (req, res, next) => {
  try {
    const request = await Request.findById(req.params.id).populate('user');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'درخواست یافت نشد'
      });
    }

    // بررسی دسترسی
    const isAssigned = request.acceptedBy?.toString() === req.user._id.toString() ||
                       request.originalSarafi?.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isAssigned && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'شما اجازه تغییر این درخواست را ندارید'
      });
    }

    request.status = 'completed';
    request.completedAt = new Date();
    request.statusHistory.push({
      status: 'completed',
      changedBy: req.user._id,
      date: new Date()
    });

    await request.save();

    // آپدیت آمار کاربر
    const user = await User.findById(request.user._id);
    user.completedRequests += 1;
    await user.save();

    // اعلان
    await notificationService.notifyRequestCompleted(request, request.user);

    res.status(200).json({
      success: true,
      message: 'درخواست با موفقیت تکمیل شد',
      data: request
    });
  } catch (error) {
    next(error);
  }
};

// رد درخواست
exports.rejectRequest = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const request = await Request.findById(req.params.id).populate('user');

    if (!request) {
      return res.status(404).json({
        success: false,
        message: 'درخواست یافت نشد'
      });
    }

    // فقط ادمین می‌تونه رد کنه
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'فقط ادمین می‌تواند درخواست را رد کند'
      });
    }

    request.status = 'rejected';
    request.rejectionReason = reason;
    request.statusHistory.push({
      status: 'rejected',
      changedBy: req.user._id,
      reason,
      date: new Date()
    });

    await request.save();

    // اعلان
    await notificationService.notifyRequestRejected(request, request.user, reason);

    res.status(200).json({
      success: true,
      message: 'درخواست رد شد',
      data: request
    });
  } catch (error) {
    next(error);
  }
};

// ========== ادمین ==========

// دریافت همه درخواست‌ها (ادمین)
exports.getAllRequests = async (req, res, next) => {
  try {
    const { status, type, visibility, userId, sarafiId, page = 1, limit = 20 } = req.query;

    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;
    if (visibility) query.visibility = visibility;
    if (userId) query.user = userId;
    if (sarafiId) {
      query.$or = [
        { originalSarafi: sarafiId },
        { acceptedBy: sarafiId }
      ];
    }

    const skip = (page - 1) * limit;

    const requests = await Request.find(query)
      .populate('currency', 'name nameFa symbol code')
      .populate('user', 'firstName lastName phone email')
      .populate('originalSarafi', 'firstName lastName')
      .populate('acceptedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Request.countDocuments(query);

    res.status(200).json({
      success: true,
      count: requests.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: requests
    });
  } catch (error) {
    next(error);
  }
};

// آمار درخواست‌ها
exports.getRequestStats = async (req, res, next) => {
  try {
    const stats = await Request.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$finalPrice' }
        }
      }
    ]);

    const typeStats = await Request.aggregate([
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalAmount: { $sum: '$finalPrice' }
        }
      }
    ]);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayStats = await Request.countDocuments({
      createdAt: { $gte: today }
    });

    res.status(200).json({
      success: true,
      data: {
        byStatus: stats,
        byType: typeStats,
        todayCount: todayStats
      }
    });
  } catch (error) {
    next(error);
  }
};
