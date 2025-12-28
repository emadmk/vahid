import { useState, useEffect } from 'react';
import {
  FaBell, FaCheck, FaCheckDouble, FaTimes, FaExclamationCircle,
  FaInfoCircle, FaCheckCircle, FaExclamationTriangle, FaTrash,
  FaFilter, FaSearch, FaEye, FaEyeSlash
} from 'react-icons/fa';
import api from '../../services/api';
import toast from 'react-hot-toast';
import jalaliMoment from 'jalali-moment';

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread, read
  const [typeFilter, setTypeFilter] = useState('all'); // all, info, success, warning, error
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [stats, setStats] = useState({ total: 0, unread: 0 });

  useEffect(() => {
    fetchNotifications();
  }, [page, filter]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filter === 'unread') params.isRead = false;
      if (filter === 'read') params.isRead = true;

      const res = await api.get('/notifications', { params });
      setNotifications(res.data.data || []);
      setTotalPages(res.data.pages || 1);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('خطا در دریافت اعلانات');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const [countRes, allRes] = await Promise.all([
        api.get('/notifications/unread-count'),
        api.get('/notifications?limit=1')
      ]);
      setStats({
        unread: countRes.data.data?.count || 0,
        total: allRes.data.total || 0
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
      setStats(prev => ({ ...prev, unread: Math.max(0, prev.unread - 1) }));
    } catch (error) {
      toast.error('خطا در به‌روزرسانی');
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setStats(prev => ({ ...prev, unread: 0 }));
      toast.success('همه اعلانات خوانده شد');
    } catch (error) {
      toast.error('خطا در به‌روزرسانی');
    }
  };

  const deleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
      setStats(prev => ({ ...prev, total: prev.total - 1 }));
      toast.success('اعلان حذف شد');
    } catch (error) {
      toast.error('خطا در حذف');
    }
  };

  const deleteAllNotifications = async () => {
    if (!confirm('آیا از حذف همه اعلانات مطمئن هستید؟')) return;
    try {
      await api.delete('/notifications/all');
      setNotifications([]);
      setStats({ total: 0, unread: 0 });
      toast.success('همه اعلانات حذف شد');
    } catch (error) {
      toast.error('خطا در حذف');
    }
  };

  const getNotificationIcon = (type) => {
    const iconClass = "w-5 h-5";
    switch (type) {
      case 'success':
        return <FaCheckCircle className={`${iconClass} text-green-500`} />;
      case 'warning':
        return <FaExclamationTriangle className={`${iconClass} text-yellow-500`} />;
      case 'error':
        return <FaExclamationCircle className={`${iconClass} text-red-500`} />;
      default:
        return <FaInfoCircle className={`${iconClass} text-blue-500`} />;
    }
  };

  const getNotificationBg = (type, isRead) => {
    if (isRead) return 'bg-dark-800/30';
    switch (type) {
      case 'success':
        return 'bg-green-500/5 border-green-500/20';
      case 'warning':
        return 'bg-yellow-500/5 border-yellow-500/20';
      case 'error':
        return 'bg-red-500/5 border-red-500/20';
      default:
        return 'bg-blue-500/5 border-blue-500/20';
    }
  };

  const formatDate = (date) => {
    return jalaliMoment(date).format('jYYYY/jMM/jDD - HH:mm');
  };

  const formatRelativeTime = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;

    if (diff < 60000) return 'همین الان';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} دقیقه پیش`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ساعت پیش`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} روز پیش`;
    return jalaliMoment(date).format('jDD jMMMM');
  };

  const filteredNotifications = notifications.filter(n => {
    if (typeFilter !== 'all' && n.type !== typeFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        n.title?.toLowerCase().includes(query) ||
        n.message?.toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <FaBell className="text-gold" />
            اعلانات
          </h1>
          <p className="text-dark-400 mt-1">
            {stats.total} اعلان ({stats.unread} خوانده نشده)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {stats.unread > 0 && (
            <button
              onClick={markAllAsRead}
              className="btn-outline flex items-center gap-2"
            >
              <FaCheckDouble />
              خواندن همه
            </button>
          )}
          {stats.total > 0 && (
            <button
              onClick={deleteAllNotifications}
              className="btn-danger flex items-center gap-2"
            >
              <FaTrash />
              حذف همه
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <FaSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400" />
            <input
              type="text"
              placeholder="جستجو در اعلانات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input w-full pr-10"
            />
          </div>

          {/* Read Status Filter */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'all'
                  ? 'bg-gold text-dark-900'
                  : 'bg-dark-800 text-dark-300 hover:text-white'
              }`}
            >
              همه
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                filter === 'unread'
                  ? 'bg-gold text-dark-900'
                  : 'bg-dark-800 text-dark-300 hover:text-white'
              }`}
            >
              <FaEyeSlash className="w-3 h-3" />
              خوانده نشده
            </button>
            <button
              onClick={() => setFilter('read')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                filter === 'read'
                  ? 'bg-gold text-dark-900'
                  : 'bg-dark-800 text-dark-300 hover:text-white'
              }`}
            >
              <FaEye className="w-3 h-3" />
              خوانده شده
            </button>
          </div>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input w-auto"
          >
            <option value="all">همه انواع</option>
            <option value="info">اطلاع‌رسانی</option>
            <option value="success">موفقیت</option>
            <option value="warning">هشدار</option>
            <option value="error">خطا</option>
          </select>
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="loading-spinner"></div>
          </div>
        ) : filteredNotifications.length === 0 ? (
          <div className="card p-12 text-center">
            <FaBell className="text-dark-600 text-5xl mx-auto mb-4" />
            <p className="text-dark-400 text-lg">اعلانی یافت نشد</p>
          </div>
        ) : (
          filteredNotifications.map((notification) => (
            <div
              key={notification._id}
              className={`card p-4 border transition-all hover:border-dark-600 ${
                getNotificationBg(notification.type, notification.isRead)
              }`}
            >
              <div className="flex items-start gap-4">
                {/* Icon */}
                <div className={`p-3 rounded-xl ${
                  notification.isRead ? 'bg-dark-800' : 'bg-dark-700'
                }`}>
                  {getNotificationIcon(notification.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className={`font-bold ${
                        notification.isRead ? 'text-dark-300' : 'text-white'
                      }`}>
                        {notification.title || 'اعلان جدید'}
                      </h3>
                      <p className={`mt-1 ${
                        notification.isRead ? 'text-dark-500' : 'text-dark-300'
                      }`}>
                        {notification.message}
                      </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {!notification.isRead && (
                        <button
                          onClick={() => markAsRead(notification._id)}
                          className="p-2 rounded-lg text-dark-400 hover:text-green-500 hover:bg-dark-800 transition-all"
                          title="علامت‌گذاری به عنوان خوانده شده"
                        >
                          <FaCheck />
                        </button>
                      )}
                      <button
                        onClick={() => deleteNotification(notification._id)}
                        className="p-2 rounded-lg text-dark-400 hover:text-red-500 hover:bg-dark-800 transition-all"
                        title="حذف"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="flex items-center gap-4 mt-3 text-xs text-dark-500">
                    <span>{formatDate(notification.createdAt)}</span>
                    <span className="text-dark-600">•</span>
                    <span>{formatRelativeTime(notification.createdAt)}</span>
                    {!notification.isRead && (
                      <>
                        <span className="text-dark-600">•</span>
                        <span className="flex items-center gap-1 text-gold">
                          <span className="w-2 h-2 bg-gold rounded-full animate-pulse"></span>
                          جدید
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-outline disabled:opacity-50"
          >
            قبلی
          </button>
          <span className="px-4 py-2 text-dark-400">
            صفحه {page} از {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="btn-outline disabled:opacity-50"
          >
            بعدی
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationsPage;
