import { useState, useEffect, useRef } from 'react';
import {
  FaMoneyBillWave, FaCoins, FaCheckCircle, FaClock, FaExclamationTriangle,
  FaFileAlt, FaFilter, FaSearch, FaCalendarAlt, FaUser, FaPhone,
  FaDownload, FaUpload, FaHistory, FaChartPie, FaWallet, FaTimes,
  FaCheck, FaEye, FaInfoCircle, FaSync, FaReceipt, FaTrash, FaFilePdf,
  FaFileImage, FaCloudUploadAlt, FaUserFriends
} from 'react-icons/fa';
import api from '../../services/api';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

const SettlementPanel = () => {
  // دریافت اطلاعات کاربر
  const { user } = useAuthStore();
  const userRole = user?.role || 'sarafi';

  // تعیین نوع پیش‌فرض بر اساس نقش کارمند
  const getDefaultType = () => {
    if (userRole === 'staff_rial') return 'rial';
    if (userRole === 'staff_currency') return 'currency';
    return 'all';
  };

  // State
  const [activeTab, setActiveTab] = useState('pending');
  const [settlementType, setSettlementType] = useState(getDefaultType());
  const [settlements, setSettlements] = useState([]);
  const [stats, setStats] = useState({
    pendingRial: 0,
    pendingCurrency: 0,
    completedToday: 0,
    overdueCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedSettlement, setSelectedSettlement] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [receiptStep, setReceiptStep] = useState(1); // 1: فرم رسید, 2: تایید نهایی
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState({
    search: '',
    dateFrom: '',
    dateTo: '',
    currency: ''
  });

  // فایل آپلود
  const fileInputRef = useRef(null);
  const MAX_FILES = 10;
  const MAX_FILE_SIZE = 200 * 1024 * 1024; // 200MB
  const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg'];
  const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg'];

  // Receipt form - فرم رسید اجباری
  const [receiptForm, setReceiptForm] = useState({
    type: 'rial', // rial | currency
    amount: '',
    paymentMethod: 'bank_transfer',
    accountHolder: '',
    bankTrackingNumber: '',
    transactionDate: new Date().toISOString().split('T')[0],
    notes: '',
    attachments: [] // {file, name, size, preview}
  });

  useEffect(() => {
    fetchData();
  }, [activeTab, settlementType, filter.search, filter.dateFrom, filter.dateTo]);

  // Debounce برای جستجو
  const [searchDebounce, setSearchDebounce] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounce(filter.search);
    }, 500);
    return () => clearTimeout(timer);
  }, [filter.search]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // وضعیت‌های مربوط به هر تب
      const statusMap = {
        pending: 'pending_collection',
        completed: 'completed',
        overdue: 'pending_collection' // نمایش موارد عقب‌افتاده
      };

      const [settlementsRes, statsRes] = await Promise.all([
        api.get('/trades/sarafi/instant-trades', {
          params: {
            status: statusMap[activeTab],
            type: settlementType !== 'all' ? settlementType : undefined,
            search: filter.search || undefined,
            dateFrom: filter.dateFrom || undefined,
            dateTo: filter.dateTo || undefined
          }
        }).catch(() => ({ data: { data: [] } })),
        api.get('/trades/sarafi/settlement-stats').catch(() => ({ data: { data: {} } }))
      ]);

      // تبدیل داده‌های معاملات به فرمت مناسب برای SettlementPanel
      const trades = settlementsRes.data.trades || settlementsRes.data.data || [];
      const formattedSettlements = trades.map(trade => ({
        _id: trade._id,
        tradeNumber: trade.tradeNumber,
        customer: trade.customer,
        type: trade.type === 'sell' ? 'currency' : 'rial', // فروش ارز = وصول ارزی، خرید ارز = وصول ریالی
        amount: trade.type === 'sell' ? trade.amount : trade.totalAmount,
        currency: trade.currency,
        dueDate: trade.validUntil || trade.createdAt,
        status: activeTab === 'overdue' && new Date(trade.validUntil || trade.createdAt) < new Date(Date.now() - 24 * 60 * 60 * 1000)
          ? 'overdue'
          : (trade.status === 'completed' ? 'completed' : 'pending'),
        trade: trade
      }));

      // فیلتر موارد عقب‌افتاده
      if (activeTab === 'overdue') {
        const overdue = formattedSettlements.filter(s =>
          new Date(s.dueDate) < new Date(Date.now() - 24 * 60 * 60 * 1000)
        );
        setSettlements(overdue);
      } else {
        setSettlements(formattedSettlements);
      }

      setStats(statsRes.data.data || {});
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // دریافت نام مشتری (با ماسک برای معاملات گروهی)
  const getCustomerDisplayName = (settlement) => {
    if (settlement.trade?.isGroupTrade || settlement.trade?.executorSarafi) {
      return settlement.trade?.sharedCustomer?.displayName || 'مشتری گروهی';
    }
    return `${settlement.customer?.firstName || ''} ${settlement.customer?.lastName || ''}`.trim();
  };

  // باز کردن مودال رسید اجباری
  const openReceiptModal = (settlement) => {
    setSelectedSettlement(settlement);
    setReceiptForm({
      type: settlement.type || 'rial',
      amount: settlement.amount?.toString() || '',
      paymentMethod: 'bank_transfer',
      accountHolder: getCustomerDisplayName(settlement),
      bankTrackingNumber: '',
      transactionDate: new Date().toISOString().split('T')[0],
      notes: '',
      attachments: []
    });
    setReceiptStep(1);
    setShowReceiptModal(true);
  };

  // اعتبارسنجی فایل
  const validateFile = (file) => {
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      toast.error(`فقط فایل‌های PDF و JPG/JPEG مجاز هستند`);
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error(`حجم فایل نباید بیشتر از 200 مگابایت باشد`);
      return false;
    }
    return true;
  };

  // افزودن فایل
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);

    if (receiptForm.attachments.length + files.length > MAX_FILES) {
      toast.error(`حداکثر ${MAX_FILES} فایل مجاز است`);
      return;
    }

    const validFiles = files.filter(validateFile);

    const newAttachments = validFiles.map(file => ({
      file,
      name: file.name,
      size: file.size,
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    }));

    setReceiptForm(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...newAttachments]
    }));

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // حذف فایل
  const removeAttachment = (index) => {
    setReceiptForm(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  // فرمت سایز فایل
  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // ثبت رسید و تسویه
  const handleSubmitReceiptAndSettlement = async () => {
    // اعتبارسنجی فرم رسید
    if (!receiptForm.amount || parseFloat(receiptForm.amount) <= 0) {
      toast.error('مبلغ رسید الزامی است');
      return;
    }
    if (!receiptForm.bankTrackingNumber.trim()) {
      toast.error('شماره پیگیری بانکی الزامی است');
      return;
    }
    if (!receiptForm.accountHolder.trim()) {
      toast.error('نام صاحب حساب الزامی است');
      return;
    }

    setSubmitting(true);
    try {
      // ابتدا آپلود فایل‌ها
      let uploadedFiles = [];
      if (receiptForm.attachments.length > 0) {
        const formData = new FormData();
        receiptForm.attachments.forEach((att, i) => {
          formData.append('files', att.file);
        });

        try {
          const uploadRes = await api.post('/receipts/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          uploadedFiles = uploadRes.data.files || [];
        } catch (uploadError) {
          console.error('Upload error:', uploadError);
          // ادامه بدون فایل اگر آپلود مشکل داشت
        }
      }

      // ثبت رسید
      const receiptData = {
        type: receiptForm.type,
        amount: parseFloat(receiptForm.amount),
        paymentMethod: receiptForm.paymentMethod,
        accountHolder: receiptForm.accountHolder,
        bankTrackingNumber: receiptForm.bankTrackingNumber,
        transactionDate: receiptForm.transactionDate,
        notes: receiptForm.notes,
        attachments: uploadedFiles,
        relatedTrade: selectedSettlement._id,
        customer: selectedSettlement.customer?._id
      };

      await api.post('/receipts', receiptData);

      // تایید وصول و ارسال به حسابداری
      await api.put(`/trades/instant/${selectedSettlement._id}/confirm-collection`, {
        amount: parseFloat(receiptForm.amount),
        paymentMethod: receiptForm.paymentMethod,
        referenceNumber: receiptForm.bankTrackingNumber,
        notes: receiptForm.notes,
        collectionType: receiptForm.type,
        receiptAttached: true
      });

      toast.success('رسید و تسویه با موفقیت ثبت شد');
      setShowReceiptModal(false);
      setSelectedSettlement(null);
      resetReceiptForm();
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در ثبت رسید و تسویه');
    } finally {
      setSubmitting(false);
    }
  };

  const resetReceiptForm = () => {
    setReceiptForm({
      type: 'rial',
      amount: '',
      paymentMethod: 'bank_transfer',
      accountHolder: '',
      bankTrackingNumber: '',
      transactionDate: new Date().toISOString().split('T')[0],
      notes: '',
      attachments: []
    });
    setReceiptStep(1);
  };

  const handleMarkOverdue = async (settlementId) => {
    try {
      await api.put(`/settlements/${settlementId}/overdue`);
      toast.success('به تاخیر افتاده ثبت شد');
      fetchData();
    } catch (error) {
      toast.error('خطا');
    }
  };

  const formatNumber = (num) => new Intl.NumberFormat('fa-IR').format(num || 0);
  const formatDate = (date) => new Date(date).toLocaleDateString('fa-IR');

  const getStatusBadge = (status) => {
    const map = {
      pending: { label: 'در انتظار وصول', class: 'bg-yellow-500/20 text-yellow-500', icon: FaClock },
      partial: { label: 'وصول جزئی', class: 'bg-blue-500/20 text-blue-500', icon: FaChartPie },
      completed: { label: 'تسویه شده', class: 'bg-green-500/20 text-green-500', icon: FaCheckCircle },
      overdue: { label: 'تاخیر', class: 'bg-red-500/20 text-red-500', icon: FaExclamationTriangle }
    };
    const s = map[status] || map.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 ${s.class}`}>
        <s.icon className="text-xs" />
        {s.label}
      </span>
    );
  };

  // Demo data
  const demoSettlements = [
    {
      _id: '1',
      tradeNumber: 'TRD-241228-ABC123',
      customer: { firstName: 'علی', lastName: 'محمدی', phone: '09121234567', _id: 'c1' },
      type: 'rial',
      amount: 50000000,
      dueDate: new Date(),
      status: 'pending',
      trade: { currency: { code: 'USD', nameFa: 'دلار' }, amount: 1000 }
    },
    {
      _id: '2',
      tradeNumber: 'TRD-241227-DEF456',
      customer: { firstName: 'محمد', lastName: 'رضایی', phone: '09127654321', _id: 'c2' },
      type: 'currency',
      amount: 500,
      currency: { code: 'EUR', nameFa: 'یورو' },
      dueDate: new Date(Date.now() - 86400000),
      status: 'overdue',
      trade: { currency: { code: 'EUR' }, amount: 500 }
    }
  ];

  const displaySettlements = settlements.length > 0 ? settlements : demoSettlements;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FaWallet className="text-gold" />
            پنل وصول و تسویه
          </h1>
          <p className="text-dark-400 text-sm mt-1">مدیریت تسویه‌حساب‌های مشتریان</p>
        </div>
        <button onClick={fetchData} className="btn-outline flex items-center gap-2">
          <FaSync />
          بروزرسانی
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4 border-r-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-400 text-sm">وصول ریالی معوق</p>
              <p className="text-2xl font-bold text-yellow-500">{formatNumber(stats.pendingRial)}</p>
              <p className="text-xs text-dark-500">ریال</p>
            </div>
            <FaMoneyBillWave className="text-yellow-500 text-3xl opacity-50" />
          </div>
        </div>

        <div className="card p-4 border-r-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-400 text-sm">وصول ارزی معوق</p>
              <p className="text-2xl font-bold text-blue-500">{stats.pendingCurrency || 3}</p>
              <p className="text-xs text-dark-500">مورد</p>
            </div>
            <FaCoins className="text-blue-500 text-3xl opacity-50" />
          </div>
        </div>

        <div className="card p-4 border-r-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-400 text-sm">تسویه امروز</p>
              <p className="text-2xl font-bold text-green-500">{stats.completedToday || 5}</p>
              <p className="text-xs text-dark-500">مورد</p>
            </div>
            <FaCheckCircle className="text-green-500 text-3xl opacity-50" />
          </div>
        </div>

        <div className="card p-4 border-r-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-400 text-sm">تاخیر وصول</p>
              <p className="text-2xl font-bold text-red-500">{stats.overdueCount || 2}</p>
              <p className="text-xs text-dark-500">مورد</p>
            </div>
            <FaExclamationTriangle className="text-red-500 text-3xl opacity-50" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Tab Switcher */}
          <div className="flex rounded-lg bg-dark-800 p-1">
            {[
              { value: 'pending', label: 'در انتظار', count: 5 },
              { value: 'completed', label: 'تسویه شده', count: 12 },
              { value: 'overdue', label: 'تاخیر', count: 2 }
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                  activeTab === tab.value
                    ? 'bg-gold text-dark-900 font-bold'
                    : 'text-dark-400 hover:text-white'
                }`}
              >
                {tab.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.value ? 'bg-dark-900/20' : 'bg-dark-700'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Type Filter - فقط برای صراف نمایش داده می‌شود */}
          {!['staff_rial', 'staff_currency'].includes(userRole) ? (
            <div className="flex rounded-lg bg-dark-800 p-1">
              {[
                { value: 'all', label: 'همه' },
                { value: 'rial', label: 'ریالی', icon: FaMoneyBillWave },
                { value: 'currency', label: 'ارزی', icon: FaCoins }
              ].map(type => (
                <button
                  key={type.value}
                  onClick={() => setSettlementType(type.value)}
                  className={`px-3 py-1.5 rounded-lg flex items-center gap-1 text-sm ${
                    settlementType === type.value
                      ? 'bg-dark-700 text-white'
                      : 'text-dark-400'
                  }`}
                >
                  {type.icon && <type.icon className="text-xs" />}
                  {type.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-800">
              {userRole === 'staff_rial' ? (
                <>
                  <FaMoneyBillWave className="text-yellow-500" />
                  <span className="text-yellow-500 text-sm font-bold">کارمند وصول ریالی</span>
                </>
              ) : (
                <>
                  <FaCoins className="text-blue-500" />
                  <span className="text-blue-500 text-sm font-bold">کارمند وصول ارزی</span>
                </>
              )}
            </div>
          )}

          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <FaSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400" />
              <input
                type="text"
                placeholder="جستجو مشتری، شماره معامله..."
                value={filter.search}
                onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                className="input w-full pr-10"
              />
            </div>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filter.dateFrom}
              onChange={(e) => setFilter({ ...filter, dateFrom: e.target.value })}
              className="input"
            />
            <span className="text-dark-400">تا</span>
            <input
              type="date"
              value={filter.dateTo}
              onChange={(e) => setFilter({ ...filter, dateTo: e.target.value })}
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Important Notice */}
      <div className="bg-gold/10 border border-gold/30 rounded-xl p-4 flex items-center gap-3">
        <FaReceipt className="text-gold text-2xl flex-shrink-0" />
        <div>
          <p className="text-gold font-bold">ثبت رسید اجباری</p>
          <p className="text-dark-300 text-sm">قبل از تسویه هر معامله، ابتدا باید رسید پرداخت ثبت شود. بدون رسید امکان تسویه وجود ندارد.</p>
        </div>
      </div>

      {/* Settlements Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-800">
              <tr>
                <th className="text-right p-4 text-dark-400 text-sm">شماره معامله</th>
                <th className="text-right p-4 text-dark-400 text-sm">مشتری</th>
                <th className="text-right p-4 text-dark-400 text-sm">نوع</th>
                <th className="text-right p-4 text-dark-400 text-sm">مبلغ</th>
                <th className="text-right p-4 text-dark-400 text-sm">سررسید</th>
                <th className="text-right p-4 text-dark-400 text-sm">وضعیت</th>
                <th className="text-center p-4 text-dark-400 text-sm">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center p-8">
                    <div className="loading-spinner mx-auto"></div>
                  </td>
                </tr>
              ) : displaySettlements.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center p-8 text-dark-500">
                    موردی یافت نشد
                  </td>
                </tr>
              ) : (
                displaySettlements.map(settlement => (
                  <tr key={settlement._id} className="border-t border-dark-800 hover:bg-dark-800/30">
                    <td className="p-4">
                      <span className="text-gold font-medium">{settlement.tradeNumber}</span>
                    </td>
                    <td className="p-4">
                      {settlement.trade?.isGroupTrade ? (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                            <FaUserFriends className="text-purple-400 text-xs" />
                          </div>
                          <div>
                            <p className="text-purple-400 text-sm">
                              {settlement.trade?.sharedCustomer?.displayName || 'مشتری گروهی'}
                            </p>
                            <p className="text-dark-500 text-xs">
                              صراف: {settlement.trade?.ownerSarafi?.sarafiInfo?.name ||
                                `${settlement.trade?.ownerSarafi?.firstName || ''} ${settlement.trade?.ownerSarafi?.lastName || ''}`}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center">
                            <FaUser className="text-dark-400 text-xs" />
                          </div>
                          <div>
                            <p className="text-white text-sm">
                              {settlement.customer?.firstName} {settlement.customer?.lastName}
                            </p>
                            <p className="text-dark-500 text-xs flex items-center gap-1">
                              <FaPhone className="text-xs" />
                              {settlement.customer?.phone}
                            </p>
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="p-4">
                      {settlement.type === 'rial' ? (
                        <span className="flex items-center gap-1 text-yellow-500">
                          <FaMoneyBillWave />
                          ریالی
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-blue-500">
                          <FaCoins />
                          {settlement.currency?.code || settlement.trade?.currency?.code}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="text-white font-bold">
                        {formatNumber(settlement.amount)}
                      </p>
                      <p className="text-dark-500 text-xs">
                        {settlement.type === 'rial' ? 'ریال' : settlement.currency?.code}
                      </p>
                    </td>
                    <td className="p-4">
                      <p className={`${
                        new Date(settlement.dueDate) < new Date() ? 'text-red-500' : 'text-dark-300'
                      }`}>
                        {formatDate(settlement.dueDate)}
                      </p>
                      {new Date(settlement.dueDate) < new Date() && settlement.status !== 'completed' && (
                        <p className="text-red-500 text-xs">گذشته</p>
                      )}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(settlement.status)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        {settlement.status !== 'completed' && (
                          <button
                            onClick={() => openReceiptModal(settlement)}
                            className="p-2 rounded-lg bg-green-500/20 text-green-500 hover:bg-green-500/30 flex items-center gap-1"
                            title="ثبت رسید و تسویه"
                          >
                            <FaReceipt />
                            <span className="text-xs hidden lg:inline">ثبت رسید</span>
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedSettlement(settlement);
                          }}
                          className="p-2 rounded-lg bg-dark-700 text-dark-400 hover:text-white"
                          title="جزئیات"
                        >
                          <FaEye />
                        </button>
                        {settlement.status === 'pending' && new Date(settlement.dueDate) < new Date() && (
                          <button
                            onClick={() => handleMarkOverdue(settlement._id)}
                            className="p-2 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30"
                            title="ثبت تاخیر"
                          >
                            <FaExclamationTriangle />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========== مودال ثبت رسید اجباری ========== */}
      {showReceiptModal && selectedSettlement && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-dark-900 pb-4 border-b border-dark-700">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FaReceipt className="text-gold" />
                ثبت رسید جدید
                <span className="text-sm font-normal text-dark-400">(اجباری قبل از تسویه)</span>
              </h2>
              <button
                onClick={() => {
                  if (confirm('با بستن این پنجره، تسویه انجام نمی‌شود. آیا مطمئنید؟')) {
                    setShowReceiptModal(false);
                    setSelectedSettlement(null);
                    resetReceiptForm();
                  }
                }}
                className="text-dark-400 hover:text-white"
              >
                <FaTimes />
              </button>
            </div>

            {/* اطلاعات معامله */}
            <div className="bg-dark-800 rounded-lg p-4 mb-6">
              <h3 className="text-dark-400 text-sm mb-3">اطلاعات معامله مرتبط:</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-dark-500">شماره معامله:</span>
                  <p className="text-gold font-bold">{selectedSettlement.tradeNumber}</p>
                </div>
                <div>
                  <span className="text-dark-500">مشتری:</span>
                  <p className={selectedSettlement.trade?.isGroupTrade || selectedSettlement.trade?.executorSarafi ? 'text-purple-400' : 'text-white'}>
                    {getCustomerDisplayName(selectedSettlement)}
                  </p>
                </div>
                <div>
                  <span className="text-dark-500">نوع تسویه:</span>
                  <p className={selectedSettlement.type === 'rial' ? 'text-yellow-500' : 'text-blue-500'}>
                    {selectedSettlement.type === 'rial' ? 'ریالی' : 'ارزی'}
                  </p>
                </div>
                <div>
                  <span className="text-dark-500">مبلغ:</span>
                  <p className="text-white font-bold">{formatNumber(selectedSettlement.amount)}</p>
                </div>
              </div>
            </div>

            {/* فرم رسید */}
            <div className="space-y-4">
              {/* نوع رسید */}
              <div>
                <label className="block text-dark-300 mb-2">نوع رسید *</label>
                <div className="flex gap-4">
                  <label className={`flex-1 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    receiptForm.type === 'rial'
                      ? 'border-yellow-500 bg-yellow-500/10'
                      : 'border-dark-700 hover:border-dark-600'
                  }`}>
                    <input
                      type="radio"
                      name="receiptType"
                      value="rial"
                      checked={receiptForm.type === 'rial'}
                      onChange={(e) => setReceiptForm({ ...receiptForm, type: e.target.value })}
                      className="hidden"
                    />
                    <div className="flex items-center gap-2">
                      <FaMoneyBillWave className={receiptForm.type === 'rial' ? 'text-yellow-500' : 'text-dark-400'} />
                      <span className={receiptForm.type === 'rial' ? 'text-yellow-500' : 'text-dark-300'}>ریالی</span>
                    </div>
                  </label>
                  <label className={`flex-1 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                    receiptForm.type === 'currency'
                      ? 'border-blue-500 bg-blue-500/10'
                      : 'border-dark-700 hover:border-dark-600'
                  }`}>
                    <input
                      type="radio"
                      name="receiptType"
                      value="currency"
                      checked={receiptForm.type === 'currency'}
                      onChange={(e) => setReceiptForm({ ...receiptForm, type: e.target.value })}
                      className="hidden"
                    />
                    <div className="flex items-center gap-2">
                      <FaCoins className={receiptForm.type === 'currency' ? 'text-blue-500' : 'text-dark-400'} />
                      <span className={receiptForm.type === 'currency' ? 'text-blue-500' : 'text-dark-300'}>ارزی</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* مبلغ */}
              <div>
                <label className="block text-dark-300 mb-2">مبلغ رسید *</label>
                <input
                  type="number"
                  value={receiptForm.amount}
                  onChange={(e) => setReceiptForm({ ...receiptForm, amount: e.target.value })}
                  className="input w-full text-lg"
                  placeholder="مبلغ را وارد کنید"
                />
              </div>

              {/* روش پرداخت */}
              <div>
                <label className="block text-dark-300 mb-2">روش وصول *</label>
                <select
                  value={receiptForm.paymentMethod}
                  onChange={(e) => setReceiptForm({ ...receiptForm, paymentMethod: e.target.value })}
                  className="input w-full"
                >
                  <option value="bank_transfer">انتقال بانکی</option>
                  <option value="cash">نقدی</option>
                  <option value="cheque">چک</option>
                  <option value="pos">کارتخوان</option>
                  <option value="crypto">ارز دیجیتال</option>
                </select>
              </div>

              {/* نام صاحب حساب */}
              <div>
                <label className="block text-dark-300 mb-2">نام صاحب حساب / پرداخت‌کننده *</label>
                <input
                  type="text"
                  value={receiptForm.accountHolder}
                  onChange={(e) => setReceiptForm({ ...receiptForm, accountHolder: e.target.value })}
                  className="input w-full"
                  placeholder="نام کامل صاحب حساب"
                />
              </div>

              {/* شماره پیگیری */}
              <div>
                <label className="block text-dark-300 mb-2">شماره پیگیری بانکی / رسید *</label>
                <input
                  type="text"
                  value={receiptForm.bankTrackingNumber}
                  onChange={(e) => setReceiptForm({ ...receiptForm, bankTrackingNumber: e.target.value })}
                  className="input w-full"
                  placeholder="شماره پیگیری تراکنش"
                />
              </div>

              {/* تاریخ تراکنش */}
              <div>
                <label className="block text-dark-300 mb-2">تاریخ تراکنش</label>
                <input
                  type="date"
                  value={receiptForm.transactionDate}
                  onChange={(e) => setReceiptForm({ ...receiptForm, transactionDate: e.target.value })}
                  className="input w-full"
                />
              </div>

              {/* توضیحات */}
              <div>
                <label className="block text-dark-300 mb-2">توضیحات</label>
                <textarea
                  value={receiptForm.notes}
                  onChange={(e) => setReceiptForm({ ...receiptForm, notes: e.target.value })}
                  className="input w-full"
                  rows="2"
                  placeholder="توضیحات اضافی..."
                />
              </div>

              {/* آپلود فایل */}
              <div>
                <label className="block text-dark-300 mb-2">
                  فایل‌های پیوست
                  <span className="text-dark-500 text-xs mr-2">
                    (حداکثر {MAX_FILES} فایل، هر فایل تا 200MB، فرمت PDF/JPG/JPEG)
                  </span>
                </label>

                {/* Upload Zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-dark-600 hover:border-gold rounded-xl p-6 text-center cursor-pointer transition-all"
                >
                  <FaCloudUploadAlt className="text-dark-400 text-4xl mx-auto mb-3" />
                  <p className="text-dark-300">برای آپلود فایل کلیک کنید یا فایل را اینجا رها کنید</p>
                  <p className="text-dark-500 text-sm mt-1">PDF, JPG, JPEG - حداکثر 200MB</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </div>

                {/* File List */}
                {receiptForm.attachments.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-dark-400 text-sm">
                      {receiptForm.attachments.length} فایل انتخاب شده:
                    </p>
                    {receiptForm.attachments.map((att, index) => (
                      <div key={index} className="flex items-center gap-3 bg-dark-800 rounded-lg p-3">
                        {att.name.endsWith('.pdf') ? (
                          <FaFilePdf className="text-red-500 text-xl flex-shrink-0" />
                        ) : (
                          <FaFileImage className="text-blue-500 text-xl flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm truncate">{att.name}</p>
                          <p className="text-dark-500 text-xs">{formatFileSize(att.size)}</p>
                        </div>
                        {att.preview && (
                          <img src={att.preview} alt="" className="w-10 h-10 object-cover rounded" />
                        )}
                        <button
                          type="button"
                          onClick={() => removeAttachment(index)}
                          className="p-2 text-red-500 hover:bg-red-500/20 rounded-lg"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Warning */}
            <div className="mt-6 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-start gap-2">
              <FaInfoCircle className="text-yellow-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="text-yellow-500 font-bold">توجه:</p>
                <p className="text-dark-300">
                  بدون ثبت رسید، امکان تسویه وجود ندارد. پس از ثبت رسید، تسویه به صورت خودکار انجام می‌شود.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 mt-6 sticky bottom-0 bg-dark-900 pt-4 border-t border-dark-700">
              <button
                onClick={handleSubmitReceiptAndSettlement}
                disabled={submitting}
                className="btn-gold flex-1 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="loading-spinner-sm"></div>
                    در حال ثبت...
                  </>
                ) : (
                  <>
                    <FaReceipt />
                    ثبت رسید و تسویه
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  if (confirm('با بستن این پنجره، تسویه انجام نمی‌شود. آیا مطمئنید؟')) {
                    setShowReceiptModal(false);
                    setSelectedSettlement(null);
                    resetReceiptForm();
                  }
                }}
                disabled={submitting}
                className="btn-outline flex-1"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettlementPanel;
