import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FaUsers, FaExchangeAlt, FaGlobe, FaClock, FaCheckCircle,
  FaMoneyBillWave, FaCoins, FaCalculator, FaChartLine,
  FaStar, FaArrowUp, FaArrowDown, FaBell, FaShieldAlt,
  FaExclamationTriangle, FaInfoCircle, FaStore
} from 'react-icons/fa';
import { sarafiAPI } from '../../services/api';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';

const SarafiDashboard = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [tradeStats, setTradeStats] = useState(null);
  const [riskSummary, setRiskSummary] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [recentTrades, setRecentTrades] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [dashRes, tradeStatsRes, tradesRes, riskRes, alertsRes] = await Promise.all([
          sarafiAPI.getDashboard(),
          api.get('/trades/sarafi/stats').catch(() => ({ data: { data: {} } })),
          api.get('/trades/sarafi/trades', { params: { limit: 5 } }).catch(() => ({ data: { data: [] } })),
          api.get('/sarafi/risk-summary').catch(() => ({ data: { data: {} } })),
          api.get('/notifications/unread', { params: { limit: 5 } }).catch(() => ({ data: { data: [] } }))
        ]);
        setStats(dashRes.data.data);
        setTradeStats(tradeStatsRes.data.data || {});
        setRecentTrades(tradesRes.data.data || []);
        setRiskSummary(riskRes.data.data || {});
        setAlerts(alertsRes.data.data || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const formatNumber = (num) => {
    return new Intl.NumberFormat('fa-IR').format(num || 0);
  };

  const getStatusBadge = (status) => {
    const map = {
      pending: { label: 'در انتظار تصمیم', class: 'bg-yellow-500/20 text-yellow-500' },
      approved: { label: 'تایید شده', class: 'bg-blue-500/20 text-blue-500' },
      processing: { label: 'در حال پردازش', class: 'bg-purple-500/20 text-purple-500' },
      awaiting_currency: { label: 'انتظار وصول ارز', class: 'bg-orange-500/20 text-orange-500' },
      awaiting_rial: { label: 'انتظار وصول ریال', class: 'bg-orange-500/20 text-orange-500' },
      completed: { label: 'تکمیل شده', class: 'bg-green-500/20 text-green-500' },
      cancelled: { label: 'لغو شده', class: 'bg-red-500/20 text-red-500' }
    };
    const s = map[status] || { label: status, class: 'bg-gray-500/20 text-gray-400' };
    return <span className={`px-2 py-1 rounded-full text-xs ${s.class}`}>{s.label}</span>;
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
      {/* خوش‌آمدگویی */}
      <div className="card-gold">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">
              سلام {user?.firstName} عزیز!
            </h1>
            <p className="text-dark-300">به پنل صراف خوش آمدید</p>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-dark-400 text-xs">امتیاز صراف</p>
              <p className="text-2xl font-bold text-gold flex items-center gap-1">
                <FaStar className="text-lg" />
                {formatNumber(user?.sarafiStats?.score || 0)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-dark-400 text-xs">نرخ موفقیت</p>
              <p className="text-2xl font-bold text-green-500">
                {(user?.sarafiStats?.successRate || 0).toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ========== ویجت‌های ریسک و هشدار ========== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* وضعیت Exposure */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FaShieldAlt className="text-blue-500" />
              <span className="font-bold">سقف تعهد</span>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${
              (riskSummary?.exposure?.percentage || 0) > 90
                ? 'bg-red-500/20 text-red-500'
                : (riskSummary?.exposure?.percentage || 0) > 70
                  ? 'bg-yellow-500/20 text-yellow-500'
                  : 'bg-green-500/20 text-green-500'
            }`}>
              {(riskSummary?.exposure?.percentage || 0).toFixed(1)}%
            </span>
          </div>
          <div className="w-full bg-dark-700 rounded-full h-2 mb-2">
            <div
              className={`h-2 rounded-full ${
                (riskSummary?.exposure?.percentage || 0) > 90
                  ? 'bg-red-500'
                  : (riskSummary?.exposure?.percentage || 0) > 70
                    ? 'bg-yellow-500'
                    : 'bg-green-500'
              }`}
              style={{ width: `${Math.min(100, riskSummary?.exposure?.percentage || 0)}%` }}
            ></div>
          </div>
          <p className="text-xs text-dark-400">
            {formatNumber(riskSummary?.exposure?.current || 0)} از {formatNumber(riskSummary?.exposure?.max || 0)} ریال
          </p>
        </div>

        {/* وضعیت بازار */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FaStore className="text-purple-500" />
              <span className="font-bold">وضعیت بازار</span>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${
              riskSummary?.session?.isOpen
                ? 'bg-green-500/20 text-green-500'
                : 'bg-red-500/20 text-red-500'
            }`}>
              {riskSummary?.session?.isOpen ? 'باز' : 'بسته'}
            </span>
          </div>
          {riskSummary?.session?.isOpen && (
            <>
              <p className="text-sm text-dark-300">
                ساعت کاری: {riskSummary?.session?.openTime} - {riskSummary?.session?.closeTime}
              </p>
              <p className={`text-xs mt-1 ${
                riskSummary?.session?.isBeforeCutoff ? 'text-green-500' : 'text-yellow-500'
              }`}>
                {riskSummary?.session?.isBeforeCutoff
                  ? `Cut-off: ${riskSummary?.session?.cutoff}`
                  : 'پس از Cut-off - تسویه فردا'}
              </p>
            </>
          )}
          {!riskSummary?.session?.isOpen && (
            <p className="text-sm text-dark-400">{riskSummary?.session?.reason || 'خارج از ساعت کاری'}</p>
          )}
        </div>

        {/* خلاصه هشدارها */}
        <div className="card p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FaBell className="text-gold" />
              <span className="font-bold">هشدارها</span>
            </div>
            {alerts.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {alerts.length}
              </span>
            )}
          </div>
          {riskSummary?.alerts?.length > 0 ? (
            <div className="space-y-2">
              {riskSummary.alerts.slice(0, 2).map((alert, idx) => (
                <div key={idx} className={`text-xs p-2 rounded flex items-center gap-2 ${
                  alert.type === 'danger' ? 'bg-red-500/20 text-red-400' :
                  alert.type === 'warning' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-blue-500/20 text-blue-400'
                }`}>
                  {alert.type === 'danger' ? <FaExclamationTriangle /> : <FaInfoCircle />}
                  <span className="truncate">{alert.message}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-green-500">همه چیز عالی است!</p>
          )}
        </div>
      </div>

      {/* ========== آمار اصلی معاملات ========== */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Link to="/sarafi/trades" className="card p-4 text-center hover:border-gold/50 transition-all border-l-4 border-yellow-500">
          <FaBell className="text-yellow-500 text-xl mx-auto mb-2" />
          <p className="text-dark-400 text-xs mb-1">در انتظار تصمیم</p>
          <p className="text-2xl font-bold text-yellow-500">{tradeStats?.pendingCount || 0}</p>
        </Link>
        <Link to="/sarafi/currency-collection" className="card p-4 text-center hover:border-gold/50 transition-all border-l-4 border-orange-500">
          <FaCoins className="text-orange-500 text-xl mx-auto mb-2" />
          <p className="text-dark-400 text-xs mb-1">انتظار وصول ارز</p>
          <p className="text-2xl font-bold text-orange-500">{tradeStats?.awaitingCurrency || 0}</p>
        </Link>
        <Link to="/sarafi/rial-collection" className="card p-4 text-center hover:border-gold/50 transition-all border-l-4 border-green-500">
          <FaMoneyBillWave className="text-green-500 text-xl mx-auto mb-2" />
          <p className="text-dark-400 text-xs mb-1">انتظار وصول ریال</p>
          <p className="text-2xl font-bold text-green-500">{tradeStats?.awaitingRial || 0}</p>
        </Link>
        <div className="card p-4 text-center border-l-4 border-blue-500">
          <FaExchangeAlt className="text-blue-500 text-xl mx-auto mb-2" />
          <p className="text-dark-400 text-xs mb-1">معاملات امروز</p>
          <p className="text-2xl font-bold text-blue-500">{tradeStats?.todayTrades || 0}</p>
        </div>
        <div className="card p-4 text-center border-l-4 border-purple-500">
          <FaCheckCircle className="text-purple-500 text-xl mx-auto mb-2" />
          <p className="text-dark-400 text-xs mb-1">تکمیل شده</p>
          <p className="text-2xl font-bold text-purple-500">{tradeStats?.completedToday || 0}</p>
        </div>
        <div className="card p-4 text-center border-l-4 border-gold">
          <FaChartLine className="text-gold text-xl mx-auto mb-2" />
          <p className="text-dark-400 text-xs mb-1">کارمزد امروز</p>
          <p className="text-lg font-bold text-gold">{formatNumber(tradeStats?.todayCommission || 0)}</p>
        </div>
      </div>

      {/* آمار کلی */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link to="/sarafi/customers" className="stat-card hover:border-gold-500/30">
          <FaUsers className="text-blue-500 text-2xl mb-2" />
          <div className="stat-value">{stats?.customers?.total || 0}</div>
          <div className="stat-label">مشتریان</div>
          {stats?.customers?.pending > 0 && (
            <p className="text-yellow-500 text-xs mt-1">{stats.customers.pending} در انتظار تایید</p>
          )}
        </Link>

        <Link to="/sarafi/trades" className="stat-card hover:border-gold-500/30">
          <FaExchangeAlt className="text-gold-500 text-2xl mb-2" />
          <div className="stat-value">{tradeStats?.totalTrades || 0}</div>
          <div className="stat-label">کل معاملات</div>
        </Link>

        <div className="stat-card">
          <FaCalculator className="text-green-500 text-2xl mb-2" />
          <div className="stat-value text-lg">{formatNumber(tradeStats?.totalVolume || 0)}</div>
          <div className="stat-label">حجم معاملات (ریال)</div>
        </div>

        <div className="stat-card">
          <FaChartLine className="text-purple-500 text-2xl mb-2" />
          <div className="stat-value text-lg">{formatNumber(tradeStats?.totalCommission || 0)}</div>
          <div className="stat-label">کارمزد کل (ریال)</div>
        </div>
      </div>

      {/* دسترسی سریع */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/sarafi/trades" className="card p-4 hover:border-gold/50 transition-all flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <FaExchangeAlt className="text-yellow-500 text-xl" />
          </div>
          <div>
            <h3 className="font-bold">مدیریت معاملات</h3>
            <p className="text-dark-400 text-sm">تایید، رد و پیگیری معاملات</p>
          </div>
          {(tradeStats?.pendingCount > 0) && (
            <span className="mr-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
              {tradeStats.pendingCount}
            </span>
          )}
        </Link>

        <Link to="/sarafi/accountant" className="card p-4 hover:border-gold/50 transition-all flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
            <FaCalculator className="text-blue-500 text-xl" />
          </div>
          <div>
            <h3 className="font-bold">حسابداری</h3>
            <p className="text-dark-400 text-sm">مدیریت کیف پول مشتریان</p>
          </div>
        </Link>

        <Link to="/sarafi/customers" className="card p-4 hover:border-gold/50 transition-all flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
            <FaUsers className="text-green-500 text-xl" />
          </div>
          <div>
            <h3 className="font-bold">مشتریان</h3>
            <p className="text-dark-400 text-sm">مدیریت و تایید مشتریان</p>
          </div>
          {(stats?.customers?.pending > 0) && (
            <span className="mr-auto bg-yellow-500 text-white text-xs px-2 py-1 rounded-full">
              {stats.customers.pending}
            </span>
          )}
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* آخرین معاملات */}
        <div className="card-dark">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FaExchangeAlt className="text-gold" />
              آخرین معاملات
            </h2>
            <Link to="/sarafi/trades" className="text-gold-500 text-sm">مشاهده همه</Link>
          </div>
          {recentTrades.length > 0 ? (
            <div className="space-y-3">
              {recentTrades.map((trade) => (
                <div key={trade._id} className="flex items-center justify-between p-3 bg-dark-800/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      trade.type === 'buy' ? 'bg-green-500/20' : 'bg-red-500/20'
                    }`}>
                      {trade.type === 'buy' ? (
                        <FaArrowDown className="text-green-500" />
                      ) : (
                        <FaArrowUp className="text-red-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">
                        {trade.type === 'buy' ? 'خرید' : 'فروش'} {formatNumber(trade.amount)} {trade.currency?.nameFa}
                      </p>
                      <p className="text-dark-500 text-xs">
                        {trade.customer?.firstName} {trade.customer?.lastName}
                      </p>
                    </div>
                  </div>
                  <div className="text-left">
                    {getStatusBadge(trade.status)}
                    <p className="text-gold text-xs mt-1">{formatNumber(trade.totalAmount)} ریال</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-dark-500 text-center py-4">معامله‌ای وجود ندارد</p>
          )}
        </div>

        {/* مشتریان جدید */}
        <div className="card-dark">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FaUsers className="text-gold" />
              مشتریان جدید
            </h2>
            <Link to="/sarafi/customers" className="text-gold-500 text-sm">مشاهده همه</Link>
          </div>
          {stats?.recentCustomers?.length > 0 ? (
            <div className="space-y-3">
              {stats.recentCustomers.map((customer) => (
                <div key={customer._id} className="flex items-center justify-between p-3 bg-dark-800/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-500">
                      {customer.firstName?.[0]}
                    </div>
                    <div>
                      <p className="text-white text-sm">{customer.firstName} {customer.lastName}</p>
                      <p className="text-dark-500 text-xs">{customer.phone}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    customer.sarafiApprovalStatus === 'approved'
                      ? 'bg-green-500/20 text-green-500'
                      : 'bg-yellow-500/20 text-yellow-500'
                  }`}>
                    {customer.sarafiApprovalStatus === 'approved' ? 'تایید شده' : 'در انتظار'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-dark-500 text-center py-4">مشتری جدیدی وجود ندارد</p>
          )}
        </div>
      </div>

      {/* درخواست‌های قدیم (اگر وجود دارد) */}
      {stats?.requests?.pending > 0 && (
        <div className="card p-4 bg-yellow-500/10 border-yellow-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FaClock className="text-yellow-500 text-xl" />
              <div>
                <p className="font-bold text-yellow-500">درخواست‌های قدیمی</p>
                <p className="text-sm text-dark-400">{stats.requests.pending} درخواست در انتظار بررسی</p>
              </div>
            </div>
            <Link to="/sarafi/requests" className="btn-outline px-4 py-2">
              مشاهده
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};

export default SarafiDashboard;
