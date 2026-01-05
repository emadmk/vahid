const mongoose = require('mongoose');

/**
 * مدل لاگ عملیات - Audit Trail
 * ثبت کامل همه عملیات حساس برای حسابرسی و شفافیت
 */
const auditLogSchema = new mongoose.Schema({
  // ========== اطلاعات عملیات ==========

  // نوع عملیات
  action: {
    type: String,
    required: true,
    enum: [
      // عملیات کاربر
      'user.login',
      'user.logout',
      'user.register',
      'user.password_change',
      'user.profile_update',

      // عملیات مشتری
      'customer.create',
      'customer.update',
      'customer.suspend',
      'customer.unsuspend',
      'customer.tier_change',

      // عملیات معامله
      'trade.create',
      'trade.approve',
      'trade.reject',
      'trade.cancel',
      'trade.complete',

      // عملیات سفارش
      'order.create',
      'order.update',
      'order.cancel',
      'order.fill',
      'order.partial_fill',

      // عملیات وصول
      'receipt.create',
      'receipt.update',
      'receipt.confirm',
      'receipt.reject',
      'receipt.finalize',
      'receipt.amend',

      // عملیات کیف پول
      'wallet.deposit',
      'wallet.withdraw',
      'wallet.credit_increase',
      'wallet.credit_decrease',
      'wallet.credit_usage',

      // عملیات اسپرد
      'spread.create',
      'spread.update',
      'spread.delete',

      // عملیات پیشنهاد/عرضه
      'offer.create',
      'offer.update',
      'offer.cancel',
      'offer.match',
      'offer.price_change',

      // عملیات ارز
      'currency.create',
      'currency.update',
      'currency.archive',
      'currency.activate',

      // عملیات دسترسی
      'permission.grant',
      'permission.revoke',
      'role.assign',
      'role.remove',

      // عملیات کارکنان
      'staff.create',
      'staff.update',
      'staff.deactivate',

      // عملیات سیستم
      'system.settings_update',
      'system.rate_update',
      'system.circuit_breaker',

      // عملیات گروه
      'group.create',
      'group.update',
      'group.delete',
      'group.join',
      'group.leave',
      'group.member_add',
      'group.member_remove',

      // عملیات اشتراک‌گذاری مشتری
      'customer_sharing.enable',
      'customer_sharing.disable',
      'customer_sharing.share_customer',
      'customer_sharing.unshare_customer',
      'customer_sharing.update_settings',

      // عملیات تسویه گروهی
      'group_settlement.create',
      'group_settlement.confirm',
      'group_settlement.dispute',
      'group_settlement.resolve',
      'group_settlement.complete',

      // معاملات گروهی
      'group_trade.create',
      'group_trade.complete',
      'group_trade.cancel',

      // سایر
      'other'
    ]
  },

  // دسته‌بندی عملیات
  category: {
    type: String,
    enum: [
      'authentication',   // احراز هویت
      'customer',         // مشتری
      'trade',            // معامله
      'order',            // سفارش
      'receipt',          // وصول
      'wallet',           // کیف پول
      'spread',           // اسپرد
      'offer',            // پیشنهاد
      'currency',         // ارز
      'permission',       // دسترسی
      'staff',            // کارکنان
      'system',           // سیستم
      'group',            // گروه صراف
      'customer_sharing', // اشتراک‌گذاری مشتری
      'group_settlement', // تسویه گروهی
      'group_trade'       // معامله گروهی
    ],
    required: true
  },

  // سطح اهمیت
  severity: {
    type: String,
    enum: ['info', 'warning', 'critical', 'high_risk'],
    default: 'info'
  },

  // ========== کاربر انجام‌دهنده ==========

  // کاربر
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // نقش کاربر در زمان عملیات
  userRole: {
    type: String,
    enum: ['user', 'sarafi', 'admin', 'staff']
  },

  // نقش کارمند (اگر کارمند صرافی باشد)
  staffRole: {
    type: String,
    enum: ['accountant', 'currency_collector', 'rial_collector', 'manager', 'operator', 'sales_manager']
  },

  // ========== صراف مرتبط ==========
  sarafi: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  // ========== موجودیت هدف ==========

  // نوع موجودیت
  targetType: {
    type: String,
    enum: ['User', 'Trade', 'Order', 'Receipt', 'Wallet', 'Spread', 'MarketOffer', 'Currency', 'SarafiStaff', 'Settings', 'SarafiGroup', 'SharedCustomer', 'GroupSettlement']
  },

  // شناسه موجودیت
  targetId: {
    type: mongoose.Schema.Types.ObjectId
  },

  // شماره شناسایی (مثل شماره سفارش، شماره رسید)
  targetReference: {
    type: String
  },

  // ========== جزئیات تغییرات ==========

  // مقادیر قبل از تغییر
  previousValues: {
    type: mongoose.Schema.Types.Mixed
  },

  // مقادیر بعد از تغییر
  newValues: {
    type: mongoose.Schema.Types.Mixed
  },

  // توضیحات
  description: {
    type: String,
    required: true
  },

  // دلیل (برای عملیات حساس)
  reason: {
    type: String
  },

  // ========== فایل‌ها ==========
  attachments: [{
    filename: String,
    fileId: mongoose.Schema.Types.ObjectId
  }],

  // ========== اطلاعات فنی ==========

  // آدرس IP
  ipAddress: {
    type: String
  },

  // User Agent
  userAgent: {
    type: String
  },

  // Session ID
  sessionId: {
    type: String
  },

  // ========== متادیتا ==========
  metadata: {
    type: mongoose.Schema.Types.Mixed
  },

  // آیا این عملیات حساس است
  isHighRisk: {
    type: Boolean,
    default: false
  },

  // آیا نیاز به تایید دوم داشت
  requiredDualApproval: {
    type: Boolean,
    default: false
  },

  // تایید کننده دوم (اگر Dual Approval بود)
  secondApprover: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// ایندکس‌ها
auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ user: 1, createdAt: -1 });
auditLogSchema.index({ sarafi: 1, createdAt: -1 });
auditLogSchema.index({ action: 1, createdAt: -1 });
auditLogSchema.index({ category: 1, createdAt: -1 });
auditLogSchema.index({ targetType: 1, targetId: 1 });
auditLogSchema.index({ severity: 1, createdAt: -1 });
auditLogSchema.index({ isHighRisk: 1, createdAt: -1 });

// متد استاتیک برای ثبت لاگ
auditLogSchema.statics.log = async function(data) {
  const {
    action,
    category,
    user,
    userRole,
    staffRole,
    sarafi,
    targetType,
    targetId,
    targetReference,
    previousValues,
    newValues,
    description,
    reason,
    ipAddress,
    userAgent,
    sessionId,
    metadata,
    isHighRisk,
    requiredDualApproval,
    secondApprover,
    attachments
  } = data;

  // تعیین سطح اهمیت
  let severity = 'info';
  const criticalActions = [
    'wallet.credit_increase',
    'wallet.credit_decrease',
    'customer.suspend',
    'trade.approve',
    'receipt.finalize',
    'spread.update',
    'permission.grant',
    'permission.revoke'
  ];
  const highRiskActions = [
    'receipt.amend',
    'trade.cancel',
    'offer.price_change',
    'system.circuit_breaker'
  ];

  if (criticalActions.includes(action)) {
    severity = 'critical';
  } else if (highRiskActions.includes(action) || isHighRisk) {
    severity = 'high_risk';
  } else if (action.startsWith('wallet.') || action.startsWith('receipt.')) {
    severity = 'warning';
  }

  const log = new this({
    action,
    category,
    severity,
    user,
    userRole,
    staffRole,
    sarafi,
    targetType,
    targetId,
    targetReference,
    previousValues,
    newValues,
    description,
    reason,
    ipAddress,
    userAgent,
    sessionId,
    metadata,
    isHighRisk: isHighRisk || severity === 'critical' || severity === 'high_risk',
    requiredDualApproval,
    secondApprover,
    attachments
  });

  await log.save();
  return log;
};

// متد برای دریافت لاگ‌های یک موجودیت
auditLogSchema.statics.getLogsForTarget = async function(targetType, targetId, limit = 50) {
  return this.find({ targetType, targetId })
    .populate('user', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// متد برای دریافت لاگ‌های یک کاربر
auditLogSchema.statics.getLogsForUser = async function(userId, limit = 100) {
  return this.find({ user: userId })
    .sort({ createdAt: -1 })
    .limit(limit);
};

// متد برای دریافت لاگ‌های یک صراف
auditLogSchema.statics.getLogsForSarafi = async function(sarafiId, options = {}) {
  const {
    limit = 100,
    category,
    action,
    startDate,
    endDate,
    severity
  } = options;

  const query = { sarafi: sarafiId };

  if (category) query.category = category;
  if (action) query.action = action;
  if (severity) query.severity = severity;
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = startDate;
    if (endDate) query.createdAt.$lte = endDate;
  }

  return this.find(query)
    .populate('user', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(limit);
};

// متد برای دریافت عملیات حساس
auditLogSchema.statics.getHighRiskLogs = async function(sarafiId, limit = 50) {
  return this.find({
    sarafi: sarafiId,
    $or: [
      { isHighRisk: true },
      { severity: { $in: ['critical', 'high_risk'] } }
    ]
  })
    .populate('user', 'firstName lastName email')
    .sort({ createdAt: -1 })
    .limit(limit);
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
