import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FaPlus, FaList, FaCheckCircle, FaClock, FaGlobe,
  FaWallet, FaStar, FaExchangeAlt, FaStore, FaMedal,
  FaArrowUp, FaArrowDown, FaCreditCard
} from 'react-icons/fa';
import { requestAPI, publicAPI } from '../../services/api';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import jalaliMoment from 'jalali-moment';

const tierColors = {
  A: { bg: 'bg-gold/20', text: 'text-gold', label: 'طلایی' },
  B: { bg: 'bg-blue-500/20', text: 'text-blue-500', label: 'نقره‌ای' },
  C: { bg: 'bg-purple-500/20', text: 'text-purple-500', label: 'برنزی' },
  new: { bg: 'bg-gray-500/20', text: 'text-gray-400', label: 'جدید' }
};

const Dashboard = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({ pending: 0, completed: 0, total: 0 });
  const [recentRequests, setRecentRequests] = useState([]);
  const [rates, setRates] = useState([]);
  const [wallets, setWallets] = useState({ cash: null, credit: null });
  const [recentTrades, setRecentTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [requestsRes, ratesRes, walletsRes, tradesRes] = await Promise.all([
          requestAPI.getMyRequests({ limit: 5 }),
          publicAPI.getRates(),
          api.get('/wallets/my-wallets').catch(() => ({ data: { data: [] } })),
          api.get('/trades/my-trades', { params: { limit: 3 } }).catch(() => ({ data: { data: [] } }))
        ]);

        setRecentRequests(requestsRes.data.data);
        setRates(ratesRes.data.data);
        setRecentTrades(tradesRes.data.data || []);

        // تنظیم کیف پول‌ها
        const walletsData = walletsRes.data.data || [];
        setWallets({
          cash: walletsData.find(w => w.type === 'cash'),
          credit: walletsData.find(w => w.type === 'credit')
        });

        // محاسبه آمار
        const all = requestsRes.data.data;
        setStats({
          total: requestsRes.data.total,
          pending: all.filter(r => ['pending', 'waiting_public', 'public'].includes(r.status)).length,
          completed: all.filter(r => r.status === 'completed').length
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
            {formatNumber(wallets.cash?.balance || 0)}
            <span className="text-sm text-dark-400 mr-1">ریال</span>
          </p>
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
                {formatNumber((wallets.credit?.creditLimit || 0) - (wallets.credit?.usedCredit || 0))}
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
        </Link>
      </div>

      {/* آمار سریع */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stat-card">
          <FaList className="text-gold text-2xl mb-2" />
          <div className="stat-value">{stats.total}</div>
          <div className="stat-label">کل درخواست‌ها</div>
        </div>
        <div className="stat-card">
          <FaClock className="text-yellow-500 text-2xl mb-2" />
          <div className="stat-value">{stats.pending}</div>
          <div className="stat-label">در انتظار</div>
        </div>
        <div className="stat-card">
          <FaCheckCircle className="text-green-500 text-2xl mb-2" />
          <div className="stat-value">{stats.completed}</div>
          <div className="stat-label">تکمیل شده</div>
        </div>
        <div className="stat-card">
          <FaExchangeAlt className="text-purple-500 text-2xl mb-2" />
          <div className="stat-value">{recentTrades.length}</div>
          <div className="stat-label">معاملات اخیر</div>
        </div>
      </div>

      {/* دکمه‌های سریع */}
      {user?.status === 'approved' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/dashboard/new-request" className="card-dark hover:border-gold-500/50 flex items-center gap-4 transition-all">
            <div className="w-12 h-12 rounded-full bg-gold-500/10 flex items-center justify-center text-gold-500">
              <FaPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white font-bold">درخواست جدید</h3>
              <p className="text-dark-400 text-sm">ثبت درخواست خرید یا فروش</p>
            </div>
          </Link>
          <Link to="/dashboard/market" className="card-dark hover:border-gold-500/50 flex items-center gap-4 transition-all">
            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
              <FaStore className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white font-bold">بازار</h3>
              <p className="text-dark-400 text-sm">مشاهده و ثبت پیشنهاد</p>
            </div>
          </Link>
          <Link to="/dashboard/trades" className="card-dark hover:border-gold-500/50 flex items-center gap-4 transition-all">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500">
              <FaExchangeAlt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white font-bold">معاملات من</h3>
              <p className="text-dark-400 text-sm">پیگیری معاملات جاری</p>
            </div>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* آخرین معاملات */}
        <div className="card-dark">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FaExchangeAlt className="text-gold" />
              آخرین معاملات
            </h2>
            <Link to="/dashboard/trades" className="text-gold-500 text-sm hover:text-gold-400">
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

      {/* آخرین درخواست‌ها */}
      <div className="card-dark">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold text-white">آخرین درخواست‌ها</h2>
          <Link to="/dashboard/requests" className="text-gold-500 text-sm hover:text-gold-400">
            مشاهده همه
          </Link>
        </div>

        {recentRequests.length === 0 ? (
          <p className="text-dark-500 text-center py-8">درخواستی ثبت نشده</p>
        ) : (
          <div className="space-y-3">
            {recentRequests.map((request) => (
              <div key={request._id} className="flex items-center justify-between p-4 bg-dark-800/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{request.currency?.symbol}</span>
                  <div>
                    <p className="text-white font-medium">
                      {request.type === 'buy' ? 'خرید' : 'فروش'} {request.amount} {request.currency?.nameFa}
                    </p>
                    <p className="text-dark-500 text-xs">
                      {jalaliMoment(request.createdAt).format('jYYYY/jMM/jDD - HH:mm')}
                    </p>
                  </div>
                </div>
                {getStatusBadge(request.status)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
