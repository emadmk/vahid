const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth');
const SarafiGroup = require('../models/SarafiGroup');
const SharedCustomer = require('../models/SharedCustomer');
const GroupSettlement = require('../models/GroupSettlement');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const groupSharingService = require('../services/groupSharingService');

// همه روت‌ها نیاز به احراز هویت دارند
router.use(protect);

// ==================== روت‌های عمومی صراف ====================

// دریافت گروه‌های من
router.get('/my-groups', authorize('sarafi', 'admin'), async (req, res) => {
  try {
    const groups = await SarafiGroup.getGroupsForUser(req.user._id);

    // پردازش گروه‌ها با رعایت حریم خصوصی
    const processedGroups = groups.map(group => {
      const ownerId = group.owner._id ? group.owner._id.toString() : group.owner.toString();
      const isOwner = ownerId === req.user._id.toString();
      const isAdmin = group.isAdmin(req.user._id);

      // بررسی وضعیت اشتراک‌گذاری مشتری
      const member = group.members.find(m => {
        const memberId = m.user._id ? m.user._id.toString() : m.user.toString();
        return memberId === req.user._id.toString();
      });
      const isSharingActive = group.isMemberSharingActive ? group.isMemberSharingActive(req.user._id) : false;
      const mySharing = member?.customerSharing?.isSharing || false;

      return {
        _id: group._id,
        name: group.privacy.showGroupName ? group.name : 'گروه خصوصی',
        description: isAdmin ? group.description : undefined,
        isOwner,
        isAdmin,
        memberCount: group.stats.totalMembers,
        myRole: isOwner ? 'owner' : (isAdmin ? 'admin' : 'member'),
        rateSharing: group.rateSharing,
        requestSharing: group.requestSharing,
        customerSharing: {
          groupEnabled: group.customerSharing?.enabled || false,
          isActive: isSharingActive,
          mySharing: mySharing,
          activationMode: group.customerSharing?.activationMode || 'manual'
        },
        createdAt: group.createdAt
      };
    });

    res.json({
      success: true,
      data: processedGroups
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ==================== روت‌های تسویه گروهی (باید قبل از /:id باشند) ====================

// دریافت تسویه‌های من
router.get('/settlements', authorize('sarafi', 'admin'), async (req, res) => {
  try {
    const { role, status, limit, skip } = req.query;
    const settlements = await GroupSettlement.getSettlementsForSarafi(
      req.user._id,
      { role, status, limit: parseInt(limit) || 50, skip: parseInt(skip) || 0 }
    );
    res.json({ success: true, data: settlements });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// دریافت جزئیات تسویه
router.get('/settlements/:id', authorize('sarafi', 'admin'), async (req, res) => {
  try {
    const settlement = await GroupSettlement.findById(req.params.id)
      .populate('group', 'name')
      .populate('trade')
      .populate('ownerSarafi', 'firstName lastName sarafiInfo.name')
      .populate('executorSarafi', 'firstName lastName sarafiInfo.name')
      .populate('customer', 'firstName lastName')
      .populate('currency', 'name symbol code');

    if (!settlement) {
      return res.status(404).json({ success: false, message: 'تسویه یافت نشد' });
    }

    // بررسی دسترسی
    const isOwner = settlement.ownerSarafi._id.toString() === req.user._id.toString();
    const isExecutor = settlement.executorSarafi._id.toString() === req.user._id.toString();

    if (!isOwner && !isExecutor) {
      return res.status(403).json({ success: false, message: 'دسترسی غیرمجاز' });
    }

    res.json({
      success: true,
      data: {
        ...settlement.toObject(),
        isOwner,
        isExecutor,
        customer: isOwner ? settlement.customer : { displayName: 'مشتری اشتراکی' }
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// تایید تسویه
router.post('/settlements/:id/confirm', authorize('sarafi', 'admin'), async (req, res) => {
  try {
    const settlement = await groupSharingService.confirmSettlement(
      req.params.id,
      req.user._id
    );
    res.json({
      success: true,
      data: settlement,
      message: 'تسویه تایید شد'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ثبت وصول از مشتری (فقط صراف مالک)
router.post('/settlements/:id/customer-collection', authorize('sarafi', 'admin'), async (req, res) => {
  try {
    const settlement = await groupSharingService.recordCustomerCollection(
      req.params.id,
      req.user._id,
      req.body
    );
    res.json({
      success: true,
      data: settlement,
      message: 'وصول از مشتری ثبت شد'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ثبت اختلاف
router.post('/settlements/:id/dispute', authorize('sarafi', 'admin'), async (req, res) => {
  try {
    const settlement = await GroupSettlement.findById(req.params.id);
    if (!settlement) {
      return res.status(404).json({ success: false, message: 'تسویه یافت نشد' });
    }

    const { reason } = req.body;
    await settlement.raiseDispute(reason, req.user._id);

    res.json({
      success: true,
      data: settlement,
      message: 'اختلاف ثبت شد'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// محاسبه خالص بدهی بین دو صراف
router.get('/balance/:sarafiId', authorize('sarafi', 'admin'), async (req, res) => {
  try {
    const { groupId } = req.query;
    const balance = await GroupSettlement.calculateNetBalance(
      req.user._id,
      req.params.sarafiId,
      groupId
    );
    res.json({ success: true, data: balance });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ==================== روت‌های معامله و اشتراک‌گذاری (باید قبل از /:id باشند) ====================

// حذف اشتراک‌گذاری یک مشتری
router.delete('/shared-customers/:customerId', authorize('sarafi', 'admin'), async (req, res) => {
  try {
    await groupSharingService.unshareCustomer(req.params.customerId, req.user._id);
    res.json({
      success: true,
      message: 'اشتراک‌گذاری مشتری حذف شد'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// به‌روزرسانی وضعیت آنلاین (برای حالت offline)
router.post('/heartbeat', authorize('sarafi', 'admin'), async (req, res) => {
  try {
    const result = await groupSharingService.updateOnlineStatus(req.user._id);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// پیش‌نمایش معامله گروهی
router.post('/group-trade/preview', authorize('sarafi', 'admin'), async (req, res) => {
  try {
    const { sharedCustomerId, type, currencyId, amount, executorSpreadPercent, baseRate } = req.body;
    const preview = await groupSharingService.calculateGroupTradePreview(
      sharedCustomerId,
      type,
      currencyId,
      amount,
      executorSpreadPercent,
      baseRate
    );
    res.json({ success: true, data: preview });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ایجاد معامله گروهی
router.post('/group-trade', authorize('sarafi', 'admin'), async (req, res) => {
  try {
    const result = await groupSharingService.createGroupTrade({
      ...req.body,
      executorSarafiId: req.user._id
    });
    res.status(201).json({
      success: true,
      data: result,
      message: 'معامله گروهی با موفقیت ایجاد شد'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ==================== روت‌های عمومی گروه ====================

// ایجاد گروه جدید
router.post('/', authorize('sarafi', 'admin'), async (req, res) => {
  try {
    const { name, description, privacy, rateSharing, requestSharing } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        message: 'نام گروه الزامی است'
      });
    }

    const group = await SarafiGroup.create({
      name,
      description,
      owner: req.user._id,
      privacy: privacy || {},
      rateSharing: rateSharing || {},
      requestSharing: requestSharing || {}
    });

    // ثبت لاگ
    await AuditLog.log({
      action: 'group.create',
      category: 'group',
      user: req.user._id,
      userRole: 'sarafi',
      sarafi: req.user._id,
      targetType: 'SarafiGroup',
      targetId: group._id,
      description: `ایجاد گروه "${name}"`,
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      data: group,
      message: 'گروه با موفقیت ایجاد شد'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// دریافت جزئیات گروه
router.get('/:id', authorize('sarafi', 'admin'), async (req, res) => {
  try {
    const group = await SarafiGroup.findById(req.params.id)
      .populate('owner', 'firstName lastName email sarafiInfo.name')
      .populate('members.user', 'firstName lastName email sarafiInfo.name')
      .populate('members.addedBy', 'firstName lastName');

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'گروه یافت نشد'
      });
    }

    // بررسی دسترسی - بعد از populate، owner یک آبجکت است
    const ownerId = group.owner._id ? group.owner._id.toString() : group.owner.toString();
    if (!group.isMember(req.user._id) && ownerId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'شما دسترسی به این گروه ندارید'
      });
    }

    const isOwner = ownerId === req.user._id.toString();
    const isAdmin = group.isAdmin(req.user._id);

    // دریافت اعضا با رعایت حریم خصوصی
    let visibleMembers = [];
    if (isAdmin || group.privacy.canViewMemberList === 'all') {
      visibleMembers = group.members.map(m => ({
        _id: m.user._id,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        sarafiName: m.user.sarafiInfo?.name,
        role: m.role,
        joinedAt: m.joinedAt
      }));
    } else if (group.privacy.membersVisible) {
      visibleMembers = group.members.map(m => ({
        _id: m.user._id,
        firstName: m.user.firstName,
        lastName: m.user.lastName[0] + '***',
        role: m.role
      }));
    }

    res.json({
      success: true,
      data: {
        _id: group._id,
        name: group.name,
        description: isAdmin ? group.description : undefined,
        owner: isAdmin ? {
          _id: group.owner._id,
          firstName: group.owner.firstName,
          lastName: group.owner.lastName,
          sarafiName: group.owner.sarafiInfo?.name
        } : undefined,
        isOwner,
        isAdmin,
        members: visibleMembers,
        memberCount: group.stats.totalMembers,
        privacy: isOwner ? group.privacy : undefined,
        rateSharing: group.rateSharing,
        requestSharing: group.requestSharing,
        stats: group.stats,
        inviteCode: isAdmin ? group.inviteCode : undefined,
        createdAt: group.createdAt
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// به‌روزرسانی گروه
router.put('/:id', authorize('sarafi', 'admin'), async (req, res) => {
  try {
    const group = await SarafiGroup.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'گروه یافت نشد'
      });
    }

    // فقط مالک می‌تواند ویرایش کند
    if (group.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'فقط مالک گروه می‌تواند آن را ویرایش کند'
      });
    }

    const { name, description, privacy, rateSharing, requestSharing, isActive } = req.body;

    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    if (privacy) group.privacy = { ...group.privacy, ...privacy };
    if (rateSharing) group.rateSharing = { ...group.rateSharing, ...rateSharing };
    if (requestSharing) group.requestSharing = { ...group.requestSharing, ...requestSharing };
    if (isActive !== undefined) group.isActive = isActive;

    await group.save();

    // ثبت لاگ
    await AuditLog.log({
      action: 'group.update',
      category: 'group',
      user: req.user._id,
      userRole: 'sarafi',
      sarafi: req.user._id,
      targetType: 'SarafiGroup',
      targetId: group._id,
      description: `به‌روزرسانی گروه "${group.name}"`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      data: group,
      message: 'گروه با موفقیت به‌روزرسانی شد'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// تولید کد دعوت جدید
router.post('/:id/invite-code', authorize('sarafi', 'admin'), async (req, res) => {
  try {
    const group = await SarafiGroup.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'گروه یافت نشد'
      });
    }

    if (!group.isAdmin(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'فقط ادمین‌ها می‌توانند کد دعوت تولید کنند'
      });
    }

    const { expiresInDays = 7 } = req.body;
    const code = group.generateInviteCode(expiresInDays);
    await group.save();

    res.json({
      success: true,
      data: {
        inviteCode: code,
        expiresAt: group.inviteCodeExpiry
      },
      message: 'کد دعوت جدید تولید شد'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// پیوستن به گروه با کد دعوت
router.post('/join', authorize('sarafi', 'admin'), async (req, res) => {
  try {
    const { inviteCode } = req.body;

    if (!inviteCode) {
      return res.status(400).json({
        success: false,
        message: 'کد دعوت الزامی است'
      });
    }

    const group = await SarafiGroup.joinByInviteCode(inviteCode, req.user._id);

    // ثبت لاگ
    await AuditLog.log({
      action: 'group.join',
      category: 'group',
      user: req.user._id,
      userRole: 'sarafi',
      sarafi: req.user._id,
      targetType: 'SarafiGroup',
      targetId: group._id,
      description: `پیوستن به گروه با کد دعوت`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      data: {
        groupId: group._id,
        name: group.privacy.showGroupName ? group.name : 'گروه خصوصی'
      },
      message: 'با موفقیت به گروه پیوستید'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// اضافه کردن عضو به گروه
router.post('/:id/members', authorize('sarafi', 'admin'), async (req, res) => {
  try {
    const group = await SarafiGroup.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'گروه یافت نشد'
      });
    }

    if (!group.isAdmin(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'فقط ادمین‌ها می‌توانند عضو اضافه کنند'
      });
    }

    const { userId, email, role = 'member' } = req.body;

    let targetUser;
    if (userId) {
      targetUser = await User.findById(userId);
    } else if (email) {
      targetUser = await User.findOne({ email });
    }

    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'کاربر یافت نشد'
      });
    }

    if (targetUser.role !== 'sarafi') {
      return res.status(400).json({
        success: false,
        message: 'فقط صراف‌ها می‌توانند عضو گروه شوند'
      });
    }

    group.addMember(targetUser._id, req.user._id, role);
    await group.save();

    // ثبت لاگ
    await AuditLog.log({
      action: 'group.member_add',
      category: 'group',
      user: req.user._id,
      userRole: 'sarafi',
      sarafi: req.user._id,
      targetType: 'SarafiGroup',
      targetId: group._id,
      description: `افزودن ${targetUser.firstName} ${targetUser.lastName} به گروه`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'عضو با موفقیت اضافه شد'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// حذف عضو از گروه
router.delete('/:id/members/:memberId', authorize('sarafi', 'admin'), async (req, res) => {
  try {
    const group = await SarafiGroup.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'گروه یافت نشد'
      });
    }

    // فقط مالک یا خود عضو می‌تواند عضو را حذف کند
    const isOwner = group.owner.toString() === req.user._id.toString();
    const isSelf = req.params.memberId === req.user._id.toString();

    if (!isOwner && !isSelf) {
      return res.status(403).json({
        success: false,
        message: 'شما دسترسی به این عملیات ندارید'
      });
    }

    group.removeMember(req.params.memberId);
    await group.save();

    // ثبت لاگ
    await AuditLog.log({
      action: isSelf ? 'group.leave' : 'group.member_remove',
      category: 'group',
      user: req.user._id,
      userRole: 'sarafi',
      sarafi: req.user._id,
      targetType: 'SarafiGroup',
      targetId: group._id,
      description: isSelf ? 'خروج از گروه' : 'حذف عضو از گروه',
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: isSelf ? 'از گروه خارج شدید' : 'عضو با موفقیت حذف شد'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// تغییر نقش عضو
router.put('/:id/members/:memberId/role', authorize('sarafi', 'admin'), async (req, res) => {
  try {
    const group = await SarafiGroup.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'گروه یافت نشد'
      });
    }

    // فقط مالک می‌تواند نقش را تغییر دهد
    if (group.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'فقط مالک گروه می‌تواند نقش اعضا را تغییر دهد'
      });
    }

    const { role } = req.body;
    if (!['admin', 'member'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'نقش نامعتبر است'
      });
    }

    const member = group.members.find(m => m.user.toString() === req.params.memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'عضو یافت نشد'
      });
    }

    member.role = role;
    await group.save();

    res.json({
      success: true,
      message: 'نقش عضو با موفقیت تغییر کرد'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// حذف گروه
router.delete('/:id', authorize('sarafi', 'admin'), async (req, res) => {
  try {
    const group = await SarafiGroup.findById(req.params.id);

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'گروه یافت نشد'
      });
    }

    // فقط مالک می‌تواند گروه را حذف کند
    if (group.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'فقط مالک گروه می‌تواند آن را حذف کند'
      });
    }

    await group.deleteOne();

    // ثبت لاگ
    await AuditLog.log({
      action: 'group.delete',
      category: 'group',
      user: req.user._id,
      userRole: 'sarafi',
      sarafi: req.user._id,
      targetType: 'SarafiGroup',
      targetId: group._id,
      description: `حذف گروه "${group.name}"`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'گروه با موفقیت حذف شد'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ==================== روت‌های اشتراک‌گذاری مشتری ====================

// دریافت تنظیمات اشتراک‌گذاری
router.get('/:id/sharing-settings', authorize('sarafi', 'admin'), async (req, res) => {
  try {
    const settings = await groupSharingService.getGroupSharingSettings(
      req.params.id,
      req.user._id
    );
    res.json({ success: true, data: settings });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// به‌روزرسانی تنظیمات اشتراک‌گذاری گروه (فقط مالک)
router.put('/:id/sharing-settings', authorize('sarafi', 'admin'), async (req, res) => {
  try {
    const group = await groupSharingService.updateGroupSharingSettings(
      req.params.id,
      req.user._id,
      req.body
    );
    res.json({
      success: true,
      data: group.customerSharing,
      message: 'تنظیمات به‌روزرسانی شد'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// فعال/غیرفعال کردن اشتراک‌گذاری مشتری
router.post('/:id/sharing/toggle', authorize('sarafi', 'admin'), async (req, res) => {
  try {
    const { isEnabled, settings } = req.body;
    const group = await groupSharingService.toggleCustomerSharing(
      req.params.id,
      req.user._id,
      isEnabled,
      settings
    );
    res.json({
      success: true,
      data: { isEnabled },
      message: isEnabled ? 'اشتراک‌گذاری فعال شد' : 'اشتراک‌گذاری غیرفعال شد'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// اشتراک‌گذاری یک مشتری
router.post('/:id/shared-customers', authorize('sarafi', 'admin'), async (req, res) => {
  try {
    const {
      customerId,
      displayName,
      trustRating,
      tradeLimits,
      ownerSpread,
      expiresAt,
      notes
    } = req.body;

    const sharedCustomer = await groupSharingService.shareCustomer({
      groupId: req.params.id,
      sarafiId: req.user._id,
      customerId,
      displayName,
      trustRating,
      tradeLimits,
      ownerSpread,
      expiresAt,
      notes
    });

    res.status(201).json({
      success: true,
      data: sharedCustomer,
      message: 'مشتری با موفقیت به اشتراک گذاشته شد'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// دریافت مشتریان اشتراکی قابل دسترس
router.get('/:id/available-customers', authorize('sarafi', 'admin'), async (req, res) => {
  try {
    const customers = await groupSharingService.getAvailableSharedCustomers(
      req.params.id,
      req.user._id
    );
    res.json({ success: true, data: customers });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// دریافت مشتریان اشتراکی من در این گروه
router.get('/:id/my-shared-customers', authorize('sarafi', 'admin'), async (req, res) => {
  try {
    const customers = await SharedCustomer.getSharedCustomersOfSarafi(
      req.user._id,
      req.params.id
    );
    res.json({ success: true, data: customers });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
