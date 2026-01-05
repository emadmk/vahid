import { useState, useEffect } from 'react';
import {
  FaCalculator, FaWallet, FaCreditCard, FaPlus, FaMinus, FaSpinner, FaSearch, FaHistory,
  FaExchangeAlt, FaCheck, FaTimes, FaEye, FaArrowUp, FaArrowDown, FaClock, FaCoins, FaDollarSign, FaEuroSign
} from 'react-icons/fa';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const Accountant = () => {
  const [activeTab, setActiveTab] = useState('trades'); // trades | wallets
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerWallets, setCustomerWallets] = useState(null);
  const [currencyBalances, setCurrencyBalances] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [processing, setProcessing] = useState(false);

  // معاملات در انتظار حسابداری
  const [pendingTrades, setPendingTrades] = useState([]);
  const [tradesLoading, setTradesLoading] = useState(true);
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    if (activeTab === 'wallets') {
      fetchCustomers();
      fetchCurrencies();
    } else {
      fetchPendingTrades();
    }
  }, [activeTab]);

  const fetchCurrencies = async () => {
    try {
      const res = await api.get('/public/currencies');
      setCurrencies(res.data.data || []);
    } catch (e) {
      console.error('خطا در دریافت ارزها:', e);
    }
  };

  const getCurrencyIcon = (code) => {
    if (code === 'USD') return <FaDollarSign className="text-green-500" />;
    if (code === 'EUR') return <FaEuroSign className="text-blue-500" />;
    return <FaCoins className="text-gold" />;
  };

  const fetchPendingTrades = async () => {
    try {
      setTradesLoading(true);
      const response = await api.get('/trades/sarafi/instant-trades', {
        params: { status: 'pending_accounting' }
      });
      setPendingTrades(response.data.trades || response.data.data || []);
    } catch (error) {
      console.error('خطا در دریافت معاملات:', error);
    } finally {
      setTradesLoading(false);
    }
  };

  const handleApproveTrade = async (tradeId) => {
    try {
      setProcessing(true);
      await api.put(`/trades/instant/${tradeId}/accounting-approve`);
      toast.success('معامله تایید و تکمیل شد');
      fetchPendingTrades();
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در تایید معامله');
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectTrade = async () => {
    if (!rejectReason.trim()) {
      toast.error('لطفا دلیل رد را وارد کنید');
      return;
    }
    try {
      setProcessing(true);
      await api.put(`/trades/instant/${selectedTrade._id}/accounting-reject`, {
        reason: rejectReason
      });
      toast.success('معامله رد شد');
      setShowRejectModal(false);
      setRejectReason('');
      setSelectedTrade(null);
      fetchPendingTrades();
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در رد معامله');
    } finally {
      setProcessing(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/sarafi/customers');
      setCustomers(response.data.data);
    } catch (error) {
      console.error('خطا در دریافت مشتریان:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerWallets = async (customerId) => {
    try {
      const [walletsRes, currencyRes] = await Promise.all([
        api.get(`/wallets/customer/${customerId}`),
        api.get(`/wallets/customer/${customerId}/currencies`)
      ]);
      setCustomerWallets(walletsRes.data.data);
      setCurrencyBalances(currencyRes.data.data?.currencyBalances || []);
    } catch (error) {
      console.error('خطا در دریافت کیف پول:', error);
    }
  };

  const handleSelectCustomer = async (customer) => {
    setSelectedCustomer(customer);
    await fetchCustomerWallets(customer._id);
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('fa-IR').format(num || 0);
  };

  const openModal = (type) => {
    setModalType(type);
    setAmount('');
    setDescription('');
    setSelectedCurrency('');
    setShowModal(true);
  };

  const handleAction = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('لطفا مبلغ معتبر وارد کنید');
      return;
    }

    // برای عملیات ارزی، انتخاب ارز الزامی است
    if (['currencyDeposit', 'currencyWithdraw'].includes(modalType) && !selectedCurrency) {
      toast.error('ارز را انتخاب کنید');
      return;
    }

    try {
      setProcessing(true);
      const amountNum = parseFloat(amount);

      switch (modalType) {
        case 'deposit':
          await api.post('/wallets/deposit', {
            customerId: selectedCustomer._id,
            amount: amountNum,
            description
          });
          toast.success('واریز با موفقیت انجام شد');
          break;
        case 'withdraw':
          await api.post('/wallets/withdraw', {
            customerId: selectedCustomer._id,
            amount: amountNum,
            description
          });
          toast.success('برداشت با موفقیت انجام شد');
          break;
        case 'currencyDeposit':
          await api.post('/wallets/currency/deposit', {
            customerId: selectedCustomer._id,
            currencyId: selectedCurrency,
            amount: amountNum,
            description
          });
          toast.success('واریز ارز با موفقیت انجام شد');
          break;
        case 'currencyWithdraw':
          await api.post('/wallets/currency/withdraw', {
            customerId: selectedCustomer._id,
            currencyId: selectedCurrency,
            amount: amountNum,
            description
          });
          toast.success('برداشت ارز با موفقیت انجام شد');
          break;
        case 'creditIncrease':
          await api.post('/wallets/credit/increase', {
            customerId: selectedCustomer._id,
            amount: amountNum
          });
          toast.success('سقف اعتبار افزایش یافت');
          break;
        case 'creditDecrease':
          await api.post('/wallets/credit/decrease', {
            customerId: selectedCustomer._id,
            amount: amountNum
          });
          toast.success('سقف اعتبار کاهش یافت');
          break;
        case 'creditRepay':
          await api.post('/wallets/credit/repay', {
            customerId: selectedCustomer._id,
            amount: amountNum,
            description
          });
          toast.success('بازپرداخت ثبت شد');
          break;
      }

      setShowModal(false);
      await fetchCustomerWallets(selectedCustomer._id);
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در انجام عملیات');
    } finally {
      setProcessing(false);
    }
  };

  const modalTitles = {
    deposit: 'واریز ریال به کیف پول',
    withdraw: 'برداشت ریال از کیف پول',
    currencyDeposit: 'واریز ارز به کیف پول',
    currencyWithdraw: 'برداشت ارز از کیف پول',
    creditIncrease: 'افزایش سقف اعتبار',
    creditDecrease: 'کاهش سقف اعتبار',
    creditRepay: 'ثبت بازپرداخت اعتبار'
  };

  const filteredCustomers = customers.filter(c =>
    c.firstName?.includes(search) ||
    c.lastName?.includes(search) ||
    c.email?.includes(search) ||
    c.phone?.includes(search)
  );

  const formatDate = (date) => new Date(date).toLocaleDateString('fa-IR');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <FaCalculator className="text-gold" />
          پنل حسابداری
        </h1>

        {/* Tab Switcher */}
        <div className="flex rounded-lg bg-dark-800 p-1">
          <button
            onClick={() => setActiveTab('trades')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
              activeTab === 'trades'
                ? 'bg-gold text-dark-900 font-bold'
                : 'text-dark-400 hover:text-white'
            }`}
          >
            <FaExchangeAlt />
            تایید معاملات
            {pendingTrades.length > 0 && (
              <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {pendingTrades.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('wallets')}
            className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
              activeTab === 'wallets'
                ? 'bg-gold text-dark-900 font-bold'
                : 'text-dark-400 hover:text-white'
            }`}
          >
            <FaWallet />
            مدیریت کیف پول
          </button>
        </div>
      </div>

      {/* بخش تایید معاملات */}
      {activeTab === 'trades' && (
        <div className="space-y-4">
          {/* آمار */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-4 border-r-4 border-yellow-500">
              <div className="flex items-center gap-3">
                <FaClock className="text-yellow-500 text-2xl" />
                <div>
                  <p className="text-dark-400 text-sm">در انتظار تایید</p>
                  <p className="text-2xl font-bold text-yellow-500">{pendingTrades.length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* جدول معاملات */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-dark-800">
                  <tr>
                    <th className="text-right p-4 text-dark-400 text-sm">شماره معامله</th>
                    <th className="text-right p-4 text-dark-400 text-sm">مشتری</th>
                    <th className="text-right p-4 text-dark-400 text-sm">نوع</th>
                    <th className="text-right p-4 text-dark-400 text-sm">ارز</th>
                    <th className="text-right p-4 text-dark-400 text-sm">مقدار</th>
                    <th className="text-right p-4 text-dark-400 text-sm">مبلغ کل</th>
                    <th className="text-right p-4 text-dark-400 text-sm">تاریخ</th>
                    <th className="text-center p-4 text-dark-400 text-sm">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {tradesLoading ? (
                    <tr>
                      <td colSpan="8" className="text-center p-8">
                        <FaSpinner className="animate-spin text-gold text-2xl mx-auto" />
                      </td>
                    </tr>
                  ) : pendingTrades.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center p-8 text-dark-500">
                        معامله‌ای در انتظار تایید نیست
                      </td>
                    </tr>
                  ) : (
                    pendingTrades.map(trade => (
                      <tr key={trade._id} className="border-t border-dark-800 hover:bg-dark-800/30">
                        <td className="p-4 text-gold font-medium">{trade.tradeNumber}</td>
                        <td className="p-4 text-white">
                          {trade.customer?.firstName} {trade.customer?.lastName}
                        </td>
                        <td className="p-4">
                          <span className={`flex items-center gap-1 ${trade.type === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                            {trade.type === 'buy' ? <FaArrowUp /> : <FaArrowDown />}
                            {trade.type === 'buy' ? 'خرید' : 'فروش'}
                          </span>
                        </td>
                        <td className="p-4 text-white">{trade.currency?.code}</td>
                        <td className="p-4 text-white">{formatNumber(trade.amount)}</td>
                        <td className="p-4 text-white font-bold">{formatNumber(trade.totalAmount)} ریال</td>
                        <td className="p-4 text-dark-400 text-sm">{formatDate(trade.createdAt)}</td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleApproveTrade(trade._id)}
                              disabled={processing}
                              className="p-2 rounded-lg bg-green-500/20 text-green-500 hover:bg-green-500/30"
                              title="تایید و تکمیل"
                            >
                              <FaCheck />
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
                            <button
                              onClick={() => setSelectedTrade(trade)}
                              className="p-2 rounded-lg bg-dark-700 text-dark-400 hover:text-white"
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
        </div>
      )}

      {/* بخش مدیریت کیف پول */}
      {activeTab === 'wallets' && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Customer List */}
        <div className="card p-4">
          <div className="mb-4">
            <div className="relative">
              <FaSearch className="absolute right-3 top-1/2 transform -translate-y-1/2 text-dark-400" />
              <input
                type="text"
                placeholder="جستجوی مشتری..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field w-full pr-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <FaSpinner className="animate-spin text-gold text-2xl" />
            </div>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {filteredCustomers.map((customer) => (
                <div
                  key={customer._id}
                  onClick={() => handleSelectCustomer(customer)}
                  className={`p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedCustomer?._id === customer._id
                      ? 'bg-gold/20 border border-gold'
                      : 'bg-dark-800 hover:bg-dark-700'
                  }`}
                >
                  <p className="font-bold">{customer.firstName} {customer.lastName}</p>
                  <p className="text-dark-400 text-sm">{customer.phone || customer.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      customer.tier === 'A' ? 'bg-gold/20 text-gold' :
                      customer.tier === 'B' ? 'bg-gray-300/20 text-gray-300' :
                      customer.tier === 'C' ? 'bg-orange-400/20 text-orange-400' :
                      'bg-dark-700 text-dark-400'
                    }`}>
                      {customer.tier === 'A' ? 'طلایی' :
                       customer.tier === 'B' ? 'نقره‌ای' :
                       customer.tier === 'C' ? 'برنزی' : 'جدید'}
                    </span>
                    <span className="text-xs text-dark-400">{customer.score || 0} امتیاز</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Customer Wallets */}
        <div className="lg:col-span-2">
          {selectedCustomer && customerWallets ? (
            <div className="space-y-4">
              <div className="card p-4 bg-dark-800/50">
                <h2 className="font-bold text-lg mb-2">
                  {selectedCustomer.firstName} {selectedCustomer.lastName}
                </h2>
                <p className="text-dark-400 text-sm">{selectedCustomer.email}</p>
                <p className="text-dark-400 text-sm">{selectedCustomer.phone}</p>
              </div>

              {/* Cash Wallet */}
              <div className="card p-6 border-r-4 border-r-green-500">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                      <FaWallet className="text-green-500 text-xl" />
                    </div>
                    <div>
                      <h3 className="font-bold">کیف پول نقدی</h3>
                      <p className="text-2xl font-bold text-green-500">
                        {formatNumber(customerWallets.cash?.balance)} ریال
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openModal('deposit')}
                      className="btn-gold px-3 py-2 flex items-center gap-1"
                    >
                      <FaPlus /> واریز
                    </button>
                    <button
                      onClick={() => openModal('withdraw')}
                      className="btn-outline px-3 py-2 flex items-center gap-1"
                    >
                      <FaMinus /> برداشت
                    </button>
                  </div>
                </div>
              </div>

              {/* Currency Balances */}
              <div className="card p-6 border-r-4 border-r-yellow-500">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                      <FaCoins className="text-yellow-500 text-xl" />
                    </div>
                    <h3 className="font-bold">موجودی ارزها</h3>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openModal('currencyDeposit')}
                      className="btn-gold px-3 py-2 flex items-center gap-1 text-sm"
                    >
                      <FaPlus /> واریز ارز
                    </button>
                    <button
                      onClick={() => openModal('currencyWithdraw')}
                      className="btn-outline px-3 py-2 flex items-center gap-1 text-sm"
                    >
                      <FaMinus /> برداشت ارز
                    </button>
                  </div>
                </div>
                {currencyBalances.length === 0 ? (
                  <p className="text-dark-400 text-center py-4">موجودی ارزی ندارد</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {currencyBalances.map((cb, index) => (
                      <div key={cb.currency || index} className="bg-dark-800 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center">
                            {getCurrencyIcon(cb.currencyCode)}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{cb.currencyName || cb.currencyCode}</p>
                            <p className="text-xs text-dark-400">{cb.currencyCode}</p>
                          </div>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span className="text-dark-400">موجودی:</span>
                            <span className="font-bold text-gold">{formatNumber(cb.amount)}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-dark-400">ارزش ریالی:</span>
                            <span className="text-green-500">{formatNumber(cb.rialValue)} ریال</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Credit Wallet */}
              <div className="card p-6 border-r-4 border-r-gold">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gold/20 rounded-full flex items-center justify-center">
                      <FaCreditCard className="text-gold text-xl" />
                    </div>
                    <div>
                      <h3 className="font-bold">کیف پول اعتباری</h3>
                      <div className="grid grid-cols-3 gap-4 mt-2">
                        <div>
                          <p className="text-dark-400 text-xs">سقف</p>
                          <p className="font-bold text-gold">{formatNumber(customerWallets.credit?.creditLimit)}</p>
                        </div>
                        <div>
                          <p className="text-dark-400 text-xs">مصرف‌شده</p>
                          <p className="font-bold text-red-500">{formatNumber(customerWallets.credit?.usedCredit)}</p>
                        </div>
                        <div>
                          <p className="text-dark-400 text-xs">قابل استفاده</p>
                          <p className="font-bold text-green-500">
                            {formatNumber((customerWallets.credit?.creditLimit || 0) - (customerWallets.credit?.usedCredit || 0))}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => openModal('creditIncrease')}
                    className="btn-gold px-3 py-2 flex items-center gap-1 text-sm"
                  >
                    <FaPlus /> افزایش سقف
                  </button>
                  <button
                    onClick={() => openModal('creditDecrease')}
                    className="btn-outline px-3 py-2 flex items-center gap-1 text-sm"
                  >
                    <FaMinus /> کاهش سقف
                  </button>
                  <button
                    onClick={() => openModal('creditRepay')}
                    className="bg-green-500/20 text-green-500 px-3 py-2 rounded flex items-center gap-1 text-sm hover:bg-green-500/30"
                  >
                    <FaHistory /> ثبت بازپرداخت
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="card p-10 text-center text-dark-400">
              لطفا یک مشتری را انتخاب کنید
            </div>
          )}
        </div>
      </div>
      )}

      {/* مودال رد معامله */}
      {showRejectModal && selectedTrade && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 text-red-500">رد معامله</h2>

            <div className="bg-dark-800 rounded-lg p-4 mb-4">
              <p className="text-dark-400 text-sm">شماره معامله:</p>
              <p className="text-gold font-bold">{selectedTrade.tradeNumber}</p>
            </div>

            <div>
              <label className="block text-dark-300 mb-2">دلیل رد *</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="input w-full"
                rows="3"
                placeholder="دلیل رد معامله را وارد کنید..."
              />
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setSelectedTrade(null);
                }}
                className="btn-outline flex-1"
              >
                انصراف
              </button>
              <button
                onClick={handleRejectTrade}
                disabled={processing}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg flex-1 flex items-center justify-center gap-2"
              >
                {processing ? <FaSpinner className="animate-spin" /> : <FaTimes />}
                رد معامله
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Action Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{modalTitles[modalType]}</h2>

            <div className="space-y-4">
              {/* انتخاب ارز برای عملیات ارزی */}
              {['currencyDeposit', 'currencyWithdraw'].includes(modalType) && (
                <div>
                  <label className="block text-dark-400 text-sm mb-2">انتخاب ارز</label>
                  <select
                    className="input-field w-full"
                    value={selectedCurrency}
                    onChange={(e) => setSelectedCurrency(e.target.value)}
                  >
                    <option value="">انتخاب کنید...</option>
                    {currencies.filter(c => c.isActive).map(currency => (
                      <option key={currency._id} value={currency._id}>
                        {currency.nameFa} ({currency.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-dark-400 text-sm mb-2">
                  {['currencyDeposit', 'currencyWithdraw'].includes(modalType) ? 'مقدار' : 'مبلغ (ریال)'}
                </label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input-field w-full"
                  placeholder={['currencyDeposit', 'currencyWithdraw'].includes(modalType) ? 'مثال: 100' : 'مثال: 10000000'}
                />
              </div>

              {['deposit', 'withdraw', 'creditRepay', 'currencyDeposit', 'currencyWithdraw'].includes(modalType) && (
                <div>
                  <label className="block text-dark-400 text-sm mb-2">توضیحات (اختیاری)</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="input-field w-full"
                    placeholder="توضیحات"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="btn-outline flex-1"
              >
                انصراف
              </button>
              <button
                onClick={handleAction}
                disabled={processing}
                className="btn-gold flex-1"
              >
                {processing ? <FaSpinner className="animate-spin mx-auto" /> : 'تایید'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Accountant;
