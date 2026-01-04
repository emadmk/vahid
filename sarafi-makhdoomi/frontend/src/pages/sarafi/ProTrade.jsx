import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FaChartLine, FaArrowUp, FaArrowDown, FaExchangeAlt, FaBolt,
  FaClock, FaWallet, FaPercent, FaInfoCircle, FaCheck, FaTimes,
  FaSync, FaHistory, FaChartBar, FaLayerGroup, FaShieldAlt,
  FaUserTie, FaCalculator, FaExpand, FaCompress
} from 'react-icons/fa';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ProTrade = () => {
  // State های اصلی
  const [currencies, setCurrencies] = useState([]);
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
  const [recentTrades, setRecentTrades] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Order Ticket State
  const [orderTicket, setOrderTicket] = useState({
    customerId: '',
    side: 'buy',
    orderType: 'limit',
    amount: '',
    price: '',
    stopPrice: '',
    paymentSource: 'cash',
    timeInForce: 'GTC',
    autoExecute: true,
    notes: ''
  });

  // Market Data
  const [marketData, setMarketData] = useState({
    lastPrice: 0,
    change24h: 0,
    high24h: 0,
    low24h: 0,
    volume24h: 0,
    vwap: 0
  });

  // Risk Check
  const [riskCheck, setRiskCheck] = useState(null);
  const [isCheckingRisk, setIsCheckingRisk] = useState(false);

  // Refs for intervals
  const intervalRef = useRef(null);

  useEffect(() => {
    fetchInitialData();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (selectedCurrency) {
      fetchMarketData();
      // Auto-refresh every 2 seconds
      intervalRef.current = setInterval(() => {
        fetchMarketData();
      }, 2000);
      return () => clearInterval(intervalRef.current);
    }
  }, [selectedCurrency]);

  // Fetch initial data
  const fetchInitialData = async () => {
    try {
      const [currRes, custRes] = await Promise.all([
        api.get('/public/currencies'),
        api.get('/sarafi/customers').catch(() => ({ data: { data: [] } }))
      ]);

      const activeCurrencies = currRes.data.data || [];
      setCurrencies(activeCurrencies);
      setCustomers(custRes.data.data || []);

      if (activeCurrencies.length > 0) {
        setSelectedCurrency(activeCurrencies[0]);
      }
    } catch (error) {
      toast.error('خطا در بارگذاری اطلاعات');
    } finally {
      setLoading(false);
    }
  };

  // Fetch market data for selected currency
  const fetchMarketData = async () => {
    if (!selectedCurrency) return;

    try {
      const [bookRes, tapeRes, statsRes, ordersRes] = await Promise.all([
        api.get(`/orders/book/${selectedCurrency._id}?levels=15`),
        api.get(`/orders/tape/${selectedCurrency._id}?limit=20`),
        api.get(`/orders/stats/${selectedCurrency._id}`).catch(() => ({ data: { data: {} } })),
        api.get('/orders/sarafi/all', { params: { status: 'open', limit: 10 } })
      ]);

      setOrderBook(bookRes.data.data || { bids: [], asks: [] });
      setRecentTrades(tapeRes.data.data || []);
      setMyOrders(ordersRes.data.data || []);

      // Update market data
      const stats = statsRes.data.data || {};
      setMarketData({
        lastPrice: selectedCurrency.sellRate,
        change24h: selectedCurrency.changePercent || 0,
        high24h: stats.high24h || selectedCurrency.sellRate,
        low24h: stats.low24h || selectedCurrency.buyRate,
        volume24h: stats.volume24h || 0,
        vwap: stats.vwap || selectedCurrency.sellRate
      });

      // Auto-fill price
      if (!orderTicket.price && selectedCurrency) {
        setOrderTicket(prev => ({
          ...prev,
          price: orderTicket.side === 'buy' ? selectedCurrency.sellRate : selectedCurrency.buyRate
        }));
      }
    } catch (error) {
      console.error('Error fetching market data:', error);
    }
  };

  // Pre-Trade Risk Check
  const performRiskCheck = async () => {
    if (!orderTicket.amount || !selectedCurrency) return;

    setIsCheckingRisk(true);
    try {
      const totalAmount = parseFloat(orderTicket.amount) * parseFloat(orderTicket.price || marketData.lastPrice);
      const res = await api.post('/sarafi/risk-check', {
        customerId: orderTicket.customerId || null,
        currencyId: selectedCurrency._id,
        amount: parseFloat(orderTicket.amount),
        totalAmount,
        orderType: orderTicket.orderType
      });
      setRiskCheck(res.data.data);
    } catch (error) {
      console.error('Risk check error:', error);
    } finally {
      setIsCheckingRisk(false);
    }
  };

  // Submit order
  const handleSubmitOrder = async () => {
    if (!orderTicket.amount) {
      toast.error('مقدار الزامی است');
      return;
    }
    if (orderTicket.orderType === 'limit' && !orderTicket.price) {
      toast.error('قیمت برای سفارش Limit الزامی است');
      return;
    }

    try {
      const payload = {
        ...orderTicket,
        currencyId: selectedCurrency._id,
        amount: parseFloat(orderTicket.amount),
        price: parseFloat(orderTicket.price) || null,
        stopPrice: parseFloat(orderTicket.stopPrice) || null
      };

      await api.post('/orders', payload);
      toast.success('سفارش ثبت شد');

      // Reset form
      setOrderTicket(prev => ({
        ...prev,
        amount: '',
        price: orderTicket.side === 'buy' ? selectedCurrency?.sellRate : selectedCurrency?.buyRate,
        stopPrice: '',
        notes: ''
      }));
      setRiskCheck(null);
      fetchMarketData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در ثبت سفارش');
    }
  };

  // Cancel order
  const handleCancelOrder = async (orderId) => {
    try {
      await api.put(`/orders/${orderId}/cancel`);
      toast.success('سفارش لغو شد');
      fetchMarketData();
    } catch (error) {
      toast.error('خطا در لغو سفارش');
    }
  };

  // Quick fill from order book
  const handleOrderBookClick = (price, side) => {
    setOrderTicket(prev => ({
      ...prev,
      side: side === 'bid' ? 'sell' : 'buy',
      price: price.toString()
    }));
  };

  const formatNumber = (num) => new Intl.NumberFormat('fa-IR').format(num || 0);
  const formatTime = (date) => new Date(date).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Calculate total
  const totalAmount = parseFloat(orderTicket.amount || 0) * parseFloat(orderTicket.price || marketData.lastPrice);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-dark-900 p-4' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FaChartLine className="text-gold" />
            خرید و فروش حرفه‌ای
          </h1>

          {/* Currency Selector */}
          <div className="flex gap-2">
            {currencies.slice(0, 6).map(currency => (
              <button
                key={currency._id}
                onClick={() => setSelectedCurrency(currency)}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1 text-sm transition-all ${
                  selectedCurrency?._id === currency._id
                    ? 'bg-gold text-dark-900 font-bold'
                    : 'bg-dark-800 text-dark-300 hover:bg-dark-700'
                }`}
              >
                <span>{currency.symbol}</span>
                <span>{currency.code}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={fetchMarketData} className="p-2 text-gold hover:bg-dark-800 rounded-lg">
            <FaSync />
          </button>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 text-dark-400 hover:text-white hover:bg-dark-800 rounded-lg"
          >
            {isFullscreen ? <FaCompress /> : <FaExpand />}
          </button>
        </div>
      </div>

      {/* Market Info Bar */}
      {selectedCurrency && (
        <div className="card p-3 mb-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div>
                <span className="text-dark-400 text-xs">آخرین قیمت</span>
                <p className="text-white text-lg font-bold">{formatNumber(marketData.lastPrice)}</p>
              </div>
              <div>
                <span className="text-dark-400 text-xs">تغییر 24h</span>
                <p className={`font-bold ${marketData.change24h >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {marketData.change24h >= 0 ? '+' : ''}{marketData.change24h.toFixed(2)}%
                </p>
              </div>
              <div>
                <span className="text-dark-400 text-xs">بیشترین</span>
                <p className="text-green-500">{formatNumber(marketData.high24h)}</p>
              </div>
              <div>
                <span className="text-dark-400 text-xs">کمترین</span>
                <p className="text-red-500">{formatNumber(marketData.low24h)}</p>
              </div>
              <div>
                <span className="text-dark-400 text-xs">VWAP</span>
                <p className="text-purple-500">{formatNumber(marketData.vwap)}</p>
              </div>
              <div>
                <span className="text-dark-400 text-xs">حجم 24h</span>
                <p className="text-dark-300">{formatNumber(marketData.volume24h)}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <span className="text-green-500">خرید: {formatNumber(selectedCurrency.buyRate)}</span>
              <span className="text-red-500">فروش: {formatNumber(selectedCurrency.sellRate)}</span>
              <span className="text-gold">
                اسپرد: {formatNumber(selectedCurrency.sellRate - selectedCurrency.buyRate)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Trading Grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Order Book - Left */}
        <div className="col-span-12 lg:col-span-3">
          <div className="card h-full">
            <div className="p-3 border-b border-dark-800 flex items-center justify-between">
              <h3 className="text-white font-bold flex items-center gap-2">
                <FaLayerGroup className="text-gold" />
                دفتر سفارشات
              </h3>
            </div>

            {/* Asks (Sell Orders) */}
            <div className="p-2">
              <div className="grid grid-cols-3 text-xs text-dark-500 pb-1 border-b border-dark-800">
                <span>قیمت</span>
                <span className="text-center">مقدار</span>
                <span className="text-left">تجمعی</span>
              </div>
              <div className="max-h-40 overflow-y-auto">
                {orderBook.asks?.slice().reverse().map((ask, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleOrderBookClick(ask.price, 'ask')}
                    className="grid grid-cols-3 text-xs py-1 hover:bg-red-500/10 cursor-pointer relative"
                  >
                    <div
                      className="absolute inset-0 bg-red-500/10"
                      style={{ width: `${Math.min(100, (ask.cumulative / (orderBook.asks[orderBook.asks.length - 1]?.cumulative || 1)) * 100)}%` }}
                    />
                    <span className="text-red-500 font-medium relative z-10">{formatNumber(ask.price)}</span>
                    <span className="text-white text-center relative z-10">{formatNumber(ask.amount)}</span>
                    <span className="text-dark-400 text-left relative z-10">{formatNumber(ask.cumulative)}</span>
                  </div>
                ))}
              </div>

              {/* Spread */}
              <div className="py-2 text-center border-y border-dark-700 my-2">
                <span className="text-gold text-sm font-bold">
                  {formatNumber(orderBook.spread)} اسپرد
                </span>
              </div>

              {/* Bids (Buy Orders) */}
              <div className="max-h-40 overflow-y-auto">
                {orderBook.bids?.map((bid, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleOrderBookClick(bid.price, 'bid')}
                    className="grid grid-cols-3 text-xs py-1 hover:bg-green-500/10 cursor-pointer relative"
                  >
                    <div
                      className="absolute inset-0 bg-green-500/10"
                      style={{ width: `${Math.min(100, (bid.cumulative / (orderBook.bids[orderBook.bids.length - 1]?.cumulative || 1)) * 100)}%` }}
                    />
                    <span className="text-green-500 font-medium relative z-10">{formatNumber(bid.price)}</span>
                    <span className="text-white text-center relative z-10">{formatNumber(bid.amount)}</span>
                    <span className="text-dark-400 text-left relative z-10">{formatNumber(bid.cumulative)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Order Ticket - Center */}
        <div className="col-span-12 lg:col-span-5">
          <div className="card">
            <div className="p-3 border-b border-dark-800">
              <h3 className="text-white font-bold flex items-center gap-2">
                <FaExchangeAlt className="text-gold" />
                فرم ثبت سفارش
              </h3>
            </div>

            <div className="p-4 space-y-4">
              {/* Buy/Sell Toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setOrderTicket(prev => ({ ...prev, side: 'buy', price: selectedCurrency?.sellRate }))}
                  className={`py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                    orderTicket.side === 'buy'
                      ? 'bg-green-500 text-white'
                      : 'bg-dark-800 text-dark-400 hover:bg-dark-700'
                  }`}
                >
                  <FaArrowUp />
                  خرید
                </button>
                <button
                  onClick={() => setOrderTicket(prev => ({ ...prev, side: 'sell', price: selectedCurrency?.buyRate }))}
                  className={`py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                    orderTicket.side === 'sell'
                      ? 'bg-red-500 text-white'
                      : 'bg-dark-800 text-dark-400 hover:bg-dark-700'
                  }`}
                >
                  <FaArrowDown />
                  فروش
                </button>
              </div>

              {/* Order Type */}
              <div>
                <label className="text-dark-400 text-sm mb-1 block">نوع سفارش</label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { value: 'market', label: 'بازار', icon: FaBolt },
                    { value: 'limit', label: 'محدود', icon: FaChartBar },
                    { value: 'conditional', label: 'شرطی', icon: FaShieldAlt },
                    { value: 'stop_limit', label: 'Stop-Limit', icon: FaLayerGroup }
                  ].map(type => (
                    <button
                      key={type.value}
                      onClick={() => setOrderTicket(prev => ({ ...prev, orderType: type.value }))}
                      className={`py-2 px-1 rounded text-xs flex flex-col items-center gap-1 ${
                        orderTicket.orderType === type.value
                          ? 'bg-gold/20 text-gold border border-gold'
                          : 'bg-dark-800 text-dark-400 border border-dark-700'
                      }`}
                    >
                      <type.icon />
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer Selection */}
              <div>
                <label className="text-dark-400 text-sm mb-1 block flex items-center gap-1">
                  <FaUserTie className="text-gold" />
                  مشتری (اختیاری)
                </label>
                <select
                  value={orderTicket.customerId}
                  onChange={(e) => setOrderTicket(prev => ({ ...prev, customerId: e.target.value }))}
                  className="input w-full"
                >
                  <option value="">سفارش صرافی</option>
                  {customers.filter(c => c.status === 'approved').map(c => (
                    <option key={c._id} value={c._id}>
                      {c.firstName} {c.lastName} - {c.phone}
                    </option>
                  ))}
                </select>
              </div>

              {/* Amount & Price Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-dark-400 text-sm mb-1 block">مقدار ({selectedCurrency?.code})</label>
                  <input
                    type="number"
                    value={orderTicket.amount}
                    onChange={(e) => setOrderTicket(prev => ({ ...prev, amount: e.target.value }))}
                    onBlur={performRiskCheck}
                    className="input w-full text-lg"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="text-dark-400 text-sm mb-1 block">
                    قیمت (ریال)
                    {orderTicket.orderType === 'market' && <span className="text-gold mr-1">(قیمت بازار)</span>}
                  </label>
                  <input
                    type="number"
                    value={orderTicket.price}
                    onChange={(e) => setOrderTicket(prev => ({ ...prev, price: e.target.value }))}
                    className="input w-full text-lg"
                    placeholder={formatNumber(marketData.lastPrice)}
                    disabled={orderTicket.orderType === 'market'}
                  />
                </div>
              </div>

              {/* Stop Price (for conditional orders) */}
              {['conditional', 'stop_limit'].includes(orderTicket.orderType) && (
                <div>
                  <label className="text-dark-400 text-sm mb-1 block">قیمت فعال‌سازی (Stop)</label>
                  <input
                    type="number"
                    value={orderTicket.stopPrice}
                    onChange={(e) => setOrderTicket(prev => ({ ...prev, stopPrice: e.target.value }))}
                    className="input w-full"
                    placeholder="وقتی قیمت به این حد رسید..."
                  />
                </div>
              )}

              {/* Payment Source & Time in Force */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-dark-400 text-sm mb-1 block flex items-center gap-1">
                    <FaWallet className="text-gold" />
                    منبع پرداخت
                  </label>
                  <select
                    value={orderTicket.paymentSource}
                    onChange={(e) => setOrderTicket(prev => ({ ...prev, paymentSource: e.target.value }))}
                    className="input w-full"
                  >
                    <option value="cash">نقدی</option>
                    <option value="credit">اعتباری</option>
                    <option value="mixed">ترکیبی</option>
                  </select>
                </div>
                <div>
                  <label className="text-dark-400 text-sm mb-1 block flex items-center gap-1">
                    <FaClock className="text-gold" />
                    اعتبار زمانی
                  </label>
                  <select
                    value={orderTicket.timeInForce}
                    onChange={(e) => setOrderTicket(prev => ({ ...prev, timeInForce: e.target.value }))}
                    className="input w-full"
                  >
                    <option value="GTC">تا لغو (GTC)</option>
                    <option value="IOC">فوری یا لغو (IOC)</option>
                    <option value="FOK">کامل یا لغو (FOK)</option>
                    <option value="DAY">امروز (DAY)</option>
                  </select>
                </div>
              </div>

              {/* Total & Risk Check */}
              <div className="bg-dark-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-dark-400">مجموع</span>
                  <span className="text-white text-xl font-bold">{formatNumber(totalAmount)} ریال</span>
                </div>

                {/* Risk Check Result */}
                {riskCheck && (
                  <div className={`mt-2 p-2 rounded ${riskCheck.passed ? 'bg-green-500/20' : 'bg-red-500/20'}`}>
                    <div className="flex items-center gap-2 mb-1">
                      {riskCheck.passed ? (
                        <FaCheck className="text-green-500" />
                      ) : (
                        <FaTimes className="text-red-500" />
                      )}
                      <span className={riskCheck.passed ? 'text-green-500' : 'text-red-500'}>
                        {riskCheck.passed ? 'بررسی ریسک: تایید' : 'بررسی ریسک: رد'}
                      </span>
                    </div>
                    {!riskCheck.passed && riskCheck.reason && (
                      <p className="text-red-400 text-xs">{riskCheck.reason}</p>
                    )}
                    {riskCheck.customer && (
                      <div className="text-xs text-dark-400 mt-1">
                        Tier: {riskCheck.customer.tier} | امتیاز: {riskCheck.customer.score} | بلک‌پوینت: {riskCheck.customer.blackPoints}
                      </div>
                    )}
                  </div>
                )}

                {isCheckingRisk && (
                  <div className="flex items-center gap-2 mt-2 text-gold text-sm">
                    <FaSync className="animate-spin" />
                    در حال بررسی ریسک...
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmitOrder}
                disabled={!orderTicket.amount || (riskCheck && !riskCheck.passed)}
                className={`w-full py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                  orderTicket.side === 'buy'
                    ? 'bg-green-500 hover:bg-green-600 text-white disabled:bg-green-500/50'
                    : 'bg-red-500 hover:bg-red-600 text-white disabled:bg-red-500/50'
                }`}
              >
                {orderTicket.side === 'buy' ? <FaArrowUp /> : <FaArrowDown />}
                {orderTicket.side === 'buy' ? 'ثبت سفارش خرید' : 'ثبت سفارش فروش'}
              </button>
            </div>
          </div>
        </div>

        {/* Recent Trades & My Orders - Right */}
        <div className="col-span-12 lg:col-span-4 space-y-4">
          {/* Market Tape */}
          <div className="card">
            <div className="p-3 border-b border-dark-800 flex items-center justify-between">
              <h3 className="text-white font-bold flex items-center gap-2">
                <FaHistory className="text-gold" />
                معاملات اخیر
              </h3>
            </div>
            <div className="max-h-48 overflow-y-auto">
              {recentTrades.length === 0 ? (
                <p className="text-dark-500 text-center p-4">معامله‌ای یافت نشد</p>
              ) : (
                recentTrades.map((trade, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 border-b border-dark-800/50 hover:bg-dark-800/30">
                    <div className="flex items-center gap-2">
                      {trade.side === 'buy' ? (
                        <FaArrowUp className="text-green-500 text-xs" />
                      ) : (
                        <FaArrowDown className="text-red-500 text-xs" />
                      )}
                      <span className={trade.side === 'buy' ? 'text-green-500' : 'text-red-500'}>
                        {formatNumber(trade.price)}
                      </span>
                    </div>
                    <span className="text-white text-sm">{formatNumber(trade.amount)}</span>
                    <span className="text-dark-500 text-xs">{formatTime(trade.time)}</span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* My Open Orders */}
          <div className="card">
            <div className="p-3 border-b border-dark-800 flex items-center justify-between">
              <h3 className="text-white font-bold flex items-center gap-2">
                <FaChartBar className="text-gold" />
                سفارشات فعال من
              </h3>
              <span className="bg-gold/20 text-gold text-xs px-2 py-1 rounded-full">{myOrders.length}</span>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {myOrders.length === 0 ? (
                <p className="text-dark-500 text-center p-4">سفارش فعالی ندارید</p>
              ) : (
                myOrders.map(order => (
                  <div key={order._id} className="p-3 border-b border-dark-800/50 hover:bg-dark-800/30">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        {order.side === 'buy' ? (
                          <span className="bg-green-500/20 text-green-500 text-xs px-2 py-0.5 rounded">خرید</span>
                        ) : (
                          <span className="bg-red-500/20 text-red-500 text-xs px-2 py-0.5 rounded">فروش</span>
                        )}
                        <span className="text-white text-sm">{order.currency?.code}</span>
                      </div>
                      <button
                        onClick={() => handleCancelOrder(order._id)}
                        className="p-1 rounded bg-red-500/20 text-red-500 hover:bg-red-500/30"
                      >
                        <FaTimes className="text-xs" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-dark-400">
                        {formatNumber(order.remainingAmount)}/{formatNumber(order.amount)} @ {formatNumber(order.price)}
                      </span>
                      <span className="text-dark-500">{order.orderNumber}</span>
                    </div>
                    {order.filledAmount > 0 && (
                      <div className="mt-1">
                        <div className="bg-dark-700 rounded-full h-1">
                          <div
                            className="bg-gold h-1 rounded-full"
                            style={{ width: `${(order.filledAmount / order.amount) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProTrade;
