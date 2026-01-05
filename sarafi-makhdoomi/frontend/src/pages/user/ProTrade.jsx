import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FaChartLine, FaArrowUp, FaArrowDown, FaExchangeAlt, FaBolt,
  FaClock, FaWallet, FaPercent, FaInfoCircle, FaCheck, FaTimes,
  FaSync, FaHistory, FaChartBar, FaLayerGroup, FaCalculator,
  FaExpand, FaCompress, FaCoins
} from 'react-icons/fa';
import api from '../../services/api';
import toast from 'react-hot-toast';
import CurrencySelector from '../../components/CurrencySelector';

const ProTrade = () => {
  // State های اصلی
  const [currencies, setCurrencies] = useState([]);
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [orderBook, setOrderBook] = useState({ bids: [], asks: [] });
  const [recentTrades, setRecentTrades] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Order Ticket State
  const [orderTicket, setOrderTicket] = useState({
    side: 'buy',
    orderType: 'limit',
    amount: '',
    price: '',
    stopPrice: '',
    timeInForce: 'GTC',
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
      // Auto-refresh every 3 seconds
      intervalRef.current = setInterval(() => {
        fetchMarketData();
      }, 3000);
      return () => clearInterval(intervalRef.current);
    }
  }, [selectedCurrency]);

  // Fetch initial data
  const fetchInitialData = async () => {
    try {
      const [currRes, walletRes] = await Promise.all([
        api.get('/public/currencies'),
        api.get('/wallets/my').catch(() => ({ data: { data: null } }))
      ]);

      const activeCurrencies = currRes.data.data || [];
      setCurrencies(activeCurrencies);
      setWallet(walletRes.data.data);

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
        api.get(`/orders/book/${selectedCurrency._id}?levels=15`).catch(() => ({ data: { data: { bids: [], asks: [] } } })),
        api.get(`/orders/tape/${selectedCurrency._id}?limit=20`).catch(() => ({ data: { data: [] } })),
        api.get(`/orders/stats/${selectedCurrency._id}`).catch(() => ({ data: { data: {} } })),
        api.get('/orders/my', { params: { status: 'open', limit: 10 } }).catch(() => ({ data: { data: [] } }))
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
        currencyId: selectedCurrency._id,
        side: orderTicket.side,
        orderType: orderTicket.orderType,
        amount: parseFloat(orderTicket.amount),
        price: parseFloat(orderTicket.price) || null,
        stopPrice: parseFloat(orderTicket.stopPrice) || null,
        timeInForce: orderTicket.timeInForce,
        notes: orderTicket.notes
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

  // Quick amount buttons
  const handleQuickAmount = (percentage) => {
    if (!wallet || !selectedCurrency) return;

    let balance;
    if (orderTicket.side === 'buy') {
      // برای خرید: موجودی ریالی تقسیم بر قیمت = مقدار ارز قابل خرید
      const rialBalance = wallet.cashBalance || 0;
      const price = orderTicket.price || selectedCurrency.sellRate;
      balance = price > 0 ? rialBalance / price : 0;
    } else {
      // برای فروش: موجودی ارز
      const currencyBalance = wallet.currencyBalances?.find(
        cb => cb.currency?.code === selectedCurrency.code || cb.currency?._id === selectedCurrency._id
      );
      balance = currencyBalance?.balance || 0;
    }

    const amount = (balance * percentage / 100).toFixed(selectedCurrency.decimalPlaces || 2);
    setOrderTicket(prev => ({ ...prev, amount }));
  };

  const formatNumber = (num) => new Intl.NumberFormat('fa-IR').format(num || 0);
  const formatTime = (date) => new Date(date).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  // Calculate total
  const totalAmount = parseFloat(orderTicket.amount || 0) * parseFloat(orderTicket.price || marketData.lastPrice);

  // Get wallet balance for selected currency
  const getCurrencyBalance = () => {
    if (!wallet || !selectedCurrency) return 0;
    // currencyBalances آرایه‌ای از آبجکت‌ها با فرمت {currency: {...}, balance: number}
    const currencyBalance = wallet.currencyBalances?.find(
      cb => cb.currency?.code === selectedCurrency.code || cb.currency?._id === selectedCurrency._id
    );
    return currencyBalance?.balance || 0;
  };

  const getRialBalance = () => {
    if (!wallet) return 0;
    return wallet.cashBalance || 0;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className={`${isFullscreen ? 'fixed inset-0 z-50 bg-dark-900 p-4 overflow-auto' : ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FaChartLine className="text-gold" />
            معاملات حرفه‌ای
          </h1>

          {/* Currency Selector */}
          <div className="w-64">
            <CurrencySelector
              currencies={currencies}
              selectedCurrency={selectedCurrency}
              onSelect={setSelectedCurrency}
              showRates={false}
              compact={true}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Wallet Balance */}
          <div className="hidden md:flex items-center gap-4 bg-dark-800 rounded-lg px-4 py-2">
            <div className="flex items-center gap-2">
              <FaWallet className="text-gold" />
              <span className="text-dark-400 text-sm">موجودی:</span>
            </div>
            <div className="text-sm">
              <span className="text-white">{formatNumber(getRialBalance())}</span>
              <span className="text-dark-400 mr-1">ریال</span>
            </div>
            {selectedCurrency && (
              <div className="text-sm border-r border-dark-700 pr-4">
                <span className="text-white">{formatNumber(getCurrencyBalance())}</span>
                <span className="text-dark-400 mr-1">{selectedCurrency.code}</span>
              </div>
            )}
          </div>

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
                  {marketData.change24h >= 0 ? '+' : ''}{(marketData.change24h || 0).toFixed(2)}%
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
              <div className="hidden lg:block">
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
                {(orderBook.asks || []).slice().reverse().map((ask, idx) => (
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
                {(!orderBook.asks || orderBook.asks.length === 0) && (
                  <p className="text-dark-500 text-center py-4 text-xs">سفارش فروشی نیست</p>
                )}
              </div>

              {/* Spread */}
              <div className="py-2 text-center border-y border-dark-700 my-2">
                <span className="text-gold text-sm font-bold">
                  {formatNumber(orderBook.spread || (selectedCurrency?.sellRate - selectedCurrency?.buyRate))} اسپرد
                </span>
              </div>

              {/* Bids (Buy Orders) */}
              <div className="max-h-40 overflow-y-auto">
                {(orderBook.bids || []).map((bid, idx) => (
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
                {(!orderBook.bids || orderBook.bids.length === 0) && (
                  <p className="text-dark-500 text-center py-4 text-xs">سفارش خریدی نیست</p>
                )}
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
                ثبت سفارش
              </h3>
            </div>

            <div className="p-4 space-y-4">
              {/* Buy/Sell Toggle */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setOrderTicket(prev => ({ ...prev, side: 'buy', price: selectedCurrency?.sellRate }))}
                  className={`py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                    orderTicket.side === 'buy'
                      ? 'bg-green-500 text-white shadow-lg shadow-green-500/30'
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
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
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
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'market', label: 'بازار', icon: FaBolt, desc: 'اجرای فوری' },
                    { value: 'limit', label: 'محدود', icon: FaChartBar, desc: 'قیمت دلخواه' },
                    { value: 'stop_limit', label: 'Stop-Limit', icon: FaLayerGroup, desc: 'شرطی' }
                  ].map(type => (
                    <button
                      key={type.value}
                      onClick={() => setOrderTicket(prev => ({ ...prev, orderType: type.value }))}
                      className={`py-2 px-2 rounded-lg text-xs flex flex-col items-center gap-1 transition-all ${
                        orderTicket.orderType === type.value
                          ? 'bg-gold/20 text-gold border border-gold'
                          : 'bg-dark-800 text-dark-400 border border-dark-700 hover:border-dark-600'
                      }`}
                    >
                      <type.icon className="text-lg" />
                      <span className="font-medium">{type.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount & Price Row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-dark-400 text-sm mb-1 block">مقدار ({selectedCurrency?.code})</label>
                  <input
                    type="number"
                    value={orderTicket.amount}
                    onChange={(e) => setOrderTicket(prev => ({ ...prev, amount: e.target.value }))}
                    className="input w-full text-lg"
                    placeholder="0.00"
                  />
                  {/* Quick Amount Buttons */}
                  <div className="flex gap-1 mt-2">
                    {[25, 50, 75, 100].map(pct => (
                      <button
                        key={pct}
                        onClick={() => handleQuickAmount(pct)}
                        className="flex-1 py-1 text-xs bg-dark-800 hover:bg-dark-700 text-dark-400 hover:text-white rounded transition-all"
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-dark-400 text-sm mb-1 block">
                    قیمت (ریال)
                    {orderTicket.orderType === 'market' && <span className="text-gold mr-1">(بازار)</span>}
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

              {/* Stop Price (for stop_limit orders) */}
              {orderTicket.orderType === 'stop_limit' && (
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

              {/* Time in Force */}
              <div>
                <label className="text-dark-400 text-sm mb-1 block flex items-center gap-1">
                  <FaClock className="text-gold" />
                  اعتبار سفارش
                </label>
                <select
                  value={orderTicket.timeInForce}
                  onChange={(e) => setOrderTicket(prev => ({ ...prev, timeInForce: e.target.value }))}
                  className="input w-full"
                >
                  <option value="GTC">تا لغو (GTC)</option>
                  <option value="IOC">فوری یا لغو (IOC)</option>
                  <option value="FOK">کامل یا لغو (FOK)</option>
                  <option value="DAY">فقط امروز (DAY)</option>
                </select>
              </div>

              {/* Total & Summary */}
              <div className="bg-dark-800 rounded-xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-dark-400">مجموع</span>
                  <span className="text-white text-xl font-bold">{formatNumber(totalAmount)} ریال</span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs text-dark-400">
                  <div>
                    <span>موجودی {selectedCurrency?.code}:</span>
                    <span className="text-white mr-2">{formatNumber(getCurrencyBalance())}</span>
                  </div>
                  <div>
                    <span>موجودی ریال:</span>
                    <span className="text-white mr-2">{formatNumber(getRialBalance())}</span>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={handleSubmitOrder}
                disabled={!orderTicket.amount}
                className={`w-full py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                  orderTicket.side === 'buy'
                    ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white disabled:from-green-500/50 disabled:to-green-600/50 shadow-lg shadow-green-500/20'
                    : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white disabled:from-red-500/50 disabled:to-red-600/50 shadow-lg shadow-red-500/20'
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
                    <span className="text-dark-500 text-xs">{formatTime(trade.time || trade.createdAt)}</span>
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
                        {formatNumber(order.remainingAmount || order.amount)}/{formatNumber(order.amount)} @ {formatNumber(order.price)}
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

          {/* Quick Info */}
          <div className="card p-4">
            <div className="flex items-center gap-2 mb-3">
              <FaInfoCircle className="text-gold" />
              <span className="text-white font-medium">راهنما</span>
            </div>
            <div className="space-y-2 text-xs text-dark-400">
              <p>• <span className="text-green-500">سفارش بازار:</span> اجرای فوری با بهترین قیمت</p>
              <p>• <span className="text-blue-500">سفارش محدود:</span> اجرا در قیمت تعیین شده</p>
              <p>• <span className="text-purple-500">Stop-Limit:</span> فعال شدن در قیمت مشخص</p>
              <p className="pt-2 border-t border-dark-700">روی قیمت‌های Order Book کلیک کنید تا در فرم وارد شود</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProTrade;
