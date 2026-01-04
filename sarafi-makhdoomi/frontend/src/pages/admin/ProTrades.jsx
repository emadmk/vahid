import { useState, useEffect } from 'react';
import {
  FaChartLine, FaArrowUp, FaArrowDown, FaSync, FaFilter,
  FaSearch
} from 'react-icons/fa';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ProTrades = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    filled: 0,
    cancelled: 0
  });

  useEffect(() => {
    fetchOrders();
    fetchStats();
  }, [filter]);

  const fetchOrders = async () => {
    try {
      const params = {
        ...(filter !== 'all' && { status: filter }),
        ...(search && { search })
      };
      const res = await api.get('/admin/orders', { params });
      setOrders(res.data.data || []);
    } catch (error) {
      toast.error('خطا در دریافت اطلاعات');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/orders/stats');
      setStats(res.data.data || {});
    } catch (error) {
      console.error(error);
    }
  };

  const formatNumber = (num) => new Intl.NumberFormat('fa-IR').format(num || 0);
  const formatDate = (date) => new Date(date).toLocaleDateString('fa-IR');

  const getStatusBadge = (status) => {
    const map = {
      pending: { label: 'در انتظار', class: 'bg-yellow-500/20 text-yellow-500' },
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
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FaChartLine className="text-gold" />
          خرید و فروش حرفه‌ای
        </h1>
        <p className="text-dark-400 text-sm mt-1">مدیریت و نظارت بر سفارشات پیشرفته</p>
      </div>

      {/* آمار */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4 text-center">
          <p className="text-dark-400 text-sm">کل سفارشات</p>
          <p className="text-white text-2xl font-bold">{formatNumber(stats.total)}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-dark-400 text-sm">فعال</p>
          <p className="text-blue-500 text-2xl font-bold">{formatNumber(stats.open)}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-dark-400 text-sm">تکمیل شده</p>
          <p className="text-green-500 text-2xl font-bold">{formatNumber(stats.filled)}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-dark-400 text-sm">لغو شده</p>
          <p className="text-red-500 text-2xl font-bold">{formatNumber(stats.cancelled)}</p>
        </div>
      </div>

      {/* فیلترها */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <FaSearch className="text-dark-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && fetchOrders()}
              placeholder="جستجو..."
              className="input flex-1"
            />
          </div>
          <div className="flex gap-2">
            {[
              { value: 'all', label: 'همه' },
              { value: 'pending', label: 'در انتظار' },
              { value: 'open', label: 'فعال' },
              { value: 'filled', label: 'تکمیل' },
              { value: 'cancelled', label: 'لغو' }
            ].map(f => (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1 rounded-lg text-sm ${
                  filter === f.value ? 'bg-gold text-dark-900' : 'bg-dark-800 text-dark-400'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button onClick={fetchOrders} className="p-2 text-gold hover:bg-dark-800 rounded-lg">
            <FaSync />
          </button>
        </div>
      </div>

      {/* جدول */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-800">
              <tr>
                <th className="text-right p-3 text-dark-400 text-sm">شماره</th>
                <th className="text-right p-3 text-dark-400 text-sm">صراف</th>
                <th className="text-right p-3 text-dark-400 text-sm">مشتری</th>
                <th className="text-right p-3 text-dark-400 text-sm">نوع</th>
                <th className="text-right p-3 text-dark-400 text-sm">سمت</th>
                <th className="text-right p-3 text-dark-400 text-sm">ارز</th>
                <th className="text-right p-3 text-dark-400 text-sm">مقدار</th>
                <th className="text-right p-3 text-dark-400 text-sm">قیمت</th>
                <th className="text-right p-3 text-dark-400 text-sm">تاریخ</th>
                <th className="text-right p-3 text-dark-400 text-sm">وضعیت</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center p-8 text-dark-500">
                    سفارشی یافت نشد
                  </td>
                </tr>
              ) : (
                orders.map(order => (
                  <tr key={order._id} className="border-t border-dark-800 hover:bg-dark-800/30">
                    <td className="p-3 text-gold text-sm">{order.orderNumber}</td>
                    <td className="p-3 text-white">
                      {order.sarafi?.businessName || `${order.sarafi?.firstName} ${order.sarafi?.lastName}`}
                    </td>
                    <td className="p-3 text-white">
                      {order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : 'صرافی'}
                    </td>
                    <td className="p-3 text-dark-400 text-sm">
                      {order.orderType === 'market' ? 'بازار' :
                       order.orderType === 'limit' ? 'محدود' : 'شرطی'}
                    </td>
                    <td className="p-3">
                      <span className={`flex items-center gap-1 ${order.side === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                        {order.side === 'buy' ? <FaArrowUp /> : <FaArrowDown />}
                        {order.side === 'buy' ? 'خرید' : 'فروش'}
                      </span>
                    </td>
                    <td className="p-3 text-white">{order.currency?.code}</td>
                    <td className="p-3 text-white">{formatNumber(order.amount)}</td>
                    <td className="p-3 text-white">{formatNumber(order.price)}</td>
                    <td className="p-3 text-dark-400 text-sm">{formatDate(order.createdAt)}</td>
                    <td className="p-3">{getStatusBadge(order.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ProTrades;
