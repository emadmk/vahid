const SarafiGroup = require('../models/SarafiGroup');
const SharedCustomer = require('../models/SharedCustomer');
const GroupSettlement = require('../models/GroupSettlement');
const Trade = require('../models/Trade');
const User = require('../models/User');
const Currency = require('../models/Currency');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');

/**
 * سرویس مدیریت اشتراک‌گذاری مشتری در گروه‌های صراف
 */
class GroupSharingService {
  /**
   * فعال/غیرفعال کردن اشتراک‌گذاری مشتری برای یک صراف در گروه
   */
  async toggleCustomerSharing(groupId, sarafiId, isEnabled, settings = {}) {
    const group = await SarafiGroup.findById(groupId);
    if (!group) {
      throw new Error('گروه یافت نشد');
    }

    // بررسی عضویت
    const ownerId = group.owner._id ? group.owner._id.toString() : group.owner.toString();
    const isOwner = ownerId === sarafiId.toString();
    if (!isOwner && !group.isMember(sarafiId)) {
      throw new Error('شما عضو این گروه نیستید');
    }

    // اگر مالک اشتراک‌گذاری را فعال می‌کند، سطح گروه را هم فعال کن
    if (isEnabled && isOwner && !group.customerSharing?.enabled) {
      if (!group.customerSharing) {
        group.customerSharing = {};
      }
      group.customerSharing.enabled = true;
      group.customerSharing.activationMode = settings.activationMode || 'manual';
    }

    // بررسی فعال بودن اشتراک‌گذاری در سطح گروه (فقط برای اعضای غیر مالک)
    if (isEnabled && !isOwner && !group.customerSharing?.enabled) {
      throw new Error('اشتراک‌گذاری مشتری در این گروه فعال نیست. لطفاً با مالک گروه تماس بگیرید.');
    }

    if (isOwner) {
      // برای مالک، تنظیمات را در سطح گروه ذخیره می‌کنیم
      // و یک عضو مجازی برای او ایجاد می‌کنیم
      let ownerMember = group.members.find(m => m.user.toString() === sarafiId.toString());
      if (!ownerMember) {
        group.members.push({
          user: sarafiId,
          role: 'admin',
          customerSharing: {
            isSharing: isEnabled,
            lastActivatedAt: isEnabled ? new Date() : undefined,
            personalSettings: settings
          }
        });
      } else {
        group.toggleCustomerSharing(sarafiId, isEnabled);
        if (settings.activationMode) {
          ownerMember.customerSharing.personalSettings = settings;
        }
      }
    } else {
      group.toggleCustomerSharing(sarafiId, isEnabled);
      const member = group.members.find(m => m.user.toString() === sarafiId.toString());
      if (member && settings.activationMode) {
        member.customerSharing.personalSettings = settings;
      }
    }

    await group.save();

    // ثبت لاگ
    await AuditLog.log({
      action: isEnabled ? 'customer_sharing.enable' : 'customer_sharing.disable',
      category: 'customer_sharing',
      user: sarafiId,
      userRole: 'sarafi',
      sarafi: sarafiId,
      targetType: 'SarafiGroup',
      targetId: group._id,
      description: isEnabled ? 'فعال‌سازی اشتراک‌گذاری مشتری' : 'غیرفعال‌سازی اشتراک‌گذاری مشتری'
    });

    return group;
  }

  /**
   * اشتراک‌گذاری یک مشتری با گروه
   */
  async shareCustomer(data) {
    const {
      groupId,
      sarafiId,
      customerId,
      displayName,
      trustRating,
      tradeLimits,
      ownerSpread,
      expiresAt,
      notes
    } = data;

    // دریافت گروه
    const group = await SarafiGroup.findById(groupId);
    if (!group) {
      throw new Error('گروه یافت نشد');
    }

    // بررسی عضویت
    const ownerId = group.owner._id ? group.owner._id.toString() : group.owner.toString();
    const isOwner = ownerId === sarafiId.toString();
    if (!isOwner && !group.isMember(sarafiId)) {
      throw new Error('شما عضو این گروه نیستید');
    }

    // بررسی فعال بودن اشتراک‌گذاری
    // اگر مالک است و اشتراک‌گذاری فعال نیست، به طور خودکار فعال کن
    if (!group.customerSharing?.enabled) {
      if (isOwner) {
        // فعال‌سازی خودکار برای مالک
        if (!group.customerSharing) {
          group.customerSharing = {};
        }
        group.customerSharing.enabled = true;
        group.customerSharing.activationMode = 'manual';

        // همچنین اشتراک‌گذاری شخصی مالک را فعال کن
        let ownerMember = group.members.find(m => m.user.toString() === sarafiId.toString());
        if (!ownerMember) {
          group.members.push({
            user: sarafiId,
            role: 'admin',
            customerSharing: {
              isSharing: true,
              lastActivatedAt: new Date()
            }
          });
        } else {
          ownerMember.customerSharing = ownerMember.customerSharing || {};
          ownerMember.customerSharing.isSharing = true;
          ownerMember.customerSharing.lastActivatedAt = new Date();
        }

        await group.save();
      } else {
        throw new Error('اشتراک‌گذاری مشتری در این گروه فعال نیست. لطفاً با مالک گروه تماس بگیرید.');
      }
    }

    // بررسی مشتری
    const customer = await User.findById(customerId);
    if (!customer) {
      throw new Error('مشتری یافت نشد');
    }

    // بررسی اینکه این مشتری متعلق به این صراف است
    if (customer.sarafi?.toString() !== sarafiId.toString()) {
      throw new Error('این مشتری متعلق به شما نیست');
    }

    // دریافت تعداد معاملات موفق
    const successfulTrades = await Trade.countDocuments({
      customer: customerId,
      sarafi: sarafiId,
      status: 'completed'
    });

    // محاسبه میانگین حجم معاملات
    const avgVolume = await this._calculateAverageTradeVolume(customerId, sarafiId);

    // ایجاد نام مستعار
    const finalDisplayName = displayName || `مشتری-${Date.now().toString(36).toUpperCase().slice(-6)}`;

    // اشتراک‌گذاری مشتری
    const sharedCustomer = await SharedCustomer.shareCustomer({
      groupId,
      ownerSarafiId: sarafiId,
      customerId,
      displayName: finalDisplayName,
      customerInfo: {
        type: customer.customerType || 'individual',
        trustRating: trustRating || 3,
        isVerified: customer.isVerified || false,
        averageTradeVolume: avgVolume,
        successfulTrades
      },
      tradeLimits: tradeLimits || {
        allowedTypes: ['buy', 'sell']
      },
      ownerSpread: ownerSpread || { buy: 0, sell: 0 },
      expiresAt,
      notes
    });

    // به‌روزرسانی آمار عضو
    group.updateMemberSharingStats(sarafiId, { customersShared: 1 });
    await group.save();

    // ثبت لاگ
    await AuditLog.log({
      action: 'customer_sharing.share_customer',
      category: 'customer_sharing',
      user: sarafiId,
      userRole: 'sarafi',
      sarafi: sarafiId,
      targetType: 'SharedCustomer',
      targetId: sharedCustomer._id,
      description: `اشتراک‌گذاری مشتری با نام ${finalDisplayName}`
    });

    return sharedCustomer;
  }

  /**
   * محاسبه میانگین حجم معاملات
   */
  async _calculateAverageTradeVolume(customerId, sarafiId) {
    const trades = await Trade.find({
      customer: customerId,
      sarafi: sarafiId,
      status: 'completed'
    }).select('totalAmount');

    if (trades.length === 0) return 'low';

    const avgAmount = trades.reduce((sum, t) => sum + t.totalAmount, 0) / trades.length;

    if (avgAmount < 100000000) return 'low';          // کمتر از 100 میلیون
    if (avgAmount < 500000000) return 'medium';       // 100 تا 500 میلیون
    if (avgAmount < 2000000000) return 'high';        // 500 میلیون تا 2 میلیارد
    return 'very_high';                               // بالای 2 میلیارد
  }

  /**
   * حذف اشتراک‌گذاری یک مشتری
   */
  async unshareCustomer(sharedCustomerId, sarafiId) {
    const sharedCustomer = await SharedCustomer.findById(sharedCustomerId);
    if (!sharedCustomer) {
      throw new Error('مشتری اشتراکی یافت نشد');
    }

    if (sharedCustomer.ownerSarafi.toString() !== sarafiId.toString()) {
      throw new Error('شما مجاز به این عملیات نیستید');
    }

    await sharedCustomer.remove();

    // ثبت لاگ
    await AuditLog.log({
      action: 'customer_sharing.unshare_customer',
      category: 'customer_sharing',
      user: sarafiId,
      userRole: 'sarafi',
      sarafi: sarafiId,
      targetType: 'SharedCustomer',
      targetId: sharedCustomer._id,
      description: 'حذف اشتراک‌گذاری مشتری'
    });

    return { success: true };
  }

  /**
   * دریافت مشتریان اشتراکی قابل دسترس برای یک صراف
   */
  async getAvailableSharedCustomers(groupId, sarafiId) {
    const group = await SarafiGroup.findById(groupId);
    if (!group) {
      throw new Error('گروه یافت نشد');
    }

    // بررسی عضویت
    const ownerId = group.owner._id ? group.owner._id.toString() : group.owner.toString();
    const isOwner = ownerId === sarafiId.toString();
    if (!isOwner && !group.isMember(sarafiId)) {
      throw new Error('شما عضو این گروه نیستید');
    }

    // دریافت اعضایی که اشتراک‌گذاری فعال دارند
    const activeSharingMembers = group.getMembersWithActiveSharing(sarafiId);
    const activeSharingUserIds = activeSharingMembers.map(m => m.user);

    // اضافه کردن مالک اگر اشتراک‌گذاری فعال دارد
    if (group.isMemberSharingActive(group.owner) && group.owner.toString() !== sarafiId.toString()) {
      activeSharingUserIds.push(group.owner);
    }

    // دریافت مشتریان اشتراکی از این اعضا
    const sharedCustomers = await SharedCustomer.find({
      group: groupId,
      ownerSarafi: { $in: activeSharingUserIds },
      status: 'active',
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } }
      ]
    })
      .populate('ownerSarafi', 'firstName lastName sarafiInfo.name')
      .populate('tradeLimits.allowedCurrencies', 'name symbol code')
      .sort({ createdAt: -1 });

    // پردازش برای حفظ حریم خصوصی
    return sharedCustomers.map(sc => ({
      _id: sc._id,
      displayName: sc.displayName,
      ownerSarafi: {
        _id: sc.ownerSarafi._id,
        name: sc.ownerSarafi.sarafiInfo?.name || `${sc.ownerSarafi.firstName} ${sc.ownerSarafi.lastName}`
      },
      customerInfo: {
        type: sc.customerInfo.type,
        trustRating: sc.customerInfo.trustRating,
        isVerified: sc.customerInfo.isVerified,
        averageTradeVolume: sc.customerInfo.averageTradeVolume,
        successfulTrades: sc.customerInfo.successfulTrades
      },
      tradeLimits: sc.tradeLimits,
      ownerSpread: sc.ownerSpread,
      stats: {
        totalTrades: sc.stats.totalTrades
      }
    }));
  }

  /**
   * ایجاد معامله گروهی
   */
  async createGroupTrade(data) {
    const {
      sharedCustomerId,
      executorSarafiId,
      type, // buy or sell
      currencyId,
      amount,
      baseRate,
      executorSpreadPercent,
      paymentMethod,
      notes
    } = data;

    // دریافت مشتری اشتراکی
    const sharedCustomer = await SharedCustomer.findById(sharedCustomerId)
      .populate('group')
      .populate('ownerSarafi')
      .populate('customer');

    if (!sharedCustomer) {
      throw new Error('مشتری اشتراکی یافت نشد');
    }

    if (sharedCustomer.status !== 'active') {
      throw new Error('این مشتری دیگر در اشتراک نیست');
    }

    // بررسی محدودیت‌های معامله
    if (sharedCustomer.tradeLimits.allowedTypes?.length > 0 &&
        !sharedCustomer.tradeLimits.allowedTypes.includes(type)) {
      throw new Error(`نوع معامله ${type === 'buy' ? 'خرید' : 'فروش'} برای این مشتری مجاز نیست`);
    }

    // بررسی ارز مجاز
    if (sharedCustomer.tradeLimits.allowedCurrencies?.length > 0 &&
        !sharedCustomer.tradeLimits.allowedCurrencies.some(c => c.toString() === currencyId)) {
      throw new Error('این ارز برای معامله با این مشتری مجاز نیست');
    }

    // دریافت ارز
    const currency = await Currency.findById(currencyId);
    if (!currency) {
      throw new Error('ارز یافت نشد');
    }

    // محاسبه اسپردها
    const ownerSpreadPercent = type === 'buy'
      ? sharedCustomer.ownerSpread.buy
      : sharedCustomer.ownerSpread.sell;

    // بررسی حداکثر اسپرد اجراکننده
    const maxExecutorSpread = sharedCustomer.group.customerSharing?.spreadSettings?.maxExecutorSpread || 5;
    if (executorSpreadPercent > maxExecutorSpread) {
      throw new Error(`اسپرد شما نباید بیشتر از ${maxExecutorSpread}% باشد`);
    }

    // محاسبه نرخ‌ها
    const ownerSpreadAmount = baseRate * (ownerSpreadPercent / 100);
    const executorSpreadAmount = baseRate * (executorSpreadPercent / 100);

    // نرخ بین صراف‌ها (نرخ پایه + اسپرد مالک)
    const interSarafiRate = type === 'buy'
      ? baseRate + ownerSpreadAmount    // خرید: مشتری بیشتر می‌دهد
      : baseRate - ownerSpreadAmount;   // فروش: مشتری کمتر می‌گیرد

    // نرخ نهایی برای مشتری (نرخ بین صراف‌ها + اسپرد اجراکننده)
    const customerRate = type === 'buy'
      ? interSarafiRate + executorSpreadAmount
      : interSarafiRate - executorSpreadAmount;

    // محاسبه مبالغ
    const customerTotal = amount * customerRate;
    const interSarafiTotal = amount * interSarafiRate;
    const ownerProfit = amount * ownerSpreadAmount;
    const executorProfit = amount * executorSpreadAmount;

    // بررسی محدودیت مبلغ
    if (sharedCustomer.tradeLimits.minAmount && customerTotal < sharedCustomer.tradeLimits.minAmount) {
      throw new Error(`حداقل مبلغ معامله ${sharedCustomer.tradeLimits.minAmount.toLocaleString()} ریال است`);
    }
    if (sharedCustomer.tradeLimits.maxAmount && customerTotal > sharedCustomer.tradeLimits.maxAmount) {
      throw new Error(`حداکثر مبلغ معامله ${sharedCustomer.tradeLimits.maxAmount.toLocaleString()} ریال است`);
    }

    // ایجاد معامله
    const tradeNumber = Trade.generateTradeNumber();
    const trade = await Trade.create({
      tradeNumber,
      type,
      currency: currencyId,
      amount,
      rate: customerRate,
      totalAmount: customerTotal,
      netAmount: customerTotal,
      customer: sharedCustomer.customer._id,
      sarafi: executorSarafiId, // صراف اجراکننده
      paymentMethod: paymentMethod || 'cash_wallet',
      status: 'pending',
      isGroupTrade: true,
      group: sharedCustomer.group._id,
      sharedCustomer: sharedCustomerId,
      ownerSarafi: sharedCustomer.ownerSarafi._id,
      groupTradeDetails: {
        baseRate,
        ownerSpreadPercent,
        ownerSpreadAmount,
        executorSpreadPercent,
        executorSpreadAmount,
        interSarafiRate,
        ownerProfit,
        executorProfit
      },
      notes: notes ? [{ content: notes, addedBy: executorSarafiId }] : []
    });

    // ایجاد تسویه گروهی
    const settlementNumber = GroupSettlement.generateSettlementNumber();
    const settlement = await GroupSettlement.create({
      settlementNumber,
      group: sharedCustomer.group._id,
      trade: trade._id,
      ownerSarafi: sharedCustomer.ownerSarafi._id,
      executorSarafi: executorSarafiId,
      customer: sharedCustomer.customer._id,
      tradeType: type,
      currency: currencyId,
      amount,
      rates: {
        baseRate,
        ownerSpread: ownerSpreadPercent,
        executorSpread: executorSpreadPercent,
        customerRate,
        interSarafiRate
      },
      amounts: {
        customerTotal,
        interSarafiTotal,
        ownerProfit,
        executorProfit
      }
    });

    // به‌روزرسانی معامله با شناسه تسویه
    trade.groupSettlement = settlement._id;
    await trade.save();

    // ارسال اعلان به صراف مالک
    await Notification.create({
      user: sharedCustomer.ownerSarafi._id,
      title: 'معامله جدید با مشتری اشتراکی',
      message: `صراف دیگری معامله‌ای با مشتری "${sharedCustomer.displayName}" انجام داده است`,
      type: 'trade_new',
      data: {
        tradeId: trade._id,
        settlementId: settlement._id
      },
      actionUrl: `/sarafi/group-settlements/${settlement._id}`
    });

    // ثبت لاگ
    await AuditLog.log({
      action: 'group_trade.create',
      category: 'group_trade',
      user: executorSarafiId,
      userRole: 'sarafi',
      sarafi: executorSarafiId,
      targetType: 'Trade',
      targetId: trade._id,
      targetReference: tradeNumber,
      description: `ایجاد معامله گروهی با مشتری ${sharedCustomer.displayName}`,
      metadata: {
        ownerSarafi: sharedCustomer.ownerSarafi._id,
        settlementId: settlement._id
      }
    });

    return {
      trade,
      settlement,
      calculations: {
        baseRate,
        ownerSpreadPercent,
        ownerSpreadAmount,
        executorSpreadPercent,
        executorSpreadAmount,
        interSarafiRate,
        customerRate,
        customerTotal,
        interSarafiTotal,
        ownerProfit,
        executorProfit
      }
    };
  }

  /**
   * تایید تسویه توسط یکی از صراف‌ها
   */
  async confirmSettlement(settlementId, sarafiId) {
    const settlement = await GroupSettlement.findById(settlementId);
    if (!settlement) {
      throw new Error('تسویه یافت نشد');
    }

    const isOwner = settlement.ownerSarafi.toString() === sarafiId.toString();
    const isExecutor = settlement.executorSarafi.toString() === sarafiId.toString();

    if (!isOwner && !isExecutor) {
      throw new Error('شما مجاز به این عملیات نیستید');
    }

    await settlement.confirmSettlement(sarafiId, isOwner);

    // اگر تسویه کامل شد
    if (settlement.executorSettlement.status === 'completed') {
      // به‌روزرسانی آمار مشتری اشتراکی
      const sharedCustomer = await SharedCustomer.findById(
        (await Trade.findById(settlement.trade)).sharedCustomer
      );
      if (sharedCustomer) {
        await sharedCustomer.updateStatsAfterTrade(
          settlement.amounts.customerTotal,
          settlement.amounts.ownerProfit
        );
      }

      // ارسال اعلان
      const otherSarafiId = isOwner ? settlement.executorSarafi : settlement.ownerSarafi;
      await Notification.create({
        user: otherSarafiId,
        title: 'تسویه تکمیل شد',
        message: `تسویه ${settlement.settlementNumber} با موفقیت تکمیل شد`,
        type: 'trade_completed',
        data: { settlementId: settlement._id },
        actionUrl: `/sarafi/group-settlements/${settlement._id}`
      });
    }

    // ثبت لاگ
    await AuditLog.log({
      action: 'group_settlement.confirm',
      category: 'group_settlement',
      user: sarafiId,
      userRole: 'sarafi',
      sarafi: sarafiId,
      targetType: 'GroupSettlement',
      targetId: settlement._id,
      targetReference: settlement.settlementNumber,
      description: `تایید تسویه توسط ${isOwner ? 'صراف مالک' : 'صراف اجراکننده'}`
    });

    return settlement;
  }

  /**
   * ثبت وصول از مشتری
   */
  async recordCustomerCollection(settlementId, sarafiId, data) {
    const settlement = await GroupSettlement.findById(settlementId);
    if (!settlement) {
      throw new Error('تسویه یافت نشد');
    }

    // فقط صراف مالک می‌تواند وصول از مشتری را ثبت کند
    if (settlement.ownerSarafi.toString() !== sarafiId.toString()) {
      throw new Error('فقط صراف مالک می‌تواند وصول از مشتری را ثبت کند');
    }

    await settlement.recordCustomerCollection(data);

    // به‌روزرسانی وضعیت معامله
    await Trade.findByIdAndUpdate(settlement.trade, {
      groupSettlementStatus: 'completed'
    });

    // به‌روزرسانی آمار گروه
    const group = await SarafiGroup.findById(settlement.group);
    if (group) {
      group.updateMemberSharingStats(settlement.ownerSarafi, {
        trades: 1,
        earnings: settlement.amounts.ownerProfit
      });
      await group.save();
    }

    // ثبت لاگ
    await AuditLog.log({
      action: 'group_settlement.complete',
      category: 'group_settlement',
      user: sarafiId,
      userRole: 'sarafi',
      sarafi: sarafiId,
      targetType: 'GroupSettlement',
      targetId: settlement._id,
      targetReference: settlement.settlementNumber,
      description: 'تکمیل وصول از مشتری'
    });

    return settlement;
  }

  /**
   * دریافت تنظیمات اشتراک‌گذاری گروه
   */
  async getGroupSharingSettings(groupId, sarafiId) {
    const group = await SarafiGroup.findById(groupId);
    if (!group) {
      throw new Error('گروه یافت نشد');
    }

    const ownerId = group.owner._id ? group.owner._id.toString() : group.owner.toString();
    const isOwner = ownerId === sarafiId.toString();
    if (!isOwner && !group.isMember(sarafiId)) {
      throw new Error('شما عضو این گروه نیستید');
    }

    const member = group.members.find(m => m.user.toString() === sarafiId.toString());

    return {
      groupSettings: group.customerSharing,
      personalSettings: member?.customerSharing || {
        isSharing: false,
        personalSettings: {}
      },
      isSharingActive: group.isMemberSharingActive(sarafiId),
      isOwner
    };
  }

  /**
   * به‌روزرسانی تنظیمات اشتراک‌گذاری گروه (فقط مالک)
   */
  async updateGroupSharingSettings(groupId, sarafiId, settings) {
    const group = await SarafiGroup.findById(groupId);
    if (!group) {
      throw new Error('گروه یافت نشد');
    }

    const ownerId = group.owner._id ? group.owner._id.toString() : group.owner.toString();
    if (ownerId !== sarafiId.toString()) {
      throw new Error('فقط مالک گروه می‌تواند تنظیمات را تغییر دهد');
    }

    group.customerSharing = {
      ...group.customerSharing,
      ...settings
    };

    await group.save();

    // ثبت لاگ
    await AuditLog.log({
      action: 'customer_sharing.update_settings',
      category: 'customer_sharing',
      user: sarafiId,
      userRole: 'sarafi',
      sarafi: sarafiId,
      targetType: 'SarafiGroup',
      targetId: group._id,
      description: 'به‌روزرسانی تنظیمات اشتراک‌گذاری گروه'
    });

    return group;
  }

  /**
   * به‌روزرسانی وضعیت آنلاین عضو (برای حالت offline)
   */
  async updateOnlineStatus(sarafiId) {
    const groups = await SarafiGroup.find({
      $or: [
        { owner: sarafiId },
        { 'members.user': sarafiId }
      ],
      isActive: true,
      'customerSharing.enabled': true
    });

    for (const group of groups) {
      group.updateMemberOnlineStatus(sarafiId);
      await group.save();
    }

    return { updated: groups.length };
  }

  /**
   * محاسبه پیش‌نمایش معامله گروهی
   */
  async calculateGroupTradePreview(sharedCustomerId, type, currencyId, amount, executorSpreadPercent, baseRate) {
    const sharedCustomer = await SharedCustomer.findById(sharedCustomerId)
      .populate('group');

    if (!sharedCustomer) {
      throw new Error('مشتری اشتراکی یافت نشد');
    }

    const ownerSpreadPercent = type === 'buy'
      ? sharedCustomer.ownerSpread.buy
      : sharedCustomer.ownerSpread.sell;

    const ownerSpreadAmount = baseRate * (ownerSpreadPercent / 100);
    const executorSpreadAmount = baseRate * (executorSpreadPercent / 100);

    const interSarafiRate = type === 'buy'
      ? baseRate + ownerSpreadAmount
      : baseRate - ownerSpreadAmount;

    const customerRate = type === 'buy'
      ? interSarafiRate + executorSpreadAmount
      : interSarafiRate - executorSpreadAmount;

    const customerTotal = amount * customerRate;
    const interSarafiTotal = amount * interSarafiRate;
    const ownerProfit = amount * ownerSpreadAmount;
    const executorProfit = amount * executorSpreadAmount;

    return {
      baseRate,
      ownerSpreadPercent,
      ownerSpreadAmount: Math.round(ownerSpreadAmount),
      executorSpreadPercent,
      executorSpreadAmount: Math.round(executorSpreadAmount),
      interSarafiRate: Math.round(interSarafiRate),
      customerRate: Math.round(customerRate),
      customerTotal: Math.round(customerTotal),
      interSarafiTotal: Math.round(interSarafiTotal),
      ownerProfit: Math.round(ownerProfit),
      executorProfit: Math.round(executorProfit)
    };
  }
}

module.exports = new GroupSharingService();
