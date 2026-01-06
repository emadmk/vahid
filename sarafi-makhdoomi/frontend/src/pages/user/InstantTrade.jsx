import { useState, useEffect } from 'react';
import {
  FaExchangeAlt, FaArrowUp, FaArrowDown, FaWallet, FaClock,
  FaCheck, FaTimes, FaSync, FaMoneyBillWave, FaCreditCard,
  FaExclamationTriangle, FaHistory, FaInfoCircle
} from 'react-icons/fa';
import api from '../../services/api';
import toast from 'react-hot-toast';
import CurrencySelector from '../../components/CurrencySelector';

const InstantTrade = () => {
  // State های اصلی
  const [currencies, setCurrencies] = useState([]);
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [myTrades, setMyTrades] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);

  // فرم سفارش جدید
  const [tradeForm, setTradeForm] = useState({
    side: 'buy',
    amount: '',
    validUntil: '',
    notes: ''
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [currRes, walletRes, tradesRes] = await Promise.all([
        api.get('/public/currencies'),
        api.get('/wallets/my'),
        api.get('/trades/my-instant-trades')
      ]);

      // API فقط ارزهای فعال رو برمیگردونه، نیازی به فیلتر نیست
      const activeCurrencies = currRes.data.data || [];
      setCurrencies(activeCurrencies);
      setWallet(walletRes.data.data);
      setMyTrades(tradesRes.data.data || []);

      if (activeCurrencies.length > 0) {
        setSelectedCurrency(activeCurrencies[0]);
      }
    } catch (error) {
      toast.error('خطا در بارگذاری اطلاعات');
    } finally {
      setLoading(false);
    }
  };

  const fetchTrades = async () => {
    try {
      const res = await api.get('/trades/my-instant-trades');
      setMyTrades(res.data.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  // محاسبه مبلغ کل
  const calculateTotal = () => {
    if (!tradeForm.amount || !selectedCurrency) return 0;
    const rate = tradeForm.side === 'buy' ? selectedCurrency.sellRate : selectedCurrency.buyRate;
    return parseFloat(tradeForm.amount) * rate;
  };

  // بررسی موجودی کیف پول
  const checkWalletBalance = () => {
    if (!wallet) return null;

    const total = calculateTotal();
    const cashBalance = wallet.cashBalance || 0;
    const creditLimit = wallet.creditLimit || 0;
    const creditUsed = wallet.creditUsed || 0;
    const availableCredit = creditLimit - creditUsed;
    const totalAvailable = cashBalance + availableCredit;

    if (tradeForm.side === 'buy') {
      // برای خرید: باید ریال داشته باشد
      if (cashBalance >= total) {
        return {
          status: 'ok',
          message: 'موجودی نقدی کافی است',
          icon: FaCheck,
          color: 'green',
          canSubmit: true
        };
      } else if (totalAvailable >= total) {
        const creditNeeded = total - cashBalance;
        return {
          status: 'mixed',
          message: `⚠️ کیف پول نقدی کافی نیست! ${formatNumber(creditNeeded)} ریال از اعتبار مصرف می‌شود`,
          icon: FaExclamationTriangle,
          color: 'yellow',
          canSubmit: true,
          creditUsage: creditNeeded
        };
      } else {
        const deficit = total - totalAvailable;
        return {
          status: 'insufficient',
          message: `⛔ موجودی کافی نیست! کسری: ${formatNumber(deficit)} ریال - برای ثبت سفارش، صراف باید اعتبار شما را افزایش دهد`,
          icon: FaTimes,
          color: 'red',
          canSubmit: true, // اجازه ثبت سفارش با هشدار
          deficit: deficit
        };
      }
    } else {
      // برای فروش ارز
      return { status: 'ok', message: 'پس از تایید صراف، به پنل وصول منتقل می‌شود', icon: FaInfoCircle, color: 'blue', canSubmit: true };
    }
  };

  // ثبت سفارش
  const handleSubmitTrade = async () => {
    if (!tradeForm.amount || !selectedCurrency) {
      toast.error('مقدار الزامی است');
      return;
    }

    const walletCheck = checkWalletBalance();

    // نمایش هشدار برای وضعیت‌های خاص
    if (tradeForm.side === 'buy') {
      if (walletCheck?.status === 'insufficient') {
        const confirmed = confirm(
          `⚠️ توجه: موجودی کیف پول و اعتبار شما کافی نیست!\n\n` +
          `کسری: ${formatNumber(walletCheck.deficit)} ریال\n\n` +
          `سفارش شما ثبت می‌شود اما صراف باید ابتدا اعتبار شما را افزایش دهد.\n\n` +
          `آیا ادامه می‌دهید؟`
        );
        if (!confirmed) return;
      } else if (walletCheck?.status === 'mixed') {
        const confirmed = confirm(
          `⚠️ توجه: موجودی نقدی شما کافی نیست!\n\n` +
          `مبلغ ${formatNumber(walletCheck.creditUsage)} ریال از اعتبار شما مصرف خواهد شد.\n\n` +
          `آیا ادامه می‌دهید؟`
        );
        if (!confirmed) return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        currencyId: selectedCurrency._id,
        side: tradeForm.side,
        amount: parseFloat(tradeForm.amount),
        rate: tradeForm.side === 'buy' ? selectedCurrency.sellRate : selectedCurrency.buyRate,
        validUntil: tradeForm.validUntil || null,
        notes: tradeForm.notes,
        // اضافه کردن اطلاعات وضعیت کیف پول
        walletStatus: walletCheck?.status,
        creditUsage: walletCheck?.creditUsage || 0,
        deficit: walletCheck?.deficit || 0
      };

      await api.post('/trades/instant', payload);

      if (walletCheck?.status === 'insufficient') {
        toast.success('سفارش ثبت شد. صراف باید اعتبار شما را افزایش دهد', { duration: 5000 });
      } else if (walletCheck?.status === 'mixed') {
        toast.success('سفارش ثبت شد. بخشی از اعتبار استفاده خواهد شد', { duration: 4000 });
      } else {
        toast.success('سفارش شما ثبت شد و منتظر تایید صراف است');
      }

      // ریست فرم
      setTradeForm({
        side: 'buy',
        amount: '',
        validUntil: '',
        notes: ''
      });
      fetchTrades();
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در ثبت سفارش');
    } finally {
      setSubmitting(false);
    }
  };

  // لغو سفارش
  const handleCancelTrade = async (tradeId) => {
    if (!confirm('آیا از لغو این سفارش مطمئن هستید؟')) return;

    try {
      await api.put(`/trades/instant/${tradeId}/cancel`);
      toast.success('سفارش لغو شد');
      fetchTrades();
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در لغو');
    }
  };

  const formatNumber = (num) => new Intl.NumberFormat('fa-IR').format(num || 0);
  const formatDate = (date) => new Date(date).toLocaleDateString('fa-IR');
  const formatTime = (date) => new Date(date).toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' });

  const getStatusBadge = (status) => {
    const map = {
      pending: { label: 'در انتظار تایید', class: 'bg-yellow-500/20 text-yellow-500' },
      approved: { label: 'تایید شده', class: 'bg-blue-500/20 text-blue-500' },
      pending_collection: { label: 'در انتظار وصول', class: 'bg-orange-500/20 text-orange-500' },
      pending_accounting: { label: 'در انتظار حسابداری', class: 'bg-purple-500/20 text-purple-500' },
      completed: { label: 'تکمیل شده', class: 'bg-green-500/20 text-green-500' },
      rejected: { label: 'رد شده', class: 'bg-red-500/20 text-red-500' },
      cancelled: { label: 'لغو شده', class: 'bg-dark-500/20 text-dark-400' },
      expired: { label: 'منقضی شده', class: 'bg-dark-500/20 text-dark-400' }
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

  const walletCheck = checkWalletBalance();
  const total = calculateTotal();

  return (
    <div className="space-y-6">
      {/* هدر */}
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FaExchangeAlt className="text-gold" />
          خرید و فروش فوری
        </h1>
        <p className="text-dark-400 text-sm mt-1">ثبت سفارش خرید و فروش ارز با نرخ لحظه‌ای</p>
      </div>

      {/* کیف پول */}
      {wallet && (
        <div className="card p-4">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                <FaMoneyBillWave className="text-green-500" />
              </div>
              <div>
                <p className="text-dark-400 text-xs">موجودی نقدی</p>
                <p className="text-green-500 font-bold">{formatNumber(wallet.cashBalance)} ریال</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                <FaCreditCard className="text-blue-500" />
              </div>
              <div>
                <p className="text-dark-400 text-xs">اعتبار</p>
                <p className="text-blue-500 font-bold">
                  {formatNumber(wallet.creditUsed || 0)} / {formatNumber(wallet.creditLimit || 0)} ریال
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* فرم ثبت سفارش */}
        <div className="card">
          <div className="p-4 border-b border-dark-800">
            <h3 className="text-white font-bold">ثبت سفارش جدید</h3>
          </div>
          <div className="p-4 space-y-4">
            {/* انتخاب ارز */}
            <div data-tour="currency-selector">
              <label className="block text-dark-300 mb-2">انتخاب ارز</label>
              <CurrencySelector
                currencies={currencies}
                selectedCurrency={selectedCurrency}
                onSelect={setSelectedCurrency}
                showRates={false}
                compact={true}
              />
            </div>

            {/* نوع معامله */}
            <div data-tour="trade-type">
              <label className="block text-dark-300 mb-2">نوع معامله</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTradeForm({ ...tradeForm, side: 'buy' })}
                  className={`py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                    tradeForm.side === 'buy'
                      ? 'bg-green-500 text-white'
                      : 'bg-dark-800 text-dark-400 hover:bg-dark-700'
                  }`}
                >
                  <FaArrowUp />
                  خرید ارز
                </button>
                <button
                  onClick={() => setTradeForm({ ...tradeForm, side: 'sell' })}
                  className={`py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
                    tradeForm.side === 'sell'
                      ? 'bg-red-500 text-white'
                      : 'bg-dark-800 text-dark-400 hover:bg-dark-700'
                  }`}
                >
                  <FaArrowDown />
                  فروش ارز
                </button>
              </div>
            </div>

            {/* نرخ */}
            {selectedCurrency && (
              <div className="bg-dark-800 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <span className="text-dark-400">نرخ {tradeForm.side === 'buy' ? 'خرید' : 'فروش'}:</span>
                  <span className={`text-xl font-bold ${tradeForm.side === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                    {formatNumber(tradeForm.side === 'buy' ? selectedCurrency.sellRate : selectedCurrency.buyRate)} ریال
                  </span>
                </div>
              </div>
            )}

            {/* مقدار */}
            <div data-tour="trade-amount">
              <label className="block text-dark-300 mb-2">مقدار ({selectedCurrency?.code || 'ارز'})</label>
              <input
                type="number"
                value={tradeForm.amount}
                onChange={(e) => setTradeForm({ ...tradeForm, amount: e.target.value })}
                className="input w-full text-lg"
                placeholder="0.00"
              />
            </div>

            {/* اعتبار تا */}
            <div>
              <label className="block text-dark-300 mb-2 flex items-center gap-2">
                <FaClock className="text-gold" />
                اعتبار سفارش تا (اختیاری)
              </label>
              <input
                type="datetime-local"
                value={tradeForm.validUntil}
                onChange={(e) => setTradeForm({ ...tradeForm, validUntil: e.target.value })}
                className="input w-full"
              />
            </div>

            {/* مبلغ کل و وضعیت کیف پول */}
            <div className="bg-dark-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-dark-400">مبلغ کل:</span>
                <span className="text-white text-xl font-bold">{formatNumber(total)} ریال</span>
              </div>

              {walletCheck && tradeForm.amount && (
                <div className={`p-2 rounded flex items-center gap-2 ${
                  walletCheck.color === 'green' ? 'bg-green-500/20' :
                  walletCheck.color === 'yellow' ? 'bg-yellow-500/20' :
                  walletCheck.color === 'blue' ? 'bg-blue-500/20' : 'bg-red-500/20'
                }`}>
                  <walletCheck.icon className={`text-${walletCheck.color}-500`} />
                  <span className={`text-${walletCheck.color}-500 text-sm`}>
                    {walletCheck.message}
                  </span>
                </div>
              )}
            </div>

            {/* دکمه ثبت */}
            <button
              data-tour="submit-trade"
              onClick={handleSubmitTrade}
              disabled={submitting || !tradeForm.amount}
              className={`w-full py-4 rounded-lg font-bold text-lg flex items-center justify-center gap-2 ${
                tradeForm.side === 'buy'
                  ? walletCheck?.status === 'insufficient'
                    ? 'bg-orange-500 hover:bg-orange-600 text-white disabled:bg-orange-500/50'
                    : 'bg-green-500 hover:bg-green-600 text-white disabled:bg-green-500/50'
                  : 'bg-red-500 hover:bg-red-600 text-white disabled:bg-red-500/50'
              }`}
            >
              {submitting ? (
                <FaSync className="animate-spin" />
              ) : (
                <>
                  {tradeForm.side === 'buy' ? <FaArrowUp /> : <FaArrowDown />}
                  ثبت سفارش {tradeForm.side === 'buy' ? 'خرید' : 'فروش'}
                </>
              )}
            </button>
          </div>
        </div>

        {/* لیست سفارشات */}
        <div className="card">
          <div className="p-4 border-b border-dark-800 flex items-center justify-between">
            <h3 className="text-white font-bold flex items-center gap-2">
              <FaHistory className="text-gold" />
              سفارشات من
            </h3>
            <button onClick={fetchTrades} className="p-2 text-gold hover:bg-dark-800 rounded-lg">
              <FaSync />
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {myTrades.length === 0 ? (
              <p className="text-dark-500 text-center p-8">سفارشی وجود ندارد</p>
            ) : (
              myTrades.map(trade => (
                <div key={trade._id} className="p-4 border-b border-dark-800 hover:bg-dark-800/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`flex items-center gap-1 ${trade.side === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                        {trade.side === 'buy' ? <FaArrowUp /> : <FaArrowDown />}
                        {trade.side === 'buy' ? 'خرید' : 'فروش'}
                      </span>
                      <span className="text-white">{trade.currency?.code}</span>
                    </div>
                    {getStatusBadge(trade.status)}
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-dark-400">مقدار: </span>
                      <span className="text-white">{formatNumber(trade.amount)}</span>
                    </div>
                    <div>
                      <span className="text-dark-400">نرخ: </span>
                      <span className="text-white">{formatNumber(trade.rate)}</span>
                    </div>
                    <div>
                      <span className="text-dark-400">مبلغ کل: </span>
                      <span className="text-white">{formatNumber(trade.totalAmount)}</span>
                    </div>
                    <div>
                      <span className="text-dark-400">تاریخ: </span>
                      <span className="text-white">{formatDate(trade.createdAt)}</span>
                    </div>
                  </div>

                  {/* دلیل رد */}
                  {trade.status === 'rejected' && trade.rejectionReason && (
                    <div className="mt-2 p-2 bg-red-500/20 rounded text-red-400 text-sm">
                      دلیل رد: {trade.rejectionReason}
                    </div>
                  )}

                  {/* دکمه لغو */}
                  {trade.status === 'pending' && (
                    <button
                      onClick={() => handleCancelTrade(trade._id)}
                      className="mt-2 text-red-500 text-sm flex items-center gap-1 hover:text-red-400"
                    >
                      <FaTimes />
                      لغو سفارش
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstantTrade;
