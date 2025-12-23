import { useState, useEffect } from 'react';
import {
  FaExchangeAlt, FaSpinner, FaSearch, FaFilter, FaEye,
  FaCheck, FaTimes, FaDownload, FaChartLine
} from 'react-icons/fa';
import api from '../../services/api';
import Select from '../../components/ui/Select';

const statusLabels = {
  pending: { label: 'در انتظار', color: 'bg-yellow-500/20 text-yellow-500' },
  approved: { label: 'تایید شده', color: 'bg-blue-500/20 text-blue-500' },
  processing: { label: 'در حال پردازش', color: 'bg-purple-500/20 text-purple-500' },
  awaiting_currency: { label: 'انتظار وصول ارز', color: 'bg-orange-500/20 text-orange-500' },
  awaiting_rial: { label: 'انتظار وصول ریال', color: 'bg-orange-500/20 text-orange-500' },
  completed: { label: 'تکمیل شده', color: 'bg-green-500/20 text-green-500' },
  cancelled: { label: 'لغو شده', color: 'bg-red-500/20 text-red-500' }
};

const AdminTrades = () => {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', type: '', sarafi: '', search: '' });
  const [stats, setStats] = useState(null);
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

  useEffect(() => {
    fetchData();
  }, [filter, pagination.page]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tradesRes, statsRes] = await Promise.all([
        api.get('/admin/trades', {
          params: {
            ...filter,
            page: pagination.page,
            limit: pagination.limit
          }
        }),
        api.get('/admin/trades/stats')
      ]);
      setTrades(tradesRes.data.data || []);
      setPagination(prev => ({ ...prev, total: tradesRes.data.total || 0 }));
      setStats(statsRes.data.data);
    } catch (error) {
      console.error('خطا در دریافت معاملات:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('fa-IR').format(num || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fa-IR');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <FaExchangeAlt className="text-gold" />
          مانیتورینگ معاملات
        </h1>
        <button className="btn-outline px-4 py-2 flex items-center gap-2">
          <FaDownload /> خروجی اکسل
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="card p-4 text-center border-l-4 border-yellow-500">
            <p className="text-dark-400 text-xs mb-1">در انتظار</p>
            <p className="text-2xl font-bold text-yellow-500">{stats.pending || 0}</p>
          </div>
          <div className="card p-4 text-center border-l-4 border-blue-500">
            <p className="text-dark-400 text-xs mb-1">در حال پردازش</p>
            <p className="text-2xl font-bold text-blue-500">{stats.processing || 0}</p>
          </div>
          <div className="card p-4 text-center border-l-4 border-orange-500">
            <p className="text-dark-400 text-xs mb-1">انتظار وصول</p>
            <p className="text-2xl font-bold text-orange-500">{stats.awaiting || 0}</p>
          </div>
          <div className="card p-4 text-center border-l-4 border-green-500">
            <p className="text-dark-400 text-xs mb-1">تکمیل شده</p>
            <p className="text-2xl font-bold text-green-500">{stats.completed || 0}</p>
          </div>
          <div className="card p-4 text-center border-l-4 border-red-500">
            <p className="text-dark-400 text-xs mb-1">لغو شده</p>
            <p className="text-2xl font-bold text-red-500">{stats.cancelled || 0}</p>
          </div>
          <div className="card p-4 text-center border-l-4 border-gold">
            <p className="text-dark-400 text-xs mb-1">حجم کل</p>
            <p className="text-lg font-bold text-gold">{formatNumber(stats.totalVolume)} ریال</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <FaFilter className="text-dark-400" />
          <div className="relative flex-1 min-w-[200px]">
            <FaSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400" />
            <input
              type="text"
              placeholder="جستجوی شماره معامله یا مشتری..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              className="input-field w-full pr-10"
            />
          </div>
          <Select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            className="w-44"
            placeholder="همه وضعیت‌ها"
            options={[
              { value: '', label: 'همه وضعیت‌ها' },
              { value: 'pending', label: 'در انتظار' },
              { value: 'approved', label: 'تایید شده' },
              { value: 'processing', label: 'در حال پردازش' },
              { value: 'awaiting_currency', label: 'انتظار وصول ارز' },
              { value: 'awaiting_rial', label: 'انتظار وصول ریال' },
              { value: 'completed', label: 'تکمیل شده' },
              { value: 'cancelled', label: 'لغو شده' }
            ]}
          />
          <Select
            value={filter.type}
            onChange={(e) => setFilter({ ...filter, type: e.target.value })}
            className="w-32"
            placeholder="همه انواع"
            options={[
              { value: '', label: 'همه انواع' },
              { value: 'buy', label: 'خرید' },
              { value: 'sell', label: 'فروش' }
            ]}
          />
        </div>
      </div>

      {/* Trades Table */}
      {loading ? (
        <div className="flex justify-center py-10">
          <FaSpinner className="animate-spin text-gold text-3xl" />
        </div>
      ) : trades.length === 0 ? (
        <div className="card p-10 text-center text-dark-400">
          معامله‌ای یافت نشد
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-800">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-medium text-dark-400">شماره</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-dark-400">نوع</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-dark-400">ارز</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-dark-400">مقدار</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-dark-400">مبلغ کل</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-dark-400">مشتری</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-dark-400">صراف</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-dark-400">وضعیت</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-dark-400">تاریخ</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-dark-400">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {trades.map((trade) => {
                  const status = statusLabels[trade.status] || statusLabels.pending;
                  return (
                    <tr key={trade._id} className="hover:bg-dark-800/50">
                      <td className="px-4 py-3 text-sm font-mono">{trade.tradeNumber}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-xs ${
                          trade.type === 'buy' ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                        }`}>
                          {trade.type === 'buy' ? 'خرید' : 'فروش'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{trade.currency?.symbol}</span>
                          <span className="text-sm">{trade.currency?.nameFa}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">{formatNumber(trade.amount)}</td>
                      <td className="px-4 py-3 text-gold font-bold">{formatNumber(trade.totalAmount)} ریال</td>
                      <td className="px-4 py-3 text-sm">
                        {trade.customer?.firstName} {trade.customer?.lastName}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {trade.sarafi?.firstName} {trade.sarafi?.lastName}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${status.color}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-dark-400">{formatDate(trade.createdAt)}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setSelectedTrade(trade)}
                          className="text-gold hover:text-gold-400"
                        >
                          <FaEye />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.total > pagination.limit && (
            <div className="p-4 border-t border-dark-700 flex items-center justify-between">
              <span className="text-sm text-dark-400">
                نمایش {(pagination.page - 1) * pagination.limit + 1} تا {Math.min(pagination.page * pagination.limit, pagination.total)} از {pagination.total}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 rounded bg-dark-800 disabled:opacity-50"
                >
                  قبلی
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page * pagination.limit >= pagination.total}
                  className="px-3 py-1 rounded bg-dark-800 disabled:opacity-50"
                >
                  بعدی
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trade Details Modal */}
      {selectedTrade && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FaChartLine className="text-gold" />
                جزئیات معامله
              </h2>
              <button onClick={() => setSelectedTrade(null)} className="text-dark-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-dark-800 p-4 rounded-lg">
                <p className="text-dark-400 text-sm">شماره معامله</p>
                <p className="font-mono font-bold">{selectedTrade.tradeNumber}</p>
              </div>
              <div className="bg-dark-800 p-4 rounded-lg">
                <p className="text-dark-400 text-sm">وضعیت</p>
                <span className={`px-2 py-1 rounded-full text-xs ${statusLabels[selectedTrade.status]?.color}`}>
                  {statusLabels[selectedTrade.status]?.label}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              <div>
                <p className="text-dark-400 text-sm">نوع معامله</p>
                <p className="font-bold">{selectedTrade.type === 'buy' ? 'خرید' : 'فروش'}</p>
              </div>
              <div>
                <p className="text-dark-400 text-sm">ارز</p>
                <p className="font-bold">{selectedTrade.currency?.nameFa}</p>
              </div>
              <div>
                <p className="text-dark-400 text-sm">مقدار</p>
                <p className="font-bold">{formatNumber(selectedTrade.amount)}</p>
              </div>
              <div>
                <p className="text-dark-400 text-sm">نرخ</p>
                <p className="font-bold">{formatNumber(selectedTrade.rate)} ریال</p>
              </div>
              <div>
                <p className="text-dark-400 text-sm">مبلغ کل</p>
                <p className="font-bold text-gold">{formatNumber(selectedTrade.totalAmount)} ریال</p>
              </div>
              <div>
                <p className="text-dark-400 text-sm">کارمزد</p>
                <p className="font-bold text-green-500">{formatNumber(selectedTrade.commission?.amount)} ریال</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-dark-800 p-4 rounded-lg">
                <p className="text-dark-400 text-sm mb-2">مشتری</p>
                <p className="font-bold">{selectedTrade.customer?.firstName} {selectedTrade.customer?.lastName}</p>
                <p className="text-sm text-dark-400">{selectedTrade.customer?.phone}</p>
              </div>
              <div className="bg-dark-800 p-4 rounded-lg">
                <p className="text-dark-400 text-sm mb-2">صراف</p>
                <p className="font-bold">{selectedTrade.sarafi?.firstName} {selectedTrade.sarafi?.lastName}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-3 p-3 bg-dark-800 rounded-lg">
                <span className={`w-3 h-3 rounded-full ${
                  selectedTrade.currencyCollection?.status === 'collected' ? 'bg-green-500' : 'bg-yellow-500'
                }`} />
                <div>
                  <p className="text-sm">وصول ارز</p>
                  <p className="text-xs text-dark-400">
                    {selectedTrade.currencyCollection?.status === 'collected' ? 'انجام شده' : 'در انتظار'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-dark-800 rounded-lg">
                <span className={`w-3 h-3 rounded-full ${
                  selectedTrade.rialCollection?.status === 'collected' ? 'bg-green-500' : 'bg-yellow-500'
                }`} />
                <div>
                  <p className="text-sm">وصول ریال</p>
                  <p className="text-xs text-dark-400">
                    {selectedTrade.rialCollection?.status === 'collected' ? 'انجام شده' : 'در انتظار'}
                  </p>
                </div>
              </div>
            </div>

            <div className="text-sm text-dark-400">
              تاریخ ثبت: {new Date(selectedTrade.createdAt).toLocaleDateString('fa-IR')} - {new Date(selectedTrade.createdAt).toLocaleTimeString('fa-IR')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminTrades;
