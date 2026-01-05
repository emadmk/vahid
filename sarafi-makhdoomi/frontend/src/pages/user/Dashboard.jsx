import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FaList, FaCheckCircle, FaClock,
  FaWallet, FaStar, FaExchangeAlt, FaMedal,
  FaArrowUp, FaArrowDown, FaCreditCard, FaChartLine,
  FaBook, FaChartBar, FaPercent, FaBolt
} from 'react-icons/fa';
import { publicAPI } from '../../services/api';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import useViewStore from '../../store/viewStore';
import jalaliMoment from 'jalali-moment';

const tierColors = {
  A: { bg: 'bg-gold/20', text: 'text-gold', label: 'طلایی' },
  B: { bg: 'bg-blue-500/20', text: 'text-blue-500', label: 'نقره‌ای' },
  C: { bg: 'bg-purple-500/20', text: 'text-purple-500', label: 'برنزی' },
  new: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'جدید' }
};

const Dashboard = () => {
  const { user } = useAuthStore();
  const { viewMode, showAdvancedStats, showCharts, showMarketDepth, compactMode } = useViewStore();
  const [stats, setStats] = useState({ pending: 0, completed: 0, total: 0 });
  const [rates, setRates] = useState([]);
  const [wallets, setWallets] = useState({ cash: null, credit: null });
  const [recentTrades, setRecentTrades] = useState([]);
  const [marketStats, setMarketStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [ratesRes, walletsRes, tradesRes, statsRes] = await Promise.all([
          publicAPI.getRates(),
          api.get('/wallets/my-wallets').catch(() => ({ data: { data: [] } })),
          api.get('/trades/my-instant-trades', { params: { limit: 5 } }).catch(() => ({ data: { data: [] } })),
          api.get('/public/market-stats').catch(() => ({ data: { data: null } }))
        ]);

        setRates(ratesRes.data.data || []);
        const tradesData = tradesRes.data.data || [];
        setRecentTrades(tradesData);
        setMarketStats(statsRes.data.data);

        // تنظیم کیف پول‌ها - API یک object با cash و credit برمی‌گردونه
        const walletsData = walletsRes.data.data || {};
        setWallets({
          cash: walletsData.cash || null,
          credit: walletsData.credit || null
        });

        // محاسبه آمار از معاملات
        setStats({
          total: tradesData.length,
          pending: tradesData.filter(t => ['pending', 'approved', 'pending_collection', 'pending_accounting'].includes(t.status)).length,
          completed: tradesData.filter(t => t.status === 'completed').length
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const formatNumber = (num) => {
    return new Intl.NumberFormat('fa-IR').format(num || 0);
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: 'در انتظار', class: 'badge-warning' },
      waiting_public: { label: 'در انتظار', class: 'badge-warning' },
      public: { label: 'عمومی', class: 'badge-info' },
      private: { label: 'خصوصی', class: 'badge-gold' },
      accepted: { label: 'پذیرفته', class: 'badge-success' },
      in_progress: { label: 'در حال انجام', class: 'badge-info' },
      completed: { label: 'تکمیل شده', class: 'badge-success' },
      cancelled: { label: 'لغو شده', class: 'badge-danger' },
      rejected: { label: 'رد شده', class: 'badge-danger' }
    };
    const s = statusMap[status] || { label: status, class: 'badge-info' };
    return <span className={`badge ${s.class}`}>{s.label}</span>;
  };

  const tierInfo = tierColors[user?.tier] || tierColors.new;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* خوش‌آمدگویی و امتیاز */}
      <div className="card-gold">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">
              سلام {user?.firstName} عزیز!
            </h1>
            <p className="text-dark-300">
              به پنل کاربری صرافی گلدن 2026 خوش آمدید
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${tierInfo.bg}`}>
              <FaMedal className={tierInfo.text} />
              <span className={`font-bold ${tierInfo.text}`}>{tierInfo.label}</span>
            </div>
            <div className="text-center">
              <p className="text-dark-400 text-xs">امتیاز شما</p>
              <p className="text-2xl font-bold text-gold flex items-center gap-1">
                <FaStar className="text-lg" />
                {formatNumber(user?.score || 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* کیف پول‌ها */}
      <div data-tour="wallet-balance" className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* کیف پول نقدی */}
        <Link to="/dashboard/wallet" className="card p-6 hover:border-gold/50 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <FaWallet className="text-green-500 text-xl" />
              </div>
              <div>
                <h3 className="font-bold">کیف پول نقدی</h3>
                <p className="text-dark-400 text-sm">موجودی قابل برداشت</p>
              </div>
            </div>
            <FaArrowUp className="text-dark-400 group-hover:text-gold transition-colors" />
          </div>
          <p className="text-3xl font-bold text-green-500">
            {formatNumber(wallets.cash?.availableBalance || wallets.cash?.balance || 0)}
            <span className="text-sm text-dark-400 mr-1">ریال</span>
          </p>
          {/* Shadow Balance */}
          {(wallets.cash?.committedBalance > 0) && (
            <div className="mt-2 pt-2 border-t border-dark-700">
              <p className="text-xs text-dark-400 flex justify-between">
                <span>در تعهد:</span>
                <span className="text-yellow-500">{formatNumber(wallets.cash?.committedBalance)} ریال</span>
              </p>
              <p className="text-xs text-dark-400 flex justify-between">
                <span>کل موجودی:</span>
                <span>{formatNumber(wallets.cash?.balance || 0)} ریال</span>
              </p>
            </div>
          )}
        </Link>

        {/* کیف پول اعتباری */}
        <Link to="/dashboard/wallet" className="card p-6 hover:border-gold/50 transition-all group">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <FaCreditCard className="text-blue-500 text-xl" />
              </div>
              <div>
                <h3 className="font-bold">کیف پول اعتباری</h3>
                <p className="text-dark-400 text-sm">اعتبار باقیمانده</p>
              </div>
            </div>
            <FaArrowUp className="text-dark-400 group-hover:text-gold transition-colors" />
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold text-blue-500">
                {formatNumber(wallets.credit?.availableBalance || ((wallets.credit?.creditLimit || 0) - (wallets.credit?.usedCredit || 0)))}
                <span className="text-sm text-dark-400 mr-1">ریال</span>
              </p>
              <p className="text-xs text-dark-400 mt-1">
                از {formatNumber(wallets.credit?.creditLimit || 0)} ریال
              </p>
            </div>
            <div className="text-left">
              <p className="text-dark-400 text-xs">استفاده شده</p>
              <p className="text-orange-500 font-bold">{formatNumber(wallets.credit?.usedCredit || 0)}</p>
            </div>
          </div>
          {/* Shadow Balance */}
          {(wallets.credit?.committedBalance > 0) && (
            <div className="mt-2 pt-2 border-t border-dark-700">
              <p className="text-xs text-dark-400 flex justify-between">
                <span>در تعهد:</span>
                <span className="text-yellow-500">{formatNumber(wallets.credit?.committedBalance)} ریال</span>
              </p>
            </div>
          )}
        </Link>
      </div>

      {/* آمار سریع */}
      <div data-tour="stats-cards" className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link to="/dashboard/instant-trade" className="stat-card hover:border-gold/50">
          <FaExchangeAlt className="text-gold text-2xl mb-2" />
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">کل معاملات</div>
        </Link>
        <div className="stat-card">
          <FaClock className="text-yellow-500 text-2xl mb-2" />
          <div className="stat-value">{stats.pending}</div>
          <div className="stat-label">در جریان</div>
        </div>
        <div className="stat-card">
          <FaCheckCircle className="text-green-500 text-2xl mb-2" />
          <div className="stat-value">{stats.completed}</div>
          <div className="stat-label">تکمیل شده</div>
        </div>
        <Link to="/dashboard/pro-trade" className="stat-card hover:border-purple-500/50">
          <FaChartLine className="text-purple-500 text-2xl mb-2" />
          <div className="stat-value">PRO</div>
          <div className="stat-label">معاملات حرفه‌ای</div>
        </Link>
      </div>

      {/* دکمه‌های سریع */}
      {user?.status === 'approved' && (
        <div data-tour="quick-actions" className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to="/dashboard/instant-trade" className="card-dark hover:border-gold-500/50 flex items-center gap-4 transition-all">
            <div className="w-12 h-12 rounded-full bg-gold-500/10 flex items-center justify-center text-gold-500">
              <FaBolt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white font-bold">خرید و فروش فوری</h3>
              <p className="text-dark-400 text-sm">معامله سریع با قیمت لحظه‌ای</p>
            </div>
          </Link>
          <Link to="/dashboard/pro-trade" className="card-dark hover:border-gold-500/50 flex items-center gap-4 transition-all">
            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
              <FaChartLine className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white font-bold">خرید و فروش حرفه‌ای</h3>
              <p className="text-dark-400 text-sm">سفارش‌گذاری پیشرفته</p>
            </div>
          </Link>
        </div>
      )}

      {/* بخش حرفه‌ای - آمار پیشرفته */}
      {viewMode === 'professional' && showAdvancedStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
            <div className="flex items-center gap-2 mb-2">
              <FaChartLine className="text-blue-500" />
              <span className="text-dark-400 text-sm">حجم معاملات 24h</span>
            </div>
            <p className="text-xl font-bold text-white">
              {formatNumber(marketStats?.volume24h || 0)}
              <span className="text-xs text-dark-400 mr-1">ریال</span>
            </p>
          </div>
          <div className="card p-4 bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
            <div className="flex items-center gap-2 mb-2">
              <FaChartBar className="text-green-500" />
              <span className="text-dark-400 text-sm">تعداد معاملات</span>
            </div>
            <p className="text-xl font-bold text-white">
              {formatNumber(marketStats?.tradesCount || 0)}
            </p>
          </div>
          <div className="card p-4 bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
            <div className="flex items-center gap-2 mb-2">
              <FaPercent className="text-purple-500" />
              <span className="text-dark-400 text-sm">تغییر 24h</span>
            </div>
            <p className={`text-xl font-bold ${(marketStats?.change24h || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {(marketStats?.change24h || 0) >= 0 ? '+' : ''}{(marketStats?.change24h || 0).toFixed(2)}%
            </p>
          </div>
          <div className="card p-4 bg-gradient-to-br from-gold/10 to-gold/5 border-gold/20">
            <div className="flex items-center gap-2 mb-2">
              <FaBook className="text-gold" />
              <span className="text-dark-400 text-sm">سفارشات باز</span>
            </div>
            <p className="text-xl font-bold text-white">
              {formatNumber(marketStats?.openOrders || 0)}
            </p>
          </div>
        </div>
      )}

      {/* بخش حرفه‌ای - عمق بازار */}
      {viewMode === 'professional' && showMarketDepth && rates.length > 0 && (
        <div className="card-dark">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <FaChartBar className="text-gold" />
            عمق بازار - {rates[0]?.nameFa}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {/* سمت خرید */}
            <div>
              <p className="text-green-500 text-sm mb-2 font-medium">سفارشات خرید</p>
              <div className="space-y-1">
                {[...Array(5)].map((_, i) => {
                  const basePrice = rates[0]?.buyRate || 0;
                  const price = basePrice - (i * 100);
                  const amount = Math.floor(Math.random() * 500 + 100);
                  const width = 100 - (i * 15);
                  return (
                    <div key={i} className="relative h-8 rounded overflow-hidden">
                      <div
                        className="absolute inset-y-0 right-0 bg-green-500/20"
                        style={{ width: `${width}%` }}
                      />
                      <div className="relative z-10 flex justify-between items-center px-2 h-full text-sm">
                        <span className="text-dark-400">{formatNumber(amount)}</span>
                        <span className="text-green-500">{formatNumber(price)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {/* سمت فروش */}
            <div>
              <p className="text-red-500 text-sm mb-2 font-medium">سفارشات فروش</p>
              <div className="space-y-1">
                {[...Array(5)].map((_, i) => {
                  const basePrice = rates[0]?.sellRate || 0;
                  const price = basePrice + (i * 100);
                  const amount = Math.floor(Math.random() * 500 + 100);
                  const width = 100 - (i * 15);
                  return (
                    <div key={i} className="relative h-8 rounded overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 bg-red-500/20"
                        style={{ width: `${width}%` }}
                      />
                      <div className="relative z-10 flex justify-between items-center px-2 h-full text-sm">
                        <span className="text-red-500">{formatNumber(price)}</span>
                        <span className="text-dark-400">{formatNumber(amount)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className={`grid grid-cols-1 ${compactMode ? '' : 'lg:grid-cols-2'} gap-6`}>
        {/* آخرین معاملات */}
        <div className="card-dark">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FaExchangeAlt className="text-gold" />
              آخرین معاملات
            </h2>
            <Link to="/dashboard/instant-trade" className="text-gold-500 text-sm hover:text-gold-400">
              مشاهده همه
            </Link>
          </div>

          {recentTrades.length === 0 ? (
            <p className="text-dark-500 text-center py-8">معامله‌ای ثبت نشده</p>
          ) : (
            <div className="space-y-3">
              {recentTrades.map((trade) => (
                <div key={trade._id} className="flex items-center justify-between p-4 bg-dark-800/50 rounded-xl">
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
                      <p className="text-white font-medium">
                        {trade.type === 'buy' ? 'خرید' : 'فروش'} {formatNumber(trade.amount)} {trade.currency?.nameFa}
                      </p>
                      <p className="text-dark-500 text-xs">
                        {formatNumber(trade.totalAmount)} ریال
                      </p>
                    </div>
                  </div>
                  <span className={`px-2 py-1 rounded text-xs ${
                    trade.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                    trade.status === 'cancelled' ? 'bg-red-500/20 text-red-500' :
                    'bg-yellow-500/20 text-yellow-500'
                  }`}>
                    {trade.status === 'completed' ? 'تکمیل' :
                     trade.status === 'cancelled' ? 'لغو شده' : 'در جریان'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* نرخ ارز */}
        <div className="card-dark">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white">نرخ لحظه‌ای</h2>
            <Link to="/rates" className="text-gold-500 text-sm hover:text-gold-400">
              مشاهده همه
            </Link>
          </div>

          <div className="space-y-3">
            {rates.slice(0, 4).map((rate) => (
              <div key={rate._id} className="flex items-center justify-between p-4 bg-dark-800/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{rate.symbol}</span>
                  <span className="text-white font-medium">{rate.nameFa}</span>
                </div>
                <div className="text-left">
                  <p className="text-green-400 text-sm">خرید: {rate.buyRate?.toLocaleString()}</p>
                  <p className="text-red-400 text-sm">فروش: {rate.sellRate?.toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
