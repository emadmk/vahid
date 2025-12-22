import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaUsers, FaExchangeAlt, FaGlobe, FaClock, FaCheckCircle } from 'react-icons/fa';
import { sarafiAPI } from '../../services/api';
import useAuthStore from '../../store/authStore';
import jalaliMoment from 'jalali-moment';

const SarafiDashboard = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await sarafiAPI.getDashboard();
        setStats(res.data.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  const getStatusBadge = (status) => {
    const map = {
      pending: { label: 'در انتظار', class: 'badge-warning' },
      approved: { label: 'تایید شده', class: 'badge-success' }
    };
    const s = map[status] || { label: status, class: 'badge-info' };
    return <span className={`badge ${s.class}`}>{s.label}</span>;
  };

  return (
    <div className="space-y-6">
      {/* خوش‌آمدگویی */}
      <div className="card-gold">
        <h1 className="text-2xl font-bold text-white mb-2">
          سلام {user?.firstName} عزیز! 👋
        </h1>
        <p className="text-dark-300">به پنل صراف خوش آمدید</p>
      </div>

      {/* آمار */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Link to="/sarafi/customers" className="stat-card hover:border-gold-500/30">
          <FaUsers className="text-blue-500 text-2xl mb-2" />
          <div className="stat-value">{stats?.customers?.total || 0}</div>
          <div className="stat-label">مشتریان</div>
          {stats?.customers?.pending > 0 && (
            <p className="text-yellow-500 text-xs mt-1">{stats.customers.pending} در انتظار تایید</p>
          )}
        </Link>

        <Link to="/sarafi/requests" className="stat-card hover:border-gold-500/30">
          <FaExchangeAlt className="text-gold-500 text-2xl mb-2" />
          <div className="stat-value">{stats?.requests?.total || 0}</div>
          <div className="stat-label">کل درخواست‌ها</div>
          {stats?.requests?.pending > 0 && (
            <p className="text-yellow-500 text-xs mt-1">{stats.requests.pending} در انتظار</p>
          )}
        </Link>

        <Link to="/sarafi/public-requests" className="stat-card hover:border-gold-500/30">
          <FaGlobe className="text-green-500 text-2xl mb-2" />
          <div className="stat-value">{stats?.publicRequests || 0}</div>
          <div className="stat-label">درخواست‌های عمومی</div>
        </Link>

        <div className="stat-card">
          <FaCheckCircle className="text-purple-500 text-2xl mb-2" />
          <div className="stat-value">{stats?.requests?.completed || 0}</div>
          <div className="stat-label">تکمیل شده</div>
        </div>
      </div>

      {/* درخواست‌های امروز */}
      <div className="card-dark">
        <div className="flex items-center gap-3 mb-4">
          <FaClock className="text-gold-500" />
          <h2 className="text-lg font-bold text-white">
            درخواست‌های امروز: {stats?.requests?.today || 0}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* آخرین درخواست‌ها */}
        <div className="card-dark">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white">آخرین درخواست‌ها</h2>
            <Link to="/sarafi/requests" className="text-gold-500 text-sm">مشاهده همه ←</Link>
          </div>
          {stats?.recentRequests?.length > 0 ? (
            <div className="space-y-3">
              {stats.recentRequests.map((req) => (
                <div key={req._id} className="flex items-center justify-between p-3 bg-dark-800/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{req.currency?.symbol}</span>
                    <div>
                      <p className="text-white text-sm">
                        {req.type === 'buy' ? 'خرید' : 'فروش'} {req.amount} {req.currency?.nameFa}
                      </p>
                      <p className="text-dark-500 text-xs">{req.user?.firstName} {req.user?.lastName}</p>
                    </div>
                  </div>
                  <span className={`badge ${req.status === 'pending' ? 'badge-warning' : 'badge-success'}`}>
                    {req.status === 'pending' ? 'جدید' : 'پذیرفته'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-dark-500 text-center py-4">درخواستی وجود ندارد</p>
          )}
        </div>

        {/* مشتریان جدید */}
        <div className="card-dark">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white">مشتریان جدید</h2>
            <Link to="/sarafi/customers" className="text-gold-500 text-sm">مشاهده همه ←</Link>
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
                      <p className="text-dark-500 text-xs">{customer.email}</p>
                    </div>
                  </div>
                  {getStatusBadge(customer.sarafiApprovalStatus)}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-dark-500 text-center py-4">مشتری جدیدی وجود ندارد</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SarafiDashboard;
