import { useState, useEffect, useMemo } from 'react';
import {
  FaExchangeAlt, FaArrowUp, FaArrowDown, FaSearch, FaFilter,
  FaCalendarAlt, FaClock, FaSync, FaDownload, FaEye, FaCheck,
  FaTimes, FaChartLine, FaUserFriends, FaCoins, FaMoneyBillWave,
  FaSortAmountDown, FaSortAmountUp, FaChevronDown, FaFileExcel,
  FaFilePdf, FaListUl, FaThLarge, FaHandshake, FaPercent,
  FaSpinner, FaBell
} from 'react-icons/fa';
import api from '../../services/api';
import toast from 'react-hot-toast';

const GroupTrades = () => {
  // States
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('table'); // table | cards
  const [showFilters, setShowFilters] = useState(true);
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [currencies, setCurrencies] = useState([]);
  const [sarafis, setSarafis] = useState([]);
  const [pendingTrades, setPendingTrades] = useState({ groupTrades: [], memberTrades: [], total: 0 });
  const [acceptingTrade, setAcceptingTrade] = useState(null);
  const [showPendingSection, setShowPendingSection] = useState(true);

  // Statistics
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    totalVolume: 0,
    totalProfit: 0
  });

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
    type: 'all', // buy | sell | all
    currency: 'all',
    sarafi: 'all',
    dateFrom: '',
    dateTo: '',
    timeFrom: '',
    timeTo: '',
    minAmount: '',
    maxAmount: '',
    role: 'all' // owner | executor | all
  });

  // Sorting
  const [sortConfig, setSortConfig] = useState({
    key: 'createdAt',
    direction: 'desc'
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tradesRes, currenciesRes, pendingRes] = await Promise.all([
        api.get('/sarafi-groups/my-trades'),
        api.get('/public/currencies'),
        api.get('/sarafi-groups/pending-group-trades').catch(() => ({ data: { data: { groupTrades: [], memberTrades: [], total: 0 } } }))
      ]);

      const tradesData = tradesRes.data.data || [];
      setTrades(tradesData);
      setCurrencies(currenciesRes.data.data || []);
      setPendingTrades(pendingRes.data.data || { groupTrades: [], memberTrades: [], total: 0 });

      // استخراج لیست صراف‌ها از معاملات
      const uniqueSarafis = [];
      tradesData.forEach(trade => {
        if (trade.ownerSarafi && !uniqueSarafis.find(s => s._id === trade.ownerSarafi._id)) {
          uniqueSarafis.push(trade.ownerSarafi);
        }
        if (trade.executorSarafi && !uniqueSarafis.find(s => s._id === trade.executorSarafi._id)) {
          uniqueSarafis.push(trade.executorSarafi);
        }
      });
      setSarafis(uniqueSarafis);

      // محاسبه آمار
      calculateStats(tradesData);
    } catch (error) {
      console.error(error);
      toast.error('خطا در دریافت اطلاعات');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    const stats = {
      total: data.length,
      pending: data.filter(t => t.status === 'pending' || t.status === 'approved').length,
      completed: data.filter(t => t.status === 'completed').length,
      totalVolume: data.reduce((sum, t) => sum + (t.totalAmount || 0), 0),
      totalProfit: data.reduce((sum, t) => {
        const ownerProfit = t.groupTradeDetails?.ownerProfit || 0;
        const executorProfit = t.groupTradeDetails?.executorProfit || 0;
        return sum + ownerProfit + executorProfit;
      }, 0)
    };
    setStats(stats);
  };

  // قبول معامله و انتقال به پنل خودم
  const handleAcceptTrade = async (tradeId) => {
    const ownerSpread = prompt('درصد سود صراف مالک (پیش‌فرض: 1%):', '1');
    if (ownerSpread === null) return;

    const executorSpread = prompt('درصد سود شما (پیش‌فرض: 1%):', '1');
    if (executorSpread === null) return;

    const ownerSpreadPercent = parseFloat(ownerSpread) || 1;
    const executorSpreadPercent = parseFloat(executorSpread) || 1;

    if (!confirm(`آیا می‌خواهید این معامله را قبول کنید؟\n\nسود صراف مالک: ${ownerSpreadPercent}%\nسود شما: ${executorSpreadPercent}%`)) return;

    setAcceptingTrade(tradeId);
    try {
      await api.post(`/sarafi-groups/accept-trade/${tradeId}`, {
        ownerSpreadPercent,
        executorSpreadPercent
      });
      toast.success('معامله با موفقیت قبول شد و به پنل شما منتقل شد');
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.message || 'خطا در قبول معامله');
    } finally {
      setAcceptingTrade(null);
    }
  };

  // تولید نام مستعار برای مشتری
  const getMaskedCustomerName = (trade, index) => {
    if (trade.sharedCustomer?.displayName) {
      return trade.sharedCustomer.displayName;
    }
    const sarafiName = trade.sarafi?.sarafiInfo?.name || trade.sarafi?.sarafiInfo?.alias || `${trade.sarafi?.firstName || ''}`;
    return `مشتری ${sarafiName} #${index + 1}`;
  };

  // فیلتر کردن داده‌ها
  const filteredTrades = useMemo(() => {
    return trades.filter(trade => {
      // جستجو
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const tradeNumber = (trade.tradeNumber || '').toLowerCase();
        const customerName = (trade.sharedCustomer?.displayName || '').toLowerCase();
        const ownerName = `${trade.ownerSarafi?.firstName || ''} ${trade.ownerSarafi?.lastName || ''}`.toLowerCase();
        if (!tradeNumber.includes(searchLower) && !customerName.includes(searchLower) && !ownerName.includes(searchLower)) {
          return false;
        }
      }

      // فیلتر وضعیت
      if (filters.status !== 'all' && trade.status !== filters.status) return false;

      // فیلتر نوع
      if (filters.type !== 'all' && trade.type !== filters.type) return false;

      // فیلتر ارز
      if (filters.currency !== 'all' && trade.currency?._id !== filters.currency) return false;

      // فیلتر صراف
      if (filters.sarafi !== 'all') {
        if (trade.ownerSarafi?._id !== filters.sarafi && trade.executorSarafi?._id !== filters.sarafi) {
          return false;
        }
      }

      // فیلتر نقش
      if (filters.role === 'owner' && !trade.isOwner) return false;
      if (filters.role === 'executor' && !trade.isExecutor) return false;

      // فیلتر تاریخ
      if (filters.dateFrom) {
        const tradeDate = new Date(trade.createdAt).setHours(0, 0, 0, 0);
        const fromDate = new Date(filters.dateFrom).setHours(0, 0, 0, 0);
        if (tradeDate < fromDate) return false;
      }
      if (filters.dateTo) {
        const tradeDate = new Date(trade.createdAt).setHours(23, 59, 59, 999);
        const toDate = new Date(filters.dateTo).setHours(23, 59, 59, 999);
        if (tradeDate > toDate) return false;
      }

      // فیلتر مبلغ
      if (filters.minAmount && trade.totalAmount < parseFloat(filters.minAmount)) return false;
      if (filters.maxAmount && trade.totalAmount > parseFloat(filters.maxAmount)) return false;

      return true;
    });
  }, [trades, filters]);

  // مرتب‌سازی
  const sortedTrades = useMemo(() => {
    const sorted = [...filteredTrades];
    sorted.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      // مقادیر تو در تو
      if (sortConfig.key === 'currency') {
        aVal = a.currency?.code || '';
        bVal = b.currency?.code || '';
      } else if (sortConfig.key === 'ownerSarafi') {
        aVal = a.ownerSarafi?.firstName || '';
        bVal = b.ownerSarafi?.firstName || '';
      }

      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredTrades, sortConfig]);

  // صفحه‌بندی
  const paginatedTrades = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return sortedTrades.slice(start, start + itemsPerPage);
  }, [sortedTrades, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(sortedTrades.length / itemsPerPage);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      type: 'all',
      currency: 'all',
      sarafi: 'all',
      dateFrom: '',
      dateTo: '',
      timeFrom: '',
      timeTo: '',
      minAmount: '',
      maxAmount: '',
      role: 'all'
    });
    setCurrentPage(1);
  };

  const exportToExcel = () => {
    toast.success('در حال آماده‌سازی فایل اکسل...');
    // TODO: پیاده‌سازی export
  };

  const formatNumber = (num) => new Intl.NumberFormat('fa-IR').format(num || 0);
  const formatDate = (date) => new Date(date).toLocaleDateString('fa-IR');
  const formatTime = (date) => new Date(date).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

  const getStatusConfig = (status) => {
    const configs = {
      pending: { label: 'در انتظار', class: 'bg-yellow-500/20 text-yellow-500', icon: FaClock },
      approved: { label: 'تایید شده', class: 'bg-blue-500/20 text-blue-500', icon: FaCheck },
      pending_collection: { label: 'در انتظار وصول', class: 'bg-orange-500/20 text-orange-500', icon: FaHandshake },
      pending_accounting: { label: 'در انتظار حسابداری', class: 'bg-purple-500/20 text-purple-500', icon: FaChartLine },
      completed: { label: 'تکمیل شده', class: 'bg-green-500/20 text-green-500', icon: FaCheck },
      rejected: { label: 'رد شده', class: 'bg-red-500/20 text-red-500', icon: FaTimes },
      cancelled: { label: 'لغو شده', class: 'bg-dark-500/20 text-dark-400', icon: FaTimes }
    };
    return configs[status] || configs.pending;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* هدر */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
              <FaExchangeAlt className="text-white" />
            </div>
            معاملات گروهی
          </h1>
          <p className="text-dark-400 text-sm mt-1">مدیریت و پیگیری تمام معاملات بین‌صرافی</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-outline flex items-center gap-2 ${showFilters ? 'bg-dark-700' : ''}`}
          >
            <FaFilter />
            فیلترها
          </button>
          <button onClick={fetchData} className="btn-outline flex items-center gap-2">
            <FaSync />
            بروزرسانی
          </button>
          <button onClick={exportToExcel} className="btn-gold flex items-center gap-2">
            <FaFileExcel />
            خروجی اکسل
          </button>
        </div>
      </div>

      {/* آمار کلی */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="card p-4 border-r-4 border-indigo-500">
          <p className="text-dark-400 text-sm">کل معاملات</p>
          <p className="text-2xl font-bold text-indigo-500">{formatNumber(stats.total)}</p>
        </div>
        <div className="card p-4 border-r-4 border-yellow-500">
          <p className="text-dark-400 text-sm">در انتظار</p>
          <p className="text-2xl font-bold text-yellow-500">{formatNumber(stats.pending)}</p>
        </div>
        <div className="card p-4 border-r-4 border-green-500">
          <p className="text-dark-400 text-sm">تکمیل شده</p>
          <p className="text-2xl font-bold text-green-500">{formatNumber(stats.completed)}</p>
        </div>
        <div className="card p-4 border-r-4 border-blue-500">
          <p className="text-dark-400 text-sm">حجم کل</p>
          <p className="text-xl font-bold text-blue-500">{formatNumber(stats.totalVolume)}</p>
          <p className="text-xs text-dark-500">ریال</p>
        </div>
        <div className="card p-4 border-r-4 border-gold">
          <p className="text-dark-400 text-sm">سود کل</p>
          <p className="text-xl font-bold text-gold">{formatNumber(stats.totalProfit)}</p>
          <p className="text-xs text-dark-500">ریال</p>
        </div>
      </div>

      {/* درخواست‌های معامله در انتظار */}
      {pendingTrades.total > 0 && (
        <div className="card border border-purple-500/30 overflow-hidden">
          <div
            className="p-4 bg-purple-500/10 flex items-center justify-between cursor-pointer"
            onClick={() => setShowPendingSection(!showPendingSection)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <FaBell className="text-purple-400" />
              </div>
              <div>
                <h3 className="text-white font-bold flex items-center gap-2">
                  درخواست‌های معامله از اعضای گروه
                  <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                    {pendingTrades.total}
                  </span>
                </h3>
                <p className="text-dark-400 text-sm">معاملاتی که منتظر قبول شدن هستند</p>
              </div>
            </div>
            <FaChevronDown className={`text-dark-400 transition-transform ${showPendingSection ? 'rotate-180' : ''}`} />
          </div>

          {showPendingSection && (
            <div className="p-4 space-y-4">
              {/* معاملات اعضای گروه */}
              {pendingTrades.memberTrades?.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingTrades.memberTrades.map((trade, index) => (
                    <div key={trade._id} className="bg-dark-800 rounded-xl p-4 border border-gold/20">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <FaExchangeAlt className="text-gold" />
                          <span className="text-white font-bold">{getMaskedCustomerName(trade, index)}</span>
                        </div>
                        <span className={`px-2 py-1 rounded-lg text-xs ${trade.type === 'buy' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                          {trade.type === 'buy' ? 'خرید' : 'فروش'}
                        </span>
                      </div>

                      <p className="text-gold text-xs mb-3">
                        صراف: {trade.sarafi?.sarafiInfo?.name || trade.sarafi?.sarafiInfo?.alias || `${trade.sarafi?.firstName || ''} ${trade.sarafi?.lastName || ''}`}
                      </p>

                      <div className="space-y-2 text-sm bg-dark-900 p-3 rounded-lg mb-3">
                        <div className="flex justify-between">
                          <span className="text-dark-400">ارز:</span>
                          <span className="text-white">{trade.currency?.nameFa} ({trade.currency?.code})</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-dark-400">مقدار:</span>
                          <span className="text-gold font-bold">{formatNumber(trade.amount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-dark-400">نرخ:</span>
                          <span className="text-white">{formatNumber(trade.rate)} ریال</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-dark-400">مبلغ کل:</span>
                          <span className="text-gold font-bold">{formatNumber(trade.totalAmount)} ریال</span>
                        </div>
                      </div>

                      <p className="text-dark-500 text-xs mb-3">
                        {new Date(trade.createdAt).toLocaleDateString('fa-IR')} - {new Date(trade.createdAt).toLocaleTimeString('fa-IR')}
                      </p>

                      <button
                        onClick={() => handleAcceptTrade(trade._id)}
                        disabled={acceptingTrade === trade._id}
                        className="w-full btn-gold text-sm py-2 flex items-center justify-center gap-2"
                      >
                        {acceptingTrade === trade._id ? (
                          <>
                            <FaSpinner className="animate-spin" />
                            در حال انتقال...
                          </>
                        ) : (
                          <>
                            <FaHandshake />
                            قبول و انتقال به پنل من
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* اگر فقط معاملات گروهی بدون memberTrades وجود دارد */}
              {pendingTrades.groupTrades?.length > 0 && pendingTrades.memberTrades?.length === 0 && (
                <p className="text-dark-400 text-center py-4">
                  درخواست‌های معامله از مشتریان اشتراکی شما موجود است
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* فیلترها */}
      {showFilters && (
        <div className="card p-4 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white font-bold flex items-center gap-2">
              <FaFilter className="text-gold" />
              فیلترهای پیشرفته
            </h3>
            <button onClick={resetFilters} className="text-sm text-dark-400 hover:text-white">
              پاک کردن فیلترها
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* جستجو */}
            <div className="lg:col-span-2">
              <label className="block text-dark-400 text-sm mb-1">جستجو</label>
              <div className="relative">
                <FaSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  placeholder="شماره معامله، نام صراف، نام مشتری..."
                  className="input w-full pr-10"
                />
              </div>
            </div>

            {/* وضعیت */}
            <div>
              <label className="block text-dark-400 text-sm mb-1">وضعیت</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="input w-full"
              >
                <option value="all">همه</option>
                <option value="pending">در انتظار</option>
                <option value="approved">تایید شده</option>
                <option value="pending_collection">در انتظار وصول</option>
                <option value="pending_accounting">در انتظار حسابداری</option>
                <option value="completed">تکمیل شده</option>
                <option value="rejected">رد شده</option>
              </select>
            </div>

            {/* نوع */}
            <div>
              <label className="block text-dark-400 text-sm mb-1">نوع معامله</label>
              <select
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                className="input w-full"
              >
                <option value="all">همه</option>
                <option value="buy">خرید</option>
                <option value="sell">فروش</option>
              </select>
            </div>

            {/* ارز */}
            <div>
              <label className="block text-dark-400 text-sm mb-1">ارز</label>
              <select
                value={filters.currency}
                onChange={(e) => setFilters({ ...filters, currency: e.target.value })}
                className="input w-full"
              >
                <option value="all">همه ارزها</option>
                {currencies.map(c => (
                  <option key={c._id} value={c._id}>{c.nameFa} ({c.code})</option>
                ))}
              </select>
            </div>

            {/* نقش */}
            <div>
              <label className="block text-dark-400 text-sm mb-1">نقش من</label>
              <select
                value={filters.role}
                onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                className="input w-full"
              >
                <option value="all">همه</option>
                <option value="owner">صاحب معامله</option>
                <option value="executor">اجراکننده</option>
              </select>
            </div>

            {/* تاریخ از */}
            <div>
              <label className="block text-dark-400 text-sm mb-1">از تاریخ</label>
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                className="input w-full"
              />
            </div>

            {/* تاریخ تا */}
            <div>
              <label className="block text-dark-400 text-sm mb-1">تا تاریخ</label>
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                className="input w-full"
              />
            </div>
          </div>

          {/* فیلترهای اضافی */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t border-dark-800">
            <div>
              <label className="block text-dark-400 text-sm mb-1">حداقل مبلغ</label>
              <input
                type="number"
                value={filters.minAmount}
                onChange={(e) => setFilters({ ...filters, minAmount: e.target.value })}
                placeholder="ریال"
                className="input w-full"
              />
            </div>
            <div>
              <label className="block text-dark-400 text-sm mb-1">حداکثر مبلغ</label>
              <input
                type="number"
                value={filters.maxAmount}
                onChange={(e) => setFilters({ ...filters, maxAmount: e.target.value })}
                placeholder="ریال"
                className="input w-full"
              />
            </div>
            <div className="md:col-span-2 flex items-end gap-2">
              <span className="text-dark-400 text-sm">
                {formatNumber(filteredTrades.length)} معامله از {formatNumber(trades.length)} یافت شد
              </span>
            </div>
          </div>
        </div>
      )}

      {/* تنظیمات نمایش */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-lg ${viewMode === 'table' ? 'bg-gold text-dark-900' : 'bg-dark-800 text-dark-400'}`}
          >
            <FaListUl />
          </button>
          <button
            onClick={() => setViewMode('cards')}
            className={`p-2 rounded-lg ${viewMode === 'cards' ? 'bg-gold text-dark-900' : 'bg-dark-800 text-dark-400'}`}
          >
            <FaThLarge />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-dark-400 text-sm">نمایش:</span>
          <select
            value={itemsPerPage}
            onChange={(e) => { setItemsPerPage(parseInt(e.target.value)); setCurrentPage(1); }}
            className="input py-1 px-2 text-sm"
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
      </div>

      {/* جدول معاملات */}
      {viewMode === 'table' ? (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-800">
                <tr>
                  <th className="text-right p-3 text-dark-400 text-sm cursor-pointer hover:text-white" onClick={() => handleSort('tradeNumber')}>
                    <div className="flex items-center gap-1">
                      شماره
                      {sortConfig.key === 'tradeNumber' && (sortConfig.direction === 'desc' ? <FaSortAmountDown className="text-xs" /> : <FaSortAmountUp className="text-xs" />)}
                    </div>
                  </th>
                  <th className="text-right p-3 text-dark-400 text-sm">صراف</th>
                  <th className="text-right p-3 text-dark-400 text-sm">مشتری</th>
                  <th className="text-right p-3 text-dark-400 text-sm cursor-pointer hover:text-white" onClick={() => handleSort('type')}>نوع</th>
                  <th className="text-right p-3 text-dark-400 text-sm cursor-pointer hover:text-white" onClick={() => handleSort('currency')}>ارز</th>
                  <th className="text-right p-3 text-dark-400 text-sm cursor-pointer hover:text-white" onClick={() => handleSort('amount')}>مقدار</th>
                  <th className="text-right p-3 text-dark-400 text-sm cursor-pointer hover:text-white" onClick={() => handleSort('rate')}>نرخ</th>
                  <th className="text-right p-3 text-dark-400 text-sm">اسپرد</th>
                  <th className="text-right p-3 text-dark-400 text-sm cursor-pointer hover:text-white" onClick={() => handleSort('createdAt')}>
                    <div className="flex items-center gap-1">
                      تاریخ
                      {sortConfig.key === 'createdAt' && (sortConfig.direction === 'desc' ? <FaSortAmountDown className="text-xs" /> : <FaSortAmountUp className="text-xs" />)}
                    </div>
                  </th>
                  <th className="text-right p-3 text-dark-400 text-sm">وضعیت</th>
                  <th className="text-center p-3 text-dark-400 text-sm">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {paginatedTrades.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="text-center p-8 text-dark-500">
                      معامله‌ای یافت نشد
                    </td>
                  </tr>
                ) : (
                  paginatedTrades.map(trade => {
                    const statusConfig = getStatusConfig(trade.status);
                    const StatusIcon = statusConfig.icon;
                    return (
                      <tr key={trade._id} className="border-t border-dark-800 hover:bg-dark-800/30">
                        <td className="p-3">
                          <span className="text-gold font-mono text-sm">{trade.tradeNumber}</span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-indigo-500/20 flex items-center justify-center">
                              <FaUserFriends className="text-indigo-400 text-xs" />
                            </div>
                            <div>
                              <p className="text-white text-sm">
                                {trade.ownerSarafi?.sarafiInfo?.name || `${trade.ownerSarafi?.firstName || ''} ${trade.ownerSarafi?.lastName || ''}`}
                              </p>
                              <p className="text-dark-500 text-xs">
                                {trade.isOwner ? 'صاحب' : 'اجراکننده'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="text-purple-400 text-sm">{trade.sharedCustomer?.displayName || '-'}</span>
                        </td>
                        <td className="p-3">
                          <span className={`flex items-center gap-1 text-sm ${trade.type === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                            {trade.type === 'buy' ? <FaArrowUp /> : <FaArrowDown />}
                            {trade.type === 'buy' ? 'خرید' : 'فروش'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="text-white text-sm">{trade.currency?.code}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-white font-medium">{formatNumber(trade.amount)}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-white text-sm">{formatNumber(trade.rate)}</span>
                        </td>
                        <td className="p-3">
                          {trade.groupTradeDetails ? (
                            <div className="text-xs">
                              <span className="text-green-500">{trade.groupTradeDetails.ownerSpreadPercent || 0}%</span>
                              <span className="text-dark-500 mx-1">/</span>
                              <span className="text-blue-500">{trade.groupTradeDetails.executorSpreadPercent || 0}%</span>
                            </div>
                          ) : '-'}
                        </td>
                        <td className="p-3">
                          <div>
                            <p className="text-white text-sm">{formatDate(trade.createdAt)}</p>
                            <p className="text-dark-500 text-xs">{formatTime(trade.createdAt)}</p>
                          </div>
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 w-fit ${statusConfig.class}`}>
                            <StatusIcon className="text-xs" />
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="p-3">
                          <button
                            onClick={() => setSelectedTrade(trade)}
                            className="p-2 rounded-lg bg-dark-700 text-dark-400 hover:text-white hover:bg-dark-600"
                          >
                            <FaEye />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* صفحه‌بندی */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-dark-800">
              <span className="text-dark-400 text-sm">
                صفحه {currentPage} از {totalPages}
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded bg-dark-800 text-dark-400 disabled:opacity-50"
                >
                  اول
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded bg-dark-800 text-dark-400 disabled:opacity-50"
                >
                  قبلی
                </button>
                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                  const pageNum = currentPage - 2 + i;
                  if (pageNum < 1 || pageNum > totalPages) return null;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`px-3 py-1 rounded ${pageNum === currentPage ? 'bg-gold text-dark-900' : 'bg-dark-800 text-dark-400'}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded bg-dark-800 text-dark-400 disabled:opacity-50"
                >
                  بعدی
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded bg-dark-800 text-dark-400 disabled:opacity-50"
                >
                  آخر
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* نمایش کارتی */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedTrades.map(trade => {
            const statusConfig = getStatusConfig(trade.status);
            const StatusIcon = statusConfig.icon;
            return (
              <div key={trade._id} className="card p-4 hover:border-gold/30 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-gold font-mono text-sm">{trade.tradeNumber}</span>
                  <span className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 ${statusConfig.class}`}>
                    <StatusIcon className="text-xs" />
                    {statusConfig.label}
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                    <FaUserFriends className="text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-white text-sm">
                      {trade.ownerSarafi?.sarafiInfo?.name || `${trade.ownerSarafi?.firstName || ''} ${trade.ownerSarafi?.lastName || ''}`}
                    </p>
                    <p className="text-purple-400 text-xs">{trade.sharedCustomer?.displayName || '-'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                  <div className="bg-dark-800 rounded-lg p-2">
                    <span className="text-dark-400 text-xs">نوع:</span>
                    <p className={`font-medium ${trade.type === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                      {trade.type === 'buy' ? 'خرید' : 'فروش'} {trade.currency?.code}
                    </p>
                  </div>
                  <div className="bg-dark-800 rounded-lg p-2">
                    <span className="text-dark-400 text-xs">مقدار:</span>
                    <p className="text-white font-medium">{formatNumber(trade.amount)}</p>
                  </div>
                  <div className="bg-dark-800 rounded-lg p-2">
                    <span className="text-dark-400 text-xs">نرخ:</span>
                    <p className="text-white">{formatNumber(trade.rate)}</p>
                  </div>
                  <div className="bg-dark-800 rounded-lg p-2">
                    <span className="text-dark-400 text-xs">مبلغ کل:</span>
                    <p className="text-gold font-medium">{formatNumber(trade.totalAmount)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-dark-400 pt-3 border-t border-dark-800">
                  <span>{formatDate(trade.createdAt)} - {formatTime(trade.createdAt)}</span>
                  <button
                    onClick={() => setSelectedTrade(trade)}
                    className="text-gold hover:text-gold/80"
                  >
                    جزئیات
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* مودال جزئیات */}
      {selectedTrade && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setSelectedTrade(null)}>
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-dark-800 sticky top-0 bg-dark-900">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FaEye className="text-gold" />
                جزئیات معامله
              </h2>
              <button onClick={() => setSelectedTrade(null)} className="text-dark-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* شماره معامله */}
              <div className="bg-dark-800 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <span className="text-dark-400">شماره معامله:</span>
                  <span className="text-gold font-mono text-lg">{selectedTrade.tradeNumber}</span>
                </div>
              </div>

              {/* صراف‌ها */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-dark-800 rounded-xl p-4">
                  <p className="text-dark-400 text-sm mb-2">صاحب معامله:</p>
                  <p className="text-white font-medium">
                    {selectedTrade.ownerSarafi?.sarafiInfo?.name || `${selectedTrade.ownerSarafi?.firstName || ''} ${selectedTrade.ownerSarafi?.lastName || ''}`}
                  </p>
                </div>
                <div className="bg-dark-800 rounded-xl p-4">
                  <p className="text-dark-400 text-sm mb-2">اجراکننده:</p>
                  <p className="text-white font-medium">
                    {selectedTrade.executorSarafi?.sarafiInfo?.name || `${selectedTrade.executorSarafi?.firstName || ''} ${selectedTrade.executorSarafi?.lastName || ''}`}
                  </p>
                </div>
              </div>

              {/* مشتری */}
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                <p className="text-dark-400 text-sm mb-1">مشتری گروهی:</p>
                <p className="text-purple-400 font-bold">{selectedTrade.sharedCustomer?.displayName || '-'}</p>
              </div>

              {/* جزئیات معامله */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
                  <span className="text-dark-400">نوع:</span>
                  <span className={`flex items-center gap-1 font-medium ${selectedTrade.type === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                    {selectedTrade.type === 'buy' ? <FaArrowUp /> : <FaArrowDown />}
                    {selectedTrade.type === 'buy' ? 'خرید' : 'فروش'}
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
                  <span className="text-dark-400">ارز:</span>
                  <span className="text-white font-medium">{selectedTrade.currency?.nameFa} ({selectedTrade.currency?.code})</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
                  <span className="text-dark-400">مقدار:</span>
                  <span className="text-white font-bold">{formatNumber(selectedTrade.amount)}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
                  <span className="text-dark-400">نرخ:</span>
                  <span className="text-white">{formatNumber(selectedTrade.rate)} ریال</span>
                </div>
              </div>

              {/* مبلغ کل */}
              <div className="bg-gold/10 border border-gold/30 rounded-xl p-4 flex items-center justify-between">
                <span className="text-dark-300">مبلغ کل:</span>
                <span className="text-gold text-2xl font-bold">{formatNumber(selectedTrade.totalAmount)} ریال</span>
              </div>

              {/* اسپرد و سود */}
              {selectedTrade.groupTradeDetails && (
                <div className="bg-dark-800 rounded-xl p-4 space-y-3">
                  <h4 className="text-white font-bold flex items-center gap-2">
                    <FaPercent className="text-gold" />
                    جزئیات اسپرد و سود
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-dark-900 rounded-lg">
                      <p className="text-dark-400 mb-1">اسپرد صاحب:</p>
                      <p className="text-green-500 font-bold">
                        {selectedTrade.groupTradeDetails.ownerSpreadPercent || 0}% = {formatNumber(selectedTrade.groupTradeDetails.ownerProfit || 0)} ریال
                      </p>
                    </div>
                    <div className="p-3 bg-dark-900 rounded-lg">
                      <p className="text-dark-400 mb-1">اسپرد اجراکننده:</p>
                      <p className="text-blue-500 font-bold">
                        {selectedTrade.groupTradeDetails.executorSpreadPercent || 0}% = {formatNumber(selectedTrade.groupTradeDetails.executorProfit || 0)} ریال
                      </p>
                    </div>
                    <div className="p-3 bg-dark-900 rounded-lg col-span-2">
                      <p className="text-dark-400 mb-1">نرخ بین‌صرافی:</p>
                      <p className="text-white font-bold">{formatNumber(selectedTrade.groupTradeDetails.interSarafiRate || 0)} ریال</p>
                    </div>
                  </div>
                </div>
              )}

              {/* تاریخ و وضعیت */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-dark-800 rounded-lg">
                  <span className="text-dark-400 text-sm">تاریخ ثبت:</span>
                  <p className="text-white">{formatDate(selectedTrade.createdAt)} - {formatTime(selectedTrade.createdAt)}</p>
                </div>
                <div className="p-3 bg-dark-800 rounded-lg">
                  <span className="text-dark-400 text-sm">وضعیت:</span>
                  <p className={getStatusConfig(selectedTrade.status).class.replace('bg-', 'text-').split(' ')[1]}>
                    {getStatusConfig(selectedTrade.status).label}
                  </p>
                </div>
              </div>

              {/* یادداشت */}
              {selectedTrade.notes && (
                <div className="p-3 bg-dark-800 rounded-lg">
                  <span className="text-dark-400 text-sm">یادداشت:</span>
                  <p className="text-white mt-1">{selectedTrade.notes}</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-dark-800">
              <button onClick={() => setSelectedTrade(null)} className="btn-outline w-full">
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupTrades;
