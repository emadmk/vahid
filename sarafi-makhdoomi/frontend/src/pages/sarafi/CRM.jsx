import { useState, useEffect, useMemo } from 'react';
import {
  FaHeadset, FaUsers, FaExclamationTriangle, FaBell, FaCalendarAlt, FaHistory,
  FaPlus, FaEdit, FaTrash, FaTimes, FaCheck, FaSpinner, FaSearch, FaFilter,
  FaPhone, FaEnvelope, FaComment, FaStar, FaStarHalfAlt, FaRegStar, FaChartLine,
  FaUserClock, FaClipboardList, FaFire, FaChartPie, FaUserPlus, FaHandshake,
  FaSmile, FaMeh, FaFrown, FaAngry, FaGrinStars, FaChevronDown, FaChevronUp,
  FaFileExcel, FaClock, FaCheckCircle, FaTimesCircle, FaHourglassHalf, FaEye,
  FaUserTie, FaTags, FaThumbsUp, FaThumbsDown, FaReply, FaShare, FaPaperclip,
  FaCalendarCheck, FaPhoneAlt, FaVideo, FaSms, FaWhatsapp, FaTelegram, FaRocket,
  FaCrown, FaMedal, FaAward, FaGem, FaUserShield, FaChartBar, FaBullhorn
} from 'react-icons/fa';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const CRM = () => {
  // Main States
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [trades, setTrades] = useState([]);

  // Follow-ups
  const [followUps, setFollowUps] = useState([]);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [selectedCustomerForFollowUp, setSelectedCustomerForFollowUp] = useState(null);
  const [followUpForm, setFollowUpForm] = useState({
    type: 'call',
    dueDate: '',
    dueTime: '',
    priority: 'medium',
    note: '',
    reminder: true
  });

  // Complaints
  const [complaints, setComplaints] = useState([]);
  const [showComplaintModal, setShowComplaintModal] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [complaintForm, setComplaintForm] = useState({
    customer: '',
    category: 'service',
    priority: 'medium',
    subject: '',
    description: '',
    attachments: []
  });
  const [complaintResponse, setComplaintResponse] = useState('');

  // Notes & Activities
  const [notes, setNotes] = useState([]);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteForm, setNoteForm] = useState({ customer: '', content: '', type: 'general' });

  // Reminders
  const [reminders, setReminders] = useState([]);
  const [showReminderModal, setShowReminderModal] = useState(false);
  const [reminderForm, setReminderForm] = useState({
    title: '',
    description: '',
    dueDate: '',
    dueTime: '',
    type: 'general',
    repeat: 'none'
  });

  // Customer Satisfaction
  const [satisfactionScores, setSatisfactionScores] = useState([]);

  // Dashboard Stats
  const [stats, setStats] = useState({
    totalCustomers: 0,
    activeCustomers: 0,
    vipCustomers: 0,
    newCustomersThisMonth: 0,
    pendingFollowUps: 0,
    overdueFollowUps: 0,
    openComplaints: 0,
    resolvedComplaints: 0,
    avgSatisfaction: 0,
    churnRisk: 0,
    todayReminders: 0,
    customerGrowth: 0
  });

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    segment: 'all',
    status: 'all',
    period: 'all'
  });

  // Customer Segments
  const customerSegments = [
    { id: 'vip', label: 'VIP', icon: FaCrown, color: 'gold', minTrades: 50, minVolume: 1000000000 },
    { id: 'premium', label: 'ویژه', icon: FaGem, color: 'purple', minTrades: 20, minVolume: 500000000 },
    { id: 'regular', label: 'عادی', icon: FaUserTie, color: 'blue', minTrades: 5, minVolume: 100000000 },
    { id: 'new', label: 'جدید', icon: FaUserPlus, color: 'green', minTrades: 0, minVolume: 0 },
    { id: 'inactive', label: 'غیرفعال', icon: FaUserClock, color: 'gray', minTrades: 0, minVolume: 0 }
  ];

  const complaintCategories = [
    { id: 'service', label: 'کیفیت خدمات', icon: FaHeadset },
    { id: 'rate', label: 'نرخ و قیمت', icon: FaChartLine },
    { id: 'delay', label: 'تاخیر در انجام', icon: FaClock },
    { id: 'support', label: 'پشتیبانی', icon: FaPhone },
    { id: 'technical', label: 'مشکل فنی', icon: FaExclamationTriangle },
    { id: 'other', label: 'سایر', icon: FaComment }
  ];

  const priorityLevels = [
    { id: 'low', label: 'کم', color: 'green' },
    { id: 'medium', label: 'متوسط', color: 'yellow' },
    { id: 'high', label: 'زیاد', color: 'orange' },
    { id: 'critical', label: 'بحرانی', color: 'red' }
  ];

  const followUpTypes = [
    { id: 'call', label: 'تماس تلفنی', icon: FaPhoneAlt },
    { id: 'sms', label: 'پیامک', icon: FaSms },
    { id: 'whatsapp', label: 'واتساپ', icon: FaWhatsapp },
    { id: 'telegram', label: 'تلگرام', icon: FaTelegram },
    { id: 'email', label: 'ایمیل', icon: FaEnvelope },
    { id: 'meeting', label: 'جلسه حضوری', icon: FaHandshake },
    { id: 'video', label: 'تماس تصویری', icon: FaVideo }
  ];

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [customersRes, tradesRes] = await Promise.all([
        api.get('/sarafi/customers'),
        api.get('/trades/sarafi/instant-trades', { params: { limit: 1000 } })
      ]);

      const customersData = customersRes.data.data || [];
      const tradesData = tradesRes.data.trades || tradesRes.data.data || [];

      setCustomers(customersData);
      setTrades(tradesData);

      // Calculate stats
      calculateStats(customersData, tradesData);

      // Load local data
      loadLocalData();
    } catch (error) {
      console.error('Error fetching CRM data:', error);
      toast.error('خطا در دریافت اطلاعات');
    } finally {
      setLoading(false);
    }
  };

  const loadLocalData = () => {
    // Load from localStorage for demo (in production, this would be API calls)
    const savedFollowUps = JSON.parse(localStorage.getItem('crm_followups') || '[]');
    const savedComplaints = JSON.parse(localStorage.getItem('crm_complaints') || '[]');
    const savedNotes = JSON.parse(localStorage.getItem('crm_notes') || '[]');
    const savedReminders = JSON.parse(localStorage.getItem('crm_reminders') || '[]');

    setFollowUps(savedFollowUps);
    setComplaints(savedComplaints);
    setNotes(savedNotes);
    setReminders(savedReminders);
  };

  const saveLocalData = (key, data) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  const calculateStats = (customersData, tradesData) => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Customer trade stats
    const customerTradeStats = {};
    tradesData.forEach(trade => {
      const customerId = trade.customer?._id;
      if (customerId) {
        if (!customerTradeStats[customerId]) {
          customerTradeStats[customerId] = { count: 0, volume: 0, lastTrade: null };
        }
        customerTradeStats[customerId].count++;
        customerTradeStats[customerId].volume += trade.totalAmount || 0;
        const tradeDate = new Date(trade.createdAt);
        if (!customerTradeStats[customerId].lastTrade || tradeDate > customerTradeStats[customerId].lastTrade) {
          customerTradeStats[customerId].lastTrade = tradeDate;
        }
      }
    });

    // Calculate segments
    let vipCount = 0;
    let activeCount = 0;
    let inactiveCount = 0;
    let churnRisk = 0;

    customersData.forEach(customer => {
      const stats = customerTradeStats[customer._id] || { count: 0, volume: 0, lastTrade: null };
      if (stats.count >= 50 || stats.volume >= 1000000000) vipCount++;
      if (stats.lastTrade && stats.lastTrade > thirtyDaysAgo) {
        activeCount++;
      } else if (stats.count > 0) {
        inactiveCount++;
        churnRisk++;
      }
    });

    // New customers this month
    const newThisMonth = customersData.filter(c => new Date(c.createdAt) >= thisMonth).length;

    // Load follow-ups and complaints for stats
    const followUps = JSON.parse(localStorage.getItem('crm_followups') || '[]');
    const complaints = JSON.parse(localStorage.getItem('crm_complaints') || '[]');
    const reminders = JSON.parse(localStorage.getItem('crm_reminders') || '[]');

    const pendingFollowUps = followUps.filter(f => f.status === 'pending').length;
    const overdueFollowUps = followUps.filter(f => {
      if (f.status !== 'pending') return false;
      return new Date(f.dueDate) < now;
    }).length;

    const openComplaints = complaints.filter(c => c.status !== 'resolved').length;
    const resolvedComplaints = complaints.filter(c => c.status === 'resolved').length;

    const todayStr = now.toISOString().split('T')[0];
    const todayReminders = reminders.filter(r => r.dueDate === todayStr && r.status !== 'done').length;

    setStats({
      totalCustomers: customersData.length,
      activeCustomers: activeCount,
      vipCustomers: vipCount,
      newCustomersThisMonth: newThisMonth,
      pendingFollowUps,
      overdueFollowUps,
      openComplaints,
      resolvedComplaints,
      avgSatisfaction: 4.2,
      churnRisk,
      todayReminders,
      customerGrowth: ((newThisMonth / (customersData.length || 1)) * 100).toFixed(1)
    });
  };

  // Get customer segment
  const getCustomerSegment = (customerId) => {
    const customerTrades = trades.filter(t => t.customer?._id === customerId);
    const tradeCount = customerTrades.length;
    const totalVolume = customerTrades.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
    const lastTrade = customerTrades.length > 0 ? new Date(Math.max(...customerTrades.map(t => new Date(t.createdAt)))) : null;
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    if (tradeCount >= 50 || totalVolume >= 1000000000) return customerSegments[0]; // VIP
    if (tradeCount >= 20 || totalVolume >= 500000000) return customerSegments[1]; // Premium
    if (tradeCount >= 5 || totalVolume >= 100000000) return customerSegments[2]; // Regular
    if (!lastTrade || lastTrade < thirtyDaysAgo) return customerSegments[4]; // Inactive
    return customerSegments[3]; // New
  };

  // Customer metrics
  const getCustomerMetrics = (customerId) => {
    const customerTrades = trades.filter(t => t.customer?._id === customerId);
    return {
      totalTrades: customerTrades.length,
      totalVolume: customerTrades.reduce((sum, t) => sum + (t.totalAmount || 0), 0),
      avgTradeSize: customerTrades.length > 0 ? customerTrades.reduce((sum, t) => sum + (t.totalAmount || 0), 0) / customerTrades.length : 0,
      lastTradeDate: customerTrades.length > 0 ? new Date(Math.max(...customerTrades.map(t => new Date(t.createdAt)))) : null,
      buyCount: customerTrades.filter(t => t.type === 'buy' || t.side === 'buy').length,
      sellCount: customerTrades.filter(t => t.type === 'sell' || t.side === 'sell').length
    };
  };

  // Add Follow-up
  const handleAddFollowUp = () => {
    if (!selectedCustomerForFollowUp || !followUpForm.dueDate) {
      toast.error('لطفا اطلاعات را کامل کنید');
      return;
    }

    const newFollowUp = {
      id: Date.now().toString(),
      customerId: selectedCustomerForFollowUp._id,
      customerName: `${selectedCustomerForFollowUp.firstName} ${selectedCustomerForFollowUp.lastName}`,
      customerPhone: selectedCustomerForFollowUp.phone,
      ...followUpForm,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    const updated = [...followUps, newFollowUp];
    setFollowUps(updated);
    saveLocalData('crm_followups', updated);
    toast.success('پیگیری ثبت شد');
    closeFollowUpModal();
  };

  // Complete Follow-up
  const handleCompleteFollowUp = (id, result) => {
    const updated = followUps.map(f =>
      f.id === id ? { ...f, status: 'completed', result, completedAt: new Date().toISOString() } : f
    );
    setFollowUps(updated);
    saveLocalData('crm_followups', updated);
    toast.success('پیگیری تکمیل شد');
  };

  // Add Complaint
  const handleAddComplaint = () => {
    if (!complaintForm.customer || !complaintForm.subject) {
      toast.error('لطفا اطلاعات را کامل کنید');
      return;
    }

    const customer = customers.find(c => c._id === complaintForm.customer);
    const newComplaint = {
      id: Date.now().toString(),
      ticketNumber: `TKT-${Date.now().toString().slice(-6)}`,
      customerId: complaintForm.customer,
      customerName: customer ? `${customer.firstName} ${customer.lastName}` : 'نامشخص',
      customerPhone: customer?.phone,
      ...complaintForm,
      status: 'open',
      responses: [],
      createdAt: new Date().toISOString()
    };

    const updated = [...complaints, newComplaint];
    setComplaints(updated);
    saveLocalData('crm_complaints', updated);
    toast.success('شکایت ثبت شد');
    closeComplaintModal();
  };

  // Respond to Complaint
  const handleRespondComplaint = () => {
    if (!complaintResponse.trim()) {
      toast.error('پاسخ را وارد کنید');
      return;
    }

    const updated = complaints.map(c => {
      if (c.id === selectedComplaint.id) {
        return {
          ...c,
          responses: [...(c.responses || []), {
            id: Date.now().toString(),
            text: complaintResponse,
            createdAt: new Date().toISOString(),
            by: 'staff'
          }],
          status: 'in_progress'
        };
      }
      return c;
    });

    setComplaints(updated);
    saveLocalData('crm_complaints', updated);
    setComplaintResponse('');
    toast.success('پاسخ ثبت شد');
  };

  // Resolve Complaint
  const handleResolveComplaint = (id) => {
    const updated = complaints.map(c =>
      c.id === id ? { ...c, status: 'resolved', resolvedAt: new Date().toISOString() } : c
    );
    setComplaints(updated);
    saveLocalData('crm_complaints', updated);
    setSelectedComplaint(null);
    toast.success('شکایت حل شد');
  };

  // Add Note
  const handleAddNote = () => {
    if (!noteForm.customer || !noteForm.content) {
      toast.error('لطفا اطلاعات را کامل کنید');
      return;
    }

    const customer = customers.find(c => c._id === noteForm.customer);
    const newNote = {
      id: Date.now().toString(),
      customerId: noteForm.customer,
      customerName: customer ? `${customer.firstName} ${customer.lastName}` : 'نامشخص',
      ...noteForm,
      createdAt: new Date().toISOString()
    };

    const updated = [...notes, newNote];
    setNotes(updated);
    saveLocalData('crm_notes', updated);
    toast.success('یادداشت ثبت شد');
    setShowNoteModal(false);
    setNoteForm({ customer: '', content: '', type: 'general' });
  };

  // Add Reminder
  const handleAddReminder = () => {
    if (!reminderForm.title || !reminderForm.dueDate) {
      toast.error('لطفا اطلاعات را کامل کنید');
      return;
    }

    const newReminder = {
      id: Date.now().toString(),
      ...reminderForm,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    const updated = [...reminders, newReminder];
    setReminders(updated);
    saveLocalData('crm_reminders', updated);
    toast.success('یادآور ثبت شد');
    setShowReminderModal(false);
    setReminderForm({ title: '', description: '', dueDate: '', dueTime: '', type: 'general', repeat: 'none' });
  };

  // Complete Reminder
  const handleCompleteReminder = (id) => {
    const updated = reminders.map(r =>
      r.id === id ? { ...r, status: 'done', completedAt: new Date().toISOString() } : r
    );
    setReminders(updated);
    saveLocalData('crm_reminders', updated);
    toast.success('یادآور تکمیل شد');
  };

  // Delete functions
  const handleDeleteFollowUp = (id) => {
    const updated = followUps.filter(f => f.id !== id);
    setFollowUps(updated);
    saveLocalData('crm_followups', updated);
    toast.success('حذف شد');
  };

  const handleDeleteComplaint = (id) => {
    const updated = complaints.filter(c => c.id !== id);
    setComplaints(updated);
    saveLocalData('crm_complaints', updated);
    toast.success('حذف شد');
  };

  const handleDeleteReminder = (id) => {
    const updated = reminders.filter(r => r.id !== id);
    setReminders(updated);
    saveLocalData('crm_reminders', updated);
    toast.success('حذف شد');
  };

  // Modal handlers
  const openFollowUpModal = (customer) => {
    setSelectedCustomerForFollowUp(customer);
    setFollowUpForm({
      type: 'call',
      dueDate: new Date().toISOString().split('T')[0],
      dueTime: '10:00',
      priority: 'medium',
      note: '',
      reminder: true
    });
    setShowFollowUpModal(true);
  };

  const closeFollowUpModal = () => {
    setShowFollowUpModal(false);
    setSelectedCustomerForFollowUp(null);
    setFollowUpForm({ type: 'call', dueDate: '', dueTime: '', priority: 'medium', note: '', reminder: true });
  };

  const closeComplaintModal = () => {
    setShowComplaintModal(false);
    setComplaintForm({ customer: '', category: 'service', priority: 'medium', subject: '', description: '', attachments: [] });
  };

  // Helpers
  const formatNumber = (num) => new Intl.NumberFormat('fa-IR').format(num || 0);
  const formatDate = (date) => date ? new Date(date).toLocaleDateString('fa-IR') : '-';
  const formatTime = (date) => date ? new Date(date).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) : '-';

  const getPriorityColor = (priority) => {
    const colors = { low: 'green', medium: 'yellow', high: 'orange', critical: 'red' };
    return colors[priority] || 'gray';
  };

  const getStatusBadge = (status) => {
    const configs = {
      pending: { label: 'در انتظار', color: 'yellow', icon: FaHourglassHalf },
      in_progress: { label: 'در حال بررسی', color: 'blue', icon: FaSpinner },
      completed: { label: 'تکمیل شده', color: 'green', icon: FaCheckCircle },
      resolved: { label: 'حل شده', color: 'green', icon: FaCheckCircle },
      open: { label: 'باز', color: 'orange', icon: FaExclamationTriangle },
      done: { label: 'انجام شد', color: 'green', icon: FaCheck }
    };
    const config = configs[status] || { label: status, color: 'gray', icon: FaClock };
    return (
      <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-${config.color}-500/20 text-${config.color}-500`}>
        <config.icon className="text-xs" />
        {config.label}
      </span>
    );
  };

  // Filtered data
  const filteredCustomers = useMemo(() => {
    return customers.filter(customer => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const name = `${customer.firstName} ${customer.lastName}`.toLowerCase();
        if (!name.includes(searchLower) && !customer.phone?.includes(filters.search)) return false;
      }
      if (filters.segment !== 'all') {
        const segment = getCustomerSegment(customer._id);
        if (segment.id !== filters.segment) return false;
      }
      return true;
    });
  }, [customers, trades, filters]);

  // Sorted reminders (today first, then by date)
  const sortedReminders = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return [...reminders].sort((a, b) => {
      if (a.dueDate === today && b.dueDate !== today) return -1;
      if (a.dueDate !== today && b.dueDate === today) return 1;
      return new Date(a.dueDate) - new Date(b.dueDate);
    });
  }, [reminders]);

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
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center shadow-lg">
              <FaHeadset className="text-white text-xl" />
            </div>
            پنل CRM پیشرفته
          </h1>
          <p className="text-dark-400 text-sm mt-1">مدیریت ارتباط با مشتریان، پیگیری و رضایت‌سنجی</p>
        </div>

        <div className="flex items-center gap-2">
          {stats.overdueFollowUps > 0 && (
            <div className="px-3 py-2 bg-red-500/20 border border-red-500/30 rounded-lg flex items-center gap-2 animate-pulse">
              <FaExclamationTriangle className="text-red-500" />
              <span className="text-red-500 text-sm font-bold">{stats.overdueFollowUps} پیگیری عقب‌افتاده</span>
            </div>
          )}
          {stats.todayReminders > 0 && (
            <div className="px-3 py-2 bg-gold/20 border border-gold/30 rounded-lg flex items-center gap-2">
              <FaBell className="text-gold" />
              <span className="text-gold text-sm font-bold">{stats.todayReminders} یادآور امروز</span>
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex rounded-xl bg-dark-800 p-1.5 gap-1 overflow-x-auto">
        {[
          { id: 'dashboard', label: 'داشبورد', icon: FaChartPie },
          { id: 'customers', label: 'مشتریان', icon: FaUsers, badge: stats.vipCustomers },
          { id: 'followups', label: 'پیگیری‌ها', icon: FaUserClock, badge: stats.pendingFollowUps },
          { id: 'complaints', label: 'شکایات', icon: FaExclamationTriangle, badge: stats.openComplaints },
          { id: 'reminders', label: 'یادآورها', icon: FaBell, badge: stats.todayReminders },
          { id: 'reports', label: 'گزارشات', icon: FaChartBar }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 rounded-lg flex items-center gap-2 transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white font-bold shadow-lg'
                : 'text-dark-400 hover:text-white hover:bg-dark-700'
            }`}
          >
            <tab.icon />
            {tab.label}
            {tab.badge > 0 && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-white/20' : 'bg-red-500 text-white'}`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Dashboard Tab */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* Stats Row 1 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-5 border-r-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-dark-400 text-sm">کل مشتریان</p>
                  <p className="text-3xl font-bold text-blue-500">{formatNumber(stats.totalCustomers)}</p>
                </div>
                <div className="w-14 h-14 rounded-xl bg-blue-500/20 flex items-center justify-center">
                  <FaUsers className="text-blue-500 text-2xl" />
                </div>
              </div>
            </div>

            <div className="card p-5 border-r-4 border-gold">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-dark-400 text-sm">مشتریان VIP</p>
                  <p className="text-3xl font-bold text-gold">{formatNumber(stats.vipCustomers)}</p>
                </div>
                <div className="w-14 h-14 rounded-xl bg-gold/20 flex items-center justify-center">
                  <FaCrown className="text-gold text-2xl" />
                </div>
              </div>
            </div>

            <div className="card p-5 border-r-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-dark-400 text-sm">مشتریان فعال</p>
                  <p className="text-3xl font-bold text-green-500">{formatNumber(stats.activeCustomers)}</p>
                </div>
                <div className="w-14 h-14 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <FaUserShield className="text-green-500 text-2xl" />
                </div>
              </div>
            </div>

            <div className="card p-5 border-r-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-dark-400 text-sm">مشتری جدید (این ماه)</p>
                  <p className="text-3xl font-bold text-purple-500">{formatNumber(stats.newCustomersThisMonth)}</p>
                  <p className="text-green-500 text-xs">+{stats.customerGrowth}%</p>
                </div>
                <div className="w-14 h-14 rounded-xl bg-purple-500/20 flex items-center justify-center">
                  <FaUserPlus className="text-purple-500 text-2xl" />
                </div>
              </div>
            </div>
          </div>

          {/* Stats Row 2 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center">
                <FaUserClock className="text-orange-500 text-xl" />
              </div>
              <div>
                <p className="text-dark-400 text-sm">پیگیری در انتظار</p>
                <p className="text-xl font-bold text-orange-500">{formatNumber(stats.pendingFollowUps)}</p>
              </div>
            </div>

            <div className="card p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center">
                <FaExclamationTriangle className="text-red-500 text-xl" />
              </div>
              <div>
                <p className="text-dark-400 text-sm">شکایات باز</p>
                <p className="text-xl font-bold text-red-500">{formatNumber(stats.openComplaints)}</p>
              </div>
            </div>

            <div className="card p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-yellow-500/20 flex items-center justify-center">
                <FaStar className="text-yellow-500 text-xl" />
              </div>
              <div>
                <p className="text-dark-400 text-sm">رضایت‌سنجی</p>
                <p className="text-xl font-bold text-yellow-500">{stats.avgSatisfaction}/5</p>
              </div>
            </div>

            <div className="card p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center">
                <FaFire className="text-pink-500 text-xl" />
              </div>
              <div>
                <p className="text-dark-400 text-sm">ریسک ریزش</p>
                <p className="text-xl font-bold text-pink-500">{formatNumber(stats.churnRisk)}</p>
              </div>
            </div>
          </div>

          {/* Quick Actions & Recent */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Follow-ups */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <FaUserClock className="text-orange-500" />
                  پیگیری‌های اخیر
                </h3>
                <button onClick={() => setActiveTab('followups')} className="text-orange-500 text-sm hover:underline">
                  مشاهده همه
                </button>
              </div>
              {followUps.filter(f => f.status === 'pending').slice(0, 5).length === 0 ? (
                <p className="text-dark-500 text-center py-4">پیگیری در انتظار ندارید</p>
              ) : (
                <div className="space-y-2">
                  {followUps.filter(f => f.status === 'pending').slice(0, 5).map(followUp => (
                    <div key={followUp.id} className="bg-dark-800 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full bg-${getPriorityColor(followUp.priority)}-500/20 flex items-center justify-center`}>
                          {followUpTypes.find(t => t.id === followUp.type)?.icon && (
                            <span className={`text-${getPriorityColor(followUp.priority)}-500`}>
                              {(() => { const Icon = followUpTypes.find(t => t.id === followUp.type)?.icon; return Icon ? <Icon /> : null; })()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{followUp.customerName}</p>
                          <p className="text-dark-500 text-xs">{formatDate(followUp.dueDate)}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleCompleteFollowUp(followUp.id, 'completed')}
                        className="p-2 rounded-lg bg-green-500/20 text-green-500 hover:bg-green-500/30"
                      >
                        <FaCheck />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Open Complaints */}
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-white font-bold flex items-center gap-2">
                  <FaExclamationTriangle className="text-red-500" />
                  شکایات باز
                </h3>
                <button onClick={() => setActiveTab('complaints')} className="text-red-500 text-sm hover:underline">
                  مشاهده همه
                </button>
              </div>
              {complaints.filter(c => c.status !== 'resolved').slice(0, 5).length === 0 ? (
                <p className="text-dark-500 text-center py-4">شکایت بازی ندارید</p>
              ) : (
                <div className="space-y-2">
                  {complaints.filter(c => c.status !== 'resolved').slice(0, 5).map(complaint => (
                    <div key={complaint.id} className="bg-dark-800 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-gold text-sm font-mono">{complaint.ticketNumber}</span>
                        {getStatusBadge(complaint.status)}
                      </div>
                      <p className="text-white text-sm">{complaint.subject}</p>
                      <p className="text-dark-500 text-xs">{complaint.customerName}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Customer Segments Chart */}
          <div className="card p-6">
            <h3 className="text-white font-bold flex items-center gap-2 mb-6">
              <FaChartPie className="text-gold" />
              توزیع مشتریان بر اساس سگمنت
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {customerSegments.map(segment => {
                const count = customers.filter(c => getCustomerSegment(c._id).id === segment.id).length;
                const percentage = customers.length > 0 ? ((count / customers.length) * 100).toFixed(1) : 0;
                return (
                  <div key={segment.id} className={`text-center p-4 rounded-xl bg-${segment.color}-500/10 border border-${segment.color}-500/30`}>
                    <segment.icon className={`text-${segment.color}-500 text-3xl mx-auto mb-2`} />
                    <p className={`text-${segment.color}-500 font-bold text-2xl`}>{count}</p>
                    <p className="text-dark-400 text-sm">{segment.label}</p>
                    <p className="text-dark-500 text-xs">{percentage}%</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Customers Tab */}
      {activeTab === 'customers' && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="card p-4">
            <div className="flex flex-wrap items-center gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <FaSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400" />
                <input
                  type="text"
                  placeholder="جستجوی نام یا تلفن..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="input w-full pr-10"
                />
              </div>
              <select
                value={filters.segment}
                onChange={(e) => setFilters({ ...filters, segment: e.target.value })}
                className="input"
              >
                <option value="all">همه سگمنت‌ها</option>
                {customerSegments.map(s => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
              <button onClick={() => setShowNoteModal(true)} className="btn-outline flex items-center gap-2">
                <FaPlus />
                یادداشت جدید
              </button>
            </div>
          </div>

          {/* Customers Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCustomers.slice(0, 30).map(customer => {
              const segment = getCustomerSegment(customer._id);
              const metrics = getCustomerMetrics(customer._id);
              const customerNotes = notes.filter(n => n.customerId === customer._id);
              const customerFollowUps = followUps.filter(f => f.customerId === customer._id && f.status === 'pending');

              return (
                <div key={customer._id} className="card p-4 hover:border-gold/30 transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-full bg-${segment.color}-500/20 flex items-center justify-center`}>
                        <segment.icon className={`text-${segment.color}-500 text-lg`} />
                      </div>
                      <div>
                        <h3 className="text-white font-bold">{customer.firstName} {customer.lastName}</h3>
                        <p className="text-dark-500 text-sm">{customer.phone}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs bg-${segment.color}-500/20 text-${segment.color}-500`}>
                      {segment.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
                    <div className="bg-dark-800 rounded-lg p-2 text-center">
                      <p className="text-dark-500 text-xs">معاملات</p>
                      <p className="text-white font-bold">{metrics.totalTrades}</p>
                    </div>
                    <div className="bg-dark-800 rounded-lg p-2 text-center">
                      <p className="text-dark-500 text-xs">حجم کل</p>
                      <p className="text-gold font-bold text-xs">{formatNumber(metrics.totalVolume)}</p>
                    </div>
                  </div>

                  {metrics.lastTradeDate && (
                    <p className="text-dark-500 text-xs mb-3">
                      آخرین معامله: {formatDate(metrics.lastTradeDate)}
                    </p>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    {customerNotes.length > 0 && (
                      <span className="px-2 py-0.5 bg-blue-500/20 text-blue-500 text-xs rounded-full">
                        {customerNotes.length} یادداشت
                      </span>
                    )}
                    {customerFollowUps.length > 0 && (
                      <span className="px-2 py-0.5 bg-orange-500/20 text-orange-500 text-xs rounded-full">
                        {customerFollowUps.length} پیگیری
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openFollowUpModal(customer)}
                      className="flex-1 py-2 rounded-lg bg-orange-500/20 text-orange-500 hover:bg-orange-500/30 text-sm flex items-center justify-center gap-1"
                    >
                      <FaUserClock />
                      پیگیری
                    </button>
                    <a
                      href={`tel:${customer.phone}`}
                      className="p-2 rounded-lg bg-green-500/20 text-green-500 hover:bg-green-500/30"
                    >
                      <FaPhone />
                    </a>
                    <a
                      href={`https://wa.me/${customer.phone?.replace(/^0/, '98')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-emerald-500/20 text-emerald-500 hover:bg-emerald-500/30"
                    >
                      <FaWhatsapp />
                    </a>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredCustomers.length > 30 && (
            <p className="text-dark-500 text-center">و {filteredCustomers.length - 30} مشتری دیگر...</p>
          )}
        </div>
      )}

      {/* Follow-ups Tab */}
      {activeTab === 'followups' && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <select className="input" onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                <option value="all">همه وضعیت‌ها</option>
                <option value="pending">در انتظار</option>
                <option value="completed">تکمیل شده</option>
              </select>
            </div>
          </div>

          {/* Follow-ups List */}
          <div className="grid grid-cols-1 gap-4">
            {followUps
              .filter(f => filters.status === 'all' || f.status === filters.status)
              .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
              .map(followUp => {
                const isOverdue = followUp.status === 'pending' && new Date(followUp.dueDate) < new Date();
                const typeInfo = followUpTypes.find(t => t.id === followUp.type);

                return (
                  <div key={followUp.id} className={`card p-4 ${isOverdue ? 'border border-red-500/50' : ''}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl bg-${getPriorityColor(followUp.priority)}-500/20 flex items-center justify-center`}>
                          {typeInfo && <typeInfo.icon className={`text-${getPriorityColor(followUp.priority)}-500 text-xl`} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="text-white font-bold">{followUp.customerName}</h3>
                            {isOverdue && (
                              <span className="px-2 py-0.5 bg-red-500/20 text-red-500 text-xs rounded-full animate-pulse">
                                عقب‌افتاده
                              </span>
                            )}
                          </div>
                          <p className="text-dark-400 text-sm">{followUp.customerPhone}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm">
                            <span className="text-dark-500 flex items-center gap-1">
                              <FaCalendarAlt className="text-xs" />
                              {formatDate(followUp.dueDate)}
                            </span>
                            <span className="text-dark-500 flex items-center gap-1">
                              <FaClock className="text-xs" />
                              {followUp.dueTime}
                            </span>
                            <span className={`px-2 py-0.5 rounded-full text-xs bg-${getPriorityColor(followUp.priority)}-500/20 text-${getPriorityColor(followUp.priority)}-500`}>
                              {priorityLevels.find(p => p.id === followUp.priority)?.label}
                            </span>
                          </div>
                          {followUp.note && (
                            <p className="text-dark-400 text-sm mt-2 bg-dark-800 rounded-lg p-2">{followUp.note}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {getStatusBadge(followUp.status)}
                        {followUp.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleCompleteFollowUp(followUp.id, 'completed')}
                              className="p-2 rounded-lg bg-green-500/20 text-green-500 hover:bg-green-500/30"
                              title="تکمیل"
                            >
                              <FaCheck />
                            </button>
                            <a
                              href={`tel:${followUp.customerPhone}`}
                              className="p-2 rounded-lg bg-blue-500/20 text-blue-500 hover:bg-blue-500/30"
                              title="تماس"
                            >
                              <FaPhone />
                            </a>
                          </>
                        )}
                        <button
                          onClick={() => handleDeleteFollowUp(followUp.id)}
                          className="p-2 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30"
                          title="حذف"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

            {followUps.length === 0 && (
              <div className="card p-8 text-center text-dark-500">
                <FaUserClock className="text-4xl mx-auto mb-4 opacity-50" />
                <p>پیگیری‌ای ثبت نشده است</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Complaints Tab */}
      {activeTab === 'complaints' && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <select className="input" onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="all">همه وضعیت‌ها</option>
              <option value="open">باز</option>
              <option value="in_progress">در حال بررسی</option>
              <option value="resolved">حل شده</option>
            </select>
            <button onClick={() => setShowComplaintModal(true)} className="btn-gold flex items-center gap-2">
              <FaPlus />
              ثبت شکایت
            </button>
          </div>

          {/* Complaints List */}
          <div className="grid grid-cols-1 gap-4">
            {complaints
              .filter(c => filters.status === 'all' || c.status === filters.status)
              .map(complaint => {
                const category = complaintCategories.find(c => c.id === complaint.category);

                return (
                  <div key={complaint.id} className="card p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl bg-${getPriorityColor(complaint.priority)}-500/20 flex items-center justify-center`}>
                          {category && <category.icon className={`text-${getPriorityColor(complaint.priority)}-500 text-xl`} />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-gold font-mono text-sm">{complaint.ticketNumber}</span>
                            {getStatusBadge(complaint.status)}
                            <span className={`px-2 py-0.5 rounded-full text-xs bg-${getPriorityColor(complaint.priority)}-500/20 text-${getPriorityColor(complaint.priority)}-500`}>
                              {priorityLevels.find(p => p.id === complaint.priority)?.label}
                            </span>
                          </div>
                          <h3 className="text-white font-bold">{complaint.subject}</h3>
                          <p className="text-dark-400 text-sm">{complaint.customerName} - {complaint.customerPhone}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setSelectedComplaint(complaint)}
                          className="p-2 rounded-lg bg-blue-500/20 text-blue-500 hover:bg-blue-500/30"
                          title="مشاهده"
                        >
                          <FaEye />
                        </button>
                        {complaint.status !== 'resolved' && (
                          <button
                            onClick={() => handleResolveComplaint(complaint.id)}
                            className="p-2 rounded-lg bg-green-500/20 text-green-500 hover:bg-green-500/30"
                            title="حل شده"
                          >
                            <FaCheck />
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteComplaint(complaint.id)}
                          className="p-2 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30"
                          title="حذف"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>

                    <p className="text-dark-300 text-sm mb-3">{complaint.description}</p>

                    {complaint.responses?.length > 0 && (
                      <div className="bg-dark-800 rounded-lg p-3 space-y-2">
                        <p className="text-dark-500 text-xs mb-2">{complaint.responses.length} پاسخ</p>
                        {complaint.responses.slice(-2).map(response => (
                          <div key={response.id} className="bg-dark-700 rounded p-2 text-sm">
                            <p className="text-white">{response.text}</p>
                            <p className="text-dark-500 text-xs mt-1">{formatDate(response.createdAt)}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <p className="text-dark-500 text-xs mt-3">{formatDate(complaint.createdAt)}</p>
                  </div>
                );
              })}

            {complaints.length === 0 && (
              <div className="card p-8 text-center text-dark-500">
                <FaExclamationTriangle className="text-4xl mx-auto mb-4 opacity-50" />
                <p>شکایتی ثبت نشده است</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reminders Tab */}
      {activeTab === 'reminders' && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-white font-bold">یادآورهای من</h3>
            <button onClick={() => setShowReminderModal(true)} className="btn-gold flex items-center gap-2">
              <FaPlus />
              یادآور جدید
            </button>
          </div>

          {/* Reminders List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedReminders.map(reminder => {
              const isToday = reminder.dueDate === new Date().toISOString().split('T')[0];
              const isPast = new Date(reminder.dueDate) < new Date() && reminder.status !== 'done';

              return (
                <div key={reminder.id} className={`card p-4 ${isToday ? 'border border-gold/50' : ''} ${isPast ? 'border border-red-500/50' : ''}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${isToday ? 'bg-gold/20' : isPast ? 'bg-red-500/20' : 'bg-dark-700'} flex items-center justify-center`}>
                        <FaBell className={isToday ? 'text-gold' : isPast ? 'text-red-500' : 'text-dark-400'} />
                      </div>
                      <div>
                        <h4 className="text-white font-bold">{reminder.title}</h4>
                        {reminder.description && (
                          <p className="text-dark-400 text-sm">{reminder.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-dark-500">
                          <span className="flex items-center gap-1">
                            <FaCalendarAlt />
                            {formatDate(reminder.dueDate)}
                          </span>
                          {reminder.dueTime && (
                            <span className="flex items-center gap-1">
                              <FaClock />
                              {reminder.dueTime}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {reminder.status !== 'done' ? (
                        <button
                          onClick={() => handleCompleteReminder(reminder.id)}
                          className="p-2 rounded-lg bg-green-500/20 text-green-500 hover:bg-green-500/30"
                          title="انجام شد"
                        >
                          <FaCheck />
                        </button>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-xs bg-green-500/20 text-green-500">
                          انجام شد
                        </span>
                      )}
                      <button
                        onClick={() => handleDeleteReminder(reminder.id)}
                        className="p-2 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30"
                        title="حذف"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {reminders.length === 0 && (
              <div className="col-span-full card p-8 text-center text-dark-500">
                <FaBell className="text-4xl mx-auto mb-4 opacity-50" />
                <p>یادآوری ثبت نشده است</p>
                <button onClick={() => setShowReminderModal(true)} className="btn-gold mt-4">
                  <FaPlus className="ml-2" />
                  ثبت اولین یادآور
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Customer Activity Report */}
            <div className="card p-6">
              <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                <FaChartLine className="text-blue-500" />
                فعالیت مشتریان
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-dark-400">مشتریان فعال</span>
                  <span className="text-green-500 font-bold">{stats.activeCustomers}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-dark-400">مشتریان غیرفعال</span>
                  <span className="text-red-500 font-bold">{stats.churnRisk}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-dark-400">نرخ فعالیت</span>
                  <span className="text-gold font-bold">
                    {stats.totalCustomers > 0 ? ((stats.activeCustomers / stats.totalCustomers) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            </div>

            {/* Follow-up Report */}
            <div className="card p-6">
              <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                <FaUserClock className="text-orange-500" />
                گزارش پیگیری‌ها
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-dark-400">کل پیگیری‌ها</span>
                  <span className="text-white font-bold">{followUps.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-dark-400">در انتظار</span>
                  <span className="text-yellow-500 font-bold">{stats.pendingFollowUps}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-dark-400">تکمیل شده</span>
                  <span className="text-green-500 font-bold">{followUps.filter(f => f.status === 'completed').length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-dark-400">عقب‌افتاده</span>
                  <span className="text-red-500 font-bold">{stats.overdueFollowUps}</span>
                </div>
              </div>
            </div>

            {/* Complaints Report */}
            <div className="card p-6">
              <h3 className="text-white font-bold flex items-center gap-2 mb-4">
                <FaExclamationTriangle className="text-red-500" />
                گزارش شکایات
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-dark-400">کل شکایات</span>
                  <span className="text-white font-bold">{complaints.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-dark-400">باز</span>
                  <span className="text-orange-500 font-bold">{stats.openComplaints}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-dark-400">حل شده</span>
                  <span className="text-green-500 font-bold">{stats.resolvedComplaints}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-dark-400">نرخ حل</span>
                  <span className="text-gold font-bold">
                    {complaints.length > 0 ? ((stats.resolvedComplaints / complaints.length) * 100).toFixed(1) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Follow-up Modal */}
      {showFollowUpModal && selectedCustomerForFollowUp && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={closeFollowUpModal}>
          <div className="card w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">ثبت پیگیری جدید</h2>
              <button onClick={closeFollowUpModal} className="text-dark-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <div className="bg-dark-800 rounded-lg p-4 mb-4">
              <p className="text-dark-500 text-sm">مشتری:</p>
              <p className="text-white font-bold">{selectedCustomerForFollowUp.firstName} {selectedCustomerForFollowUp.lastName}</p>
              <p className="text-dark-400 text-sm">{selectedCustomerForFollowUp.phone}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-dark-300 mb-2">نوع پیگیری</label>
                <div className="grid grid-cols-4 gap-2">
                  {followUpTypes.slice(0, 4).map(type => (
                    <button
                      key={type.id}
                      onClick={() => setFollowUpForm({ ...followUpForm, type: type.id })}
                      className={`p-3 rounded-lg flex flex-col items-center gap-1 transition-all ${
                        followUpForm.type === type.id
                          ? 'bg-gold text-dark-900'
                          : 'bg-dark-800 text-dark-400 hover:text-white'
                      }`}
                    >
                      <type.icon />
                      <span className="text-xs">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-dark-300 mb-2">تاریخ *</label>
                  <input
                    type="date"
                    value={followUpForm.dueDate}
                    onChange={e => setFollowUpForm({ ...followUpForm, dueDate: e.target.value })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-dark-300 mb-2">ساعت</label>
                  <input
                    type="time"
                    value={followUpForm.dueTime}
                    onChange={e => setFollowUpForm({ ...followUpForm, dueTime: e.target.value })}
                    className="input w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-dark-300 mb-2">اولویت</label>
                <select
                  value={followUpForm.priority}
                  onChange={e => setFollowUpForm({ ...followUpForm, priority: e.target.value })}
                  className="input w-full"
                >
                  {priorityLevels.map(p => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-dark-300 mb-2">یادداشت</label>
                <textarea
                  value={followUpForm.note}
                  onChange={e => setFollowUpForm({ ...followUpForm, note: e.target.value })}
                  className="input w-full"
                  rows="3"
                  placeholder="توضیحات پیگیری..."
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={followUpForm.reminder}
                  onChange={e => setFollowUpForm({ ...followUpForm, reminder: e.target.checked })}
                  className="w-5 h-5 rounded"
                />
                <span className="text-dark-300">یادآوری قبل از موعد</span>
              </label>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={closeFollowUpModal} className="btn-outline flex-1">انصراف</button>
              <button onClick={handleAddFollowUp} className="btn-gold flex-1">
                ثبت پیگیری
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complaint Modal */}
      {showComplaintModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={closeComplaintModal}>
          <div className="card w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">ثبت شکایت جدید</h2>
              <button onClick={closeComplaintModal} className="text-dark-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-dark-300 mb-2">مشتری *</label>
                <select
                  value={complaintForm.customer}
                  onChange={e => setComplaintForm({ ...complaintForm, customer: e.target.value })}
                  className="input w-full"
                >
                  <option value="">انتخاب کنید...</option>
                  {customers.map(c => (
                    <option key={c._id} value={c._id}>{c.firstName} {c.lastName} - {c.phone}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-dark-300 mb-2">دسته‌بندی</label>
                  <select
                    value={complaintForm.category}
                    onChange={e => setComplaintForm({ ...complaintForm, category: e.target.value })}
                    className="input w-full"
                  >
                    {complaintCategories.map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-dark-300 mb-2">اولویت</label>
                  <select
                    value={complaintForm.priority}
                    onChange={e => setComplaintForm({ ...complaintForm, priority: e.target.value })}
                    className="input w-full"
                  >
                    {priorityLevels.map(p => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-dark-300 mb-2">موضوع *</label>
                <input
                  type="text"
                  value={complaintForm.subject}
                  onChange={e => setComplaintForm({ ...complaintForm, subject: e.target.value })}
                  className="input w-full"
                  placeholder="موضوع شکایت..."
                />
              </div>

              <div>
                <label className="block text-dark-300 mb-2">توضیحات</label>
                <textarea
                  value={complaintForm.description}
                  onChange={e => setComplaintForm({ ...complaintForm, description: e.target.value })}
                  className="input w-full"
                  rows="4"
                  placeholder="شرح کامل شکایت..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={closeComplaintModal} className="btn-outline flex-1">انصراف</button>
              <button onClick={handleAddComplaint} className="btn-gold flex-1">
                ثبت شکایت
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Complaint Detail Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setSelectedComplaint(null)}>
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-dark-800 sticky top-0 bg-dark-900">
              <div>
                <span className="text-gold font-mono">{selectedComplaint.ticketNumber}</span>
                <h2 className="text-xl font-bold text-white">{selectedComplaint.subject}</h2>
              </div>
              <button onClick={() => setSelectedComplaint(null)} className="text-dark-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <div className="flex items-center gap-4">
                {getStatusBadge(selectedComplaint.status)}
                <span className={`px-2 py-1 rounded-full text-xs bg-${getPriorityColor(selectedComplaint.priority)}-500/20 text-${getPriorityColor(selectedComplaint.priority)}-500`}>
                  {priorityLevels.find(p => p.id === selectedComplaint.priority)?.label}
                </span>
              </div>

              <div className="bg-dark-800 rounded-lg p-4">
                <p className="text-dark-500 text-sm mb-1">مشتری:</p>
                <p className="text-white font-bold">{selectedComplaint.customerName}</p>
                <p className="text-dark-400">{selectedComplaint.customerPhone}</p>
              </div>

              <div className="bg-dark-800 rounded-lg p-4">
                <p className="text-dark-500 text-sm mb-1">شرح شکایت:</p>
                <p className="text-white">{selectedComplaint.description}</p>
              </div>

              {/* Responses */}
              {selectedComplaint.responses?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-dark-500 text-sm">پاسخ‌ها:</p>
                  {selectedComplaint.responses.map(response => (
                    <div key={response.id} className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
                      <p className="text-white">{response.text}</p>
                      <p className="text-dark-500 text-xs mt-2">{formatDate(response.createdAt)}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Response */}
              {selectedComplaint.status !== 'resolved' && (
                <div className="space-y-2">
                  <label className="text-dark-400 text-sm">پاسخ جدید:</label>
                  <textarea
                    value={complaintResponse}
                    onChange={e => setComplaintResponse(e.target.value)}
                    className="input w-full"
                    rows="3"
                    placeholder="پاسخ خود را بنویسید..."
                  />
                  <div className="flex gap-2">
                    <button onClick={handleRespondComplaint} className="btn-gold flex-1">
                      <FaReply className="ml-2" />
                      ارسال پاسخ
                    </button>
                    <button onClick={() => handleResolveComplaint(selectedComplaint.id)} className="btn-outline flex-1">
                      <FaCheck className="ml-2" />
                      علامت‌گذاری حل شده
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Note Modal */}
      {showNoteModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowNoteModal(false)}>
          <div className="card w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">یادداشت جدید</h2>
              <button onClick={() => setShowNoteModal(false)} className="text-dark-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-dark-300 mb-2">مشتری *</label>
                <select
                  value={noteForm.customer}
                  onChange={e => setNoteForm({ ...noteForm, customer: e.target.value })}
                  className="input w-full"
                >
                  <option value="">انتخاب کنید...</option>
                  {customers.map(c => (
                    <option key={c._id} value={c._id}>{c.firstName} {c.lastName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-dark-300 mb-2">متن یادداشت *</label>
                <textarea
                  value={noteForm.content}
                  onChange={e => setNoteForm({ ...noteForm, content: e.target.value })}
                  className="input w-full"
                  rows="4"
                  placeholder="یادداشت خود را بنویسید..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowNoteModal(false)} className="btn-outline flex-1">انصراف</button>
              <button onClick={handleAddNote} className="btn-gold flex-1">ثبت یادداشت</button>
            </div>
          </div>
        </div>
      )}

      {/* Reminder Modal */}
      {showReminderModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setShowReminderModal(false)}>
          <div className="card w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">یادآور جدید</h2>
              <button onClick={() => setShowReminderModal(false)} className="text-dark-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-dark-300 mb-2">عنوان *</label>
                <input
                  type="text"
                  value={reminderForm.title}
                  onChange={e => setReminderForm({ ...reminderForm, title: e.target.value })}
                  className="input w-full"
                  placeholder="عنوان یادآور..."
                />
              </div>

              <div>
                <label className="block text-dark-300 mb-2">توضیحات</label>
                <textarea
                  value={reminderForm.description}
                  onChange={e => setReminderForm({ ...reminderForm, description: e.target.value })}
                  className="input w-full"
                  rows="2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-dark-300 mb-2">تاریخ *</label>
                  <input
                    type="date"
                    value={reminderForm.dueDate}
                    onChange={e => setReminderForm({ ...reminderForm, dueDate: e.target.value })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-dark-300 mb-2">ساعت</label>
                  <input
                    type="time"
                    value={reminderForm.dueTime}
                    onChange={e => setReminderForm({ ...reminderForm, dueTime: e.target.value })}
                    className="input w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-dark-300 mb-2">تکرار</label>
                <select
                  value={reminderForm.repeat}
                  onChange={e => setReminderForm({ ...reminderForm, repeat: e.target.value })}
                  className="input w-full"
                >
                  <option value="none">بدون تکرار</option>
                  <option value="daily">روزانه</option>
                  <option value="weekly">هفتگی</option>
                  <option value="monthly">ماهانه</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowReminderModal(false)} className="btn-outline flex-1">انصراف</button>
              <button onClick={handleAddReminder} className="btn-gold flex-1">ثبت یادآور</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CRM;
