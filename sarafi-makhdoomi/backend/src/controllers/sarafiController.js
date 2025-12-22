const User = require('../models/User');
const Request = require('../models/Request');
const notificationService = require('../services/notificationService');

// دریافت اطلاعات صراف
exports.getProfile = async (req, res, next) => {
  try {
    const sarafi = await User.findById(req.user._id).select('-password');

    res.status(200).json({
      success: true,
      data: sarafi
    });
  } catch (error) {
    next(error);
  }
};

// بروزرسانی اطلاعات صراف
exports.updateProfile = async (req, res, next) => {
  try {
    const allowedFields = [
      'firstName', 'lastName', 'phone', 'address', 'city',
      'nationalCode', 'sarafiInfo'
    ];

    const updateData = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    const sarafi = await User.findByIdAndUpdate(req.user._id, updateData, {
      new: true,
      runValidators: true
    }).select('-password');

    res.status(200).json({
      success: true,
      message: 'پروفایل بروزرسانی شد',
      data: sarafi
    });
  } catch (error) {
    next(error);
  }
};

// دریافت مشتریان صراف
exports.getMyCustomers = async (req, res, next) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;

    const query = { selectedSarafi: req.user._id, role: 'user' };
    if (status) query.sarafiApprovalStatus = status;
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const customers = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      count: customers.length,
      total,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: customers
    });
  } catch (error) {
    next(error);
  }
};

// تایید مشتری
exports.approveCustomer = async (req, res, next) => {
  try {
    const customer = await User.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'کاربر یافت نشد'
      });
    }

    if (customer.selectedSarafi?.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'این کاربر مشتری شما نیست'
      });
    }

    customer.sarafiApprovalStatus = 'approved';
    customer.status = 'approved';
    await customer.save();

    await notificationService.notifyUserApproved(customer);

    res.status(200).json({
      success: true,
      message: 'مشتری تایید شد',
      data: customer
    });
  } catch (error) {
    next(error);
  }
};

// نمیشناسم - ارجاع به ادمین
exports.unknownCustomer = async (req, res, next) => {
  try {
    const customer = await User.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'کاربر یافت نشد'
      });
    }

    if (customer.selectedSarafi?.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'این کاربر مشتری شما نیست'
      });
    }

    customer.sarafiApprovalStatus = 'unknown';
    // برای ادمین بماند pending
    customer.status = 'pending';
    await customer.save();

    res.status(200).json({
      success: true,
      message: 'کاربر برای بررسی به ادمین ارسال شد',
      data: customer
    });
  } catch (error) {
    next(error);
  }
};

// رد مشتری
exports.rejectCustomer = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const customer = await User.findById(req.params.id);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: 'کاربر یافت نشد'
      });
    }

    if (customer.selectedSarafi?.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'این کاربر مشتری شما نیست'
      });
    }

    customer.sarafiApprovalStatus = 'rejected';
    customer.status = 'rejected';
    customer.rejectionReason = reason;
    await customer.save();

    await notificationService.notifyUserRejected(customer, reason);

    res.status(200).json({
      success: true,
      message: 'مشتری رد شد',
      data: customer
    });
  } catch (error) {
    next(error);
  }
};

// داشبورد صراف
exports.getDashboard = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // تعداد مشتریان
    const totalCustomers = await User.countDocuments({
      selectedSarafi: req.user._id,
      role: 'user'
    });

    const pendingCustomers = await User.countDocuments({
      selectedSarafi: req.user._id,
      role: 'user',
      sarafiApprovalStatus: 'pending'
    });

    // درخواست‌های من
    const myRequests = await Request.countDocuments({
      $or: [
        { originalSarafi: req.user._id },
        { acceptedBy: req.user._id }
      ]
    });

    const pendingRequests = await Request.countDocuments({
      originalSarafi: req.user._id,
      status: 'pending'
    });

    const privateRequests = await Request.countDocuments({
      $or: [
        { originalSarafi: req.user._id },
        { acceptedBy: req.user._id }
      ],
      visibility: 'private'
    });

    const completedRequests = await Request.countDocuments({
      $or: [
        { originalSarafi: req.user._id },
        { acceptedBy: req.user._id }
      ],
      status: 'completed'
    });

    // درخواست‌های عمومی موجود
    const publicRequests = await Request.countDocuments({
      visibility: 'public',
      status: 'public'
    });

    // درخواست‌های امروز
    const todayRequests = await Request.countDocuments({
      originalSarafi: req.user._id,
      createdAt: { $gte: today }
    });

    // آخرین درخواست‌ها
    const recentRequests = await Request.find({
      $or: [
        { originalSarafi: req.user._id },
        { acceptedBy: req.user._id }
      ]
    })
      .populate('user', 'firstName lastName')
      .populate('currency', 'nameFa symbol')
      .sort({ createdAt: -1 })
      .limit(5);

    // مشتریان جدید
    const recentCustomers = await User.find({
      selectedSarafi: req.user._id,
      role: 'user'
    })
      .select('firstName lastName email phone sarafiApprovalStatus createdAt')
      .sort({ createdAt: -1 })
      .limit(5);

    res.status(200).json({
      success: true,
      data: {
        customers: {
          total: totalCustomers,
          pending: pendingCustomers
        },
        requests: {
          total: myRequests,
          pending: pendingRequests,
          private: privateRequests,
          completed: completedRequests,
          today: todayRequests
        },
        publicRequests,
        recentRequests,
        recentCustomers
      }
    });
  } catch (error) {
    next(error);
  }
};

// آمار صراف
exports.getStats = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    const match = {
      $or: [
        { originalSarafi: req.user._id },
        { acceptedBy: req.user._id }
      ]
    };

    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }

    const stats = await Request.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$finalPrice' }
        }
      }
    ]);

    const typeStats = await Request.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalAmount: { $sum: '$finalPrice' }
        }
      }
    ]);

    const currencyStats = await Request.aggregate([
      { $match: { ...match, status: 'completed' } },
      {
        $lookup: {
          from: 'currencies',
          localField: 'currency',
          foreignField: '_id',
          as: 'currencyInfo'
        }
      },
      {
        $group: {
          _id: '$currency',
          name: { $first: { $arrayElemAt: ['$currencyInfo.nameFa', 0] } },
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: {
        byStatus: stats,
        byType: typeStats,
        byCurrency: currencyStats
      }
    });
  } catch (error) {
    next(error);
  }
};
