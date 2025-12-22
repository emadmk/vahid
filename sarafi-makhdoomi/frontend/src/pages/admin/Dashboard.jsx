import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaUsers, FaUserTie, FaExchangeAlt, FaCoins, FaClock, FaCheckCircle } from 'react-icons/fa';
import { adminAPI } from '../../services/api';
import jalaliMoment from 'jalali-moment';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await adminAPI.getDashboard();
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

  const statCards = [
    { icon: FaUsers, label: 'کاربران', value: stats?.users?.total, pending: stats?.users?.pending, color: 'blue', link: '/admin/users' },
    { icon: FaUserTie, label: 'صراف‌ها', value: stats?.sarafis?.total, pending: stats?.sarafis?.pending, color: 'purple', link: '/admin/sarafis' },
    { icon: FaExchangeAlt, label: 'درخواست‌ها', value: stats?.requests?.total, pending: stats?.requests?.pending, color: 'green', link: '/admin/requests' },
    { icon: FaCheckCircle, label: 'تکمیل شده', value: stats?.requests?.completed, color: 'gold', link: '/admin/requests' }
  ];

  const getStatusBadge = (status) => {
    const map = {
      pending: { label: 'در انتظار', class: 'badge-warning' },
      approved: { label: 'تایید شده', class: 'badge-success' },
      completed: { label: 'تکمیل شده', class: 'badge-success' }
    };
    const s = map[status] || { label: status, class: 'badge-info' };
    return <span className={`badge ${s.class}`}>{s.label}</span>;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white">داشبورد مدیریت</h1>

      {/* آمار */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, index) => (
          <Link key={index} to={card.link} className="card-dark hover:border-gold-500/30 transition-all">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl bg-${card.color}-500/10 flex items-center justify-center text-${card.color}-500`}>
                <card.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-dark-400 text-sm">{card.label}</p>
                <p className="text-2xl font-bold text-white">{card.value || 0}</p>
                {card.pending > 0 && (
                  <p className="text-yellow-500 text-xs">{card.pending} در انتظار</p>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* آمار امروز */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="stat-card">
          <FaClock className="text-gold-500 text-2xl mb-2" />
          <div className="stat-value">{stats?.requests?.today || 0}</div>
          <div className="stat-label">درخواست امروز</div>
        </div>
        <div className="stat-card">
          <FaExchangeAlt className="text-blue-500 text-2xl mb-2" />
          <div className="stat-value">{stats?.requests?.public || 0}</div>
          <div className="stat-label">درخواست عمومی</div>
        </div>
        <div className="stat-card">
          <FaCoins className="text-green-500 text-2xl mb-2" />
          <div className="stat-value">{(stats?.transactions?.total || 0).toLocaleString()}</div>
          <div className="stat-label">مجموع تراکنش‌ها (تومان)</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* آخرین درخواست‌ها */}
        <div className="card-dark">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white">آخرین درخواست‌ها</h2>
            <Link to="/admin/requests" className="text-gold-500 text-sm">مشاهده همه ←</Link>
          </div>
          <div className="space-y-3">
            {stats?.recentRequests?.map((req) => (
              <div key={req._id} className="flex items-center justify-between p-3 bg-dark-800/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{req.currency?.symbol}</span>
                  <div>
                    <p className="text-white text-sm">
                      {req.type === 'buy' ? 'خرید' : 'فروش'} {req.currency?.nameFa}
                    </p>
                    <p className="text-dark-500 text-xs">{req.user?.firstName} {req.user?.lastName}</p>
                  </div>
                </div>
                {getStatusBadge(req.status)}
              </div>
            ))}
          </div>
        </div>

        {/* آخرین کاربران */}
        <div className="card-dark">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white">آخرین کاربران</h2>
            <Link to="/admin/users" className="text-gold-500 text-sm">مشاهده همه ←</Link>
          </div>
          <div className="space-y-3">
            {stats?.recentUsers?.map((user) => (
              <div key={user._id} className="flex items-center justify-between p-3 bg-dark-800/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-500">
                    {user.firstName?.[0]}
                  </div>
                  <div>
                    <p className="text-white text-sm">{user.firstName} {user.lastName}</p>
                    <p className="text-dark-500 text-xs">{user.email}</p>
                  </div>
                </div>
                {getStatusBadge(user.status)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
