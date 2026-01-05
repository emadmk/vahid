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
    },
    // ========== تنظیمات اشتراک‌گذاری مشتری برای هر عضو ==========
    customerSharing: {
      // آیا این عضو مشتریانش را با گروه به اشتراک می‌گذارد؟
      isSharing: {
        type: Boolean,
        default: false
      },
      // آخرین بار فعال‌سازی
      lastActivatedAt: Date,
      // آخرین بار غیرفعال‌سازی
      lastDeactivatedAt: Date,
      // تنظیمات شخصی (override گروه)
      personalSettings: {
        activationMode: {
          type: String,
          enum: ['manual', 'scheduled', 'always', 'offline', 'group_default']
        },
        schedule: {
          startTime: String,
          endTime: String,
          daysOfWeek: [Number]
        }
      },
      // آمار اشتراک‌گذاری
      stats: {
        totalCustomersShared: {
          type: Number,
          default: 0
        },
        totalTradesFromSharing: {
          type: Number,
          default: 0
        },
        totalEarningsFromSharing: {
          type: Number,
          default: 0
        }
      }
    },
    // آخرین فعالیت آنلاین (برای حالت offline)
    lastOnline: {
      type: Date,
      default: Date.now
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

  // ========== تنظیمات اشتراک‌گذاری مشتری ==========
  customerSharing: {
    // آیا اشتراک‌گذاری مشتری فعال است؟
    enabled: {
      type: Boolean,
      default: false
    },
    // حالت فعال‌سازی
    activationMode: {
      type: String,
      enum: ['manual', 'scheduled', 'always', 'offline'],
      default: 'manual'
      // manual: دستی توسط صراف
      // scheduled: براساس زمان‌بندی
      // always: همیشه فعال
      // offline: وقتی صراف آفلاین می‌شود
    },
    // زمان‌بندی (برای حالت scheduled)
    schedule: {
      startTime: {
        type: String, // فرمت HH:mm
        default: '09:00'
      },
      endTime: {
        type: String,
        default: '17:00'
      },
      // روزهای هفته (0=یکشنبه تا 6=شنبه)
      daysOfWeek: [{
        type: Number,
        min: 0,
        max: 6
      }],
      timezone: {
        type: String,
        default: 'Asia/Tehran'
      }
    },
    // تنظیمات آفلاین (برای حالت offline)
    offlineSettings: {
      // دقایق غیرفعالی قبل از اشتراک‌گذاری
      inactiveMinutes: {
        type: Number,
        default: 10,
        min: 1,
        max: 120
      }
    },
    // تنظیمات اسپرد برای معاملات گروهی
    spreadSettings: {
      // آیا صراف اجراکننده اسپرد اضافه می‌کند؟
      executorAddsSpread: {
        type: Boolean,
        default: true
      },
      // حداکثر اسپرد مجاز برای اجراکننده
      maxExecutorSpread: {
        type: Number,
        default: 5 // درصد
      }
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
  return this.members.some(m => {
    // پشتیبانی از هر دو حالت populate شده و نشده
    const memberId = m.user._id ? m.user._id.toString() : m.user.toString();
    return memberId === userId.toString();
  });
};

// متد بررسی ادمین بودن
sarafiGroupSchema.methods.isAdmin = function(userId) {
  const ownerId = this.owner._id ? this.owner._id.toString() : this.owner.toString();
  if (ownerId === userId.toString()) return true;
  const member = this.members.find(m => {
    const memberId = m.user._id ? m.user._id.toString() : m.user.toString();
    return memberId === userId.toString();
  });
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

// تابع کمکی برای دریافت ID عضو (پشتیبانی از هر دو حالت populate شده و نشده)
const getMemberId = (member) => {
  return member.user._id ? member.user._id.toString() : member.user.toString();
};

// متد حذف عضو
sarafiGroupSchema.methods.removeMember = function(userId) {
  const index = this.members.findIndex(m => getMemberId(m) === userId.toString());
  if (index === -1) {
    throw new Error('این کاربر عضو گروه نیست');
  }
  const ownerId = this.owner._id ? this.owner._id.toString() : this.owner.toString();
  if (ownerId === userId.toString()) {
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
  return this.members.filter(m => getMemberId(m) === requestingUserId.toString());
};

// ========== متدهای اشتراک‌گذاری مشتری ==========

// فعال/غیرفعال کردن اشتراک‌گذاری مشتری برای یک عضو
sarafiGroupSchema.methods.toggleCustomerSharing = function(userId, isSharing) {
  const member = this.members.find(m => getMemberId(m) === userId.toString());
  if (!member) {
    throw new Error('این کاربر عضو گروه نیست');
  }

  member.customerSharing = member.customerSharing || {};
  member.customerSharing.isSharing = isSharing;

  if (isSharing) {
    member.customerSharing.lastActivatedAt = new Date();
  } else {
    member.customerSharing.lastDeactivatedAt = new Date();
  }

  return member;
};

// بررسی اینکه آیا اشتراک‌گذاری مشتری فعال است
sarafiGroupSchema.methods.isMemberSharingActive = function(userId) {
  // اگر اشتراک‌گذاری مشتری در سطح گروه غیرفعال است
  if (!this.customerSharing?.enabled) {
    return false;
  }

  const member = this.members.find(m => getMemberId(m) === userId.toString());
  if (!member) return false;

  // اگر به صورت دستی غیرفعال کرده
  if (!member.customerSharing?.isSharing) return false;

  // بررسی حالت فعال‌سازی
  const mode = member.customerSharing?.personalSettings?.activationMode ||
               this.customerSharing.activationMode;

  switch (mode) {
    case 'always':
      return true;

    case 'manual':
      return member.customerSharing?.isSharing || false;

    case 'scheduled':
      return this._isWithinSchedule(member);

    case 'offline':
      return this._isOffline(member);

    default:
      return member.customerSharing?.isSharing || false;
  }
};

// بررسی زمان‌بندی
sarafiGroupSchema.methods._isWithinSchedule = function(member) {
  const schedule = member.customerSharing?.personalSettings?.schedule ||
                   this.customerSharing.schedule;

  if (!schedule?.startTime || !schedule?.endTime) return true;

  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentDay = now.getDay();

  // بررسی روز هفته
  if (schedule.daysOfWeek?.length > 0 && !schedule.daysOfWeek.includes(currentDay)) {
    return false;
  }

  // تبدیل زمان به دقیقه
  const [startHour, startMin] = schedule.startTime.split(':').map(Number);
  const [endHour, endMin] = schedule.endTime.split(':').map(Number);

  const currentTimeInMinutes = currentHour * 60 + currentMinute;
  const startTimeInMinutes = startHour * 60 + startMin;
  const endTimeInMinutes = endHour * 60 + endMin;

  return currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes;
};

// بررسی آفلاین بودن
sarafiGroupSchema.methods._isOffline = function(member) {
  if (!member.lastOnline) return true;

  const inactiveMinutes = this.customerSharing?.offlineSettings?.inactiveMinutes || 10;
  const minutesSinceLastOnline = (Date.now() - member.lastOnline.getTime()) / (1000 * 60);

  return minutesSinceLastOnline >= inactiveMinutes;
};

// به‌روزرسانی وضعیت آنلاین عضو
sarafiGroupSchema.methods.updateMemberOnlineStatus = function(userId) {
  const member = this.members.find(m => getMemberId(m) === userId.toString());
  if (member) {
    member.lastOnline = new Date();
  }
  return member;
};

// دریافت اعضایی که اشتراک‌گذاری مشتری فعال دارند
sarafiGroupSchema.methods.getMembersWithActiveSharing = function(excludeUserId = null) {
  return this.members.filter(m => {
    if (excludeUserId && getMemberId(m) === excludeUserId.toString()) {
      return false;
    }
    const memberId = getMemberId(m);
    return this.isMemberSharingActive(memberId);
  });
};

// به‌روزرسانی آمار اشتراک‌گذاری عضو
sarafiGroupSchema.methods.updateMemberSharingStats = function(userId, stats) {
  const member = this.members.find(m => getMemberId(m) === userId.toString());
  if (!member) return;

  member.customerSharing = member.customerSharing || {};
  member.customerSharing.stats = member.customerSharing.stats || {};

  if (stats.customersShared) {
    member.customerSharing.stats.totalCustomersShared =
      (member.customerSharing.stats.totalCustomersShared || 0) + stats.customersShared;
  }
  if (stats.trades) {
    member.customerSharing.stats.totalTradesFromSharing =
      (member.customerSharing.stats.totalTradesFromSharing || 0) + stats.trades;
  }
  if (stats.earnings) {
    member.customerSharing.stats.totalEarningsFromSharing =
      (member.customerSharing.stats.totalEarningsFromSharing || 0) + stats.earnings;
  }

  return member;
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
  // تبدیل به uppercase برای جلوگیری از مشکل case-sensitivity
  const normalizedCode = code.toUpperCase().trim();

  const group = await this.findOne({
    inviteCode: normalizedCode,
    isActive: true,
    $or: [
      { inviteCodeExpiry: { $gt: new Date() } },
      { inviteCodeExpiry: null }
    ]
  });

  if (!group) {
    throw new Error('کد دعوت نامعتبر یا منقضی شده است');
  }

  // بررسی اینکه مالک نباشد
  if (group.owner.toString() === userId.toString()) {
    throw new Error('شما مالک این گروه هستید');
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
