import { useState, useEffect, useCallback } from 'react';
import {
  FaBook, FaArrowUp, FaArrowDown, FaPlus, FaTimes, FaCheck,
  FaClock, FaExclamationTriangle, FaFilter, FaSync
} from 'react-icons/fa';
import api from '../../services/api';
import toast from 'react-hot-toast';

const SarafiOrderBook = () => {
  const [currencies, setCurrencies] = useState([]);
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [orderBook, setOrderBook] = useState({ buyOrders: [], sellOrders: [] });
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [filter, setFilter] = useState('all'); // all, open, filled, cancelled

  const [newOrder, setNewOrder] = useState({
    currencyId: '',
    side: 'buy',
    orderType: 'limit',
    amount: '',
    price: '',
    stopPrice: '',
    validUntil: '',
    notes: ''
  });

  useEffect(() => {
    fetchCurrencies();
  }, []);

  useEffect(() => {
    if (selectedCurrency) {
      fetchOrderBook();
      const interval = setInterval(fetchOrderBook, 5000);
      return () => clearInterval(interval);
    }
  }, [selectedCurrency]);

  useEffect(() => {
    fetchMyOrders();
  }, [filter]);

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
      const params = filter !== 'all' ? { status: filter } : {};
      const res = await api.get('/orders/sarafi/orders', { params });
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
      toast.error('قیمت برای سفارش limit الزامی است');
      return;
    }

    try {
      await api.post('/orders', newOrder);
      toast.success('سفارش ثبت شد');
      setShowNewOrder(false);
      setNewOrder({
        currencyId: '',
        side: 'buy',
        orderType: 'limit',
        amount: '',
        price: '',
        stopPrice: '',
        validUntil: '',
        notes: ''
      });
      fetchMyOrders();
      fetchOrderBook();
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
      fetchOrderBook();
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در لغو');
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
            دفتر سفارشات
          </h1>
          <p className="text-dark-400 text-sm mt-1">مشاهده و ثبت سفارشات خرید و فروش</p>
        </div>
        <button
          onClick={() => setShowNewOrder(true)}
          className="btn-gold flex items-center gap-2"
        >
          <FaPlus />
          سفارش جدید
        </button>
      </div>

      {/* انتخاب ارز */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-dark-400">انتخاب ارز:</span>
          <div className="flex flex-wrap gap-2">
            {currencies.map(currency => (
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

      {/* Order Book */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* سفارشات خرید */}
        <div className="card overflow-hidden">
          <div className="bg-green-500/10 p-4 border-b border-dark-800">
            <h3 className="text-green-500 font-bold flex items-center gap-2">
              <FaArrowUp />
              سفارشات خرید (Bid)
            </h3>
          </div>
          <div className="p-4">
            {orderBook.buyOrders?.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-4 text-xs text-dark-500 pb-2 border-b border-dark-800">
                  <span>قیمت</span>
                  <span>مقدار</span>
                  <span>مجموع</span>
                  <span>سطح</span>
                </div>
                {orderBook.buyOrders.map((order, idx) => (
                  <div key={idx} className="grid grid-cols-4 text-sm py-1 hover:bg-dark-800/50 rounded">
                    <span className="text-green-500 font-medium">{formatNumber(order.price)}</span>
                    <span className="text-white">{formatNumber(order.amount)}</span>
                    <span className="text-dark-400">{formatNumber(order.total)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      order.customerTier === 'A' ? 'bg-gold/20 text-gold' :
                      order.customerTier === 'B' ? 'bg-blue-500/20 text-blue-500' :
                      order.customerTier === 'C' ? 'bg-purple-500/20 text-purple-500' :
                      'bg-dark-700 text-dark-400'
                    }`}>
                      {order.customerTier || 'عادی'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-dark-500 text-center py-8">سفارش خریدی وجود ندارد</p>
            )}
          </div>
        </div>

        {/* سفارشات فروش */}
        <div className="card overflow-hidden">
          <div className="bg-red-500/10 p-4 border-b border-dark-800">
            <h3 className="text-red-500 font-bold flex items-center gap-2">
              <FaArrowDown />
              سفارشات فروش (Ask)
            </h3>
          </div>
          <div className="p-4">
            {orderBook.sellOrders?.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-4 text-xs text-dark-500 pb-2 border-b border-dark-800">
                  <span>قیمت</span>
                  <span>مقدار</span>
                  <span>مجموع</span>
                  <span>سطح</span>
                </div>
                {orderBook.sellOrders.map((order, idx) => (
                  <div key={idx} className="grid grid-cols-4 text-sm py-1 hover:bg-dark-800/50 rounded">
                    <span className="text-red-500 font-medium">{formatNumber(order.price)}</span>
                    <span className="text-white">{formatNumber(order.amount)}</span>
                    <span className="text-dark-400">{formatNumber(order.total)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      order.customerTier === 'A' ? 'bg-gold/20 text-gold' :
                      order.customerTier === 'B' ? 'bg-blue-500/20 text-blue-500' :
                      order.customerTier === 'C' ? 'bg-purple-500/20 text-purple-500' :
                      'bg-dark-700 text-dark-400'
                    }`}>
                      {order.customerTier || 'عادی'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-dark-500 text-center py-8">سفارش فروشی وجود ندارد</p>
            )}
          </div>
        </div>
      </div>

      {/* قیمت فعلی */}
      {selectedCurrencyData && (
        <div className="card p-4">
          <div className="flex flex-wrap items-center justify-center gap-8">
            <div className="text-center">
              <p className="text-dark-400 text-sm mb-1">قیمت خرید</p>
              <p className="text-green-500 text-2xl font-bold">{formatNumber(selectedCurrencyData.buyRate)}</p>
            </div>
            <div className="text-center">
              <p className="text-dark-400 text-sm mb-1">قیمت فروش</p>
              <p className="text-red-500 text-2xl font-bold">{formatNumber(selectedCurrencyData.sellRate)}</p>
            </div>
            <div className="text-center">
              <p className="text-dark-400 text-sm mb-1">اسپرد</p>
              <p className="text-gold text-xl font-bold">
                {formatNumber((selectedCurrencyData.sellRate || 0) - (selectedCurrencyData.buyRate || 0))}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* سفارشات من */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-dark-800 flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-white font-bold">سفارشات من</h3>
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
                <th className="text-right p-3 text-dark-400 text-sm">شماره</th>
                <th className="text-right p-3 text-dark-400 text-sm">ارز</th>
                <th className="text-right p-3 text-dark-400 text-sm">نوع</th>
                <th className="text-right p-3 text-dark-400 text-sm">سمت</th>
                <th className="text-right p-3 text-dark-400 text-sm">مقدار</th>
                <th className="text-right p-3 text-dark-400 text-sm">قیمت</th>
                <th className="text-right p-3 text-dark-400 text-sm">وضعیت</th>
                <th className="text-center p-3 text-dark-400 text-sm">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {myOrders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center p-8 text-dark-500">
                    سفارشی وجود ندارد
                  </td>
                </tr>
              ) : (
                myOrders.map(order => (
                  <tr key={order._id} className="border-t border-dark-800">
                    <td className="p-3 text-gold text-sm">{order.orderNumber}</td>
                    <td className="p-3">
                      <span className="text-white">{order.currency?.nameFa}</span>
                    </td>
                    <td className="p-3">
                      <span className="text-dark-400 text-sm">
                        {order.orderType === 'market' ? 'بازار' :
                         order.orderType === 'limit' ? 'محدود' : 'شرطی'}
                      </span>
                    </td>
                    <td className="p-3">
                      <span className={order.side === 'buy' ? 'text-green-500' : 'text-red-500'}>
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
              <h2 className="text-xl font-bold text-white">سفارش جدید</h2>
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-dark-300 mb-2">سمت</label>
                  <select
                    value={newOrder.side}
                    onChange={(e) => setNewOrder({ ...newOrder, side: e.target.value })}
                    className="input w-full"
                  >
                    <option value="buy">خرید</option>
                    <option value="sell">فروش</option>
                  </select>
                </div>
                <div>
                  <label className="block text-dark-300 mb-2">نوع سفارش</label>
                  <select
                    value={newOrder.orderType}
                    onChange={(e) => setNewOrder({ ...newOrder, orderType: e.target.value })}
                    className="input w-full"
                  >
                    <option value="market">بازار (Market)</option>
                    <option value="limit">محدود (Limit)</option>
                    <option value="conditional">شرطی</option>
                  </select>
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

              {newOrder.orderType !== 'market' && (
                <div>
                  <label className="block text-dark-300 mb-2">قیمت (ریال)</label>
                  <input
                    type="number"
                    value={newOrder.price}
                    onChange={(e) => setNewOrder({ ...newOrder, price: e.target.value })}
                    className="input w-full"
                    placeholder="قیمت مورد نظر"
                  />
                </div>
              )}

              {newOrder.orderType === 'conditional' && (
                <div>
                  <label className="block text-dark-300 mb-2">قیمت فعال‌سازی</label>
                  <input
                    type="number"
                    value={newOrder.stopPrice}
                    onChange={(e) => setNewOrder({ ...newOrder, stopPrice: e.target.value })}
                    className="input w-full"
                    placeholder="وقتی قیمت به این حد رسید..."
                  />
                </div>
              )}

              <div>
                <label className="block text-dark-300 mb-2">اعتبار تا</label>
                <input
                  type="datetime-local"
                  value={newOrder.validUntil}
                  onChange={(e) => setNewOrder({ ...newOrder, validUntil: e.target.value })}
                  className="input w-full"
                />
              </div>

              <div>
                <label className="block text-dark-300 mb-2">یادداشت</label>
                <textarea
                  value={newOrder.notes}
                  onChange={(e) => setNewOrder({ ...newOrder, notes: e.target.value })}
                  className="input w-full"
                  rows="2"
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

export default SarafiOrderBook;
