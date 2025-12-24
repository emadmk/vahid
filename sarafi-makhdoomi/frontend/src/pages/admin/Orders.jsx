import { useState, useEffect } from 'react';
import {
  FaBook, FaArrowUp, FaArrowDown, FaFilter, FaSearch, FaEye
} from 'react-icons/fa';
import api from '../../services/api';
import toast from 'react-hot-toast';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sarafis, setSarafis] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [filters, setFilters] = useState({
    sarafiId: '',
    currencyId: '',
    status: '',
    side: ''
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [stats, setStats] = useState({});

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [filters]);

  const fetchInitialData = async () => {
    try {
      const [sarafisRes, currenciesRes] = await Promise.all([
        api.get('/admin/sarafis'),
        api.get('/public/currencies')
      ]);
      setSarafis(sarafisRes.data.data || []);
      setCurrencies(currenciesRes.data.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = Object.fromEntries(Object.entries(filters).filter(([_, v]) => v));
      const res = await api.get('/admin/orders', { params });
      setOrders(res.data.data || []);

      // محاسبه آمار
      const orders = res.data.data || [];
      setStats({
        total: orders.length,
        open: orders.filter(o => ['pending', 'open', 'partially_filled'].includes(o.status)).length,
        filled: orders.filter(o => o.status === 'filled').length,
        cancelled: orders.filter(o => ['cancelled', 'rejected', 'expired'].includes(o.status)).length
      });
    } catch (error) {
      toast.error('خطا در دریافت سفارشات');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      pending: { label: 'در انتظار', class: 'bg-yellow-500/20 text-yellow-500' },
      pending_credit: { label: 'بررسی اعتبار', class: 'bg-orange-500/20 text-orange-500' },
      open: { label: 'فعال', class: 'bg-blue-500/20 text-blue-500' },
      partially_filled: { label: 'تکمیل جزئی', class: 'bg-purple-500/20 text-purple-500' },
      filled: { label: 'تکمیل شده', class: 'bg-green-500/20 text-green-500' },
      cancelled: { label: 'لغو شده', class: 'bg-red-500/20 text-red-500' },
      rejected: { label: 'رد شده', class: 'bg-red-500/20 text-red-500' },
      expired: { label: 'منقضی', class: 'bg-dark-500/20 text-dark-400' }
    };
    const s = map[status] || { label: status, class: 'bg-dark-500/20 text-dark-400' };
    return <span className={`px-2 py-1 rounded-full text-xs ${s.class}`}>{s.label}</span>;
  };

  const formatNumber = (num) => new Intl.NumberFormat('fa-IR').format(num || 0);

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fa-IR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
      {/* هدر */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FaBook className="text-gold" />
            مدیریت سفارشات
          </h1>
          <p className="text-dark-400 text-sm mt-1">نظارت بر سفارشات همه صرافی‌ها</p>
        </div>
      </div>

      {/* آمار */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <p className="text-dark-400 text-sm mb-1">کل سفارشات</p>
          <p className="text-white text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="card p-4 text-center border-l-4 border-blue-500">
          <p className="text-dark-400 text-sm mb-1">فعال</p>
          <p className="text-blue-500 text-2xl font-bold">{stats.open}</p>
        </div>
        <div className="card p-4 text-center border-l-4 border-green-500">
          <p className="text-dark-400 text-sm mb-1">تکمیل شده</p>
          <p className="text-green-500 text-2xl font-bold">{stats.filled}</p>
        </div>
        <div className="card p-4 text-center border-l-4 border-red-500">
          <p className="text-dark-400 text-sm mb-1">لغو شده</p>
          <p className="text-red-500 text-2xl font-bold">{stats.cancelled}</p>
        </div>
      </div>

      {/* فیلترها */}
      <div className="card p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-dark-400 text-sm mb-2">صرافی</label>
            <select
              value={filters.sarafiId}
              onChange={(e) => setFilters({ ...filters, sarafiId: e.target.value })}
              className="input w-full"
            >
              <option value="">همه صرافی‌ها</option>
              {sarafis.map(s => (
                <option key={s._id} value={s._id}>
                  {s.firstName} {s.lastName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-dark-400 text-sm mb-2">ارز</label>
            <select
              value={filters.currencyId}
              onChange={(e) => setFilters({ ...filters, currencyId: e.target.value })}
              className="input w-full"
            >
              <option value="">همه ارزها</option>
              {currencies.map(c => (
                <option key={c._id} value={c._id}>{c.nameFa}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-dark-400 text-sm mb-2">وضعیت</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="input w-full"
            >
              <option value="">همه</option>
              <option value="open">فعال</option>
              <option value="filled">تکمیل شده</option>
              <option value="cancelled">لغو شده</option>
            </select>
          </div>

          <div>
            <label className="block text-dark-400 text-sm mb-2">سمت</label>
            <select
              value={filters.side}
              onChange={(e) => setFilters({ ...filters, side: e.target.value })}
              className="input w-full"
            >
              <option value="">همه</option>
              <option value="buy">خرید</option>
              <option value="sell">فروش</option>
            </select>
          </div>
        </div>
      </div>

      {/* لیست سفارشات */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-800">
              <tr>
                <th className="text-right p-4 text-dark-400">شماره سفارش</th>
                <th className="text-right p-4 text-dark-400">صرافی</th>
                <th className="text-right p-4 text-dark-400">مشتری</th>
                <th className="text-right p-4 text-dark-400">ارز</th>
                <th className="text-right p-4 text-dark-400">سمت</th>
                <th className="text-right p-4 text-dark-400">مقدار</th>
                <th className="text-right p-4 text-dark-400">قیمت</th>
                <th className="text-center p-4 text-dark-400">وضعیت</th>
                <th className="text-right p-4 text-dark-400">تاریخ</th>
                <th className="text-center p-4 text-dark-400">جزئیات</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center p-8 text-dark-500">
                    سفارشی وجود ندارد
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order._id} className="border-t border-dark-800 hover:bg-dark-800/50">
                    <td className="p-4">
                      <span className="text-gold font-mono text-sm">{order.orderNumber}</span>
                    </td>
                    <td className="p-4 text-white text-sm">
                      {order.sarafi?.firstName} {order.sarafi?.lastName}
                    </td>
                    <td className="p-4 text-dark-300 text-sm">
                      {order.customer?.firstName} {order.customer?.lastName}
                    </td>
                    <td className="p-4">
                      <span className="flex items-center gap-1">
                        <span>{order.currency?.symbol}</span>
                        <span className="text-white">{order.currency?.code}</span>
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`flex items-center gap-1 ${order.side === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                        {order.side === 'buy' ? <FaArrowDown /> : <FaArrowUp />}
                        {order.side === 'buy' ? 'خرید' : 'فروش'}
                      </span>
                    </td>
                    <td className="p-4 text-white">{formatNumber(order.amount)}</td>
                    <td className="p-4 text-white">{formatNumber(order.price)}</td>
                    <td className="p-4 text-center">{getStatusBadge(order.status)}</td>
                    <td className="p-4 text-dark-400 text-sm">{formatDate(order.createdAt)}</td>
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setSelectedOrder(order)}
                        className="p-2 rounded-lg bg-blue-500/20 text-blue-500 hover:bg-blue-500/30"
                      >
                        <FaEye />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* مودال جزئیات */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">جزئیات سفارش</h2>
              <button onClick={() => setSelectedOrder(null)} className="text-dark-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-dark-500 text-sm">شماره سفارش</label>
                  <p className="text-gold font-mono">{selectedOrder.orderNumber}</p>
                </div>
                <div>
                  <label className="text-dark-500 text-sm">وضعیت</label>
                  <p>{getStatusBadge(selectedOrder.status)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-dark-500 text-sm">صرافی</label>
                  <p className="text-white">{selectedOrder.sarafi?.firstName} {selectedOrder.sarafi?.lastName}</p>
                </div>
                <div>
                  <label className="text-dark-500 text-sm">مشتری</label>
                  <p className="text-white">{selectedOrder.customer?.firstName} {selectedOrder.customer?.lastName}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-dark-500 text-sm">ارز</label>
                  <p className="text-white">{selectedOrder.currency?.nameFa}</p>
                </div>
                <div>
                  <label className="text-dark-500 text-sm">سمت</label>
                  <p className={selectedOrder.side === 'buy' ? 'text-green-500' : 'text-red-500'}>
                    {selectedOrder.side === 'buy' ? 'خرید' : 'فروش'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-dark-500 text-sm">مقدار</label>
                  <p className="text-white font-bold">{formatNumber(selectedOrder.amount)}</p>
                </div>
                <div>
                  <label className="text-dark-500 text-sm">قیمت</label>
                  <p className="text-white font-bold">{formatNumber(selectedOrder.price)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-dark-500 text-sm">مقدار تکمیل شده</label>
                  <p className="text-green-500">{formatNumber(selectedOrder.filledAmount)}</p>
                </div>
                <div>
                  <label className="text-dark-500 text-sm">نوع سفارش</label>
                  <p className="text-white">
                    {selectedOrder.orderType === 'market' ? 'بازار' :
                     selectedOrder.orderType === 'limit' ? 'محدود' : 'شرطی'}
                  </p>
                </div>
              </div>

              {selectedOrder.riskCheck && (
                <div className={`p-4 rounded-xl ${selectedOrder.riskCheck.passed ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
                  <p className={selectedOrder.riskCheck.passed ? 'text-green-500' : 'text-red-500'}>
                    بررسی ریسک: {selectedOrder.riskCheck.passed ? 'تایید شده' : 'رد شده'}
                  </p>
                  {selectedOrder.riskCheck.failureReason && (
                    <p className="text-dark-400 text-sm mt-1">{selectedOrder.riskCheck.failureReason}</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="text-dark-500">تاریخ ایجاد</label>
                  <p className="text-white">{formatDate(selectedOrder.createdAt)}</p>
                </div>
                {selectedOrder.validUntil && (
                  <div>
                    <label className="text-dark-500">اعتبار تا</label>
                    <p className="text-white">{formatDate(selectedOrder.validUntil)}</p>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setSelectedOrder(null)}
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

export default AdminOrders;
