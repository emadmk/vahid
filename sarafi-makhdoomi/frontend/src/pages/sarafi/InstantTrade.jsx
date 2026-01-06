import { useState, useEffect } from 'react';
import {
  FaExchangeAlt, FaArrowUp, FaArrowDown, FaWallet, FaClock,
  FaCheck, FaTimes, FaSync, FaUser, FaMoneyBillWave, FaCreditCard,
  FaExclamationTriangle, FaFilter, FaEye, FaHistory, FaReceipt,
  FaMoneyCheckAlt, FaHandHoldingUsd
} from 'react-icons/fa';
import api from '../../services/api';
import toast from 'react-hot-toast';
import CurrencySelector from '../../components/CurrencySelector';

const InstantTrade = () => {
  // State های اصلی
  const [currencies, setCurrencies] = useState([]);
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showTradeModal, setShowTradeModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  // فرم سفارش جدید
  const [tradeForm, setTradeForm] = useState({
    customerId: '',
    side: 'buy',
    amount: '',
    validUntil: '',
    notes: ''
  });

  // وضعیت کیف پول مشتری انتخاب شده
  const [customerWallet, setCustomerWallet] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    fetchTrades();
  }, [filter]);

  useEffect(() => {
    if (tradeForm.customerId) {
      fetchCustomerWallet(tradeForm.customerId);
    } else {
      setCustomerWallet(null);
    }
  }, [tradeForm.customerId]);

  const fetchInitialData = async () => {
    try {
      const [currRes, custRes] = await Promise.all([
        api.get('/public/currencies'),
        api.get('/sarafi/customers')
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

  const fetchTrades = async () => {
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const res = await api.get('/trades/sarafi/instant-trades', { params });
      setTrades(res.data.data || []);
    } catch (error) {
      console.error(error);
    }
  };

  const fetchCustomerWallet = async (customerId) => {
    try {
      const res = await api.get(`/sarafi/customers/${customerId}/wallet`);
      setCustomerWallet(res.data.data);
    } catch (error) {
      console.error(error);
      setCustomerWallet(null);
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
    if (!customerWallet) return null;

    const total = calculateTotal();
    const cashBalance = customerWallet.cashBalance || 0;
    const creditBalance = customerWallet.creditBalance || 0;
    const creditLimit = customerWallet.creditLimit || 0;
    const availableCredit = creditLimit - creditBalance;

    if (tradeForm.side === 'buy') {
      // برای خرید: باید ریال داشته باشد
      if (cashBalance >= total) {
        return { status: 'ok', message: 'موجودی نقدی کافی است', paymentMethod: 'cash' };
      } else if (cashBalance + availableCredit >= total) {
        return {
          status: 'mixed',
          message: `${formatNumber(cashBalance)} نقدی + ${formatNumber(total - cashBalance)} اعتباری`,
          paymentMethod: 'mixed',
          cashAmount: cashBalance,
          creditAmount: total - cashBalance
        };
      } else {
        return {
          status: 'insufficient',
          message: `کسری: ${formatNumber(total - cashBalance - availableCredit)} ریال`,
          shortage: total - cashBalance - availableCredit
        };
      }
    } else {
      // برای فروش: باید ارز داشته باشد - این در بک‌اند چک می‌شود
      return { status: 'ok', message: 'در انتظار تایید صراف', paymentMethod: 'currency' };
    }
  };

  // ثبت سفارش
  const handleSubmitTrade = async () => {
    if (!tradeForm.amount || !selectedCurrency) {
      toast.error('مقدار الزامی است');
      return;
    }

    if (!tradeForm.customerId) {
      toast.error('انتخاب مشتری الزامی است');
      return;
    }

    setSubmitting(true);
    try {
      const walletCheck = checkWalletBalance();

      const payload = {
        customerId: tradeForm.customerId,
        currencyId: selectedCurrency._id,
        side: tradeForm.side,
        amount: parseFloat(tradeForm.amount),
        rate: tradeForm.side === 'buy' ? selectedCurrency.sellRate : selectedCurrency.buyRate,
        validUntil: tradeForm.validUntil || null,
        notes: tradeForm.notes,
        paymentMethod: walletCheck?.paymentMethod || 'cash',
        walletStatus: walletCheck
      };

      await api.post('/trades/instant', payload);
      toast.success('سفارش ثبت شد و منتظر تایید است');

      // ریست فرم
      setTradeForm({
        customerId: '',
        side: 'buy',
        amount: '',
        validUntil: '',
        notes: ''
      });
      setCustomerWallet(null);
      setShowTradeModal(false);
      fetchTrades();
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در ثبت سفارش');
    } finally {
      setSubmitting(false);
    }
  };

  // تایید معامله توسط صراف
  const handleApproveTrade = async (trade) => {
    // بررسی وضعیت کیف پول و نمایش هشدار
    const walletStatus = trade.walletStatus?.status;

    if (walletStatus === 'insufficient') {
      const confirmed = confirm(
        `⛔ هشدار: موجودی و اعتبار مشتری کافی نیست!\n\n` +
        `کسری: ${formatNumber(trade.walletStatus?.shortage)} ریال\n\n` +
        `⚠️ قبل از تایید، اعتبار مشتری را افزایش دهید.\n\n` +
        `آیا با این حال ادامه می‌دهید؟`
      );
      if (!confirmed) return;
    } else if (walletStatus === 'mixed') {
      const confirmed = confirm(
        `⚠️ توجه: بخشی از مبلغ از اعتبار مشتری کسر می‌شود.\n\n` +
        `مبلغ اعتباری: ${formatNumber(trade.walletStatus?.creditAmount)} ریال\n\n` +
        `آیا ادامه می‌دهید؟`
      );
      if (!confirmed) return;
    }

    try {
      await api.put(`/trades/instant/${trade._id}/approve`);
      toast.success('معامله تایید شد');
      fetchTrades();
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در تایید');
    }
  };

  // رد معامله با دلیل
  const handleRejectTrade = async () => {
    if (!rejectReason.trim()) {
      toast.error('لطفا دلیل رد را وارد کنید');
      return;
    }

    try {
      await api.put(`/trades/instant/${selectedTrade._id}/reject`, {
        reason: rejectReason
      });
      toast.success('معامله رد شد');
      setShowRejectModal(false);
      setSelectedTrade(null);
      setRejectReason('');
      fetchTrades();
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در رد');
    }
  };

  // ثبت وصول
  const handleMarkCollected = async (tradeId) => {
    if (!confirm('آیا وصول این معامله را تایید می‌کنید؟')) return;

    try {
      await api.put(`/trades/instant/${tradeId}/confirm-collection`);
      toast.success('وصول ثبت شد');
      fetchTrades();
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در ثبت وصول');
    }
  };

  // تکمیل حسابداری
  const handleCompleteTrade = async (tradeId) => {
    if (!confirm('آیا حسابداری این معامله را تکمیل می‌کنید؟')) return;

    try {
      await api.put(`/trades/instant/${tradeId}/accounting-approve`);
      toast.success('معامله تکمیل شد');
      fetchTrades();
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در تکمیل');
    }
  };

  const formatNumber = (num) => new Intl.NumberFormat('fa-IR').format(num || 0);
  const formatDate = (date) => new Date(date).toLocaleDateString('fa-IR');

  const getStatusBadge = (status) => {
    const map = {
      pending: { label: 'در انتظار تایید صراف', class: 'bg-yellow-500/20 text-yellow-500' },
      approved: { label: 'تایید صراف', class: 'bg-blue-500/20 text-blue-500' },
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
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FaExchangeAlt className="text-gold" />
            خرید و فروش فوری
          </h1>
          <p className="text-dark-400 text-sm mt-1">ثبت و مدیریت معاملات فوری مشتریان</p>
        </div>
        <button
          data-tour="new-trade-btn"
          onClick={() => setShowTradeModal(true)}
          className="btn-gold flex items-center gap-2"
        >
          <FaExchangeAlt />
          معامله جدید
        </button>
      </div>

      {/* انتخاب ارز با کامپوننت جدید */}
      <div data-tour="currency-selector">
        <CurrencySelector
          currencies={currencies}
          selectedCurrency={selectedCurrency}
          onSelect={setSelectedCurrency}
          showRates={true}
        />
      </div>

      {/* لیست معاملات */}
      <div data-tour="trades-table" className="card overflow-hidden">
        <div className="p-4 border-b border-dark-800 flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-white font-bold flex items-center gap-2">
            <FaHistory className="text-gold" />
            معاملات فوری
          </h3>
          <div data-tour="trade-filters" className="flex gap-2">
            {[
              { value: 'all', label: 'همه' },
              { value: 'pending', label: 'در انتظار' },
              { value: 'approved', label: 'تایید شده' },
              { value: 'pending_collection', label: 'وصول' },
              { value: 'completed', label: 'تکمیل' },
              { value: 'rejected', label: 'رد شده' }
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
                <th className="text-right p-3 text-dark-400 text-sm">مشتری</th>
                <th className="text-right p-3 text-dark-400 text-sm">نوع</th>
                <th className="text-right p-3 text-dark-400 text-sm">ارز</th>
                <th className="text-right p-3 text-dark-400 text-sm">مقدار</th>
                <th className="text-right p-3 text-dark-400 text-sm">نرخ</th>
                <th className="text-right p-3 text-dark-400 text-sm">مبلغ کل</th>
                <th className="text-right p-3 text-dark-400 text-sm">وضعیت کیف پول</th>
                <th className="text-right p-3 text-dark-400 text-sm">وضعیت</th>
                <th className="text-center p-3 text-dark-400 text-sm">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {trades.length === 0 ? (
                <tr>
                  <td colSpan="10" className="text-center p-8 text-dark-500">
                    معامله‌ای وجود ندارد
                  </td>
                </tr>
              ) : (
                trades.map(trade => (
                  <tr key={trade._id} className="border-t border-dark-800 hover:bg-dark-800/30">
                    <td className="p-3 text-gold text-sm">{trade.tradeNumber}</td>
                    <td className="p-3">
                      {trade.isGroupTrade ? (
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                          <div>
                            <span className="text-purple-400">
                              {trade.ownerSarafi?.sarafiInfo?.name || trade.ownerSarafi?.sarafiInfo?.alias || `${trade.ownerSarafi?.firstName || ''} ${trade.ownerSarafi?.lastName || ''}`.trim() || 'صراف'}
                            </span>
                            <p className="text-dark-500 text-xs">
                              {trade.sharedCustomer?.displayName || 'مشتری گروهی'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <span className="text-white">{trade.customer?.firstName} {trade.customer?.lastName}</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`flex items-center gap-1 ${trade.side === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                        {trade.side === 'buy' ? <FaArrowUp /> : <FaArrowDown />}
                        {trade.side === 'buy' ? 'خرید' : 'فروش'}
                      </span>
                    </td>
                    <td className="p-3 text-white">{trade.currency?.code}</td>
                    <td className="p-3 text-white">{formatNumber(trade.amount)}</td>
                    <td className="p-3 text-white">{formatNumber(trade.rate)}</td>
                    <td className="p-3 text-white">{formatNumber(trade.totalAmount)}</td>
                    <td className="p-3">
                      {trade.walletStatus?.status === 'ok' && (
                        <span className="text-green-500 text-xs flex items-center gap-1">
                          <FaCheck /> موجودی کافی
                        </span>
                      )}
                      {trade.walletStatus?.status === 'mixed' && (
                        <span className="text-yellow-500 text-xs flex items-center gap-1">
                          <FaExclamationTriangle /> ترکیبی
                        </span>
                      )}
                      {trade.walletStatus?.status === 'insufficient' && (
                        <span className="text-red-500 text-xs flex items-center gap-1">
                          <FaTimes /> کسری موجودی
                        </span>
                      )}
                    </td>
                    <td className="p-3">{getStatusBadge(trade.status)}</td>
                    <td className="p-3">
                      <div className="flex items-center justify-center gap-1">
                        {/* تایید صراف */}
                        {trade.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApproveTrade(trade)}
                              className={`p-2 rounded-lg ${
                                trade.walletStatus?.status === 'insufficient'
                                  ? 'bg-orange-500/20 text-orange-500 hover:bg-orange-500/30'
                                  : trade.walletStatus?.status === 'mixed'
                                    ? 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30'
                                    : 'bg-green-500/20 text-green-500 hover:bg-green-500/30'
                              }`}
                              title={
                                trade.walletStatus?.status === 'insufficient'
                                  ? '⚠️ تایید - کسری موجودی!'
                                  : trade.walletStatus?.status === 'mixed'
                                    ? '⚠️ تایید - استفاده از اعتبار'
                                    : 'تایید صراف'
                              }
                            >
                              {trade.walletStatus?.status === 'insufficient' || trade.walletStatus?.status === 'mixed' ? (
                                <FaExclamationTriangle />
                              ) : (
                                <FaCheck />
                              )}
                            </button>
                            <button
                              onClick={() => {
                                setSelectedTrade(trade);
                                setShowRejectModal(true);
                              }}
                              className="p-2 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30"
                              title="رد"
                            >
                              <FaTimes />
                            </button>
                          </>
                        )}

                        {/* ثبت وصول */}
                        {trade.status === 'pending_collection' && (
                          <button
                            onClick={() => handleMarkCollected(trade._id)}
                            className="p-2 rounded-lg bg-blue-500/20 text-blue-500 hover:bg-blue-500/30"
                            title="ثبت وصول"
                          >
                            <FaHandHoldingUsd />
                          </button>
                        )}

                        {/* تکمیل معامله */}
                        {trade.status === 'pending_accounting' && (
                          <button
                            onClick={() => handleCompleteTrade(trade._id)}
                            className="p-2 rounded-lg bg-purple-500/20 text-purple-500 hover:bg-purple-500/30"
                            title="تکمیل حسابداری"
                          >
                            <FaReceipt />
                          </button>
                        )}

                        {/* جزئیات */}
                        <button
                          onClick={() => setSelectedTrade(trade)}
                          className="p-2 rounded-lg bg-dark-700 text-dark-400 hover:bg-dark-600"
                          title="جزئیات"
                        >
                          <FaEye />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* مودال معامله جدید */}
      {showTradeModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-dark-800">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FaExchangeAlt className="text-gold" />
                معامله فوری جدید
              </h2>
              <button onClick={() => setShowTradeModal(false)} className="text-dark-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* انتخاب مشتری */}
              <div>
                <label className="block text-dark-300 mb-2 flex items-center gap-2">
                  <FaUser className="text-gold" />
                  انتخاب مشتری
                </label>
                <select
                  value={tradeForm.customerId}
                  onChange={(e) => setTradeForm({ ...tradeForm, customerId: e.target.value })}
                  className="input w-full"
                >
                  <option value="">انتخاب کنید...</option>
                  {customers.filter(c => c.status === 'approved').map(c => (
                    <option key={c._id} value={c._id}>
                      {c.firstName} {c.lastName} - {c.phone}
                    </option>
                  ))}
                </select>
              </div>

              {/* نمایش وضعیت کیف پول */}
              {customerWallet && (
                <div className="bg-dark-800 rounded-lg p-3 space-y-2">
                  <p className="text-dark-400 text-sm">وضعیت کیف پول مشتری:</p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1 text-green-500">
                      <FaMoneyBillWave />
                      نقدی: {formatNumber(customerWallet.cashBalance)}
                    </span>
                    <span className="flex items-center gap-1 text-blue-500">
                      <FaCreditCard />
                      اعتباری: {formatNumber(customerWallet.creditBalance)} / {formatNumber(customerWallet.creditLimit)}
                    </span>
                  </div>
                </div>
              )}

              {/* نوع معامله */}
              <div>
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
                    خرید (مشتری می‌خرد)
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
                    فروش (مشتری می‌فروشد)
                  </button>
                </div>
              </div>

              {/* ارز و قیمت */}
              <div className="bg-dark-800 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-dark-400">ارز:</span>
                  <span className="text-white font-bold">{selectedCurrency?.nameFa} ({selectedCurrency?.code})</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-dark-400">نرخ:</span>
                  <span className={`font-bold ${tradeForm.side === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                    {formatNumber(tradeForm.side === 'buy' ? selectedCurrency?.sellRate : selectedCurrency?.buyRate)} ریال
                  </span>
                </div>
              </div>

              {/* مقدار */}
              <div>
                <label className="block text-dark-300 mb-2">مقدار ({selectedCurrency?.code})</label>
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
                  اعتبار سفارش تا
                </label>
                <input
                  type="datetime-local"
                  value={tradeForm.validUntil}
                  onChange={(e) => setTradeForm({ ...tradeForm, validUntil: e.target.value })}
                  className="input w-full"
                />
              </div>

              {/* یادداشت */}
              <div>
                <label className="block text-dark-300 mb-2">یادداشت</label>
                <textarea
                  value={tradeForm.notes}
                  onChange={(e) => setTradeForm({ ...tradeForm, notes: e.target.value })}
                  className="input w-full"
                  rows="2"
                />
              </div>

              {/* محاسبه مبلغ کل */}
              <div className="bg-dark-800 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-dark-400">مبلغ کل:</span>
                  <span className="text-white text-xl font-bold">{formatNumber(total)} ریال</span>
                </div>

                {/* وضعیت کیف پول */}
                {walletCheck && tradeForm.customerId && (
                  <div className={`p-2 rounded ${
                    walletCheck.status === 'ok' ? 'bg-green-500/20' :
                    walletCheck.status === 'mixed' ? 'bg-yellow-500/20' : 'bg-red-500/20'
                  }`}>
                    <div className="flex items-center gap-2">
                      {walletCheck.status === 'ok' ? (
                        <FaCheck className="text-green-500" />
                      ) : walletCheck.status === 'mixed' ? (
                        <FaExclamationTriangle className="text-yellow-500" />
                      ) : (
                        <FaTimes className="text-red-500" />
                      )}
                      <span className={
                        walletCheck.status === 'ok' ? 'text-green-500' :
                        walletCheck.status === 'mixed' ? 'text-yellow-500' : 'text-red-500'
                      }>
                        {walletCheck.message}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4 p-4 border-t border-dark-800">
              <button
                onClick={handleSubmitTrade}
                disabled={submitting || !tradeForm.amount || !tradeForm.customerId}
                className={`flex-1 py-3 rounded-lg font-bold flex items-center justify-center gap-2 ${
                  tradeForm.side === 'buy'
                    ? 'bg-green-500 hover:bg-green-600 text-white disabled:bg-green-500/50'
                    : 'bg-red-500 hover:bg-red-600 text-white disabled:bg-red-500/50'
                }`}
              >
                {submitting ? (
                  <FaSync className="animate-spin" />
                ) : (
                  <>
                    {tradeForm.side === 'buy' ? <FaArrowUp /> : <FaArrowDown />}
                    ثبت معامله
                  </>
                )}
              </button>
              <button onClick={() => setShowTradeModal(false)} className="btn-outline flex-1">
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال رد با دلیل */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-dark-800">
              <h2 className="text-xl font-bold text-white">رد معامله</h2>
              <button onClick={() => setShowRejectModal(false)} className="text-dark-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <p className="text-dark-400">
                در حال رد معامله شماره <span className="text-gold">{selectedTrade?.tradeNumber}</span>
              </p>

              <div>
                <label className="block text-dark-300 mb-2">دلیل رد (الزامی)</label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="input w-full"
                  rows="3"
                  placeholder="لطفا دلیل رد معامله را وارد کنید..."
                />
              </div>
            </div>

            <div className="flex gap-4 p-4 border-t border-dark-800">
              <button
                onClick={handleRejectTrade}
                disabled={!rejectReason.trim()}
                className="flex-1 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-bold disabled:bg-red-500/50"
              >
                رد معامله
              </button>
              <button onClick={() => setShowRejectModal(false)} className="btn-outline flex-1">
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال جزئیات معامله */}
      {selectedTrade && !showRejectModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-dark-800">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FaEye className="text-gold" />
                جزئیات معامله
              </h2>
              <button onClick={() => setSelectedTrade(null)} className="text-dark-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* شماره معامله */}
              <div className="flex items-center justify-between">
                <span className="text-dark-400">شماره معامله:</span>
                <span className="text-gold font-mono">{selectedTrade.tradeNumber}</span>
              </div>

              {/* مشتری / صراف */}
              <div className="bg-dark-800 rounded-lg p-3">
                {selectedTrade.isGroupTrade ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                      <span className="text-purple-400 font-bold">معامله گروهی</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-dark-400">صراف:</span>
                      <span className="text-white">
                        {selectedTrade.ownerSarafi?.sarafiInfo?.name || selectedTrade.ownerSarafi?.sarafiInfo?.alias || `${selectedTrade.ownerSarafi?.firstName || ''} ${selectedTrade.ownerSarafi?.lastName || ''}`.trim() || '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-dark-400">نام مستعار:</span>
                      <span className="text-white">
                        {selectedTrade.sharedCustomer?.displayName || '-'}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-dark-400">مشتری:</span>
                    <span className="text-white">{selectedTrade.customer?.firstName} {selectedTrade.customer?.lastName}</span>
                  </div>
                )}
              </div>

              {/* نوع معامله */}
              <div className="flex items-center justify-between">
                <span className="text-dark-400">نوع:</span>
                <span className={`flex items-center gap-1 ${selectedTrade.side === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                  {selectedTrade.side === 'buy' ? <FaArrowUp /> : <FaArrowDown />}
                  {selectedTrade.side === 'buy' ? 'خرید' : 'فروش'}
                </span>
              </div>

              {/* ارز */}
              <div className="flex items-center justify-between">
                <span className="text-dark-400">ارز:</span>
                <span className="text-white">{selectedTrade.currency?.nameFa} ({selectedTrade.currency?.code})</span>
              </div>

              {/* مقدار */}
              <div className="flex items-center justify-between">
                <span className="text-dark-400">مقدار:</span>
                <span className="text-white">{formatNumber(selectedTrade.amount)}</span>
              </div>

              {/* نرخ */}
              <div className="flex items-center justify-between">
                <span className="text-dark-400">نرخ:</span>
                <span className="text-white">{formatNumber(selectedTrade.rate)} ریال</span>
              </div>

              {/* مبلغ کل */}
              <div className="bg-dark-800 rounded-lg p-3 flex items-center justify-between">
                <span className="text-dark-400">مبلغ کل:</span>
                <span className="text-gold text-lg font-bold">{formatNumber(selectedTrade.totalAmount)} ریال</span>
              </div>

              {/* کارمزد */}
              {selectedTrade.commission?.amount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-dark-400">کارمزد:</span>
                  <span className="text-green-500">{formatNumber(selectedTrade.commission.amount)} ریال</span>
                </div>
              )}

              {/* وضعیت */}
              <div className="flex items-center justify-between">
                <span className="text-dark-400">وضعیت:</span>
                {getStatusBadge(selectedTrade.status)}
              </div>

              {/* تاریخ */}
              <div className="flex items-center justify-between">
                <span className="text-dark-400">تاریخ ثبت:</span>
                <span className="text-white">{formatDate(selectedTrade.createdAt)}</span>
              </div>

              {/* یادداشت */}
              {selectedTrade.notes && (
                <div>
                  <span className="text-dark-400 block mb-1">یادداشت:</span>
                  <p className="text-white bg-dark-800 rounded-lg p-3">{selectedTrade.notes}</p>
                </div>
              )}

              {/* دلیل رد */}
              {selectedTrade.rejectionReason && (
                <div>
                  <span className="text-red-400 block mb-1">دلیل رد:</span>
                  <p className="text-red-300 bg-red-500/10 rounded-lg p-3">{selectedTrade.rejectionReason}</p>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-dark-800">
              <button onClick={() => setSelectedTrade(null)} className="btn-outline w-full">
                بستن
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InstantTrade;
