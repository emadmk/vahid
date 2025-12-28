const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth');
const Message = require('../models/Message');
const { Conversation } = require('../models/Message');
const Notification = require('../models/Notification');

router.use(protect);

/**
 * دریافت لیست مکالمات
 */
router.get('/conversations', async (req, res) => {
  try {
    const conversations = await Conversation.find({
      'participants.user': req.user._id,
      isActive: true
    })
      .populate('participants.user', 'firstName lastName phone role')
      .populate('lastMessage.sender', 'firstName lastName')
      .sort({ 'lastMessage.sentAt': -1 });

    // اضافه کردن تعداد خوانده نشده
    const result = conversations.map(conv => ({
      ...conv.toObject(),
      unreadCount: conv.unreadCount.get(req.user._id.toString()) || 0
    }));

    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * ایجاد یا دریافت مکالمه مستقیم
 */
router.post('/conversations/direct', async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'شناسه کاربر الزامی است' });
    }

    const sarafiId = req.user.role === 'sarafi' ? req.user._id : req.user.selectedSarafi;

    const conversation = await Conversation.getOrCreateDirect(
      req.user._id,
      userId,
      sarafiId
    );

    await conversation.populate('participants.user', 'firstName lastName phone role');

    res.json({ success: true, data: conversation });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * دریافت پیام‌های یک مکالمه
 */
router.get('/conversations/:conversationId/messages', async (req, res) => {
  try {
    const { limit = 50, before } = req.query;

    const conversation = await Conversation.findOne({
      _id: req.params.conversationId,
      'participants.user': req.user._id
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'مکالمه یافت نشد' });
    }

    const query = {
      conversation: conversation._id,
      deletedBy: { $ne: req.user._id }
    };

    if (before) {
      query._id = { $lt: before };
    }

    const messages = await Message.find(query)
      .populate('sender', 'firstName lastName role')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    // علامت‌گذاری خوانده شده
    await conversation.markAsRead(req.user._id);

    res.json({
      success: true,
      data: messages.reverse(),
      hasMore: messages.length === parseInt(limit)
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * ارسال پیام
 */
router.post('/conversations/:conversationId/messages', async (req, res) => {
  try {
    const { content, messageType = 'text', priority = 'normal', linkedEntity } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: 'متن پیام الزامی است' });
    }

    const conversation = await Conversation.findOne({
      _id: req.params.conversationId,
      'participants.user': req.user._id
    }).populate('participants.user', 'firstName lastName');

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'مکالمه یافت نشد' });
    }

    const message = await Message.create({
      conversation: conversation._id,
      sender: req.user._id,
      senderType: req.user.role,
      content: content.trim(),
      messageType,
      priority,
      linkedEntity,
      readBy: [{ user: req.user._id }]
    });

    await message.populate('sender', 'firstName lastName role');

    // به‌روزرسانی مکالمه
    await conversation.updateLastMessage(message);

    // ارسال اعلان به سایر شرکت‌کنندگان
    for (const participant of conversation.participants) {
      if (participant.user._id.toString() !== req.user._id.toString()) {
        await Notification.create({
          user: participant.user._id,
          type: 'system',
          title: 'پیام جدید',
          message: `${req.user.firstName}: ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
          severity: priority === 'urgent' ? 'warning' : 'info',
          link: `/messages/${conversation._id}`,
          data: { conversationId: conversation._id, messageId: message._id }
        });
      }
    }

    res.status(201).json({ success: true, data: message });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * علامت‌گذاری همه پیام‌های مکالمه به عنوان خوانده شده
 */
router.put('/conversations/:conversationId/read', async (req, res) => {
  try {
    const conversation = await Conversation.findOne({
      _id: req.params.conversationId,
      'participants.user': req.user._id
    });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'مکالمه یافت نشد' });
    }

    await conversation.markAsRead(req.user._id);

    // علامت‌گذاری پیام‌ها
    await Message.updateMany(
      {
        conversation: conversation._id,
        'readBy.user': { $ne: req.user._id }
      },
      {
        $push: { readBy: { user: req.user._id, readAt: new Date() } }
      }
    );

    res.json({ success: true, message: 'همه پیام‌ها خوانده شد' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * حذف پیام
 */
router.delete('/messages/:messageId', async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message) {
      return res.status(404).json({ success: false, message: 'پیام یافت نشد' });
    }

    // فقط فرستنده می‌تواند پیام را حذف کند
    if (message.sender.toString() !== req.user._id.toString()) {
      // برای سایرین فقط مخفی می‌شود
      message.deletedBy.push(req.user._id);
      await message.save();
    } else {
      // حذف کامل توسط فرستنده
      await message.deleteOne();
    }

    res.json({ success: true, message: 'پیام حذف شد' });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * دریافت تعداد پیام‌های خوانده نشده
 */
router.get('/unread-count', async (req, res) => {
  try {
    const conversations = await Conversation.find({
      'participants.user': req.user._id,
      isActive: true
    });

    let totalUnread = 0;
    for (const conv of conversations) {
      totalUnread += conv.unreadCount.get(req.user._id.toString()) || 0;
    }

    res.json({ success: true, data: { count: totalUnread } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

/**
 * جستجو در پیام‌ها
 */
router.get('/search', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({ success: false, message: 'حداقل 2 کاراکتر وارد کنید' });
    }

    // دریافت مکالمات کاربر
    const userConversations = await Conversation.find({
      'participants.user': req.user._id
    }).select('_id');

    const conversationIds = userConversations.map(c => c._id);

    const messages = await Message.find({
      conversation: { $in: conversationIds },
      content: { $regex: q, $options: 'i' },
      deletedBy: { $ne: req.user._id }
    })
      .populate('sender', 'firstName lastName')
      .populate('conversation', 'type title')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({ success: true, data: messages });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
