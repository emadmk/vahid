import { useState, useEffect } from 'react';
import {
  FaChartLine, FaArrowUp, FaArrowDown, FaPlus, FaTimes, FaCheck,
  FaClock, FaSync, FaFilter, FaWallet, FaInfoCircle
} from 'react-icons/fa';
import api from '../../services/api';
import toast from 'react-hot-toast';
import CurrencySelector from '../../components/CurrencySelector';

const ProTrade = () => {
  const [currencies, setCurrencies] = useState([]);
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [orderBook, setOrderBook] = useState({ buyOrders: [], sellOrders: [] });
  const [myOrders, setMyOrders] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [filter, setFilter] = useState('all');

  const [newOrder, setNewOrder] = useState({
    side: 'buy',
    orderType: 'limit',
    amount: '',
    price: '',
    validUntil: '',
    notes: ''
  });

  useEffect(() => {
    fetchInitialData();
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

  const fetchInitialData = async () => {
    try {
      const [currRes, walletRes] = await Promise.all([
        api.get('/public/currencies'),
        api.get('/wallets/my')
      ]);

      // API فقط ارزهای فعال رو برمیگردونه
      const activeCurrencies = currRes.data.data || [];
      setCurrencies(activeCurrencies);
      setWallet(walletRes.data.data);

      if (activeCurrencies.length > 0) {
        setSelectedCurrency(activeCurrencies[0]);
      }
    } catch (error) {
      toast.error('خطا در دریافت اطلاعات');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrderBook = async () => {
    if (!selectedCurrency) return;
    try {
      const res = await api.get(`/orders/book/${selectedCurrency._id}`);
      setOrderBook(res.data.data || { buyOrders: [], sellOrders: [] });
    } catch (error) {
      console.error(error);
    }
  };

  const fetchMyOrders = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const res = await api.get('/orders/my', { params });
      setMyOrders(res.data.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const handleCreateOrder = async () => {
    if (!selectedCurrency || !newOrder.amount) {
      toast.error('ارز و مقدار الزامی است');
      return;
    }
    if (newOrder.orderType === 'limit' && !newOrder.price) {
      toast.error('قیمت برای سفارش محدود الزامی است');
      return;
    }

    try {
      const payload = {
        currencyId: selectedCurrency._id,
        ...newOrder,
        amount: parseFloat(newOrder.amount),
        price: newOrder.price ? parseFloat(newOrder.price) : null
      };

      await api.post('/orders', payload);
      toast.success('سفارش ثبت شد');
      setShowNewOrder(false);
      setNewOrder({
        side: 'buy',
        orderType: 'limit',
        amount: '',
        price: '',
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
            <FaChartLine className="text-gold" />
            خرید و فروش حرفه‌ای
          </h1>
          <p className="text-dark-400 text-sm mt-1">ثبت سفارشات پیشرفته با قیمت دلخواه</p>
        </div>
        <button
          onClick={() => setShowNewOrder(true)}
          className="btn-gold flex items-center gap-2"
        >
          <FaPlus />
          سفارش جدید
        </button>
      </div>

      {/* انتخاب ارز با کامپوننت جدید */}
      <CurrencySelector
        currencies={currencies}
        selectedCurrency={selectedCurrency}
        onSelect={setSelectedCurrency}
        showRates={true}
      />

      {/* Order Book */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* سفارشات خرید */}
        <div className="card overflow-hidden">
          <div className="bg-green-500/10 p-4 border-b border-dark-800">
            <h3 className="text-green-500 font-bold flex items-center gap-2">
              <FaArrowUp />
              سفارشات خرید
            </h3>
          </div>
          <div className="p-4">
            {orderBook.buyOrders?.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 text-xs text-dark-500 pb-2 border-b border-dark-800">
                  <span>قیمت</span>
                  <span>مقدار</span>
                  <span>مجموع</span>
                </div>
                {orderBook.buyOrders.slice(0, 10).map((order, idx) => (
                  <div key={idx} className="grid grid-cols-3 text-sm py-1 hover:bg-dark-800/50 rounded">
                    <span className="text-green-500 font-medium">{formatNumber(order.price)}</span>
                    <span className="text-white">{formatNumber(order.amount)}</span>
                    <span className="text-dark-400">{formatNumber(order.total)}</span>
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
              سفارشات فروش
            </h3>
          </div>
          <div className="p-4">
            {orderBook.sellOrders?.length > 0 ? (
              <div className="space-y-2">
                <div className="grid grid-cols-3 text-xs text-dark-500 pb-2 border-b border-dark-800">
                  <span>قیمت</span>
                  <span>مقدار</span>
                  <span>مجموع</span>
                </div>
                {orderBook.sellOrders.slice(0, 10).map((order, idx) => (
                  <div key={idx} className="grid grid-cols-3 text-sm py-1 hover:bg-dark-800/50 rounded">
                    <span className="text-red-500 font-medium">{formatNumber(order.price)}</span>
                    <span className="text-white">{formatNumber(order.amount)}</span>
                    <span className="text-dark-400">{formatNumber(order.total)}</span>
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
      {selectedCurrency && (
        <div className="card p-4">
          <div className="flex flex-wrap items-center justify-center gap-8">
            <div className="text-center">
              <p className="text-dark-400 text-sm mb-1">قیمت خرید</p>
              <p className="text-green-500 text-2xl font-bold">{formatNumber(selectedCurrency.buyRate)}</p>
            </div>
            <div className="text-center">
              <p className="text-dark-400 text-sm mb-1">قیمت فروش</p>
              <p className="text-red-500 text-2xl font-bold">{formatNumber(selectedCurrency.sellRate)}</p>
            </div>
            <div className="text-center">
              <p className="text-dark-400 text-sm mb-1">اسپرد</p>
              <p className="text-gold text-xl font-bold">
                {formatNumber((selectedCurrency.sellRate || 0) - (selectedCurrency.buyRate || 0))}
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
                    <td className="p-3 text-white">{order.currency?.nameFa}</td>
                    <td className="p-3 text-dark-400 text-sm">
                      {order.orderType === 'market' ? 'بازار' :
                       order.orderType === 'limit' ? 'محدود' : 'شرطی'}
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
            <div className="flex items-center justify-between p-4 border-b border-dark-800">
              <h2 className="text-xl font-bold text-white">سفارش جدید</h2>
              <button onClick={() => setShowNewOrder(false)} className="text-dark-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* ارز انتخاب شده */}
              <div className="bg-dark-800 rounded-lg p-3">
                <span className="text-dark-400">ارز: </span>
                <span className="text-white font-bold">{selectedCurrency?.nameFa} ({selectedCurrency?.code})</span>
              </div>

              {/* نوع سفارش */}
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

              {newOrder.orderType === 'limit' && (
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

              <div>
                <label className="block text-dark-300 mb-2">اعتبار تا</label>
                <input
                  type="datetime-local"
                  value={newOrder.validUntil}
                  onChange={(e) => setNewOrder({ ...newOrder, validUntil: e.target.value })}
                  className="input w-full"
                />
              </div>
            </div>

            <div className="flex gap-4 p-4 border-t border-dark-800">
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

export default ProTrade;
