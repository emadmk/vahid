const mongoose = require('mongoose');

const sarafiGroupSchema = new mongoose.Schema({
  // نام گروه
  name: {
    type: String,
    required: [true, 'نام گروه الزامی است'],
    trim: true,
    maxlength: [100, 'نام گروه نباید بیشتر از 100 کاراکتر باشد']
  },

  // توضیحات گروه
  description: {
    type: String,
    maxlength: [500, 'توضیحات نباید بیشتر از 500 کاراکتر باشد']
  },

  // صراف مالک (ایجادکننده) گروه
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // اعضای گروه
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],

  // تنظیمات حریم خصوصی
  privacy: {
    // آیا اعضا برای همدیگر قابل مشاهده هستند؟
    membersVisible: {
      type: Boolean,
      default: false // پیش‌فرض: اعضا برای همدیگر مخفی هستند
    },
    // آیا اعضا می‌توانند لیست اعضا را ببینند؟
    canViewMemberList: {
      type: String,
      enum: ['none', 'admins', 'all'],
      default: 'admins' // فقط ادمین‌ها می‌توانند ببینند
    },
    // آیا نام گروه برای اعضا نمایش داده شود؟
    showGroupName: {
      type: Boolean,
      default: true
    }
  },

  // تنظیمات اشتراک‌گذاری نرخ
  rateSharing: {
    // آیا نرخ‌ها در گروه به اشتراک گذاشته شوند؟
    enabled: {
      type: Boolean,
      default: true
    },
    // نحوه اشتراک‌گذاری نرخ
    mode: {
      type: String,
      enum: ['owner_only', 'admins', 'all'],
      default: 'owner_only' // فقط نرخ مالک گروه
    }
  },

  // تنظیمات درخواست‌ها
  requestSharing: {
    // آیا درخواست‌های عمومی بین اعضا به اشتراک گذاشته شود؟
    enabled: {
      type: Boolean,
      default: true
    },
    // اولویت پذیرش درخواست
    priority: {
      type: String,
      enum: ['fifo', 'random', 'round_robin'],
      default: 'fifo' // اولین نفر اولین خدمت
    }
  },

  // وضعیت گروه
  isActive: {
    type: Boolean,
    default: true
  },

  // کد دعوت یکتا
  inviteCode: {
    type: String,
    unique: true,
    sparse: true
  },

  // انقضای کد دعوت
  inviteCodeExpiry: Date,

  // آمار
  stats: {
    totalMembers: {
      type: Number,
      default: 0
    },
    totalRequests: {
      type: Number,
      default: 0
    },
    totalTransactions: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// ایندکس‌ها
sarafiGroupSchema.index({ owner: 1 });
sarafiGroupSchema.index({ 'members.user': 1 });
sarafiGroupSchema.index({ inviteCode: 1 });
sarafiGroupSchema.index({ isActive: 1 });

// متد تولید کد دعوت
sarafiGroupSchema.methods.generateInviteCode = function(expiresInDays = 7) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  this.inviteCode = code;
  this.inviteCodeExpiry = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000);
  return code;
};

// متد بررسی عضویت
sarafiGroupSchema.methods.isMember = function(userId) {
  return this.members.some(m => m.user.toString() === userId.toString());
};

// متد بررسی ادمین بودن
sarafiGroupSchema.methods.isAdmin = function(userId) {
  if (this.owner.toString() === userId.toString()) return true;
  const member = this.members.find(m => m.user.toString() === userId.toString());
  return member && member.role === 'admin';
};

// متد اضافه کردن عضو
sarafiGroupSchema.methods.addMember = function(userId, addedBy, role = 'member') {
  if (this.isMember(userId)) {
    throw new Error('این کاربر قبلا عضو گروه است');
  }
  this.members.push({
    user: userId,
    role,
    addedBy
  });
  this.stats.totalMembers = this.members.length;
};

// متد حذف عضو
sarafiGroupSchema.methods.removeMember = function(userId) {
  const index = this.members.findIndex(m => m.user.toString() === userId.toString());
  if (index === -1) {
    throw new Error('این کاربر عضو گروه نیست');
  }
  if (this.owner.toString() === userId.toString()) {
    throw new Error('نمی‌توان مالک گروه را حذف کرد');
  }
  this.members.splice(index, 1);
  this.stats.totalMembers = this.members.length;
};

// متد دریافت اعضا با رعایت حریم خصوصی
sarafiGroupSchema.methods.getVisibleMembers = function(requestingUserId) {
  // اگر درخواست‌کننده مالک یا ادمین است، همه اعضا را ببیند
  if (this.isAdmin(requestingUserId)) {
    return this.members;
  }

  // اگر اعضا قابل مشاهده هستند
  if (this.privacy.membersVisible) {
    return this.members;
  }

  // در غیر این صورت فقط خود کاربر
  return this.members.filter(m => m.user.toString() === requestingUserId.toString());
};

// متد استاتیک: دریافت گروه‌های یک صراف
sarafiGroupSchema.statics.getGroupsForUser = async function(userId) {
  return this.find({
    $or: [
      { owner: userId },
      { 'members.user': userId }
    ],
    isActive: true
  }).populate('owner', 'firstName lastName sarafiInfo.name');
};

// متد استاتیک: پیوستن با کد دعوت
sarafiGroupSchema.statics.joinByInviteCode = async function(code, userId) {
  const group = await this.findOne({
    inviteCode: code,
    isActive: true,
    $or: [
      { inviteCodeExpiry: { $gt: new Date() } },
      { inviteCodeExpiry: null }
    ]
  });

  if (!group) {
    throw new Error('کد دعوت نامعتبر یا منقضی شده است');
  }

  if (group.isMember(userId)) {
    throw new Error('شما قبلا عضو این گروه هستید');
  }

  group.addMember(userId, null, 'member');
  await group.save();

  return group;
};

// Pre-save: به‌روزرسانی آمار
sarafiGroupSchema.pre('save', function(next) {
  this.stats.totalMembers = this.members.length;
  next();
});

module.exports = mongoose.model('SarafiGroup', sarafiGroupSchema);
