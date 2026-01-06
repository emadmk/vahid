import { useState, useEffect, useMemo } from 'react';
import {
  FaCalculator, FaWallet, FaCreditCard, FaPlus, FaMinus, FaSpinner, FaSearch, FaHistory,
  FaExchangeAlt, FaCheck, FaTimes, FaEye, FaArrowUp, FaArrowDown, FaClock, FaCoins, FaDollarSign, FaEuroSign,
  FaUserFriends, FaReceipt, FaFileImage, FaFilePdf, FaChartBar, FaChartLine, FaChartPie,
  FaCalendarAlt, FaFileExcel, FaFilter, FaSync, FaUsers, FaMoneyBillWave, FaPercentage,
  FaChevronDown, FaChevronUp, FaTrophy, FaStore
} from 'react-icons/fa';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const Accountant = () => {
  // States
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | trades | wallets | reports
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('today'); // today | week | month | custom
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  // Dashboard Stats
  const [dashboardStats, setDashboardStats] = useState({
    todayTrades: 0,
    todayVolume: 0,
    todayProfit: 0,
    pendingTrades: 0,
    completedTrades: 0,
    totalCustomers: 0,
    activeCustomers: 0,
    totalRevenue: 0,
    buyCount: 0,
    sellCount: 0,
    buyVolume: 0,
    sellVolume: 0
  });

  // Chart Data
  const [chartData, setChartData] = useState({
    daily: [],
    weekly: [],
    monthly: [],
    currencyBreakdown: [],
    customerTop: []
  });

  // Trades
  const [allTrades, setAllTrades] = useState([]);
  const [pendingTrades, setPendingTrades] = useState([]);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [tradeFilters, setTradeFilters] = useState({
    status: 'all',
    type: 'all',
    search: '',
    dateFrom: '',
    dateTo: ''
  });

  // Wallets
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerWallets, setCustomerWallets] = useState(null);
  const [currencyBalances, setCurrencyBalances] = useState([]);
  const [currencies, setCurrencies] = useState([]);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [processing, setProcessing] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [tradeReceipts, setTradeReceipts] = useState([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (activeTab === 'dashboard') {
      fetchDashboardData();
    } else if (activeTab === 'trades') {
      fetchTrades();
    } else if (activeTab === 'wallets') {
      fetchCustomers();
      fetchCurrencies();
    }
  }, [activeTab, dateRange]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchDashboardData(),
        fetchCurrencies()
      ]);
    } catch (error) {
      console.error('Error fetching initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      const [tradesRes, customersRes, pendingRes] = await Promise.all([
        api.get('/trades/sarafi/instant-trades', { params: { limit: 500 } }),
        api.get('/sarafi/customers'),
        api.get('/trades/sarafi/instant-trades', { params: { status: 'pending_accounting' } })
      ]);

      const trades = tradesRes.data.trades || tradesRes.data.data || [];
      const customersList = customersRes.data.data || [];
      const pending = pendingRes.data.trades || pendingRes.data.data || [];

      setPendingTrades(pending);
      setAllTrades(trades);
      setCustomers(customersList);

      // Calculate stats
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayTrades = trades.filter(t => new Date(t.createdAt) >= today);
      const completedTrades = trades.filter(t => t.status === 'completed');

      // Calculate daily data for chart (last 7 days)
      const dailyData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        date.setHours(0, 0, 0, 0);
        const nextDate = new Date(date);
        nextDate.setDate(nextDate.getDate() + 1);

        const dayTrades = trades.filter(t => {
          const tradeDate = new Date(t.createdAt);
          return tradeDate >= date && tradeDate < nextDate;
        });

        dailyData.push({
          date: date.toLocaleDateString('fa-IR', { weekday: 'short', day: 'numeric' }),
          count: dayTrades.length,
          volume: dayTrades.reduce((sum, t) => sum + (t.totalAmount || 0), 0),
          profit: dayTrades.reduce((sum, t) => sum + (t.commission?.amount || 0), 0)
        });
      }

      // Currency breakdown
      const currencyBreakdown = {};
      trades.forEach(t => {
        const code = t.currency?.code || 'نامشخص';
        if (!currencyBreakdown[code]) {
          currencyBreakdown[code] = { count: 0, volume: 0 };
        }
        currencyBreakdown[code].count++;
        currencyBreakdown[code].volume += t.totalAmount || 0;
      });

      // Top customers
      const customerStats = {};
      trades.forEach(t => {
        const customerId = t.customer?._id || 'unknown';
        if (!customerStats[customerId]) {
          customerStats[customerId] = {
            name: `${t.customer?.firstName || ''} ${t.customer?.lastName || ''}`.trim() || 'نامشخص',
            count: 0,
            volume: 0
          };
        }
        customerStats[customerId].count++;
        customerStats[customerId].volume += t.totalAmount || 0;
      });
      const topCustomers = Object.values(customerStats)
        .sort((a, b) => b.volume - a.volume)
        .slice(0, 5);

      setDashboardStats({
        todayTrades: todayTrades.length,
        todayVolume: todayTrades.reduce((sum, t) => sum + (t.totalAmount || 0), 0),
        todayProfit: todayTrades.reduce((sum, t) => sum + (t.commission?.amount || 0), 0),
        pendingTrades: pending.length,
        completedTrades: completedTrades.length,
        totalCustomers: customersList.length,
        activeCustomers: customersList.filter(c => c.status === 'approved').length,
        totalRevenue: trades.reduce((sum, t) => sum + (t.commission?.amount || 0), 0),
        buyCount: trades.filter(t => t.type === 'buy' || t.side === 'buy').length,
        sellCount: trades.filter(t => t.type === 'sell' || t.side === 'sell').length,
        buyVolume: trades.filter(t => t.type === 'buy' || t.side === 'buy').reduce((sum, t) => sum + (t.totalAmount || 0), 0),
        sellVolume: trades.filter(t => t.type === 'sell' || t.side === 'sell').reduce((sum, t) => sum + (t.totalAmount || 0), 0)
      });

      setChartData({
        daily: dailyData,
        currencyBreakdown: Object.entries(currencyBreakdown).map(([code, data]) => ({
          currency: code,
          ...data
        })),
        customerTop: topCustomers
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const fetchTrades = async () => {
    setTradesLoading(true);
    try {
      const params = { limit: 500 };
      if (tradeFilters.status !== 'all') params.status = tradeFilters.status;

      const res = await api.get('/trades/sarafi/instant-trades', { params });
      setAllTrades(res.data.trades || res.data.data || []);
    } catch (error) {
      console.error('Error fetching trades:', error);
    } finally {
      setTradesLoading(false);
    }
  };

  const fetchCurrencies = async () => {
    try {
      const res = await api.get('/public/currencies');
      setCurrencies(res.data.data || []);
    } catch (e) {
      console.error('Error fetching currencies:', e);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/sarafi/customers');
      setCustomers(response.data.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchCustomerWallets = async (customerId) => {
    try {
      const [walletsRes, currencyRes] = await Promise.all([
        api.get(`/wallets/customer/${customerId}`),
        api.get(`/wallets/customer/${customerId}/currencies`)
      ]);
      setCustomerWallets(walletsRes.data.data);
      setCurrencyBalances(currencyRes.data.data?.currencyBalances || []);
    } catch (error) {
      console.error('Error fetching wallets:', error);
    }
  };

  // Trade Actions
  const handleApproveTrade = async (tradeId) => {
    try {
      setProcessing(true);
      await api.put(`/trades/instant/${tradeId}/accounting-approve`);
      toast.success('معامله تایید و تکمیل شد');
      fetchDashboardData();
      if (showDetailsModal) {
        setShowDetailsModal(false);
        setSelectedTrade(null);
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در تایید معامله');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectTrade = async () => {
    if (!rejectReason.trim()) {
      toast.error('لطفا دلیل رد را وارد کنید');
      return;
    }
    try {
      setProcessing(true);
      await api.put(`/trades/instant/${selectedTrade._id}/accounting-reject`, { reason: rejectReason });
      toast.success('معامله رد شد');
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedTrade(null);
      fetchDashboardData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در رد معامله');
    } finally {
      setProcessing(false);
    }
  };

  const openDetailsModal = async (trade) => {
    setSelectedTrade(trade);
    setShowDetailsModal(true);
    try {
      const res = await api.get(`/receipts?tradeId=${trade._id}`);
      setTradeReceipts(res.data.data || []);
    } catch (error) {
      setTradeReceipts([]);
    }
  };

  // Wallet Actions
  const handleSelectCustomer = async (customer) => {
    setSelectedCustomer(customer);
    await fetchCustomerWallets(customer._id);
  };

  const openModal = (type) => {
    setModalType(type);
    setAmount('');
    setDescription('');
    setSelectedCurrency('');
    setShowModal(true);
  };

  const handleAction = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('لطفا مبلغ معتبر وارد کنید');
      return;
    }

    if (['currencyDeposit', 'currencyWithdraw'].includes(modalType) && !selectedCurrency) {
      toast.error('ارز را انتخاب کنید');
      return;
    }

    try {
      setProcessing(true);
      const amountNum = parseFloat(amount);

      switch (modalType) {
        case 'deposit':
          await api.post('/wallets/deposit', { customerId: selectedCustomer._id, amount: amountNum, description });
          toast.success('واریز با موفقیت انجام شد');
          break;
        case 'withdraw':
          await api.post('/wallets/withdraw', { customerId: selectedCustomer._id, amount: amountNum, description });
          toast.success('برداشت با موفقیت انجام شد');
          break;
        case 'currencyDeposit':
          await api.post('/wallets/currency/deposit', { customerId: selectedCustomer._id, currencyId: selectedCurrency, amount: amountNum, description });
          toast.success('واریز ارز با موفقیت انجام شد');
          break;
        case 'currencyWithdraw':
          await api.post('/wallets/currency/withdraw', { customerId: selectedCustomer._id, currencyId: selectedCurrency, amount: amountNum, description });
          toast.success('برداشت ارز با موفقیت انجام شد');
          break;
        case 'creditIncrease':
          await api.post('/wallets/credit/increase', { customerId: selectedCustomer._id, amount: amountNum });
          toast.success('سقف اعتبار افزایش یافت');
          break;
        case 'creditDecrease':
          await api.post('/wallets/credit/decrease', { customerId: selectedCustomer._id, amount: amountNum });
          toast.success('سقف اعتبار کاهش یافت');
          break;
        case 'creditRepay':
          await api.post('/wallets/credit/repay', { customerId: selectedCustomer._id, amount: amountNum, description });
          toast.success('بازپرداخت ثبت شد');
          break;
      }

      setShowModal(false);
      await fetchCustomerWallets(selectedCustomer._id);
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در انجام عملیات');
    } finally {
      setProcessing(false);
    }
  };

  // Export Functions
  const exportToExcel = () => {
    toast.success('در حال آماده‌سازی فایل اکسل...');
    // TODO: Implement actual Excel export
  };

  // Helpers
  const formatNumber = (num) => new Intl.NumberFormat('fa-IR').format(num || 0);
  const formatDate = (date) => new Date(date).toLocaleDateString('fa-IR');
  const formatTime = (date) => new Date(date).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

  const getCurrencyIcon = (code) => {
    if (code === 'USD') return <FaDollarSign className="text-green-500" />;
    if (code === 'EUR') return <FaEuroSign className="text-blue-500" />;
    return <FaCoins className="text-gold" />;
  };

  const getStatusBadge = (status) => {
    const configs = {
      pending: { label: 'در انتظار', class: 'bg-yellow-500/20 text-yellow-500' },
      approved: { label: 'تایید شده', class: 'bg-blue-500/20 text-blue-500' },
      pending_collection: { label: 'در انتظار وصول', class: 'bg-orange-500/20 text-orange-500' },
      pending_accounting: { label: 'در انتظار حسابداری', class: 'bg-purple-500/20 text-purple-500' },
      completed: { label: 'تکمیل شده', class: 'bg-green-500/20 text-green-500' },
      rejected: { label: 'رد شده', class: 'bg-red-500/20 text-red-500' }
    };
    const config = configs[status] || { label: status, class: 'bg-dark-500/20 text-dark-400' };
    return <span className={`px-2 py-1 rounded-full text-xs ${config.class}`}>{config.label}</span>;
  };

  const modalTitles = {
    deposit: 'واریز ریال به کیف پول',
    withdraw: 'برداشت ریال از کیف پول',
    currencyDeposit: 'واریز ارز به کیف پول',
    currencyWithdraw: 'برداشت ارز از کیف پول',
    creditIncrease: 'افزایش سقف اعتبار',
    creditDecrease: 'کاهش سقف اعتبار',
    creditRepay: 'ثبت بازپرداخت اعتبار'
  };

  const filteredCustomers = customers.filter(c =>
    c.firstName?.includes(search) ||
    c.lastName?.includes(search) ||
    c.phone?.includes(search)
  );

  // Filter trades
  const filteredTrades = useMemo(() => {
    return allTrades.filter(trade => {
      if (tradeFilters.status !== 'all' && trade.status !== tradeFilters.status) return false;
      if (tradeFilters.type !== 'all') {
        const tradeType = trade.type || trade.side;
        if (tradeType !== tradeFilters.type) return false;
      }
      if (tradeFilters.search) {
        const searchLower = tradeFilters.search.toLowerCase();
        const customerName = `${trade.customer?.firstName || ''} ${trade.customer?.lastName || ''}`.toLowerCase();
        const tradeNumber = (trade.tradeNumber || '').toLowerCase();
        if (!customerName.includes(searchLower) && !tradeNumber.includes(searchLower)) return false;
      }
      return true;
    });
  }, [allTrades, tradeFilters]);

  // Get max value for chart scaling
  const maxChartValue = Math.max(...chartData.daily.map(d => d.count), 1);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <FaSpinner className="animate-spin text-gold text-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg">
              <FaCalculator className="text-white text-xl" />
            </div>
            پنل حسابداری پیشرفته
          </h1>
          <p className="text-dark-400 text-sm mt-1">گزارشات، تحلیل‌ها و مدیریت مالی کامل</p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={fetchDashboardData} className="btn-outline flex items-center gap-2">
            <FaSync />
            بروزرسانی
          </button>
          <button onClick={exportToExcel} className="btn-gold flex items-center gap-2">
            <FaFileExcel />
            خروجی اکسل
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-dark-800 p-1.5 gap-1 overflow-x-auto">
        {[
          { id: 'dashboard', label: 'داشبورد', icon: FaChartPie },
          { id: 'trades', label: 'تایید معاملات', icon: FaExchangeAlt, badge: pendingTrades.length },
          { id: 'wallets', label: 'کیف پول مشتریان', icon: FaWallet },
          { id: 'reports', label: 'گزارشات', icon: FaChartBar }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-gold to-amber-500 text-dark-900 font-bold shadow-lg'
                : 'text-dark-400 hover:text-white hover:bg-dark-700'
            }`}
          >
            <tab.icon />
            {tab.label}
            {tab.badge > 0 && (
              <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full animate-pulse">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Stats Cards Row 1 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-5 border-r-4 border-blue-500 bg-gradient-to-l from-blue-500/5 to-transparent">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-dark-400 text-sm">معاملات امروز</p>
                  <p className="text-3xl font-bold text-blue-500 mt-1">{formatNumber(dashboardStats.todayTrades)}</p>
                </div>
                <div className="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <FaExchangeAlt className="text-blue-500 text-2xl" />
                </div>
              </div>
            </div>

            <div className="card p-5 border-r-4 border-green-500 bg-gradient-to-l from-green-500/5 to-transparent">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-dark-400 text-sm">حجم امروز</p>
                  <p className="text-2xl font-bold text-green-500 mt-1">{formatNumber(dashboardStats.todayVolume)}</p>
                  <p className="text-dark-500 text-xs">ریال</p>
                </div>
                <div className="w-14 h-14 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <FaMoneyBillWave className="text-green-500 text-2xl" />
                </div>
              </div>
            </div>

            <div className="card p-5 border-r-4 border-purple-500 bg-gradient-to-l from-purple-500/5 to-transparent">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-dark-400 text-sm">در انتظار تایید</p>
                  <p className="text-3xl font-bold text-purple-500 mt-1">{formatNumber(dashboardStats.pendingTrades)}</p>
                </div>
                <div className="w-14 h-14 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <FaClock className="text-purple-500 text-2xl" />
                </div>
              </div>
            </div>

            <div className="card p-5 border-r-4 border-gold bg-gradient-to-l from-gold/5 to-transparent">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-dark-400 text-sm">درآمد کل</p>
                  <p className="text-2xl font-bold text-gold mt-1">{formatNumber(dashboardStats.totalRevenue)}</p>
                  <p className="text-dark-500 text-xs">ریال (کارمزد)</p>
                </div>
                <div className="w-14 h-14 rounded-xl bg-gold/20 flex items-center justify-center">
                  <FaCoins className="text-gold text-2xl" />
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards Row 2 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <FaArrowUp className="text-emerald-500 text-xl" />
              </div>
              <div>
                <p className="text-dark-400 text-sm">خرید</p>
                <p className="text-xl font-bold text-emerald-500">{formatNumber(dashboardStats.buyCount)}</p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <FaArrowDown className="text-red-500 text-xl" />
              </div>
              <div>
                <p className="text-dark-400 text-sm">فروش</p>
                <p className="text-xl font-bold text-red-500">{formatNumber(dashboardStats.sellCount)}</p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center">
                <FaUsers className="text-cyan-500 text-xl" />
              </div>
              <div>
                <p className="text-dark-400 text-sm">مشتریان فعال</p>
                <p className="text-xl font-bold text-cyan-500">{formatNumber(dashboardStats.activeCustomers)}</p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <FaCheck className="text-green-500 text-xl" />
              </div>
              <div>
                <p className="text-dark-400 text-sm">تکمیل شده</p>
                <p className="text-xl font-bold text-green-500">{formatNumber(dashboardStats.completedTrades)}</p>
              </div>
            </div>
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Chart */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <FaChartBar className="text-gold" />
                  نمودار معاملات ۷ روز اخیر
                </h3>
              </div>
              <div className="h-64 flex items-end gap-2">
                {chartData.daily.map((day, index) => (
                  <div key={index} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all hover:from-blue-400 hover:to-blue-300"
                      style={{ height: `${(day.count / maxChartValue) * 100}%`, minHeight: day.count > 0 ? '10px' : '2px' }}
                    >
                      {day.count > 0 && (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">{day.count}</span>
                        </div>
                      )}
                    </div>
                    <span className="text-dark-400 text-xs">{day.date}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Currency Breakdown */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <FaChartPie className="text-gold" />
                  توزیع ارزها
                </h3>
              </div>
              <div className="space-y-3">
                {chartData.currencyBreakdown.length === 0 ? (
                  <p className="text-dark-500 text-center py-8">داده‌ای موجود نیست</p>
                ) : (
                  chartData.currencyBreakdown.map((item, index) => {
                    const maxVolume = Math.max(...chartData.currencyBreakdown.map(c => c.volume));
                    const percentage = maxVolume > 0 ? (item.volume / maxVolume) * 100 : 0;
                    const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-cyan-500'];
                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-white flex items-center gap-2">
                            {getCurrencyIcon(item.currency)}
                            {item.currency}
                          </span>
                          <span className="text-dark-400">{formatNumber(item.count)} معامله</span>
                        </div>
                        <div className="h-3 bg-dark-700 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${colors[index % colors.length]} rounded-full transition-all`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <p className="text-dark-500 text-xs text-left">{formatNumber(item.volume)} ریال</p>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Top Customers */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-white font-bold flex items-center gap-2">
                <FaTrophy className="text-gold" />
                برترین مشتریان (بر اساس حجم معاملات)
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {chartData.customerTop.map((customer, index) => (
                <div key={index} className={`p-4 rounded-xl ${index === 0 ? 'bg-gold/10 border border-gold/30' : 'bg-dark-800'}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                      index === 0 ? 'bg-gold text-dark-900' :
                      index === 1 ? 'bg-gray-300 text-dark-900' :
                      index === 2 ? 'bg-orange-400 text-dark-900' :
                      'bg-dark-700 text-dark-400'
                    }`}>
                      {index + 1}
                    </span>
                    <span className="text-white text-sm font-medium truncate">{customer.name}</span>
                  </div>
                  <p className="text-dark-400 text-xs">{formatNumber(customer.count)} معامله</p>
                  <p className="text-gold font-bold text-sm">{formatNumber(customer.volume)} ریال</p>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Trades Quick Access */}
          {pendingTrades.length > 0 && (
            <div className="card p-6 border border-purple-500/30">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <FaClock className="text-purple-500" />
                  معاملات در انتظار تایید حسابداری
                  <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{pendingTrades.length}</span>
                </h3>
                <button onClick={() => setActiveTab('trades')} className="text-purple-400 text-sm hover:text-purple-300">
                  مشاهده همه
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-dark-800">
                    <tr>
                      <th className="text-right p-3 text-dark-400 text-sm">شماره</th>
                      <th className="text-right p-3 text-dark-400 text-sm">مشتری</th>
                      <th className="text-right p-3 text-dark-400 text-sm">نوع</th>
                      <th className="text-right p-3 text-dark-400 text-sm">مبلغ</th>
                      <th className="text-center p-3 text-dark-400 text-sm">عملیات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingTrades.slice(0, 5).map(trade => (
                      <tr key={trade._id} className="border-t border-dark-800">
                        <td className="p-3 text-gold text-sm">{trade.tradeNumber}</td>
                        <td className="p-3 text-white text-sm">{trade.customer?.firstName} {trade.customer?.lastName}</td>
                        <td className="p-3">
                          <span className={`flex items-center gap-1 text-sm ${trade.type === 'buy' || trade.side === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                            {trade.type === 'buy' || trade.side === 'buy' ? <FaArrowUp /> : <FaArrowDown />}
                            {trade.type === 'buy' || trade.side === 'buy' ? 'خرید' : 'فروش'}
                          </span>
                        </td>
                        <td className="p-3 text-white text-sm">{formatNumber(trade.totalAmount)} ریال</td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleApproveTrade(trade._id)} className="p-2 rounded-lg bg-green-500/20 text-green-500 hover:bg-green-500/30" title="تایید">
                              <FaCheck />
                            </button>
                            <button onClick={() => { setSelectedTrade(trade); setShowRejectModal(true); }} className="p-2 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30" title="رد">
                              <FaTimes />
                            </button>
                            <button onClick={() => openDetailsModal(trade)} className="p-2 rounded-lg bg-dark-700 text-dark-400 hover:text-white" title="جزئیات">
                              <FaEye />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trades Tab */}
      {activeTab === 'trades' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="card p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <FaSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400" />
                <input
                  type="text"
                  placeholder="جستجو..."
                  value={tradeFilters.search}
                  onChange={(e) => setTradeFilters({ ...tradeFilters, search: e.target.value })}
                  className="input w-full pr-10"
                />
              </div>
              <select
                value={tradeFilters.status}
                onChange={(e) => setTradeFilters({ ...tradeFilters, status: e.target.value })}
                className="input"
              >
                <option value="all">همه وضعیت‌ها</option>
                <option value="pending_accounting">در انتظار حسابداری</option>
                <option value="completed">تکمیل شده</option>
                <option value="rejected">رد شده</option>
              </select>
              <select
                value={tradeFilters.type}
                onChange={(e) => setTradeFilters({ ...tradeFilters, type: e.target.value })}
                className="input"
              >
                <option value="all">همه انواع</option>
                <option value="buy">خرید</option>
                <option value="sell">فروش</option>
              </select>
              <button onClick={fetchTrades} className="btn-gold flex items-center justify-center gap-2">
                <FaFilter />
                اعمال فیلتر
              </button>
            </div>
          </div>

          {/* Trades Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-dark-800">
                  <tr>
                    <th className="text-right p-4 text-dark-400 text-sm">شماره معامله</th>
                    <th className="text-right p-4 text-dark-400 text-sm">مشتری</th>
                    <th className="text-right p-4 text-dark-400 text-sm">نوع</th>
                    <th className="text-right p-4 text-dark-400 text-sm">ارز</th>
                    <th className="text-right p-4 text-dark-400 text-sm">مقدار</th>
                    <th className="text-right p-4 text-dark-400 text-sm">مبلغ کل</th>
                    <th className="text-right p-4 text-dark-400 text-sm">وضعیت</th>
                    <th className="text-right p-4 text-dark-400 text-sm">تاریخ</th>
                    <th className="text-center p-4 text-dark-400 text-sm">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {tradesLoading ? (
                    <tr>
                      <td colSpan="9" className="text-center p-8">
                        <FaSpinner className="animate-spin text-gold text-2xl mx-auto" />
                      </td>
                    </tr>
                  ) : filteredTrades.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center p-8 text-dark-500">معامله‌ای یافت نشد</td>
                    </tr>
                  ) : (
                    filteredTrades.map(trade => (
                      <tr key={trade._id} className="border-t border-dark-800 hover:bg-dark-800/30">
                        <td className="p-4 text-gold font-medium">{trade.tradeNumber}</td>
                        <td className="p-4">
                          {trade.isGroupTrade ? (
                            <div className="flex items-center gap-2">
                              <FaUserFriends className="text-purple-400" />
                              <span className="text-purple-400">{trade.sharedCustomer?.displayName || 'مشتری گروهی'}</span>
                            </div>
                          ) : (
                            <span className="text-white">{trade.customer?.firstName} {trade.customer?.lastName}</span>
                          )}
                        </td>
                        <td className="p-4">
                          <span className={`flex items-center gap-1 ${(trade.type || trade.side) === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                            {(trade.type || trade.side) === 'buy' ? <FaArrowUp /> : <FaArrowDown />}
                            {(trade.type || trade.side) === 'buy' ? 'خرید' : 'فروش'}
                          </span>
                        </td>
                        <td className="p-4 text-white">{trade.currency?.code}</td>
                        <td className="p-4 text-white">{formatNumber(trade.amount)}</td>
                        <td className="p-4 text-white font-bold">{formatNumber(trade.totalAmount)} ریال</td>
                        <td className="p-4">{getStatusBadge(trade.status)}</td>
                        <td className="p-4 text-dark-400 text-sm">{formatDate(trade.createdAt)}</td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-1">
                            {trade.status === 'pending_accounting' && (
                              <>
                                <button onClick={() => handleApproveTrade(trade._id)} className="p-2 rounded-lg bg-green-500/20 text-green-500 hover:bg-green-500/30" title="تایید">
                                  <FaCheck />
                                </button>
                                <button onClick={() => { setSelectedTrade(trade); setShowRejectModal(true); }} className="p-2 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30" title="رد">
                                  <FaTimes />
                                </button>
                              </>
                            )}
                            <button onClick={() => openDetailsModal(trade)} className="p-2 rounded-lg bg-dark-700 text-dark-400 hover:text-white" title="جزئیات">
                              <FaEye />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Wallets Tab */}
      {activeTab === 'wallets' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer List */}
          <div className="card p-4">
            <div className="mb-4">
              <div className="relative">
                <FaSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-dark-400" />
                <input
                  type="text"
                  placeholder="جستجوی مشتری..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="input w-full pr-10"
                />
              </div>
            </div>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filteredCustomers.map((customer) => (
                <div
                  key={customer._id}
                  onClick={() => handleSelectCustomer(customer)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedCustomer?._id === customer._id
                      ? 'bg-gold/20 border border-gold'
                      : 'bg-dark-800 hover:bg-dark-700'
                  }`}
                >
                  <p className="font-bold">{customer.firstName} {customer.lastName}</p>
                  <p className="text-dark-400 text-sm">{customer.phone}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Wallets */}
          <div className="lg:col-span-2 space-y-4">
            {selectedCustomer && customerWallets ? (
              <>
                <div className="card p-4 bg-dark-800/50">
                  <h2 className="font-bold text-lg">{selectedCustomer.firstName} {selectedCustomer.lastName}</h2>
                  <p className="text-dark-400 text-sm">{selectedCustomer.phone}</p>
                </div>

                {/* Cash Wallet */}
                <div className="card p-6 border-r-4 border-r-green-500">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                        <FaWallet className="text-green-500 text-xl" />
                      </div>
                      <div>
                        <h3 className="font-bold">کیف پول نقدی</h3>
                        <p className="text-2xl font-bold text-green-500">
                          {formatNumber(customerWallets.cash?.balance)} ریال
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openModal('deposit')} className="btn-gold px-3 py-2 flex items-center gap-1">
                        <FaPlus /> واریز
                      </button>
                      <button onClick={() => openModal('withdraw')} className="btn-outline px-3 py-2 flex items-center gap-1">
                        <FaMinus /> برداشت
                      </button>
                    </div>
                  </div>
                </div>

                {/* Currency Balances */}
                <div className="card p-6 border-r-4 border-r-yellow-500">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                        <FaCoins className="text-yellow-500 text-xl" />
                      </div>
                      <h3 className="font-bold">موجودی ارزها</h3>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openModal('currencyDeposit')} className="btn-gold px-3 py-2 flex items-center gap-1 text-sm">
                        <FaPlus /> واریز
                      </button>
                      <button onClick={() => openModal('currencyWithdraw')} className="btn-outline px-3 py-2 flex items-center gap-1 text-sm">
                        <FaMinus /> برداشت
                      </button>
                    </div>
                  </div>
                  {currencyBalances.length === 0 ? (
                    <p className="text-dark-400 text-center py-4">موجودی ارزی ندارد</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {currencyBalances.map((cb, index) => (
                        <div key={index} className="bg-dark-800 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            {getCurrencyIcon(cb.currencyCode)}
                            <span className="font-medium">{cb.currencyCode}</span>
                          </div>
                          <p className="text-gold font-bold">{formatNumber(cb.amount)}</p>
                          <p className="text-dark-500 text-xs">{formatNumber(cb.rialValue)} ریال</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Credit Wallet */}
                <div className="card p-6 border-r-4 border-r-gold">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gold/20 rounded-full flex items-center justify-center">
                        <FaCreditCard className="text-gold text-xl" />
                      </div>
                      <div>
                        <h3 className="font-bold">اعتبار</h3>
                        <div className="flex gap-4 mt-2">
                          <div>
                            <p className="text-dark-400 text-xs">سقف</p>
                            <p className="font-bold text-gold">{formatNumber(customerWallets.credit?.creditLimit)}</p>
                          </div>
                          <div>
                            <p className="text-dark-400 text-xs">مصرف‌شده</p>
                            <p className="font-bold text-red-500">{formatNumber(customerWallets.credit?.usedCredit)}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => openModal('creditIncrease')} className="btn-gold px-3 py-2 flex items-center gap-1 text-sm">
                      <FaPlus /> افزایش سقف
                    </button>
                    <button onClick={() => openModal('creditRepay')} className="bg-green-500/20 text-green-500 px-3 py-2 rounded flex items-center gap-1 text-sm hover:bg-green-500/30">
                      <FaHistory /> بازپرداخت
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="card p-10 text-center text-dark-400">
                <FaUsers className="text-4xl mx-auto mb-4 opacity-50" />
                <p>یک مشتری را انتخاب کنید</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="card p-6 text-center">
            <FaChartBar className="text-5xl text-gold mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">گزارشات پیشرفته</h3>
            <p className="text-dark-400">این بخش در نسخه بعدی فعال می‌شود</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
              <div className="bg-dark-800 rounded-xl p-4">
                <FaFileExcel className="text-green-500 text-2xl mx-auto mb-2" />
                <p className="text-sm text-dark-400">گزارش اکسل معاملات</p>
              </div>
              <div className="bg-dark-800 rounded-xl p-4">
                <FaFilePdf className="text-red-500 text-2xl mx-auto mb-2" />
                <p className="text-sm text-dark-400">گزارش PDF مالی</p>
              </div>
              <div className="bg-dark-800 rounded-xl p-4">
                <FaChartLine className="text-blue-500 text-2xl mx-auto mb-2" />
                <p className="text-sm text-dark-400">نمودار روند سود</p>
              </div>
              <div className="bg-dark-800 rounded-xl p-4">
                <FaChartPie className="text-purple-500 text-2xl mx-auto mb-2" />
                <p className="text-sm text-dark-400">تحلیل ارزها</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedTrade && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowRejectModal(false)}>
          <div className="card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4 text-red-500">رد معامله</h2>
            <div className="bg-dark-800 rounded-lg p-4 mb-4">
              <p className="text-dark-400 text-sm">شماره معامله:</p>
              <p className="text-gold font-bold">{selectedTrade.tradeNumber}</p>
            </div>
            <div>
              <label className="block text-dark-300 mb-2">دلیل رد *</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="input w-full"
                rows="3"
                placeholder="دلیل رد معامله را وارد کنید..."
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowRejectModal(false); setRejectReason(''); }} className="btn-outline flex-1">انصراف</button>
              <button onClick={handleRejectTrade} disabled={processing} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex-1 flex items-center justify-center gap-2">
                {processing ? <FaSpinner className="animate-spin" /> : <FaTimes />}
                رد معامله
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="card p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold mb-4">{modalTitles[modalType]}</h2>
            <div className="space-y-4">
              {['currencyDeposit', 'currencyWithdraw'].includes(modalType) && (
                <div>
                  <label className="block text-dark-400 text-sm mb-2">انتخاب ارز</label>
                  <select className="input w-full" value={selectedCurrency} onChange={(e) => setSelectedCurrency(e.target.value)}>
                    <option value="">انتخاب کنید...</option>
                    {currencies.map(c => (
                      <option key={c._id} value={c._id}>{c.nameFa} ({c.code})</option>
                    ))}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-dark-400 text-sm mb-2">
                  {['currencyDeposit', 'currencyWithdraw'].includes(modalType) ? 'مقدار' : 'مبلغ (ریال)'}
                </label>
                <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="input w-full" />
              </div>
              {['deposit', 'withdraw', 'creditRepay', 'currencyDeposit', 'currencyWithdraw'].includes(modalType) && (
                <div>
                  <label className="block text-dark-400 text-sm mb-2">توضیحات</label>
                  <input type="text" value={description} onChange={(e) => setDescription(e.target.value)} className="input w-full" />
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="btn-outline flex-1">انصراف</button>
              <button onClick={handleAction} disabled={processing} className="btn-gold flex-1">
                {processing ? <FaSpinner className="animate-spin mx-auto" /> : 'تایید'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetailsModal && selectedTrade && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => { setShowDetailsModal(false); setSelectedTrade(null); }}>
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-dark-800 sticky top-0 bg-dark-900">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FaEye className="text-gold" />
                جزئیات معامله
              </h2>
              <button onClick={() => { setShowDetailsModal(false); setSelectedTrade(null); }} className="text-dark-400 hover:text-white">
                <FaTimes />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-dark-800 rounded-lg p-4">
                <h3 className="text-gold font-bold mb-3 flex items-center gap-2">
                  <FaExchangeAlt />
                  اطلاعات معامله
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-dark-500">شماره:</span>
                    <p className="text-gold font-bold">{selectedTrade.tradeNumber}</p>
                  </div>
                  <div>
                    <span className="text-dark-500">نوع:</span>
                    <p className={(selectedTrade.type || selectedTrade.side) === 'buy' ? 'text-green-500' : 'text-red-500'}>
                      {(selectedTrade.type || selectedTrade.side) === 'buy' ? 'خرید' : 'فروش'}
                    </p>
                  </div>
                  <div>
                    <span className="text-dark-500">ارز:</span>
                    <p className="text-white">{selectedTrade.currency?.nameFa}</p>
                  </div>
                  <div>
                    <span className="text-dark-500">مقدار:</span>
                    <p className="text-white font-bold">{formatNumber(selectedTrade.amount)}</p>
                  </div>
                  <div>
                    <span className="text-dark-500">نرخ:</span>
                    <p className="text-white">{formatNumber(selectedTrade.rate)} ریال</p>
                  </div>
                  <div>
                    <span className="text-dark-500">مبلغ کل:</span>
                    <p className="text-green-500 font-bold">{formatNumber(selectedTrade.totalAmount)} ریال</p>
                  </div>
                </div>
              </div>

              {/* Receipts */}
              <div className="bg-dark-800 rounded-lg p-4">
                <h3 className="text-gold font-bold mb-3 flex items-center gap-2">
                  <FaReceipt />
                  رسیدها
                </h3>
                {tradeReceipts.length === 0 ? (
                  <p className="text-dark-500 text-center py-4">رسیدی ثبت نشده</p>
                ) : (
                  <div className="space-y-2">
                    {tradeReceipts.map((receipt, index) => (
                      <div key={index} className="bg-dark-700 rounded-lg p-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-dark-400">{receipt.type === 'rial' ? 'ریالی' : 'ارزی'}</span>
                          <span className="text-white font-bold">{formatNumber(receipt.amount)}</span>
                        </div>
                        {receipt.bankTrackingNumber && (
                          <p className="text-gold text-xs mt-1">پیگیری: {receipt.bankTrackingNumber}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {selectedTrade.status === 'pending_accounting' && (
              <div className="p-4 border-t border-dark-800 flex gap-3">
                <button onClick={() => handleApproveTrade(selectedTrade._id)} disabled={processing} className="flex-1 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-bold flex items-center justify-center gap-2">
                  {processing ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                  تایید و تکمیل
                </button>
                <button onClick={() => { setShowDetailsModal(false); setShowRejectModal(true); }} className="flex-1 py-2 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30 font-bold">
                  رد معامله
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Accountant;
