const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth');
const Spread = require('../models/Spread');
const Currency = require('../models/Currency');
const AuditLog = require('../models/AuditLog');

// همه روت‌ها نیاز به احراز هویت دارند
router.use(protect);
router.use(authorize('sarafi'));

// دریافت همه اسپردهای صراف
router.get('/', async (req, res) => {
  try {
    const spreads = await Spread.find({ sarafi: req.user._id })
      .populate('currency', 'code name nameFa')
      .sort({ 'currency.code': 1 });

    res.json({
      success: true,
      data: spreads
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// دریافت اسپرد یک ارز
router.get('/currency/:currencyId', async (req, res) => {
  try {
    const spread = await Spread.findOne({
      sarafi: req.user._id,
      currency: req.params.currencyId
    }).populate('currency', 'code name nameFa buyRate sellRate');

    if (!spread) {
      return res.status(404).json({ success: false, message: 'اسپرد یافت نشد' });
    }

    res.json({
      success: true,
      data: spread
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ایجاد یا به‌روزرسانی اسپرد
router.post('/', async (req, res) => {
  try {
    const {
      currencyId,
      spreadType,
      buySpread,
      sellSpread,
      useTierSpread,
      tierSpread,
      useVolumeSpread,
      volumeBasedSpread,
      useTimeSpread,
      timeBasedSpread,
      minSpread,
      maxSpread,
      notes
    } = req.body;

    // بررسی ارز
    const currency = await Currency.findById(currencyId);
    if (!currency) {
      return res.status(404).json({ success: false, message: 'ارز یافت نشد' });
    }

    // بررسی وجود اسپرد قبلی
    let spread = await Spread.findOne({
      sarafi: req.user._id,
      currency: currencyId
    });

    const isNew = !spread;
    const previousValues = spread ? {
      spreadType: spread.spreadType,
      buySpread: spread.buySpread,
      sellSpread: spread.sellSpread
    } : null;

    if (spread) {
      // به‌روزرسانی
      spread.spreadType = spreadType || spread.spreadType;
      spread.buySpread = buySpread !== undefined ? buySpread : spread.buySpread;
      spread.sellSpread = sellSpread !== undefined ? sellSpread : spread.sellSpread;
      spread.useTierSpread = useTierSpread !== undefined ? useTierSpread : spread.useTierSpread;
      spread.tierSpread = tierSpread || spread.tierSpread;
      spread.useVolumeSpread = useVolumeSpread !== undefined ? useVolumeSpread : spread.useVolumeSpread;
      spread.volumeBasedSpread = volumeBasedSpread || spread.volumeBasedSpread;
      spread.useTimeSpread = useTimeSpread !== undefined ? useTimeSpread : spread.useTimeSpread;
      spread.timeBasedSpread = timeBasedSpread || spread.timeBasedSpread;
      spread.minSpread = minSpread !== undefined ? minSpread : spread.minSpread;
      spread.maxSpread = maxSpread !== undefined ? maxSpread : spread.maxSpread;
      spread.notes = notes || spread.notes;
      spread.lastModifiedBy = req.user._id;
    } else {
      // ایجاد جدید
      spread = new Spread({
        sarafi: req.user._id,
        currency: currencyId,
        spreadType: spreadType || 'percentage',
        buySpread: buySpread || 0,
        sellSpread: sellSpread || 0,
        useTierSpread: useTierSpread || false,
        tierSpread,
        useVolumeSpread: useVolumeSpread || false,
        volumeBasedSpread,
        useTimeSpread: useTimeSpread || false,
        timeBasedSpread,
        minSpread,
        maxSpread,
        notes,
        createdBy: req.user._id,
        lastModifiedBy: req.user._id
      });
    }

    await spread.save();

    // ثبت لاگ
    await AuditLog.log({
      action: isNew ? 'spread.create' : 'spread.update',
      category: 'spread',
      severity: 'critical',
      user: req.user._id,
      userRole: 'sarafi',
      sarafi: req.user._id,
      targetType: 'Spread',
      targetId: spread._id,
      description: isNew
        ? `ایجاد اسپرد برای ${currency.code}`
        : `به‌روزرسانی اسپرد ${currency.code}`,
      previousValues,
      newValues: {
        spreadType: spread.spreadType,
        buySpread: spread.buySpread,
        sellSpread: spread.sellSpread
      },
      ipAddress: req.ip,
      isHighRisk: true
    });

    await spread.populate('currency', 'code name nameFa');

    res.json({
      success: true,
      data: spread,
      message: isNew ? 'اسپرد ایجاد شد' : 'اسپرد به‌روز شد'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// به‌روزرسانی سریع اسپرد
router.put('/:id/quick-update', async (req, res) => {
  try {
    const { buySpread, sellSpread } = req.body;

    const spread = await Spread.findOne({
      _id: req.params.id,
      sarafi: req.user._id
    }).populate('currency', 'code name');

    if (!spread) {
      return res.status(404).json({ success: false, message: 'اسپرد یافت نشد' });
    }

    const previousValues = {
      buySpread: spread.buySpread,
      sellSpread: spread.sellSpread
    };

    if (buySpread !== undefined) spread.buySpread = buySpread;
    if (sellSpread !== undefined) spread.sellSpread = sellSpread;
    spread.lastModifiedBy = req.user._id;

    await spread.save();

    // ثبت لاگ
    await AuditLog.log({
      action: 'spread.update',
      category: 'spread',
      severity: 'critical',
      user: req.user._id,
      userRole: 'sarafi',
      sarafi: req.user._id,
      targetType: 'Spread',
      targetId: spread._id,
      description: `تغییر سریع اسپرد ${spread.currency.code}`,
      previousValues,
      newValues: { buySpread: spread.buySpread, sellSpread: spread.sellSpread },
      ipAddress: req.ip,
      isHighRisk: true
    });

    res.json({
      success: true,
      data: spread,
      message: 'اسپرد به‌روز شد'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// فعال/غیرفعال کردن اسپرد
router.put('/:id/toggle', async (req, res) => {
  try {
    const spread = await Spread.findOne({
      _id: req.params.id,
      sarafi: req.user._id
    }).populate('currency', 'code name');

    if (!spread) {
      return res.status(404).json({ success: false, message: 'اسپرد یافت نشد' });
    }

    spread.isActive = !spread.isActive;
    spread.lastModifiedBy = req.user._id;
    await spread.save();

    // ثبت لاگ
    await AuditLog.log({
      action: 'spread.update',
      category: 'spread',
      user: req.user._id,
      userRole: 'sarafi',
      sarafi: req.user._id,
      targetType: 'Spread',
      targetId: spread._id,
      description: `${spread.isActive ? 'فعال‌سازی' : 'غیرفعال‌سازی'} اسپرد ${spread.currency.code}`,
      newValues: { isActive: spread.isActive },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      data: spread,
      message: spread.isActive ? 'اسپرد فعال شد' : 'اسپرد غیرفعال شد'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// محاسبه قیمت نهایی مشتری (پیش‌نمایش)
router.post('/calculate-price', async (req, res) => {
  try {
    const { currencyId, side, amount, customerTier } = req.body;

    const spread = await Spread.findOne({
      sarafi: req.user._id,
      currency: currencyId,
      isActive: true
    });

    const currency = await Currency.findById(currencyId);
    if (!currency) {
      return res.status(404).json({ success: false, message: 'ارز یافت نشد' });
    }

    const marketPrice = side === 'buy' ? currency.sellRate : currency.buyRate;

    if (!spread) {
      return res.json({
        success: true,
        data: {
          marketPrice,
          spreadValue: 0,
          spreadAmount: 0,
          spreadType: 'none',
          finalPrice: marketPrice,
          side
        }
      });
    }

    const result = spread.calculateFinalPrice(
      marketPrice,
      side,
      customerTier || 'new',
      amount || 1
    );

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// تاریخچه تغییرات اسپرد
router.get('/:id/history', async (req, res) => {
  try {
    const spread = await Spread.findOne({
      _id: req.params.id,
      sarafi: req.user._id
    });

    if (!spread) {
      return res.status(404).json({ success: false, message: 'اسپرد یافت نشد' });
    }

    // دریافت لاگ‌های مرتبط
    const logs = await AuditLog.find({
      targetType: 'Spread',
      targetId: spread._id
    })
      .populate('user', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({
      success: true,
      data: {
        internalHistory: spread.changeHistory,
        auditLogs: logs
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// حذف اسپرد
router.delete('/:id', async (req, res) => {
  try {
    const spread = await Spread.findOne({
      _id: req.params.id,
      sarafi: req.user._id
    }).populate('currency', 'code name');

    if (!spread) {
      return res.status(404).json({ success: false, message: 'اسپرد یافت نشد' });
    }

    await spread.deleteOne();

    // ثبت لاگ
    await AuditLog.log({
      action: 'spread.delete',
      category: 'spread',
      user: req.user._id,
      userRole: 'sarafi',
      sarafi: req.user._id,
      targetType: 'Spread',
      targetId: spread._id,
      description: `حذف اسپرد ${spread.currency.code}`,
      previousValues: {
        spreadType: spread.spreadType,
        buySpread: spread.buySpread,
        sellSpread: spread.sellSpread
      },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'اسپرد حذف شد'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
