import { useState, useEffect } from 'react';
import {
  FaBook, FaArrowUp, FaArrowDown, FaPlus, FaTimes, FaCheck,
  FaClock, FaSync, FaFilter
} from 'react-icons/fa';
import api from '../../services/api';
import toast from 'react-hot-toast';

const UserOrders = () => {
  const [currencies, setCurrencies] = useState([]);
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [orderBook, setOrderBook] = useState({ buyOrders: [], sellOrders: [] });
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [filter, setFilter] = useState('all');

  const [newOrder, setNewOrder] = useState({
    currencyId: '',
    side: 'buy',
    orderType: 'limit',
    amount: '',
    price: '',
    notes: ''
  });

  useEffect(() => {
    fetchCurrencies();
    fetchMyOrders();
  }, []);

  useEffect(() => {
    if (selectedCurrency) {
      fetchOrderBook();
      const interval = setInterval(fetchOrderBook, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedCurrency]);

  const fetchCurrencies = async () => {
    try {
      const res = await api.get('/public/currencies');
      setCurrencies(res.data.data || []);
      if (res.data.data?.length > 0) {
        setSelectedCurrency(res.data.data[0]._id);
      }
    } catch (error) {
      toast.error('خطا در دریافت ارزها');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderBook = async () => {
    if (!selectedCurrency) return;
    try {
      const res = await api.get(`/orders/book/${selectedCurrency}`);
      setOrderBook(res.data.data || { buyOrders: [], sellOrders: [] });
    } catch (error) {
      console.error(error);
    }
  };

  const fetchMyOrders = async () => {
    try {
      const res = await api.get('/orders/my-orders');
      setMyOrders(res.data.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateOrder = async () => {
    if (!newOrder.currencyId || !newOrder.amount) {
      toast.error('ارز و مقدار الزامی است');
      return;
    }
    if (newOrder.orderType === 'limit' && !newOrder.price) {
      toast.error('قیمت برای سفارش محدود الزامی است');
      return;
    }

    try {
      await api.post('/orders', newOrder);
      toast.success('سفارش شما ثبت شد');
      setShowNewOrder(false);
      setNewOrder({
        currencyId: '',
        side: 'buy',
        orderType: 'limit',
        amount: '',
        price: '',
        notes: ''
      });
      fetchMyOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در ثبت سفارش');
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!confirm('آیا از لغو سفارش مطمئن هستید؟')) return;
    try {
      await api.put(`/orders/${orderId}/cancel`);
      toast.success('سفارش لغو شد');
      fetchMyOrders();
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا');
    }
  };

  const formatNumber = (num) => new Intl.NumberFormat('fa-IR').format(num || 0);

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

  const filteredOrders = myOrders.filter(o => {
    if (filter === 'all') return true;
    if (filter === 'open') return ['pending', 'open', 'partially_filled'].includes(o.status);
    if (filter === 'filled') return o.status === 'filled';
    if (filter === 'cancelled') return ['cancelled', 'rejected', 'expired'].includes(o.status);
    return true;
  });

  const selectedCurrencyData = currencies.find(c => c._id === selectedCurrency);

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
            سفارشات من
          </h1>
          <p className="text-dark-400 text-sm mt-1">ثبت و پیگیری سفارشات خرید و فروش ارز</p>
        </div>
        <button
          onClick={() => setShowNewOrder(true)}
          className="btn-gold flex items-center gap-2"
        >
          <FaPlus />
          ثبت سفارش
        </button>
      </div>

      {/* انتخاب ارز */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-dark-400">نمایش قیمت:</span>
          <div className="flex flex-wrap gap-2">
            {currencies.slice(0, 6).map(currency => (
              <button
                key={currency._id}
                onClick={() => setSelectedCurrency(currency._id)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                  selectedCurrency === currency._id
                    ? 'bg-gold text-dark-900 font-bold'
                    : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                }`}
              >
                <span>{currency.symbol}</span>
                <span>{currency.code}</span>
              </button>
            ))}
          </div>
          <button onClick={fetchOrderBook} className="p-2 text-gold hover:bg-dark-800 rounded-lg mr-auto">
            <FaSync />
          </button>
        </div>
      </div>

      {/* قیمت و Order Book */}
      {selectedCurrencyData && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* قیمت فعلی */}
          <div className="card p-6 text-center">
            <h3 className="text-dark-400 mb-4">قیمت فعلی {selectedCurrencyData.nameFa}</h3>
            <div className="flex items-center justify-center gap-8">
              <div>
                <p className="text-dark-500 text-sm mb-1">خرید</p>
                <p className="text-green-500 text-2xl font-bold">{formatNumber(selectedCurrencyData.buyRate)}</p>
              </div>
              <div className="w-px h-12 bg-dark-700"></div>
              <div>
                <p className="text-dark-500 text-sm mb-1">فروش</p>
                <p className="text-red-500 text-2xl font-bold">{formatNumber(selectedCurrencyData.sellRate)}</p>
              </div>
            </div>
          </div>

          {/* سفارشات خرید */}
          <div className="card overflow-hidden">
            <div className="bg-green-500/10 p-3 border-b border-dark-800">
              <h4 className="text-green-500 font-medium flex items-center gap-2 text-sm">
                <FaArrowUp />
                بهترین پیشنهادات خرید
              </h4>
            </div>
            <div className="p-3">
              {orderBook.buyOrders?.length > 0 ? (
                <div className="space-y-1">
                  {orderBook.buyOrders.slice(0, 5).map((order, idx) => (
                    <div key={idx} className="flex justify-between text-sm py-1">
                      <span className="text-green-500">{formatNumber(order.price)}</span>
                      <span className="text-white">{formatNumber(order.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-dark-500 text-center text-sm py-4">سفارشی نیست</p>
              )}
            </div>
          </div>

          {/* سفارشات فروش */}
          <div className="card overflow-hidden">
            <div className="bg-red-500/10 p-3 border-b border-dark-800">
              <h4 className="text-red-500 font-medium flex items-center gap-2 text-sm">
                <FaArrowDown />
                بهترین پیشنهادات فروش
              </h4>
            </div>
            <div className="p-3">
              {orderBook.sellOrders?.length > 0 ? (
                <div className="space-y-1">
                  {orderBook.sellOrders.slice(0, 5).map((order, idx) => (
                    <div key={idx} className="flex justify-between text-sm py-1">
                      <span className="text-red-500">{formatNumber(order.price)}</span>
                      <span className="text-white">{formatNumber(order.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-dark-500 text-center text-sm py-4">سفارشی نیست</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* سفارشات من */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-dark-800 flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-white font-bold">تاریخچه سفارشات</h3>
          <div className="flex gap-2">
            {[
              { value: 'all', label: 'همه' },
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
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-800">
              <tr>
                <th className="text-right p-3 text-dark-400 text-sm">تاریخ</th>
                <th className="text-right p-3 text-dark-400 text-sm">ارز</th>
                <th className="text-right p-3 text-dark-400 text-sm">نوع</th>
                <th className="text-right p-3 text-dark-400 text-sm">مقدار</th>
                <th className="text-right p-3 text-dark-400 text-sm">قیمت</th>
                <th className="text-right p-3 text-dark-400 text-sm">وضعیت</th>
                <th className="text-center p-3 text-dark-400 text-sm">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center p-8 text-dark-500">
                    سفارشی وجود ندارد
                  </td>
                </tr>
              ) : (
                filteredOrders.map(order => (
                  <tr key={order._id} className="border-t border-dark-800">
                    <td className="p-3 text-dark-400 text-sm">
                      {new Date(order.createdAt).toLocaleDateString('fa-IR')}
                    </td>
                    <td className="p-3">
                      <span className="text-white">{order.currency?.nameFa}</span>
                    </td>
                    <td className="p-3">
                      <span className={`flex items-center gap-1 ${order.side === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                        {order.side === 'buy' ? <FaArrowDown /> : <FaArrowUp />}
                        {order.side === 'buy' ? 'خرید' : 'فروش'}
                      </span>
                    </td>
                    <td className="p-3 text-white">{formatNumber(order.amount)}</td>
                    <td className="p-3 text-white">{formatNumber(order.price)}</td>
                    <td className="p-3">{getStatusBadge(order.status)}</td>
                    <td className="p-3 text-center">
                      {['pending', 'open', 'partially_filled'].includes(order.status) && (
                        <button
                          onClick={() => handleCancelOrder(order._id)}
                          className="p-2 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30"
                          title="لغو"
                        >
                          <FaTimes />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* مودال سفارش جدید */}
      {showNewOrder && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">ثبت سفارش جدید</h2>
              <button onClick={() => setShowNewOrder(false)} className="text-dark-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-dark-300 mb-2">ارز</label>
                <select
                  value={newOrder.currencyId}
                  onChange={(e) => setNewOrder({ ...newOrder, currencyId: e.target.value })}
                  className="input w-full"
                >
                  <option value="">انتخاب کنید</option>
                  {currencies.map(c => (
                    <option key={c._id} value={c._id}>{c.nameFa} ({c.code})</option>
                  ))}
                </select>
              </div>

              {/* انتخاب سمت */}
              <div>
                <label className="block text-dark-300 mb-2">نوع سفارش</label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => setNewOrder({ ...newOrder, side: 'buy' })}
                    className={`p-4 rounded-xl flex items-center justify-center gap-2 transition-all ${
                      newOrder.side === 'buy'
                        ? 'bg-green-500 text-white'
                        : 'bg-dark-800 text-dark-400 hover:bg-dark-700'
                    }`}
                  >
                    <FaArrowDown />
                    خرید
                  </button>
                  <button
                    onClick={() => setNewOrder({ ...newOrder, side: 'sell' })}
                    className={`p-4 rounded-xl flex items-center justify-center gap-2 transition-all ${
                      newOrder.side === 'sell'
                        ? 'bg-red-500 text-white'
                        : 'bg-dark-800 text-dark-400 hover:bg-dark-700'
                    }`}
                  >
                    <FaArrowUp />
                    فروش
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-dark-300 mb-2">مقدار</label>
                <input
                  type="number"
                  value={newOrder.amount}
                  onChange={(e) => setNewOrder({ ...newOrder, amount: e.target.value })}
                  className="input w-full"
                  placeholder="مقدار ارز"
                />
              </div>

              <div>
                <label className="block text-dark-300 mb-2">قیمت پیشنهادی (ریال)</label>
                <input
                  type="number"
                  value={newOrder.price}
                  onChange={(e) => setNewOrder({ ...newOrder, price: e.target.value })}
                  className="input w-full"
                  placeholder="قیمت مورد نظر"
                />
              </div>

              <div>
                <label className="block text-dark-300 mb-2">توضیحات</label>
                <textarea
                  value={newOrder.notes}
                  onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
                  className="input w-full"
                  rows="2"
                  placeholder="توضیحات اختیاری..."
                />
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button onClick={handleCreateOrder} className="btn-gold flex-1">
                ثبت سفارش
              </button>
              <button onClick={() => setShowNewOrder(false)} className="btn-outline flex-1">
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserOrders;
