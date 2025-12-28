const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth');
const SarafiRate = require('../models/SarafiRate');
const SarafiRateHistory = require('../models/SarafiRateHistory');
const Currency = require('../models/Currency');
const AuditLog = require('../models/AuditLog');

// همه روت‌ها نیاز به احراز هویت دارند
router.use(protect);

// ========== روت‌های صراف ==========

// دریافت همه نرخ‌های صراف
router.get('/', authorize('sarafi'), async (req, res) => {
  try {
    // دریافت نرخ‌های تعریف‌شده صراف
    const sarafiRates = await SarafiRate.find({ sarafi: req.user._id })
      .populate('currency', 'code nameFa symbol icon type')
      .populate('updatedBy', 'firstName lastName')
      .sort({ 'currency.order': 1 });

    // دریافت همه ارزها برای نمایش
    const allCurrencies = await Currency.find({ isActive: true }).sort({ order: 1 });

    // دریافت آخرین تاریخچه برای هر ارز (برای نمایش نرخ قبلی)
    const lastHistoryItems = await SarafiRateHistory.aggregate([
      { $match: { sarafi: req.user._id } },
      { $sort: { createdAt: -1 } },
      { $group: {
        _id: '$currency',
        previousBuyRate: { $first: '$previousBuyRate' },
        previousSellRate: { $first: '$previousSellRate' }
      }}
    ]);

    const historyMap = {};
    lastHistoryItems.forEach(h => {
      historyMap[h._id.toString()] = {
        previousBuyRate: h.previousBuyRate,
        previousSellRate: h.previousSellRate
      };
    });

    // ترکیب نرخ‌های صراف با نرخ‌های پیش‌فرض
    const rates = allCurrencies.map(currency => {
      const sarafiRate = sarafiRates.find(
        r => r.currency._id.toString() === currency._id.toString()
      );
      const history = historyMap[currency._id.toString()];

      return {
        currency: {
          _id: currency._id,
          code: currency.code,
          nameFa: currency.nameFa,
          symbol: currency.symbol,
          icon: currency.icon,
          type: currency.type
        },
        buyRate: sarafiRate?.buyRate || currency.buyRate,
        sellRate: sarafiRate?.sellRate || currency.sellRate,
        previousBuyRate: history?.previousBuyRate,
        previousSellRate: history?.previousSellRate,
        isCustom: !!sarafiRate,
        lastUpdate: sarafiRate?.lastUpdate || currency.lastRateUpdate,
        updatedBy: sarafiRate?.updatedBy,
        validUntil: sarafiRate?.validUntil
      };
    });

    res.json({
      success: true,
      data: rates
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// دریافت نرخ یک ارز خاص
router.get('/:currencyId', authorize('sarafi'), async (req, res) => {
  try {
    const currency = await Currency.findById(req.params.currencyId);
    if (!currency) {
      return res.status(404).json({ success: false, message: 'ارز یافت نشد' });
    }

    const sarafiRate = await SarafiRate.findOne({
      sarafi: req.user._id,
      currency: req.params.currencyId
    }).populate('updatedBy', 'firstName lastName');

    res.json({
      success: true,
      data: {
        currency: {
          _id: currency._id,
          code: currency.code,
          nameFa: currency.nameFa,
          symbol: currency.symbol
        },
        buyRate: sarafiRate?.buyRate || currency.buyRate,
        sellRate: sarafiRate?.sellRate || currency.sellRate,
        isCustom: !!sarafiRate,
        lastUpdate: sarafiRate?.lastUpdate || currency.lastRateUpdate,
        validUntil: sarafiRate?.validUntil
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ثبت/ویرایش نرخ ارز
router.post('/:currencyId', authorize('sarafi'), async (req, res) => {
  try {
    const { buyRate, sellRate, validUntil, validityMinutes, notes } = req.body;

    // اعتبارسنجی
    if (!buyRate || !sellRate) {
      return res.status(400).json({ success: false, message: 'نرخ خرید و فروش الزامی است' });
    }

    if (buyRate <= 0 || sellRate <= 0) {
      return res.status(400).json({ success: false, message: 'نرخ باید بزرگتر از صفر باشد' });
    }

    const currency = await Currency.findById(req.params.currencyId);
    if (!currency) {
      return res.status(404).json({ success: false, message: 'ارز یافت نشد' });
    }

    // پیدا کردن نرخ فعلی برای تاریخچه
    const existingRate = await SarafiRate.findOne({
      sarafi: req.user._id,
      currency: req.params.currencyId
    });

    // ثبت تاریخچه
    await SarafiRateHistory.create({
      sarafi: req.user._id,
      currency: req.params.currencyId,
      previousBuyRate: existingRate?.buyRate || currency.buyRate,
      previousSellRate: existingRate?.sellRate || currency.sellRate,
      newBuyRate: buyRate,
      newSellRate: sellRate,
      changedBy: req.user._id,
      changedByRole: 'sarafi',
      reason: notes,
      ipAddress: req.ip
    });

    // محاسبه زمان اعتبار نرخ
    let calculatedValidUntil = null;
    if (validityMinutes && validityMinutes > 0) {
      calculatedValidUntil = new Date(Date.now() + validityMinutes * 60 * 1000);
    } else if (validUntil) {
      calculatedValidUntil = new Date(validUntil);
    }

    // ایجاد یا به‌روزرسانی نرخ
    const sarafiRate = await SarafiRate.findOneAndUpdate(
      { sarafi: req.user._id, currency: req.params.currencyId },
      {
        buyRate,
        sellRate,
        validUntil: calculatedValidUntil,
        notes,
        lastUpdate: new Date(),
        updatedBy: req.user._id,
        isActive: true
      },
      { upsert: true, new: true }
    ).populate('currency', 'code nameFa symbol');

    // ثبت لاگ
    await AuditLog.log({
      action: existingRate ? 'sarafi_rate.update' : 'sarafi_rate.create',
      category: 'rate',
      user: req.user._id,
      userRole: 'sarafi',
      sarafi: req.user._id,
      targetType: 'SarafiRate',
      targetId: sarafiRate._id,
      targetReference: currency.code,
      description: `${existingRate ? 'به‌روزرسانی' : 'ثبت'} نرخ ${currency.nameFa} - خرید: ${buyRate} فروش: ${sellRate}`,
      previousValues: existingRate ? {
        buyRate: existingRate.buyRate,
        sellRate: existingRate.sellRate
      } : null,
      newValues: { buyRate, sellRate },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      data: sarafiRate,
      message: 'نرخ با موفقیت ثبت شد'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// به‌روزرسانی چندین نرخ همزمان
router.put('/bulk', authorize('sarafi'), async (req, res) => {
  try {
    const { rates } = req.body; // [{currencyId, buyRate, sellRate}]

    if (!rates || !Array.isArray(rates) || rates.length === 0) {
      return res.status(400).json({ success: false, message: 'لیست نرخ‌ها الزامی است' });
    }

    const results = [];
    const errors = [];

    for (const rate of rates) {
      try {
        const currency = await Currency.findById(rate.currencyId);
        if (!currency) {
          errors.push({ currencyId: rate.currencyId, error: 'ارز یافت نشد' });
          continue;
        }

        const existingRate = await SarafiRate.findOne({
          sarafi: req.user._id,
          currency: rate.currencyId
        });

        // ثبت تاریخچه
        await SarafiRateHistory.create({
          sarafi: req.user._id,
          currency: rate.currencyId,
          previousBuyRate: existingRate?.buyRate || currency.buyRate,
          previousSellRate: existingRate?.sellRate || currency.sellRate,
          newBuyRate: rate.buyRate,
          newSellRate: rate.sellRate,
          changedBy: req.user._id,
          changedByRole: 'sarafi',
          ipAddress: req.ip
        });

        const sarafiRate = await SarafiRate.findOneAndUpdate(
          { sarafi: req.user._id, currency: rate.currencyId },
          {
            buyRate: rate.buyRate,
            sellRate: rate.sellRate,
            lastUpdate: new Date(),
            updatedBy: req.user._id,
            isActive: true
          },
          { upsert: true, new: true }
        );

        results.push({ currencyId: rate.currencyId, success: true });
      } catch (err) {
        errors.push({ currencyId: rate.currencyId, error: err.message });
      }
    }

    res.json({
      success: true,
      data: { updated: results.length, errors },
      message: `${results.length} نرخ به‌روزرسانی شد`
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// حذف نرخ سفارشی (برگشت به نرخ پیش‌فرض)
router.delete('/:currencyId', authorize('sarafi'), async (req, res) => {
  try {
    const sarafiRate = await SarafiRate.findOneAndDelete({
      sarafi: req.user._id,
      currency: req.params.currencyId
    });

    if (!sarafiRate) {
      return res.status(404).json({ success: false, message: 'نرخ سفارشی یافت نشد' });
    }

    // ثبت لاگ
    await AuditLog.log({
      action: 'sarafi_rate.delete',
      category: 'rate',
      user: req.user._id,
      userRole: 'sarafi',
      sarafi: req.user._id,
      targetType: 'SarafiRate',
      targetId: sarafiRate._id,
      description: `حذف نرخ سفارشی - برگشت به نرخ پیش‌فرض`,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      message: 'نرخ سفارشی حذف شد و به نرخ پیش‌فرض برگشت'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// دریافت تاریخچه تغییرات نرخ
router.get('/history/:currencyId?', authorize('sarafi'), async (req, res) => {
  try {
    const { page = 1, limit = 50, startDate, endDate } = req.query;
    const skip = (page - 1) * limit;

    const query = { sarafi: req.user._id };

    if (req.params.currencyId) {
      query.currency = req.params.currencyId;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const history = await SarafiRateHistory.find(query)
      .populate('currency', 'code nameFa symbol')
      .populate('changedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await SarafiRateHistory.countDocuments(query);

    res.json({
      success: true,
      data: history,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
