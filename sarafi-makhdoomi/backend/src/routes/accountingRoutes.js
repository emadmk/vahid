const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const { protect, authorize } = require('../middlewares/auth');
const Trade = require('../models/Trade');
const Receipt = require('../models/Receipt');
const Order = require('../models/Order');
const Wallet = require('../models/Wallet');
const AuditLog = require('../models/AuditLog');

// همه روت‌ها نیاز به احراز هویت دارند
router.use(protect);

// ========== گزارش عملکرد خرید و فروش ==========

// دریافت گزارش حسابداری
router.get('/report', authorize('sarafi'), async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      type, // buy, sell, all
      currencyId,
      settlementStatus,
      counterpartyType, // customer, exchange
      page = 1,
      limit = 50
    } = req.query;

    const skip = (page - 1) * limit;

    // ساخت query
    const query = { sarafi: req.user._id };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (type && type !== 'all') query.type = type;
    if (currencyId) query.currency = currencyId;
    if (settlementStatus) query.settlementStatus = settlementStatus;

    // دریافت معاملات
    const trades = await Trade.find(query)
      .populate('currency', 'code nameFa symbol')
      .populate('customer', 'firstName lastName phone')
      .populate('counterpartySarafi', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Trade.countDocuments(query);

    // محاسبه خلاصه
    const summaryPipeline = [
      { $match: query },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          totalValue: { $sum: '$totalAmount' },
          totalFee: { $sum: '$platformFee' }
        }
      }
    ];

    const summary = await Trade.aggregate(summaryPipeline);

    // محاسبه مانده‌ها
    const buyStats = summary.find(s => s._id === 'buy') || { count: 0, totalAmount: 0, totalValue: 0, totalFee: 0 };
    const sellStats = summary.find(s => s._id === 'sell') || { count: 0, totalAmount: 0, totalValue: 0, totalFee: 0 };

    res.json({
      success: true,
      data: {
        trades,
        summary: {
          buy: buyStats,
          sell: sellStats,
          total: {
            count: buyStats.count + sellStats.count,
            totalFee: buyStats.totalFee + sellStats.totalFee
          }
        }
      },
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ========== خروجی اکسل ==========

// دریافت لیست ستون‌های موجود برای انتخاب
router.get('/export/columns', authorize('sarafi'), async (req, res) => {
  const columns = [
    { key: 'tradeNumber', label: 'شماره معامله', default: true },
    { key: 'createdAt', label: 'تاریخ', default: true },
    { key: 'time', label: 'ساعت', default: true },
    { key: 'type', label: 'نوع معامله', default: true },
    { key: 'counterpartyType', label: 'نوع طرف مقابل', default: true },
    { key: 'counterpartyName', label: 'نام طرف مقابل', default: true },
    { key: 'currency', label: 'ارز', default: true },
    { key: 'amount', label: 'مقدار', default: true },
    { key: 'baseRate', label: 'نرخ پایه', default: true },
    { key: 'finalRate', label: 'نرخ نهایی', default: true },
    { key: 'totalAmount', label: 'مبلغ کل', default: true },
    { key: 'platformFee', label: 'کارمزد پلتفرم', default: true },
    { key: 'netAmount', label: 'مبلغ خالص', default: true },
    { key: 'settlementMethod', label: 'روش تسویه', default: false },
    { key: 'settlementStatus', label: 'وضعیت تسویه', default: true },
    { key: 'openingBalance', label: 'مانده اول', default: false },
    { key: 'closingBalance', label: 'مانده آخر', default: false },
    { key: 'description', label: 'توضیحات', default: false }
  ];

  res.json({ success: true, data: columns });
});

// خروجی اکسل
router.post('/export/excel', authorize('sarafi'), async (req, res) => {
  try {
    const {
      startDate,
      endDate,
      type,
      currencyId,
      settlementStatus,
      selectedColumns // آرایه کلیدهای ستون‌های انتخاب‌شده
    } = req.body;

    // ساخت query
    const query = { sarafi: req.user._id };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (type && type !== 'all') query.type = type;
    if (currencyId) query.currency = currencyId;
    if (settlementStatus) query.settlementStatus = settlementStatus;

    // دریافت معاملات
    const trades = await Trade.find(query)
      .populate('currency', 'code nameFa symbol')
      .populate('customer', 'firstName lastName phone')
      .populate('counterpartySarafi', 'firstName lastName')
      .sort({ createdAt: -1 });

    // ایجاد workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'صرافی گلدن 2026';
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet('گزارش حسابداری', {
      views: [{ rightToLeft: true }]
    });

    // تعریف ستون‌های پیش‌فرض
    const allColumns = {
      tradeNumber: { header: 'شماره معامله', key: 'tradeNumber', width: 15 },
      createdAt: { header: 'تاریخ', key: 'createdAt', width: 12 },
      time: { header: 'ساعت', key: 'time', width: 10 },
      type: { header: 'نوع معامله', key: 'type', width: 10 },
      counterpartyType: { header: 'نوع طرف مقابل', key: 'counterpartyType', width: 15 },
      counterpartyName: { header: 'نام طرف مقابل', key: 'counterpartyName', width: 20 },
      currency: { header: 'ارز', key: 'currency', width: 12 },
      amount: { header: 'مقدار', key: 'amount', width: 15 },
      baseRate: { header: 'نرخ پایه', key: 'baseRate', width: 15 },
      finalRate: { header: 'نرخ نهایی', key: 'finalRate', width: 15 },
      totalAmount: { header: 'مبلغ کل', key: 'totalAmount', width: 18 },
      platformFee: { header: 'کارمزد پلتفرم', key: 'platformFee', width: 15 },
      netAmount: { header: 'مبلغ خالص', key: 'netAmount', width: 18 },
      settlementMethod: { header: 'روش تسویه', key: 'settlementMethod', width: 12 },
      settlementStatus: { header: 'وضعیت تسویه', key: 'settlementStatus', width: 12 },
      openingBalance: { header: 'مانده اول', key: 'openingBalance', width: 15 },
      closingBalance: { header: 'مانده آخر', key: 'closingBalance', width: 15 },
      description: { header: 'توضیحات', key: 'description', width: 30 }
    };

    // انتخاب ستون‌ها
    const columnsToUse = selectedColumns && selectedColumns.length > 0
      ? selectedColumns.filter(key => allColumns[key]).map(key => allColumns[key])
      : Object.values(allColumns);

    worksheet.columns = columnsToUse;

    // استایل هدر
    worksheet.getRow(1).font = { bold: true, size: 12 };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD4AF37' }
    };
    worksheet.getRow(1).alignment = { horizontal: 'center', vertical: 'middle' };

    // فعال کردن فیلتر
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: columnsToUse.length }
    };

    // اضافه کردن داده‌ها
    let runningBalance = 0;
    for (const trade of trades) {
      const openingBalance = runningBalance;

      // محاسبه مانده
      if (trade.type === 'buy') {
        runningBalance -= trade.totalAmount;
      } else {
        runningBalance += trade.totalAmount;
      }

      const row = {
        tradeNumber: trade.tradeNumber,
        createdAt: new Date(trade.createdAt).toLocaleDateString('fa-IR'),
        time: new Date(trade.createdAt).toLocaleTimeString('fa-IR'),
        type: trade.type === 'buy' ? 'خرید' : 'فروش',
        counterpartyType: trade.counterpartySarafi ? 'صرافی' : 'مشتری',
        counterpartyName: trade.counterpartySarafi
          ? `${trade.counterpartySarafi.firstName} ${trade.counterpartySarafi.lastName}`
          : trade.customer
            ? `${trade.customer.firstName} ${trade.customer.lastName}`
            : '-',
        currency: trade.currency?.nameFa || '-',
        amount: trade.amount,
        baseRate: trade.baseRate || trade.rate,
        finalRate: trade.finalRate || trade.rate,
        totalAmount: trade.totalAmount,
        platformFee: trade.platformFee || 0,
        netAmount: trade.netAmount || (trade.totalAmount - (trade.platformFee || 0)),
        settlementMethod: trade.settlementMethod || 'IRR',
        settlementStatus: getSettlementStatusLabel(trade.settlementStatus),
        openingBalance,
        closingBalance: runningBalance,
        description: trade.description || ''
      };

      worksheet.addRow(row);
    }

    // استایل سلول‌های عددی
    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.eachCell((cell, colNumber) => {
          if (typeof cell.value === 'number') {
            cell.numFmt = '#,##0';
          }
          cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
      }
    });

    // ارسال فایل
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=accounting-report-${Date.now()}.xlsx`
    );

    await workbook.xlsx.write(res);
    res.end();

    // ثبت لاگ
    await AuditLog.log({
      action: 'accounting.export',
      category: 'accounting',
      user: req.user._id,
      userRole: 'sarafi',
      sarafi: req.user._id,
      description: `خروجی اکسل گزارش حسابداری - ${trades.length} معامله`,
      metadata: { tradesCount: trades.length, startDate, endDate },
      ipAddress: req.ip
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ========== آمار کلی ==========

// آمار حسابداری
router.get('/stats', authorize('sarafi'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateQuery = {};
    if (startDate || endDate) {
      dateQuery.createdAt = {};
      if (startDate) dateQuery.createdAt.$gte = new Date(startDate);
      if (endDate) dateQuery.createdAt.$lte = new Date(endDate);
    }

    // آمار معاملات
    const tradeStats = await Trade.aggregate([
      { $match: { sarafi: req.user._id, ...dateQuery } },
      {
        $group: {
          _id: null,
          totalTrades: { $sum: 1 },
          totalBuyAmount: { $sum: { $cond: [{ $eq: ['$type', 'buy'] }, '$totalAmount', 0] } },
          totalSellAmount: { $sum: { $cond: [{ $eq: ['$type', 'sell'] }, '$totalAmount', 0] } },
          totalFees: { $sum: '$platformFee' },
          buyCount: { $sum: { $cond: [{ $eq: ['$type', 'buy'] }, 1, 0] } },
          sellCount: { $sum: { $cond: [{ $eq: ['$type', 'sell'] }, 1, 0] } }
        }
      }
    ]);

    // آمار تسویه‌ها
    const settlementStats = await Trade.aggregate([
      { $match: { sarafi: req.user._id, ...dateQuery } },
      {
        $group: {
          _id: '$settlementStatus',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);

    // آمار وصول‌ها
    const receiptStats = await Receipt.aggregate([
      { $match: { sarafi: req.user._id, status: 'final', ...dateQuery } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        trades: tradeStats[0] || {
          totalTrades: 0,
          totalBuyAmount: 0,
          totalSellAmount: 0,
          totalFees: 0,
          buyCount: 0,
          sellCount: 0
        },
        settlements: settlementStats,
        receipts: receiptStats
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ========== به‌روزرسانی کیف پول ==========

// به‌روزرسانی دستی کیف پول (فقط حسابدار)
router.post('/wallet-adjustment', authorize('sarafi'), async (req, res) => {
  try {
    const { customerId, currencyId, amount, type, reason, documentNumber } = req.body;

    // اعتبارسنجی
    if (!customerId || !currencyId || !amount || !type || !reason) {
      return res.status(400).json({
        success: false,
        message: 'تمام فیلدها الزامی است'
      });
    }

    if (!['credit', 'debit'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: 'نوع تراکنش نامعتبر است'
      });
    }

    // پیدا کردن یا ایجاد کیف پول
    let wallet = await Wallet.findOne({
      user: customerId,
      currency: currencyId
    });

    if (!wallet) {
      wallet = await Wallet.create({
        user: customerId,
        currency: currencyId,
        balance: 0,
        sarafi: req.user._id
      });
    }

    const previousBalance = wallet.balance;

    // اعمال تغییر
    if (type === 'credit') {
      wallet.balance += parseFloat(amount);
    } else {
      wallet.balance -= parseFloat(amount);
    }

    // ثبت تراکنش
    wallet.transactions.push({
      type: type === 'credit' ? 'deposit' : 'withdrawal',
      amount: parseFloat(amount),
      balanceAfter: wallet.balance,
      description: `تنظیم حسابداری: ${reason}`,
      reference: documentNumber,
      performedBy: req.user._id
    });

    await wallet.save();

    // ثبت لاگ حسابداری
    await AuditLog.log({
      action: 'accounting.wallet_adjustment',
      category: 'accounting',
      severity: 'high_risk',
      user: req.user._id,
      userRole: 'sarafi',
      sarafi: req.user._id,
      targetType: 'Wallet',
      targetId: wallet._id,
      description: `تنظیم دستی کیف پول - ${type === 'credit' ? 'بستانکار' : 'بدهکار'}: ${amount}`,
      reason,
      previousValues: { balance: previousBalance },
      newValues: { balance: wallet.balance },
      metadata: { documentNumber, customerId, currencyId },
      ipAddress: req.ip,
      isHighRisk: true
    });

    res.json({
      success: true,
      data: wallet,
      message: 'کیف پول به‌روزرسانی شد'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// Helper function
function getSettlementStatusLabel(status) {
  const labels = {
    pending: 'در انتظار',
    partial: 'ناقص',
    completed: 'تکمیل شده',
    cancelled: 'لغو شده'
  };
  return labels[status] || status;
}

module.exports = router;
