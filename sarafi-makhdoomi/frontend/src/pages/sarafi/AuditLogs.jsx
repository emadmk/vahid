import { useState, useEffect } from 'react';
import {
  FaHistory, FaFilter, FaExclamationTriangle, FaInfoCircle,
  FaExclamationCircle, FaSearch, FaCalendarAlt, FaUser
} from 'react-icons/fa';
import api from '../../services/api';
import toast from 'react-hot-toast';

const SarafiAuditLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: '',
    severity: '',
    action: '',
    startDate: '',
    endDate: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const categoryLabels = {
    authentication: 'احراز هویت',
    customer: 'مشتری',
    trade: 'معامله',
    order: 'سفارش',
    receipt: 'وصول',
    wallet: 'کیف پول',
    spread: 'اسپرد',
    offer: 'پیشنهاد',
    currency: 'ارز',
    permission: 'دسترسی',
    staff: 'کارکنان',
    system: 'سیستم'
  };

  const severityConfig = {
    info: { label: 'اطلاعات', icon: FaInfoCircle, class: 'text-blue-500 bg-blue-500/20' },
    warning: { label: 'هشدار', icon: FaExclamationCircle, class: 'text-yellow-500 bg-yellow-500/20' },
    critical: { label: 'بحرانی', icon: FaExclamationTriangle, class: 'text-orange-500 bg-orange-500/20' },
    high_risk: { label: 'پرخطر', icon: FaExclamationTriangle, class: 'text-red-500 bg-red-500/20' }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, filters]);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = {
        page,
        limit: 50,
        ...Object.fromEntries(Object.entries(filters).filter(([_, v]) => v))
      };
      const res = await api.get('/sarafi/audit-logs', { params });
      if (page === 1) {
        setLogs(res.data.data || []);
      } else {
        setLogs(prev => [...prev, ...(res.data.data || [])]);
      }
      setHasMore(res.data.data?.length === 50);
    } catch (error) {
      toast.error('خطا در دریافت لاگ‌ها');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      severity: '',
      action: '',
      startDate: '',
      endDate: ''
    });
    setPage(1);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderValue = (value) => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'object') return JSON.stringify(value, null, 2);
    return String(value);
  };

  if (loading && page === 1) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* هدر */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FaHistory className="text-gold" />
            لاگ عملیات
          </h1>
          <p className="text-dark-400 text-sm mt-1">ثبت و پیگیری تمام عملیات حساس</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`btn-outline flex items-center gap-2 ${showFilters ? 'border-gold text-gold' : ''}`}
        >
          <FaFilter />
          فیلترها
        </button>
      </div>

      {/* فیلترها */}
      {showFilters && (
        <div className="card p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-dark-400 text-sm mb-2">دسته‌بندی</label>
              <select
                value={filters.category}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="input w-full"
              >
                <option value="">همه</option>
                {Object.entries(categoryLabels).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-dark-400 text-sm mb-2">اهمیت</label>
              <select
                value={filters.severity}
                onChange={(e) => handleFilterChange('severity', e.target.value)}
                className="input w-full"
              >
                <option value="">همه</option>
                {Object.entries(severityConfig).map(([key, { label }]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-dark-400 text-sm mb-2">از تاریخ</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="input w-full"
              />
            </div>

            <div>
              <label className="block text-dark-400 text-sm mb-2">تا تاریخ</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="input w-full"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="btn-outline w-full"
              >
                پاک کردن فیلترها
              </button>
            </div>
          </div>
        </div>
      )}

      {/* آمار سریع */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(severityConfig).map(([key, { label, icon: Icon, class: cls }]) => {
          const count = logs.filter(l => l.severity === key).length;
          return (
            <div
              key={key}
              className={`card p-4 cursor-pointer ${filters.severity === key ? 'border-gold' : ''}`}
              onClick={() => handleFilterChange('severity', filters.severity === key ? '' : key)}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${cls}`}>
                  <Icon />
                </div>
                <div>
                  <p className="text-dark-400 text-sm">{label}</p>
                  <p className="text-white text-xl font-bold">{count}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* لیست لاگ‌ها */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-800">
              <tr>
                <th className="text-right p-4 text-dark-400">زمان</th>
                <th className="text-right p-4 text-dark-400">کاربر</th>
                <th className="text-right p-4 text-dark-400">عملیات</th>
                <th className="text-right p-4 text-dark-400">دسته</th>
                <th className="text-center p-4 text-dark-400">اهمیت</th>
                <th className="text-right p-4 text-dark-400">توضیحات</th>
              </tr>
            </thead>
            <tbody>
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center p-8 text-dark-500">
                    لاگی یافت نشد
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const severity = severityConfig[log.severity] || severityConfig.info;
                  const SeverityIcon = severity.icon;

                  return (
                    <tr
                      key={log._id}
                      className="border-t border-dark-800 hover:bg-dark-800/50 cursor-pointer"
                      onClick={() => setSelectedLog(log)}
                    >
                      <td className="p-4 text-dark-400 text-sm whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <FaUser className="text-dark-500" />
                          <span className="text-white text-sm">
                            {log.user?.firstName} {log.user?.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <code className="text-gold text-xs bg-dark-800 px-2 py-1 rounded">
                          {log.action}
                        </code>
                      </td>
                      <td className="p-4">
                        <span className="text-dark-300 text-sm">
                          {categoryLabels[log.category] || log.category}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${severity.class}`}>
                          <SeverityIcon className="text-xs" />
                          {severity.label}
                        </span>
                      </td>
                      <td className="p-4 text-dark-400 text-sm max-w-xs truncate">
                        {log.description}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {hasMore && (
          <div className="p-4 text-center">
            <button
              onClick={() => setPage(p => p + 1)}
              className="btn-outline"
              disabled={loading}
            >
              {loading ? 'در حال بارگذاری...' : 'بارگذاری بیشتر'}
            </button>
          </div>
        )}
      </div>

      {/* مودال جزئیات */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">جزئیات لاگ</h2>
              <button onClick={() => setSelectedLog(null)} className="text-dark-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-dark-500 text-sm">عملیات</label>
                  <p className="text-gold">{selectedLog.action}</p>
                </div>
                <div>
                  <label className="text-dark-500 text-sm">دسته‌بندی</label>
                  <p className="text-white">{categoryLabels[selectedLog.category]}</p>
                </div>
                <div>
                  <label className="text-dark-500 text-sm">زمان</label>
                  <p className="text-white">{formatDate(selectedLog.createdAt)}</p>
                </div>
                <div>
                  <label className="text-dark-500 text-sm">کاربر</label>
                  <p className="text-white">
                    {selectedLog.user?.firstName} {selectedLog.user?.lastName}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-dark-500 text-sm">توضیحات</label>
                <p className="text-white">{selectedLog.description}</p>
              </div>

              {selectedLog.reason && (
                <div>
                  <label className="text-dark-500 text-sm">دلیل</label>
                  <p className="text-white">{selectedLog.reason}</p>
                </div>
              )}

              {selectedLog.previousValues && (
                <div>
                  <label className="text-dark-500 text-sm">مقادیر قبلی</label>
                  <pre className="bg-dark-800 p-4 rounded-xl text-sm text-dark-300 overflow-x-auto">
                    {renderValue(selectedLog.previousValues)}
                  </pre>
                </div>
              )}

              {selectedLog.newValues && (
                <div>
                  <label className="text-dark-500 text-sm">مقادیر جدید</label>
                  <pre className="bg-dark-800 p-4 rounded-xl text-sm text-green-400 overflow-x-auto">
                    {renderValue(selectedLog.newValues)}
                  </pre>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-dark-500">IP</label>
                  <p className="text-dark-300">{selectedLog.ipAddress || '-'}</p>
                </div>
                <div>
                  <label className="text-dark-500">نقش</label>
                  <p className="text-dark-300">{selectedLog.userRole || '-'}</p>
                </div>
              </div>

              {selectedLog.isHighRisk && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-center gap-3">
                  <FaExclamationTriangle className="text-red-500" />
                  <span className="text-red-500">این عملیات به عنوان پرخطر علامت‌گذاری شده است</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedLog(null)}
              className="btn-outline w-full mt-6"
            >
              بستن
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SarafiAuditLogs;
