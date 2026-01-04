import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FaBell, FaCheck, FaCheckDouble, FaTimes, FaExclamationCircle,
  FaInfoCircle, FaCheckCircle, FaExclamationTriangle, FaArrowLeft,
  FaTrash, FaCog
} from 'react-icons/fa';
import api from '../../services/api';
import toast from 'react-hot-toast';
import useAuthStore from '../../store/authStore';

const NotificationDropdown = ({ basePath = '/dashboard' }) => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadCount(res.data.data?.count || 0);
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications?limit=10');
      setNotifications(res.data.data || []);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      setNotifications(prev =>
        prev.map(n => n._id === id ? { ...n, isRead: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await api.put('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
      toast.success('همه اعلانات خوانده شد');
    } catch (error) {
      toast.error('خطا در به‌روزرسانی');
    }
  };

  const deleteNotification = async (id, e) => {
    e.stopPropagation();
    try {
      await api.delete(`/notifications/${id}`);
      setNotifications(prev => prev.filter(n => n._id !== id));
      toast.success('اعلان حذف شد');
    } catch (error) {
      toast.error('خطا در حذف');
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'success':
        return <FaCheckCircle className="text-green-500" />;
      case 'warning':
        return <FaExclamationTriangle className="text-yellow-500" />;
      case 'error':
        return <FaExclamationCircle className="text-red-500" />;
      default:
        return <FaInfoCircle className="text-blue-500" />;
    }
  };

  const formatTime = (date) => {
    const d = new Date(date);
    const now = new Date();
    const diff = now - d;

    if (diff < 60000) return 'همین الان';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} دقیقه پیش`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} ساعت پیش`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} روز پیش`;
    return d.toLocaleDateString('fa-IR');
  };

  const handleNotificationClick = (notification) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }

    // Navigate based on notification type/link/actionUrl
    const targetUrl = notification.link || notification.actionUrl;
    if (targetUrl) {
      // اگر مسیر با / شروع نشده، با basePath ترکیب کن
      const fullPath = targetUrl.startsWith('/') ? targetUrl : `${basePath}/${targetUrl}`;
      navigate(fullPath);
      setIsOpen(false);
    }
  };

  const goToNotificationsPage = () => {
    setIsOpen(false);
    navigate(`${basePath}/notifications`);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-dark-400 hover:text-gold-500 transition-colors rounded-lg hover:bg-dark-800"
      >
        <FaBell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 rounded-full text-[10px] text-white flex items-center justify-center font-bold px-1">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-dark-900 border border-dark-700 rounded-xl shadow-2xl z-[100] overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-dark-700 flex items-center justify-between bg-dark-800">
            <h3 className="font-bold text-white flex items-center gap-2">
              <FaBell className="text-gold" />
              اعلانات
              {unreadCount > 0 && (
                <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                  {unreadCount} جدید
                </span>
              )}
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-gold hover:text-gold/80 flex items-center gap-1"
                >
                  <FaCheckDouble />
                  خواندن همه
                </button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="loading-spinner"></div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8">
                <FaBell className="text-dark-600 text-4xl mx-auto mb-3" />
                <p className="text-dark-400">اعلانی وجود ندارد</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  onClick={() => handleNotificationClick(notification)}
                  className={`px-4 py-3 border-b border-dark-700 cursor-pointer transition-all hover:bg-dark-800 ${
                    !notification.isRead ? 'bg-dark-850' : 'bg-dark-900'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`mt-1 p-2 rounded-lg ${
                      !notification.isRead ? 'bg-dark-700' : 'bg-dark-800'
                    }`}>
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={`text-sm leading-relaxed ${
                          !notification.isRead ? 'text-white font-medium' : 'text-dark-300'
                        }`}>
                          {notification.title || notification.message}
                        </p>
                        <button
                          onClick={(e) => deleteNotification(notification._id, e)}
                          className="text-dark-500 hover:text-red-500 p-1 flex-shrink-0"
                        >
                          <FaTimes className="w-3 h-3" />
                        </button>
                      </div>
                      {notification.title && notification.message && (
                        <p className="text-xs text-dark-400 mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-[10px] text-dark-500">
                          {formatTime(notification.createdAt)}
                        </span>
                        {!notification.isRead && (
                          <span className="w-2 h-2 bg-gold rounded-full"></span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-dark-700 bg-dark-800">
            <button
              onClick={goToNotificationsPage}
              className="w-full py-2 text-center text-gold hover:text-gold/80 text-sm font-medium flex items-center justify-center gap-2"
            >
              مشاهده همه اعلانات
              <FaArrowLeft className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
