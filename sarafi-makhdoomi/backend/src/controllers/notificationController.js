const Notification = require('../models/Notification');
const notificationService = require('../services/notificationService');

// دریافت اعلان‌های کاربر
exports.getNotifications = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, unreadOnly } = req.query;

    const query = { user: req.user._id };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const skip = (page - 1) * limit;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({
      user: req.user._id,
      isRead: false
    });

    res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      unreadCount,
      pages: Math.ceil(total / limit),
      currentPage: parseInt(page),
      data: notifications
    });
  } catch (error) {
    next(error);
  }
};

// تعداد اعلان‌های خوانده نشده
exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await notificationService.getUnreadCount(req.user._id);

    res.status(200).json({
      success: true,
      data: { count }
    });
  } catch (error) {
    next(error);
  }
};

// علامت‌گذاری به عنوان خوانده شده
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await notificationService.markAsRead(
      req.params.id,
      req.user._id
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'اعلان یافت نشد'
      });
    }

    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

// علامت‌گذاری همه به عنوان خوانده شده
exports.markAllAsRead = async (req, res, next) => {
  try {
    await notificationService.markAllAsRead(req.user._id);

    res.status(200).json({
      success: true,
      message: 'همه اعلان‌ها خوانده شدند'
    });
  } catch (error) {
    next(error);
  }
};

// حذف اعلان
exports.deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'اعلان یافت نشد'
      });
    }

    res.status(200).json({
      success: true,
      message: 'اعلان حذف شد'
    });
  } catch (error) {
    next(error);
  }
};

// حذف همه اعلان‌ها
exports.deleteAllNotifications = async (req, res, next) => {
  try {
    await Notification.deleteMany({ user: req.user._id });

    res.status(200).json({
      success: true,
      message: 'همه اعلان‌ها حذف شدند'
    });
  } catch (error) {
    next(error);
  }
};
