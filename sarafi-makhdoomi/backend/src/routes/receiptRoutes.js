const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middlewares/auth');
const Receipt = require('../models/Receipt');
const Trade = require('../models/Trade');
const AuditLog = require('../models/AuditLog');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// تنظیم آپلود فایل
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads/receipts');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('فقط فایل‌های jpg, png و pdf مجاز هستند'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 200 * 1024 * 1024 } // 200MB طبق نیاز پروژه
});

// همه روت‌ها نیاز به احراز هویت دارند
router.use(protect);

// ========== روت کلی لیست رسیدها ==========

// دریافت همه رسیدهای صراف
router.get('/', authorize('sarafi'), async (req, res) => {
  try {
    const { type, status, page = 1, limit = 20 } = req.query;
    const query = { sarafi: req.user._id };

    if (type) query.type = type;
    if (status) query.status = status;

    const skip = (page - 1) * limit;

    const receipts = await Receipt.find(query)
      .populate('trade', 'tradeNumber totalAmount')
      .populate('customer', 'firstName lastName phone')
      .populate('currency', 'code nameFa')
      .populate('createdBy', 'firstName lastName')
      .populate('confirmedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Receipt.countDocuments(query);

    res.json({
      success: true,
      data: receipts,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// آپلود فایل‌های رسید (جدا از ایجاد رسید)
router.post('/upload', authorize('sarafi'), upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'فایلی انتخاب نشده' });
    }

    const files = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      uploadedAt: new Date(),
      uploadedBy: req.user._id
    }));

    res.json({
      success: true,
      files,
      message: `${files.length} فایل آپلود شد`
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ایجاد رسید جدید
router.post('/', authorize('sarafi'), upload.array('files', 10), async (req, res) => {
  try {
    console.log('Receipt POST body:', JSON.stringify(req.body, null, 2));
    console.log('Receipt POST files:', req.files?.length || 0);

    const {
      tradeId, relatedTrade, // پشتیبانی از هر دو نام
      type,
      collectionMethod, paymentMethod, // پشتیبانی از هر دو نام
      amount,
      bankTrackingNumber, trackingNumber,
      transactionDate,
      description, notes,
      accountHolder,
      customerId, customer,
      currencyId
    } = req.body;

    // استفاده از فیلدهای صحیح یا جایگزین
    const finalTradeId = tradeId || relatedTrade;
    const finalCustomerId = customerId || customer;
    const finalNotes = description || notes || '';
    const finalTrackingNumber = trackingNumber || bankTrackingNumber;

    // اعتبارسنجی اولیه
    if (!type || !['rial', 'currency'].includes(type)) {
      return res.status(400).json({ success: false, message: 'نوع وصول الزامی است' });
    }

    // تبدیل paymentMethod به collectionMethod معتبر
    const methodMapping = {
      'pos': 'bank_transfer',
      'cash': 'cash',
      'bank': 'bank_transfer',
      'transfer': 'bank_transfer',
      'card': 'bank_transfer'
    };
    let finalCollectionMethod = collectionMethod || methodMapping[paymentMethod] || paymentMethod || 'bank_transfer';

    // اعتبارسنجی collectionMethod
    const validMethods = ['bank_transfer', 'cash', 'hawala', 'check', 'barter', 'swift', 'internal_transfer', 'other'];
    if (!validMethods.includes(finalCollectionMethod)) {
      finalCollectionMethod = 'bank_transfer';
    }

    if (!amount || parseFloat(amount) <= 0) {
      return res.status(400).json({ success: false, message: 'مبلغ نامعتبر است' });
    }
    if (!finalTradeId) {
      return res.status(400).json({ success: false, message: 'معامله مرتبط الزامی است' });
    }

    // بررسی معامله
    const trade = await Trade.findOne({ _id: finalTradeId, sarafi: req.user._id });
    if (!trade) {
      return res.status(404).json({ success: false, message: 'معامله یافت نشد' });
    }

    // پارس کردن accountHolder - میتونه JSON string یا متن ساده باشه
    let parsedAccountHolder = { name: '' };
    if (accountHolder) {
      try {
        // اگه JSON بود پارس کن
        parsedAccountHolder = JSON.parse(accountHolder);
      } catch {
        // اگه متن ساده بود، به عنوان نام استفاده کن
        parsedAccountHolder = { name: accountHolder };
      }
    }

    // جمع‌آوری فایل‌ها - هم از multipart و هم از attachments قبلی
    let allFiles = [];

    // فایل‌های آپلود شده در این درخواست (multipart)
    if (req.files && req.files.length > 0) {
      allFiles = req.files.map(file => ({
        filename: file.filename,
        originalName: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        uploadedAt: new Date(),
        uploadedBy: req.user._id
      }));
    }

    // فایل‌های آپلود شده قبلی (از /receipts/upload)
    const { attachments } = req.body;
    if (attachments) {
      let parsedAttachments = attachments;
      if (typeof attachments === 'string') {
        try {
          parsedAttachments = JSON.parse(attachments);
        } catch {
          parsedAttachments = [];
        }
      }
      if (Array.isArray(parsedAttachments) && parsedAttachments.length > 0) {
        allFiles = [...allFiles, ...parsedAttachments];
      }
    }

    // تعیین وضعیت بر اساس وجود فایل (اگه فایل نباشه draft میشه)
    const receiptStatus = allFiles.length > 0 ? 'submitted' : 'draft';

    // ساخت رسید
    const receipt = new Receipt({
      receiptNumber: Receipt.generateReceiptNumber ? Receipt.generateReceiptNumber(type) : `RC-${Date.now()}`,
      sarafi: req.user._id,
      trade: finalTradeId,
      customer: finalCustomerId || trade.customer,
      currency: currencyId || trade.currency,
      type,
      collectionMethod: finalCollectionMethod,
      amount: parseFloat(amount),
      trackingNumber: finalTrackingNumber,
      collectionDate: transactionDate ? new Date(transactionDate) : new Date(),
      notes: finalNotes,
      accountHolder: parsedAccountHolder,
      createdBy: req.user._id,
      status: receiptStatus,
      files: allFiles
    });

    await receipt.save();

    // ثبت لاگ
    await AuditLog.log({
      action: 'receipt.create',
      category: 'receipt',
      user: req.user._id,
      userRole: 'sarafi',
      sarafi: req.user._id,
      targetType: 'Receipt',
      targetId: receipt._id,
      targetReference: receipt.receiptNumber,
      description: `ایجاد رسید ${type === 'rial' ? 'ریالی' : 'ارزی'} به مبلغ ${amount}`,
      ipAddress: req.ip
    });

    res.status(201).json({
      success: true,
      data: receipt,
      message: 'رسید ثبت شد'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ========== روت‌های وصول ریالی ==========

// دریافت لیست وصول‌های ریالی در انتظار
router.get('/rial/pending', authorize('sarafi'), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const receipts = await Receipt.find({
      sarafi: req.user._id,
      type: 'rial',
      status: { $in: ['draft', 'submitted', 'pending'] }
    })
      .populate('trade', 'tradeNumber totalAmount')
      .populate('customer', 'firstName lastName phone')
      .populate('createdBy', 'firstName lastName')
      .sort({ collectionDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Receipt.countDocuments({
      sarafi: req.user._id,
      type: 'rial',
      status: { $in: ['draft', 'submitted', 'pending'] }
    });

    res.json({
      success: true,
      data: receipts,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// دریافت لیست وصول‌های ریالی تایید شده
router.get('/rial/confirmed', authorize('sarafi'), async (req, res) => {
  try {
    const { page = 1, limit = 20, startDate, endDate } = req.query;
    const skip = (page - 1) * limit;

    const query = {
      sarafi: req.user._id,
      type: 'rial',
      status: { $in: ['confirmed', 'final'] }
    };

    if (startDate || endDate) {
      query.collectionDate = {};
      if (startDate) query.collectionDate.$gte = new Date(startDate);
      if (endDate) query.collectionDate.$lte = new Date(endDate);
    }

    const receipts = await Receipt.find(query)
      .populate('trade', 'tradeNumber totalAmount')
      .populate('customer', 'firstName lastName phone')
      .populate('confirmedBy', 'firstName lastName')
      .sort({ collectionDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Receipt.countDocuments(query);

    res.json({
      success: true,
      data: receipts,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ========== روت‌های وصول ارزی ==========

// دریافت لیست وصول‌های ارزی در انتظار
router.get('/currency/pending', authorize('sarafi'), async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const receipts = await Receipt.find({
      sarafi: req.user._id,
      type: 'currency',
      status: { $in: ['draft', 'submitted', 'pending'] }
    })
      .populate('trade', 'tradeNumber totalAmount')
      .populate('currency', 'code name nameFa')
      .populate('customer', 'firstName lastName phone')
      .populate('createdBy', 'firstName lastName')
      .sort({ collectionDate: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Receipt.countDocuments({
      sarafi: req.user._id,
      type: 'currency',
      status: { $in: ['draft', 'submitted', 'pending'] }
    });

    res.json({
      success: true,
      data: receipts,
      total,
      pages: Math.ceil(total / limit)
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ========== عملیات مشترک ==========

// آپلود فایل اضافی به رسید
router.post('/:id/files', authorize('sarafi'), upload.array('files', 10), async (req, res) => {
  try {
    const receipt = await Receipt.findOne({
      _id: req.params.id,
      sarafi: req.user._id,
      status: { $nin: ['final', 'rejected'] }
    });

    if (!receipt) {
      return res.status(404).json({ success: false, message: 'رسید یافت نشد یا قابل ویرایش نیست' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ success: false, message: 'فایلی انتخاب نشده' });
    }

    const newFiles = req.files.map(f => ({
      filename: f.filename,
      originalName: f.originalname,
      mimetype: f.mimetype,
      size: f.size,
      uploadedAt: new Date(),
      uploadedBy: req.user._id
    }));

    receipt.files.push(...newFiles);
    await receipt.save();

    res.json({
      success: true,
      data: receipt,
      message: `${newFiles.length} فایل اضافه شد`
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// تایید وصول
router.put('/:id/confirm', authorize('sarafi'), async (req, res) => {
  try {
    const receipt = await Receipt.findOne({
      _id: req.params.id,
      sarafi: req.user._id,
      status: { $in: ['submitted', 'pending'] }
    });

    if (!receipt) {
      return res.status(404).json({ success: false, message: 'رسید یافت نشد' });
    }

    // بررسی الزامات
    if (!receipt.files || receipt.files.length === 0) {
      return res.status(400).json({ success: false, message: 'فایل الزامی است' });
    }

    if (!receipt.accountHolder?.name) {
      return res.status(400).json({ success: false, message: 'نام صاحب حساب الزامی است' });
    }

    await receipt.changeStatus('confirmed', req.user._id, 'تایید توسط صراف');

    // ثبت لاگ
    await AuditLog.log({
      action: 'receipt.confirm',
      category: 'receipt',
      user: req.user._id,
      userRole: 'sarafi',
      sarafi: req.user._id,
      targetType: 'Receipt',
      targetId: receipt._id,
      targetReference: receipt.receiptNumber,
      description: `تایید وصول ${receipt.receiptNumber}`,
      previousValues: { status: 'submitted' },
      newValues: { status: 'confirmed' },
      ipAddress: req.ip
    });

    res.json({
      success: true,
      data: receipt,
      message: 'وصول تایید شد'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// نهایی‌سازی وصول
router.put('/:id/finalize', authorize('sarafi'), async (req, res) => {
  try {
    const receipt = await Receipt.findOne({
      _id: req.params.id,
      sarafi: req.user._id,
      status: 'confirmed'
    });

    if (!receipt) {
      return res.status(404).json({ success: false, message: 'رسید یافت نشد یا تایید نشده' });
    }

    await receipt.changeStatus('final', req.user._id, 'نهایی‌سازی');

    // ثبت لاگ
    await AuditLog.log({
      action: 'receipt.finalize',
      category: 'receipt',
      severity: 'critical',
      user: req.user._id,
      userRole: 'sarafi',
      sarafi: req.user._id,
      targetType: 'Receipt',
      targetId: receipt._id,
      targetReference: receipt.receiptNumber,
      description: `نهایی‌سازی وصول ${receipt.receiptNumber} - غیرقابل تغییر`,
      ipAddress: req.ip,
      isHighRisk: true
    });

    res.json({
      success: true,
      data: receipt,
      message: 'وصول نهایی شد و دیگر قابل تغییر نیست'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// رد وصول
router.put('/:id/reject', authorize('sarafi'), async (req, res) => {
  try {
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, message: 'دلیل رد الزامی است' });
    }

    const receipt = await Receipt.findOne({
      _id: req.params.id,
      sarafi: req.user._id,
      status: { $in: ['submitted', 'pending'] }
    });

    if (!receipt) {
      return res.status(404).json({ success: false, message: 'رسید یافت نشد' });
    }

    receipt.rejectionReason = reason;
    await receipt.changeStatus('rejected', req.user._id, reason);

    // ثبت لاگ
    await AuditLog.log({
      action: 'receipt.reject',
      category: 'receipt',
      user: req.user._id,
      userRole: 'sarafi',
      sarafi: req.user._id,
      targetType: 'Receipt',
      targetId: receipt._id,
      targetReference: receipt.receiptNumber,
      description: `رد وصول ${receipt.receiptNumber}`,
      reason,
      ipAddress: req.ip
    });

    res.json({
      success: true,
      data: receipt,
      message: 'وصول رد شد'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// تغییر وضعیت عمومی (برای فرانت‌اند)
router.put('/:id/status', authorize('sarafi'), async (req, res) => {
  try {
    const { action, reason } = req.body;
    const receipt = await Receipt.findOne({
      _id: req.params.id,
      sarafi: req.user._id
    });

    if (!receipt) {
      return res.status(404).json({ success: false, message: 'رسید یافت نشد' });
    }

    if (action === 'confirm') {
      if (!['submitted', 'pending'].includes(receipt.status)) {
        return res.status(400).json({ success: false, message: 'این رسید قابل تایید نیست' });
      }
      await receipt.changeStatus('confirmed', req.user._id, 'تایید توسط صراف');
      res.json({ success: true, data: receipt, message: 'وصول تایید شد' });
    } else if (action === 'reject') {
      if (!['submitted', 'pending'].includes(receipt.status)) {
        return res.status(400).json({ success: false, message: 'این رسید قابل رد نیست' });
      }
      receipt.rejectionReason = reason || 'بدون دلیل';
      await receipt.changeStatus('rejected', req.user._id, reason || 'رد توسط صراف');
      res.json({ success: true, data: receipt, message: 'وصول رد شد' });
    } else if (action === 'finalize') {
      if (receipt.status !== 'confirmed') {
        return res.status(400).json({ success: false, message: 'فقط رسیدهای تایید شده قابل نهایی‌سازی هستند' });
      }
      await receipt.changeStatus('final', req.user._id, 'نهایی‌سازی');
      res.json({ success: true, data: receipt, message: 'وصول نهایی شد' });
    } else {
      res.status(400).json({ success: false, message: 'عملیات نامعتبر' });
    }
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// ایجاد سند اصلاحی
router.post('/:id/amend', authorize('sarafi'), upload.array('files', 10), async (req, res) => {
  try {
    const { reason, ...amendmentData } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, message: 'دلیل اصلاح الزامی است' });
    }

    const originalReceipt = await Receipt.findOne({
      _id: req.params.id,
      sarafi: req.user._id,
      status: 'final'
    });

    if (!originalReceipt) {
      return res.status(404).json({ success: false, message: 'فقط رسیدهای نهایی قابل اصلاح هستند' });
    }

    // پردازش فایل‌ها
    const files = req.files ? req.files.map(f => ({
      filename: f.filename,
      originalName: f.originalname,
      mimetype: f.mimetype,
      size: f.size,
      uploadedAt: new Date(),
      uploadedBy: req.user._id
    })) : [];

    const amendment = await originalReceipt.createAmendment({
      ...amendmentData,
      files,
      amendmentReason: reason
    }, req.user._id);

    // ثبت لاگ
    await AuditLog.log({
      action: 'receipt.amend',
      category: 'receipt',
      severity: 'high_risk',
      user: req.user._id,
      userRole: 'sarafi',
      sarafi: req.user._id,
      targetType: 'Receipt',
      targetId: amendment._id,
      targetReference: amendment.receiptNumber,
      description: `ایجاد سند اصلاحی برای ${originalReceipt.receiptNumber}`,
      reason,
      metadata: { originalReceiptId: originalReceipt._id },
      ipAddress: req.ip,
      isHighRisk: true
    });

    res.status(201).json({
      success: true,
      data: amendment,
      message: 'سند اصلاحی ایجاد شد'
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// آمار وصول‌ها
router.get('/stats', authorize('sarafi'), async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [rialStats, currencyStats] = await Promise.all([
      Receipt.aggregate([
        { $match: { sarafi: req.user._id, type: 'rial' } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ]),
      Receipt.aggregate([
        { $match: { sarafi: req.user._id, type: 'currency' } },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalAmount: { $sum: '$amount' }
          }
        }
      ])
    ]);

    // وصول‌های امروز
    const todayReceipts = await Receipt.countDocuments({
      sarafi: req.user._id,
      createdAt: { $gte: today }
    });

    res.json({
      success: true,
      data: {
        rial: rialStats,
        currency: currencyStats,
        todayCount: todayReceipts
      }
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

// دریافت جزئیات یک رسید
router.get('/:id', authorize('sarafi'), async (req, res) => {
  try {
    const receipt = await Receipt.findOne({
      _id: req.params.id,
      sarafi: req.user._id
    })
      .populate('trade', 'tradeNumber totalAmount type')
      .populate('currency', 'code name nameFa')
      .populate('customer', 'firstName lastName phone email')
      .populate('createdBy', 'firstName lastName')
      .populate('confirmedBy', 'firstName lastName')
      .populate('statusHistory.changedBy', 'firstName lastName')
      .populate('accountingNotes.addedBy', 'firstName lastName');

    if (!receipt) {
      return res.status(404).json({ success: false, message: 'رسید یافت نشد' });
    }

    res.json({
      success: true,
      data: receipt
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
});

module.exports = router;
