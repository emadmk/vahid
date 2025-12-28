const mongoose = require('mongoose');

/**
 * مدل پیام داخلی
 * ارتباط بین صراف و مشتریان یا بین کارکنان
 */
const messageSchema = new mongoose.Schema({
  // مکالمه (برای گروه‌بندی پیام‌ها)
  conversation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation'
  },

  // فرستنده
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // نوع فرستنده
  senderType: {
    type: String,
    enum: ['user', 'sarafi', 'staff', 'admin', 'system'],
    required: true
  },

  // گیرنده (برای پیام مستقیم)
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // نوع گیرنده
  recipientType: {
    type: String,
    enum: ['user', 'sarafi', 'staff', 'admin', 'broadcast']
  },

  // متن پیام
  content: {
    type: String,
    required: true,
    maxlength: 2000
  },

  // نوع پیام
  messageType: {
    type: String,
    enum: ['text', 'image', 'file', 'trade_link', 'order_link', 'system'],
    default: 'text'
  },

  // پیوست‌ها
  attachments: [{
    filename: String,
    originalName: String,
    mimeType: String,
    size: Number,
    url: String
  }],

  // لینک به موجودیت‌ها
  linkedEntity: {
    type: {
      type: String,
      enum: ['trade', 'order', 'request']
    },
    id: mongoose.Schema.Types.ObjectId
  },

  // وضعیت خواندن
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],

  // اولویت
  priority: {
    type: String,
    enum: ['normal', 'high', 'urgent'],
    default: 'normal'
  },

  // حذف شده توسط
  deletedBy: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // ویرایش شده
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: Date

}, {
  timestamps: true
});

// ایندکس‌ها
messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ sender: 1, recipient: 1, createdAt: -1 });
messageSchema.index({ recipient: 1, 'readBy.user': 1 });

// متد بررسی خوانده شدن
messageSchema.methods.isReadBy = function(userId) {
  return this.readBy.some(r => r.user.toString() === userId.toString());
};

// متد علامت‌گذاری خوانده شده
messageSchema.methods.markAsRead = async function(userId) {
  if (!this.isReadBy(userId)) {
    this.readBy.push({ user: userId, readAt: new Date() });
    await this.save();
  }
  return this;
};

module.exports = mongoose.model('Message', messageSchema);

// ========== مدل مکالمه ==========

const conversationSchema = new mongoose.Schema({
  // شرکت‌کنندگان
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['user', 'sarafi', 'staff', 'admin']
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    lastReadAt: Date
  }],

  // نوع مکالمه
  type: {
    type: String,
    enum: ['direct', 'group', 'support'],
    default: 'direct'
  },

  // عنوان (برای گروه)
  title: String,

  // صراف مربوطه
  sarafi: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // آخرین پیام
  lastMessage: {
    content: String,
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    sentAt: Date
  },

  // تعداد پیام‌های خوانده نشده
  unreadCount: {
    type: Map,
    of: Number,
    default: new Map()
  },

  // فعال/غیرفعال
  isActive: {
    type: Boolean,
    default: true
  },

  // بسته شده
  isClosed: {
    type: Boolean,
    default: false
  },
  closedAt: Date,
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }

}, {
  timestamps: true
});

// ایندکس
conversationSchema.index({ 'participants.user': 1 });
conversationSchema.index({ sarafi: 1, type: 1 });
conversationSchema.index({ 'lastMessage.sentAt': -1 });

// متد دریافت یا ایجاد مکالمه مستقیم
conversationSchema.statics.getOrCreateDirect = async function(user1Id, user2Id, sarafiId) {
  // جستجوی مکالمه موجود
  let conversation = await this.findOne({
    type: 'direct',
    'participants.user': { $all: [user1Id, user2Id] }
  });

  if (!conversation) {
    conversation = await this.create({
      type: 'direct',
      participants: [
        { user: user1Id },
        { user: user2Id }
      ],
      sarafi: sarafiId
    });
  }

  return conversation;
};

// متد به‌روزرسانی آخرین پیام
conversationSchema.methods.updateLastMessage = async function(message) {
  this.lastMessage = {
    content: message.content.substring(0, 100),
    sender: message.sender,
    sentAt: message.createdAt
  };

  // افزایش تعداد خوانده نشده برای همه به جز فرستنده
  for (const participant of this.participants) {
    if (participant.user.toString() !== message.sender.toString()) {
      const currentCount = this.unreadCount.get(participant.user.toString()) || 0;
      this.unreadCount.set(participant.user.toString(), currentCount + 1);
    }
  }

  await this.save();
};

// متد علامت‌گذاری خوانده شده
conversationSchema.methods.markAsRead = async function(userId) {
  this.unreadCount.set(userId.toString(), 0);

  // به‌روزرسانی lastReadAt
  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  if (participant) {
    participant.lastReadAt = new Date();
  }

  await this.save();
};

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = mongoose.model('Message', messageSchema);
module.exports.Conversation = Conversation;
