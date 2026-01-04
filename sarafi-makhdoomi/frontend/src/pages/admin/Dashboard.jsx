import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaUsers, FaUserTie, FaExchangeAlt, FaCoins, FaClock, FaCheckCircle, FaChartLine, FaBolt } from 'react-icons/fa';
import { adminAPI } from '../../services/api';
import api from '../../services/api';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [tradeStats, setTradeStats] = useState(null);
  const [recentTrades, setRecentTrades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [dashRes, instantRes, recentRes] = await Promise.all([
          adminAPI.getDashboard(),
          api.get('/admin/instant-trades/stats').catch(() => ({ data: { data: {} } })),
          api.get('/admin/instant-trades', { params: { limit: 5 } }).catch(() => ({ data: { data: [] } }))
        ]);
        setStats(dashRes.data.data);
        setTradeStats(instantRes.data.data || {});
        setRecentTrades(recentRes.data.data || []);
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
    { icon: FaBolt, label: 'معاملات فوری', value: tradeStats?.total, pending: tradeStats?.pending, color: 'gold', link: '/admin/instant-trades' },
    { icon: FaChartLine, label: 'معاملات حرفه‌ای', value: stats?.orders?.total || 0, color: 'green', link: '/admin/pro-trades' }
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

      {/* آمار معاملات */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="stat-card border-r-4 border-yellow-500">
          <FaClock className="text-yellow-500 text-2xl mb-2" />
          <div className="stat-value">{tradeStats?.pending || 0}</div>
          <div className="stat-label">در انتظار تایید</div>
        </div>
        <div className="stat-card border-r-4 border-orange-500">
          <FaExchangeAlt className="text-orange-500 text-2xl mb-2" />
          <div className="stat-value">{tradeStats?.pending_collection || 0}</div>
          <div className="stat-label">در انتظار وصول</div>
        </div>
        <div className="stat-card border-r-4 border-green-500">
          <FaCheckCircle className="text-green-500 text-2xl mb-2" />
          <div className="stat-value">{tradeStats?.completed || 0}</div>
          <div className="stat-label">تکمیل شده</div>
        </div>
        <div className="stat-card border-r-4 border-gold">
          <FaCoins className="text-gold text-2xl mb-2" />
          <div className="stat-value">{(tradeStats?.totalVolume || 0).toLocaleString()}</div>
          <div className="stat-label">حجم معاملات (ریال)</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* آخرین معاملات */}
        <div className="card-dark">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-bold text-white">آخرین معاملات فوری</h2>
            <Link to="/admin/instant-trades" className="text-gold-500 text-sm">مشاهده همه ←</Link>
          </div>
          <div className="space-y-3">
            {recentTrades.length === 0 ? (
              <p className="text-dark-500 text-center py-4">معامله‌ای ثبت نشده</p>
            ) : (
              recentTrades.map((trade) => (
                <div key={trade._id} className="flex items-center justify-between p-3 bg-dark-800/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{trade.currency?.symbol || '💱'}</span>
                    <div>
                      <p className="text-white text-sm">
                        {trade.type === 'buy' ? 'خرید' : 'فروش'} {trade.currency?.nameFa}
                      </p>
                      <p className="text-dark-500 text-xs">{trade.customer?.firstName} {trade.customer?.lastName}</p>
                    </div>
                  </div>
                  {getStatusBadge(trade.status)}
                </div>
              ))
            )}
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
