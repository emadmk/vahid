import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaPlus, FaList, FaCheckCircle, FaClock, FaGlobe } from 'react-icons/fa';
import { requestAPI, publicAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import jalaliMoment from 'jalali-moment';

const Dashboard = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState({ pending: 0, completed: 0, total: 0 });
  const [recentRequests, setRecentRequests] = useState([]);
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [requestsRes, ratesRes] = await Promise.all([
          requestAPI.getMyRequests({ limit: 5 }),
          publicAPI.getRates()
        ]);

        setRecentRequests(requestsRes.data.data);
        setRates(ratesRes.data.data);

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
        <h1 className="text-2xl font-bold text-white mb-2">
          سلام {user?.firstName} عزیز! 👋
        </h1>
        <p className="text-dark-300">
          به پنل کاربری صرافی گلدن 2026 خوش آمدید
        </p>
      </div>

      {/* آمار */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="stat-card">
          <FaList className="text-gold-500 text-2xl mb-2" />
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
      </div>

      {/* دکمه‌های سریع */}
      {user?.status === 'approved' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Link to="/dashboard/new-request" className="card-dark hover:border-gold-500/50 flex items-center gap-4 transition-all">
            <div className="w-12 h-12 rounded-full bg-gold-500/10 flex items-center justify-center text-gold-500">
              <FaPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white font-bold">درخواست جدید</h3>
              <p className="text-dark-400 text-sm">ثبت درخواست خرید یا فروش ارز</p>
            </div>
          </Link>
          <Link to="/dashboard/public-requests" className="card-dark hover:border-gold-500/50 flex items-center gap-4 transition-all">
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
              <FaGlobe className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-white font-bold">درخواست‌های عمومی</h3>
              <p className="text-dark-400 text-sm">مشاهده درخواست‌های دیگر کاربران</p>
            </div>
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* آخرین درخواست‌ها */}
        <div className="card-dark">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white">آخرین درخواست‌ها</h2>
            <Link to="/dashboard/requests" className="text-gold-500 text-sm hover:text-gold-400">
              مشاهده همه ←
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

        {/* نرخ ارز */}
        <div className="card-dark">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white">نرخ لحظه‌ای</h2>
            <Link to="/rates" className="text-gold-500 text-sm hover:text-gold-400">
              مشاهده همه ←
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
