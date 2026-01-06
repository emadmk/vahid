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
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard | trades | receipts | wallets | reports
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('today'); // today | week | month | custom
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

  // Receipts
  const [receipts, setReceipts] = useState([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [receiptFilters, setReceiptFilters] = useState({
    status: 'all',
    type: 'all',
    search: '',
    dateFrom: '',
    dateTo: ''
  });
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  // Reports
  const [reportType, setReportType] = useState('daily'); // daily | weekly | monthly | custom
  const [reportData, setReportData] = useState(null);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [reportDateFrom, setReportDateFrom] = useState('');
  const [reportDateTo, setReportDateTo] = useState('');

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
    } else if (activeTab === 'receipts') {
      fetchReceipts();
    } else if (activeTab === 'wallets') {
      fetchCustomers();
      fetchCurrencies();
    } else if (activeTab === 'reports') {
      generateReport();
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

  // Fetch Receipts
  const fetchReceipts = async () => {
    setReceiptsLoading(true);
    try {
      const params = { limit: 500 };
      if (receiptFilters.status !== 'all') params.status = receiptFilters.status;
      if (receiptFilters.type !== 'all') params.type = receiptFilters.type;

      const res = await api.get('/receipts', { params });
      setReceipts(res.data.data || []);
    } catch (error) {
      console.error('Error fetching receipts:', error);
      setReceipts([]);
    } finally {
      setReceiptsLoading(false);
    }
  };

  // Generate Reports
  const generateReport = async () => {
    setReportsLoading(true);
    try {
      const now = new Date();
      let fromDate, toDate;

      if (reportType === 'daily') {
        fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      } else if (reportType === 'weekly') {
        fromDate = new Date(now);
        fromDate.setDate(fromDate.getDate() - 7);
        toDate = now;
      } else if (reportType === 'monthly') {
        fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
        toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      } else if (reportType === 'custom' && reportDateFrom && reportDateTo) {
        fromDate = new Date(reportDateFrom);
        toDate = new Date(reportDateTo);
        toDate.setDate(toDate.getDate() + 1);
      } else {
        fromDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        toDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      }

      const [tradesRes, receiptsRes] = await Promise.all([
        api.get('/trades/sarafi/instant-trades', { params: { limit: 1000 } }),
        api.get('/receipts', { params: { limit: 1000 } })
      ]);

      const allTrades = tradesRes.data.trades || tradesRes.data.data || [];
      const allReceipts = receiptsRes.data.data || [];

      // Filter by date
      const filteredTrades = allTrades.filter(t => {
        const date = new Date(t.createdAt);
        return date >= fromDate && date < toDate;
      });

      const filteredReceipts = allReceipts.filter(r => {
        const date = new Date(r.createdAt);
        return date >= fromDate && date < toDate;
      });

      // Calculate stats
      const buyTrades = filteredTrades.filter(t => t.type === 'buy' || t.side === 'buy');
      const sellTrades = filteredTrades.filter(t => t.type === 'sell' || t.side === 'sell');
      const completedTrades = filteredTrades.filter(t => t.status === 'completed');
      const pendingTrades = filteredTrades.filter(t => ['pending', 'approved', 'pending_collection', 'pending_accounting'].includes(t.status));
      const rejectedTrades = filteredTrades.filter(t => t.status === 'rejected');

      // Currency breakdown
      const currencyBreakdown = {};
      filteredTrades.forEach(t => {
        const code = t.currency?.code || 'نامشخص';
        if (!currencyBreakdown[code]) {
          currencyBreakdown[code] = { count: 0, volume: 0, buyCount: 0, sellCount: 0, buyVolume: 0, sellVolume: 0 };
        }
        currencyBreakdown[code].count++;
        currencyBreakdown[code].volume += t.totalAmount || 0;
        if (t.type === 'buy' || t.side === 'buy') {
          currencyBreakdown[code].buyCount++;
          currencyBreakdown[code].buyVolume += t.totalAmount || 0;
        } else {
          currencyBreakdown[code].sellCount++;
          currencyBreakdown[code].sellVolume += t.totalAmount || 0;
        }
      });

      // Daily breakdown for chart
      const dailyBreakdown = {};
      filteredTrades.forEach(t => {
        const dateKey = new Date(t.createdAt).toLocaleDateString('fa-IR');
        if (!dailyBreakdown[dateKey]) {
          dailyBreakdown[dateKey] = { count: 0, volume: 0, profit: 0 };
        }
        dailyBreakdown[dateKey].count++;
        dailyBreakdown[dateKey].volume += t.totalAmount || 0;
        dailyBreakdown[dateKey].profit += t.commission?.amount || 0;
      });

      // Customer stats
      const customerStats = {};
      filteredTrades.forEach(t => {
        const customerId = t.customer?._id || 'unknown';
        if (!customerStats[customerId]) {
          customerStats[customerId] = {
            name: `${t.customer?.firstName || ''} ${t.customer?.lastName || ''}`.trim() || 'نامشخص',
            phone: t.customer?.phone || '',
            count: 0,
            volume: 0,
            profit: 0
          };
        }
        customerStats[customerId].count++;
        customerStats[customerId].volume += t.totalAmount || 0;
        customerStats[customerId].profit += t.commission?.amount || 0;
      });
      const topCustomers = Object.values(customerStats).sort((a, b) => b.volume - a.volume).slice(0, 10);

      setReportData({
        period: {
          from: fromDate.toLocaleDateString('fa-IR'),
          to: new Date(toDate.getTime() - 86400000).toLocaleDateString('fa-IR'),
          type: reportType
        },
        summary: {
          totalTrades: filteredTrades.length,
          completedTrades: completedTrades.length,
          pendingTrades: pendingTrades.length,
          rejectedTrades: rejectedTrades.length,
          totalVolume: filteredTrades.reduce((sum, t) => sum + (t.totalAmount || 0), 0),
          totalProfit: filteredTrades.reduce((sum, t) => sum + (t.commission?.amount || 0), 0),
          buyCount: buyTrades.length,
          sellCount: sellTrades.length,
          buyVolume: buyTrades.reduce((sum, t) => sum + (t.totalAmount || 0), 0),
          sellVolume: sellTrades.reduce((sum, t) => sum + (t.totalAmount || 0), 0),
          totalReceipts: filteredReceipts.length,
          receiptVolume: filteredReceipts.reduce((sum, r) => sum + (r.amount || 0), 0)
        },
        currencyBreakdown: Object.entries(currencyBreakdown).map(([code, data]) => ({
          currency: code,
          ...data
        })),
        dailyBreakdown: Object.entries(dailyBreakdown).map(([date, data]) => ({
          date,
          ...data
        })),
        topCustomers,
        trades: filteredTrades,
        receipts: filteredReceipts
      });
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('خطا در تولید گزارش');
    } finally {
      setReportsLoading(false);
    }
  };

  // Export to Excel
  const exportReportToExcel = () => {
    if (!reportData) {
      toast.error('ابتدا گزارش را تولید کنید');
      return;
    }

    // Create CSV content
    let csvContent = '\uFEFF'; // BOM for UTF-8
    csvContent += 'گزارش حسابداری\n';
    csvContent += `دوره: ${reportData.period.from} تا ${reportData.period.to}\n\n`;

    csvContent += 'خلاصه گزارش\n';
    csvContent += `کل معاملات,${reportData.summary.totalTrades}\n`;
    csvContent += `تکمیل شده,${reportData.summary.completedTrades}\n`;
    csvContent += `در انتظار,${reportData.summary.pendingTrades}\n`;
    csvContent += `رد شده,${reportData.summary.rejectedTrades}\n`;
    csvContent += `حجم کل,${reportData.summary.totalVolume}\n`;
    csvContent += `سود کل,${reportData.summary.totalProfit}\n`;
    csvContent += `تعداد خرید,${reportData.summary.buyCount}\n`;
    csvContent += `تعداد فروش,${reportData.summary.sellCount}\n\n`;

    csvContent += 'توزیع ارزها\n';
    csvContent += 'ارز,تعداد,حجم,خرید,فروش\n';
    reportData.currencyBreakdown.forEach(c => {
      csvContent += `${c.currency},${c.count},${c.volume},${c.buyCount},${c.sellCount}\n`;
    });
    csvContent += '\n';

    csvContent += 'برترین مشتریان\n';
    csvContent += 'نام,تلفن,تعداد معاملات,حجم,سود\n';
    reportData.topCustomers.forEach(c => {
      csvContent += `${c.name},${c.phone},${c.count},${c.volume},${c.profit}\n`;
    });

    // Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `گزارش-حسابداری-${reportData.period.from}-${reportData.period.to}.csv`;
    link.click();
    toast.success('فایل اکسل دانلود شد');
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
          { id: 'receipts', label: 'رسیدها', icon: FaReceipt },
          { id: 'wallets', label: 'کیف پول مشتریان', icon: FaWallet },
          { id: 'reports', label: 'گزارشات پیشرفته', icon: FaChartBar }
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

      {/* Receipts Tab */}
      {activeTab === 'receipts' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="card p-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative">
                <FaSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400" />
                <input
                  type="text"
                  placeholder="جستجوی شماره پیگیری..."
                  value={receiptFilters.search}
                  onChange={(e) => setReceiptFilters({ ...receiptFilters, search: e.target.value })}
                  className="input w-full pr-10"
                />
              </div>
              <select
                value={receiptFilters.status}
                onChange={(e) => setReceiptFilters({ ...receiptFilters, status: e.target.value })}
                className="input"
              >
                <option value="all">همه وضعیت‌ها</option>
                <option value="pending">در انتظار</option>
                <option value="approved">تایید شده</option>
                <option value="rejected">رد شده</option>
              </select>
              <select
                value={receiptFilters.type}
                onChange={(e) => setReceiptFilters({ ...receiptFilters, type: e.target.value })}
                className="input"
              >
                <option value="all">همه انواع</option>
                <option value="rial">ریالی</option>
                <option value="currency">ارزی</option>
              </select>
              <button onClick={fetchReceipts} className="btn-gold flex items-center justify-center gap-2">
                <FaFilter />
                اعمال فیلتر
              </button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-4 border-r-4 border-blue-500">
              <p className="text-dark-400 text-sm">کل رسیدها</p>
              <p className="text-2xl font-bold text-blue-500">{formatNumber(receipts.length)}</p>
            </div>
            <div className="card p-4 border-r-4 border-yellow-500">
              <p className="text-dark-400 text-sm">در انتظار</p>
              <p className="text-2xl font-bold text-yellow-500">
                {formatNumber(receipts.filter(r => r.status === 'pending').length)}
              </p>
            </div>
            <div className="card p-4 border-r-4 border-green-500">
              <p className="text-dark-400 text-sm">تایید شده</p>
              <p className="text-2xl font-bold text-green-500">
                {formatNumber(receipts.filter(r => r.status === 'approved').length)}
              </p>
            </div>
            <div className="card p-4 border-r-4 border-gold">
              <p className="text-dark-400 text-sm">مجموع مبالغ</p>
              <p className="text-xl font-bold text-gold">
                {formatNumber(receipts.reduce((sum, r) => sum + (r.amount || 0), 0))}
              </p>
              <p className="text-xs text-dark-500">ریال</p>
            </div>
          </div>

          {/* Receipts Table */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-dark-800">
                  <tr>
                    <th className="text-right p-4 text-dark-400 text-sm">شماره پیگیری</th>
                    <th className="text-right p-4 text-dark-400 text-sm">معامله</th>
                    <th className="text-right p-4 text-dark-400 text-sm">مشتری</th>
                    <th className="text-right p-4 text-dark-400 text-sm">نوع</th>
                    <th className="text-right p-4 text-dark-400 text-sm">مبلغ</th>
                    <th className="text-right p-4 text-dark-400 text-sm">وضعیت</th>
                    <th className="text-right p-4 text-dark-400 text-sm">تاریخ</th>
                    <th className="text-center p-4 text-dark-400 text-sm">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {receiptsLoading ? (
                    <tr>
                      <td colSpan="8" className="text-center p-8">
                        <FaSpinner className="animate-spin text-gold text-2xl mx-auto" />
                      </td>
                    </tr>
                  ) : receipts.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center p-8 text-dark-500">رسیدی یافت نشد</td>
                    </tr>
                  ) : (
                    receipts
                      .filter(r => {
                        if (receiptFilters.search && !r.bankTrackingNumber?.includes(receiptFilters.search)) return false;
                        return true;
                      })
                      .map(receipt => (
                        <tr key={receipt._id} className="border-t border-dark-800 hover:bg-dark-800/30">
                          <td className="p-4 text-gold font-medium">{receipt.bankTrackingNumber || '-'}</td>
                          <td className="p-4 text-white text-sm">{receipt.trade?.tradeNumber || '-'}</td>
                          <td className="p-4 text-white">
                            {receipt.customer?.firstName} {receipt.customer?.lastName}
                          </td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-lg text-xs ${receipt.type === 'rial' ? 'bg-green-500/20 text-green-500' : 'bg-blue-500/20 text-blue-500'}`}>
                              {receipt.type === 'rial' ? 'ریالی' : 'ارزی'}
                            </span>
                          </td>
                          <td className="p-4 text-white font-bold">{formatNumber(receipt.amount)}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              receipt.status === 'approved' ? 'bg-green-500/20 text-green-500' :
                              receipt.status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                              'bg-yellow-500/20 text-yellow-500'
                            }`}>
                              {receipt.status === 'approved' ? 'تایید شده' : receipt.status === 'rejected' ? 'رد شده' : 'در انتظار'}
                            </span>
                          </td>
                          <td className="p-4 text-dark-400 text-sm">{formatDate(receipt.createdAt)}</td>
                          <td className="p-4">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setSelectedReceipt(receipt)}
                                className="p-2 rounded-lg bg-dark-700 text-dark-400 hover:text-white"
                                title="جزئیات"
                              >
                                <FaEye />
                              </button>
                              {receipt.imageUrl && (
                                <a
                                  href={receipt.imageUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 rounded-lg bg-blue-500/20 text-blue-500 hover:bg-blue-500/30"
                                  title="مشاهده تصویر"
                                >
                                  <FaFileImage />
                                </a>
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
        </div>
      )}

      {/* Receipt Detail Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setSelectedReceipt(null)}>
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-dark-800 sticky top-0 bg-dark-900">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FaReceipt className="text-gold" />
                جزئیات رسید
              </h2>
              <button onClick={() => setSelectedReceipt(null)} className="text-dark-400 hover:text-white">
                <FaTimes />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="bg-dark-800 rounded-lg p-3">
                  <span className="text-dark-500">شماره پیگیری</span>
                  <p className="text-gold font-bold">{selectedReceipt.bankTrackingNumber || '-'}</p>
                </div>
                <div className="bg-dark-800 rounded-lg p-3">
                  <span className="text-dark-500">نوع</span>
                  <p className="text-white">{selectedReceipt.type === 'rial' ? 'ریالی' : 'ارزی'}</p>
                </div>
                <div className="bg-dark-800 rounded-lg p-3">
                  <span className="text-dark-500">مبلغ</span>
                  <p className="text-green-500 font-bold">{formatNumber(selectedReceipt.amount)}</p>
                </div>
                <div className="bg-dark-800 rounded-lg p-3">
                  <span className="text-dark-500">وضعیت</span>
                  <p className={selectedReceipt.status === 'approved' ? 'text-green-500' : selectedReceipt.status === 'rejected' ? 'text-red-500' : 'text-yellow-500'}>
                    {selectedReceipt.status === 'approved' ? 'تایید شده' : selectedReceipt.status === 'rejected' ? 'رد شده' : 'در انتظار'}
                  </p>
                </div>
              </div>
              {selectedReceipt.trade && (
                <div className="bg-dark-800 rounded-lg p-3">
                  <span className="text-dark-500 text-sm">معامله مرتبط</span>
                  <p className="text-gold">{selectedReceipt.trade.tradeNumber}</p>
                </div>
              )}
              {selectedReceipt.description && (
                <div className="bg-dark-800 rounded-lg p-3">
                  <span className="text-dark-500 text-sm">توضیحات</span>
                  <p className="text-white">{selectedReceipt.description}</p>
                </div>
              )}
              {selectedReceipt.imageUrl && (
                <div className="bg-dark-800 rounded-lg p-3">
                  <span className="text-dark-500 text-sm mb-2 block">تصویر رسید</span>
                  <img
                    src={selectedReceipt.imageUrl}
                    alt="تصویر رسید"
                    className="w-full rounded-lg max-h-64 object-contain"
                  />
                </div>
              )}
              <div className="text-dark-500 text-xs text-center">
                {formatDate(selectedReceipt.createdAt)} - {formatTime(selectedReceipt.createdAt)}
              </div>
            </div>
            <div className="p-4 border-t border-dark-800">
              <button onClick={() => setSelectedReceipt(null)} className="btn-outline w-full">
                بستن
              </button>
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
          {/* Report Controls */}
          <div className="card p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <FaCalendarAlt className="text-gold" />
                <span className="text-white font-medium">دوره گزارش:</span>
              </div>
              <div className="flex rounded-lg bg-dark-800 p-1 gap-1">
                {[
                  { id: 'daily', label: 'روزانه' },
                  { id: 'weekly', label: 'هفتگی' },
                  { id: 'monthly', label: 'ماهانه' },
                  { id: 'custom', label: 'دلخواه' }
                ].map(type => (
                  <button
                    key={type.id}
                    onClick={() => setReportType(type.id)}
                    className={`px-4 py-2 rounded-md text-sm transition-all ${
                      reportType === type.id
                        ? 'bg-gold text-dark-900 font-bold'
                        : 'text-dark-400 hover:text-white'
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
              {reportType === 'custom' && (
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={reportDateFrom}
                    onChange={(e) => setReportDateFrom(e.target.value)}
                    className="input text-sm"
                  />
                  <span className="text-dark-400">تا</span>
                  <input
                    type="date"
                    value={reportDateTo}
                    onChange={(e) => setReportDateTo(e.target.value)}
                    className="input text-sm"
                  />
                </div>
              )}
              <button onClick={generateReport} className="btn-gold flex items-center gap-2">
                <FaSync className={reportsLoading ? 'animate-spin' : ''} />
                تولید گزارش
              </button>
              <button onClick={exportReportToExcel} disabled={!reportData} className="btn-outline flex items-center gap-2">
                <FaFileExcel />
                خروجی اکسل
              </button>
            </div>
          </div>

          {reportsLoading ? (
            <div className="card p-10 text-center">
              <FaSpinner className="animate-spin text-gold text-4xl mx-auto mb-4" />
              <p className="text-dark-400">در حال تولید گزارش...</p>
            </div>
          ) : reportData ? (
            <>
              {/* Report Header */}
              <div className="card p-4 bg-gradient-to-l from-gold/10 to-transparent border border-gold/30">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white">گزارش حسابداری</h3>
                    <p className="text-dark-400">
                      از {reportData.period.from} تا {reportData.period.to}
                    </p>
                  </div>
                  <div className="text-left">
                    <span className="text-dark-500 text-sm">نوع گزارش:</span>
                    <p className="text-gold font-bold">
                      {reportType === 'daily' ? 'روزانه' : reportType === 'weekly' ? 'هفتگی' : reportType === 'monthly' ? 'ماهانه' : 'بازه دلخواه'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="card p-5 border-r-4 border-blue-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-dark-400 text-sm">کل معاملات</p>
                      <p className="text-3xl font-bold text-blue-500">{formatNumber(reportData.summary.totalTrades)}</p>
                    </div>
                    <FaExchangeAlt className="text-blue-500 text-2xl opacity-50" />
                  </div>
                </div>
                <div className="card p-5 border-r-4 border-green-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-dark-400 text-sm">تکمیل شده</p>
                      <p className="text-3xl font-bold text-green-500">{formatNumber(reportData.summary.completedTrades)}</p>
                    </div>
                    <FaCheck className="text-green-500 text-2xl opacity-50" />
                  </div>
                </div>
                <div className="card p-5 border-r-4 border-yellow-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-dark-400 text-sm">در انتظار</p>
                      <p className="text-3xl font-bold text-yellow-500">{formatNumber(reportData.summary.pendingTrades)}</p>
                    </div>
                    <FaClock className="text-yellow-500 text-2xl opacity-50" />
                  </div>
                </div>
                <div className="card p-5 border-r-4 border-red-500">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-dark-400 text-sm">رد شده</p>
                      <p className="text-3xl font-bold text-red-500">{formatNumber(reportData.summary.rejectedTrades)}</p>
                    </div>
                    <FaTimes className="text-red-500 text-2xl opacity-50" />
                  </div>
                </div>
              </div>

              {/* Volume & Profit Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="card p-6 bg-gradient-to-l from-emerald-500/10 to-transparent">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                      <FaMoneyBillWave className="text-emerald-500 text-2xl" />
                    </div>
                    <div>
                      <p className="text-dark-400 text-sm">حجم کل معاملات</p>
                      <p className="text-2xl font-bold text-emerald-500">{formatNumber(reportData.summary.totalVolume)}</p>
                      <p className="text-dark-500 text-xs">ریال</p>
                    </div>
                  </div>
                </div>
                <div className="card p-6 bg-gradient-to-l from-gold/10 to-transparent">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gold/20 flex items-center justify-center">
                      <FaCoins className="text-gold text-2xl" />
                    </div>
                    <div>
                      <p className="text-dark-400 text-sm">سود (کارمزد)</p>
                      <p className="text-2xl font-bold text-gold">{formatNumber(reportData.summary.totalProfit)}</p>
                      <p className="text-dark-500 text-xs">ریال</p>
                    </div>
                  </div>
                </div>
                <div className="card p-6 bg-gradient-to-l from-purple-500/10 to-transparent">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-purple-500/20 flex items-center justify-center">
                      <FaReceipt className="text-purple-500 text-2xl" />
                    </div>
                    <div>
                      <p className="text-dark-400 text-sm">رسیدها</p>
                      <p className="text-2xl font-bold text-purple-500">{formatNumber(reportData.summary.totalReceipts)}</p>
                      <p className="text-dark-500 text-xs">{formatNumber(reportData.summary.receiptVolume)} ریال</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Buy/Sell Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-white font-bold flex items-center gap-2">
                      <FaArrowUp className="text-green-500" />
                      خرید
                    </h4>
                    <span className="text-green-500 font-bold">{formatNumber(reportData.summary.buyCount)} معامله</span>
                  </div>
                  <div className="bg-dark-800 rounded-lg p-3">
                    <p className="text-dark-400 text-sm">حجم خرید</p>
                    <p className="text-xl font-bold text-green-500">{formatNumber(reportData.summary.buyVolume)} ریال</p>
                  </div>
                  <div className="mt-3 h-3 bg-dark-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-l from-green-500 to-green-400 rounded-full"
                      style={{
                        width: `${reportData.summary.totalTrades > 0 ? (reportData.summary.buyCount / reportData.summary.totalTrades) * 100 : 0}%`
                      }}
                    />
                  </div>
                </div>
                <div className="card p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-white font-bold flex items-center gap-2">
                      <FaArrowDown className="text-red-500" />
                      فروش
                    </h4>
                    <span className="text-red-500 font-bold">{formatNumber(reportData.summary.sellCount)} معامله</span>
                  </div>
                  <div className="bg-dark-800 rounded-lg p-3">
                    <p className="text-dark-400 text-sm">حجم فروش</p>
                    <p className="text-xl font-bold text-red-500">{formatNumber(reportData.summary.sellVolume)} ریال</p>
                  </div>
                  <div className="mt-3 h-3 bg-dark-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-l from-red-500 to-red-400 rounded-full"
                      style={{
                        width: `${reportData.summary.totalTrades > 0 ? (reportData.summary.sellCount / reportData.summary.totalTrades) * 100 : 0}%`
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Daily Chart */}
                {reportData.dailyBreakdown.length > 0 && (
                  <div className="card p-6">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-white font-bold flex items-center gap-2">
                        <FaChartBar className="text-gold" />
                        نمودار معاملات روزانه
                      </h3>
                    </div>
                    <div className="h-64 flex items-end gap-2">
                      {reportData.dailyBreakdown.map((day, index) => {
                        const maxCount = Math.max(...reportData.dailyBreakdown.map(d => d.count), 1);
                        return (
                          <div key={index} className="flex-1 flex flex-col items-center gap-2">
                            <div
                              className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all hover:from-blue-400 hover:to-blue-300"
                              style={{ height: `${(day.count / maxCount) * 100}%`, minHeight: day.count > 0 ? '10px' : '2px' }}
                            >
                              {day.count > 0 && (
                                <div className="w-full h-full flex items-center justify-center">
                                  <span className="text-white text-xs font-bold">{day.count}</span>
                                </div>
                              )}
                            </div>
                            <span className="text-dark-400 text-xs truncate max-w-full">{day.date}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Currency Breakdown */}
                <div className="card p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-white font-bold flex items-center gap-2">
                      <FaChartPie className="text-gold" />
                      توزیع ارزها
                    </h3>
                  </div>
                  {reportData.currencyBreakdown.length === 0 ? (
                    <p className="text-dark-500 text-center py-8">داده‌ای موجود نیست</p>
                  ) : (
                    <div className="space-y-4">
                      {reportData.currencyBreakdown.map((item, index) => {
                        const maxVolume = Math.max(...reportData.currencyBreakdown.map(c => c.volume), 1);
                        const percentage = (item.volume / maxVolume) * 100;
                        const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-cyan-500'];
                        return (
                          <div key={index} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-white flex items-center gap-2">
                                {getCurrencyIcon(item.currency)}
                                {item.currency}
                              </span>
                              <div className="flex items-center gap-4">
                                <span className="text-green-500 text-xs">خرید: {item.buyCount}</span>
                                <span className="text-red-500 text-xs">فروش: {item.sellCount}</span>
                                <span className="text-dark-400">{formatNumber(item.count)} معامله</span>
                              </div>
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
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Top Customers */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-white font-bold flex items-center gap-2">
                    <FaTrophy className="text-gold" />
                    برترین مشتریان در این دوره
                  </h3>
                  <span className="text-dark-500 text-sm">{reportData.topCustomers.length} مشتری</span>
                </div>
                {reportData.topCustomers.length === 0 ? (
                  <p className="text-dark-500 text-center py-8">مشتری‌ای در این دوره یافت نشد</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-dark-800">
                        <tr>
                          <th className="text-right p-3 text-dark-400 text-sm">رتبه</th>
                          <th className="text-right p-3 text-dark-400 text-sm">نام</th>
                          <th className="text-right p-3 text-dark-400 text-sm">تلفن</th>
                          <th className="text-right p-3 text-dark-400 text-sm">تعداد معاملات</th>
                          <th className="text-right p-3 text-dark-400 text-sm">حجم</th>
                          <th className="text-right p-3 text-dark-400 text-sm">سود</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.topCustomers.map((customer, index) => (
                          <tr key={index} className="border-t border-dark-800 hover:bg-dark-800/30">
                            <td className="p-3">
                              <span className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                index === 0 ? 'bg-gold text-dark-900' :
                                index === 1 ? 'bg-gray-300 text-dark-900' :
                                index === 2 ? 'bg-orange-400 text-dark-900' :
                                'bg-dark-700 text-dark-400'
                              }`}>
                                {index + 1}
                              </span>
                            </td>
                            <td className="p-3 text-white font-medium">{customer.name}</td>
                            <td className="p-3 text-dark-400">{customer.phone}</td>
                            <td className="p-3 text-white">{formatNumber(customer.count)}</td>
                            <td className="p-3 text-gold font-bold">{formatNumber(customer.volume)} ریال</td>
                            <td className="p-3 text-green-500">{formatNumber(customer.profit)} ریال</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Print Section Info */}
              <div className="card p-4 text-center text-dark-500 text-sm">
                <p>این گزارش در تاریخ {new Date().toLocaleDateString('fa-IR')} ساعت {new Date().toLocaleTimeString('fa-IR')} تولید شده است.</p>
              </div>
            </>
          ) : (
            <div className="card p-10 text-center">
              <FaChartBar className="text-5xl text-dark-600 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-white mb-2">گزارش‌گیری</h3>
              <p className="text-dark-400 mb-6">دوره مورد نظر را انتخاب کرده و روی "تولید گزارش" کلیک کنید</p>
              <button onClick={generateReport} className="btn-gold mx-auto">
                <FaChartBar className="ml-2" />
                تولید گزارش اول
              </button>
            </div>
          )}
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
