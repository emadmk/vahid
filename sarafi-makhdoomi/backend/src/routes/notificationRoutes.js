const express = require('express');
const router = express.Router();
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteAllNotifications
} = require('../controllers/notificationController');
const { protect } = require('../middlewares/auth');

router.use(protect);

router.get('/', getNotifications);
router.get('/unread-count', getUnreadCount);
// Alias برای سازگاری
router.get('/unread', async (req, res, next) => {
  try {
    const Notification = require('../models/Notification');
    const limit = parseInt(req.query.limit) || 10;
    const notifications = await Notification.find({
      user: req.user._id,
      isRead: false
    })
      .sort({ createdAt: -1 })
      .limit(limit);

    res.status(200).json({
      success: true,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
});
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);
router.delete('/all', deleteAllNotifications);
router.delete('/:id', deleteNotification);

module.exports = router;
