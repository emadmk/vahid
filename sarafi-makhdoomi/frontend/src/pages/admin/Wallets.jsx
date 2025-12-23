import { useState, useEffect } from 'react';
import {
  FaWallet, FaSpinner, FaSearch, FaFilter,
  FaMoneyBillWave, FaCreditCard, FaHistory, FaTimes,
  FaPlus, FaMinus, FaArrowUp, FaArrowDown
} from 'react-icons/fa';
import api from '../../services/api';
import Select from '../../components/ui/Select';
import { toast } from 'react-hot-toast';

const AdminWallets = () => {
  const [wallets, setWallets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ type: '', search: '' });
  const [stats, setStats] = useState(null);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });

  // مودال عملیات
  const [operationModal, setOperationModal] = useState(null); // deposit, withdraw, creditIncrease, creditDecrease
  const [operationAmount, setOperationAmount] = useState('');
  const [operationDescription, setOperationDescription] = useState('');
  const [operationLoading, setOperationLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filter, pagination.page]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [walletsRes, statsRes] = await Promise.all([
        api.get('/admin/wallets', {
          params: {
            ...filter,
            page: pagination.page,
            limit: pagination.limit
          }
        }),
        api.get('/admin/wallets/stats')
      ]);
      setWallets(walletsRes.data.data || []);
      setPagination(prev => ({ ...prev, total: walletsRes.data.total || 0 }));
      setStats(statsRes.data.data);
    } catch (error) {
      console.error('خطا در دریافت کیف پول‌ها:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async (walletId) => {
    try {
      setLoadingTransactions(true);
      const res = await api.get(`/admin/wallets/${walletId}/transactions`);
      setTransactions(res.data.data || []);
    } catch (error) {
      console.error('خطا در دریافت تراکنش‌ها:', error);
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleViewWallet = (wallet) => {
    setSelectedWallet(wallet);
    fetchTransactions(wallet._id);
  };

  const handleOperation = async () => {
    if (!operationAmount || operationAmount <= 0) {
      toast.error('مبلغ نامعتبر است');
      return;
    }

    setOperationLoading(true);
    try {
      let endpoint = '';
      const data = {
        userId: selectedWallet.user._id,
        amount: parseInt(operationAmount),
        description: operationDescription
      };

      switch (operationModal) {
        case 'deposit':
          endpoint = '/admin/wallets/deposit';
          break;
        case 'withdraw':
          endpoint = '/admin/wallets/withdraw';
          break;
        case 'creditIncrease':
          endpoint = '/admin/wallets/credit/increase';
          break;
        case 'creditDecrease':
          endpoint = '/admin/wallets/credit/decrease';
          break;
      }

      const res = await api.post(endpoint, data);
      toast.success(res.data.message);

      // بروزرسانی
      setOperationModal(null);
      setOperationAmount('');
      setOperationDescription('');
      fetchData();
      fetchTransactions(selectedWallet._id);

      // آپدیت selectedWallet
      if (res.data.data?.wallet) {
        setSelectedWallet(prev => ({
          ...prev,
          balance: res.data.data.wallet.balance,
          creditLimit: res.data.data.wallet.creditLimit,
          usedCredit: res.data.data.wallet.usedCredit
        }));
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در انجام عملیات');
    } finally {
      setOperationLoading(false);
    }
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('fa-IR').format(num || 0);
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('fa-IR');
  };

  const getTransactionTypeLabel = (type) => {
    const types = {
      deposit: { label: 'واریز', color: 'text-green-500' },
      withdraw: { label: 'برداشت', color: 'text-red-500' },
      credit_use: { label: 'استفاده از اعتبار', color: 'text-orange-500' },
      credit_repay: { label: 'بازپرداخت اعتبار', color: 'text-blue-500' },
      credit_increase: { label: 'افزایش سقف اعتبار', color: 'text-green-500' },
      credit_decrease: { label: 'کاهش سقف اعتبار', color: 'text-red-500' },
      trade_buy: { label: 'خرید ارز', color: 'text-purple-500' },
      trade_sell: { label: 'فروش ارز', color: 'text-gold' },
      commission: { label: 'کارمزد', color: 'text-pink-500' },
      refund: { label: 'استرداد', color: 'text-cyan-500' }
    };
    return types[type] || { label: type, color: 'text-white' };
  };

  const getOperationTitle = () => {
    switch (operationModal) {
      case 'deposit': return 'واریز به کیف پول نقدی';
      case 'withdraw': return 'برداشت از کیف پول نقدی';
      case 'creditIncrease': return 'افزایش سقف اعتبار';
      case 'creditDecrease': return 'کاهش سقف اعتبار';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <FaWallet className="text-gold" />
          مدیریت کیف پول‌ها
        </h1>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4 text-center border-l-4 border-gold">
            <FaWallet className="text-gold text-2xl mx-auto mb-2" />
            <p className="text-dark-400 text-xs mb-1">تعداد کیف پول</p>
            <p className="text-2xl font-bold">{formatNumber(stats.totalWallets)}</p>
          </div>
          <div className="card p-4 text-center border-l-4 border-green-500">
            <FaMoneyBillWave className="text-green-500 text-2xl mx-auto mb-2" />
            <p className="text-dark-400 text-xs mb-1">موجودی نقدی کل</p>
            <p className="text-lg font-bold text-green-500">{formatNumber(stats.totalCashBalance)} ریال</p>
          </div>
          <div className="card p-4 text-center border-l-4 border-blue-500">
            <FaCreditCard className="text-blue-500 text-2xl mx-auto mb-2" />
            <p className="text-dark-400 text-xs mb-1">سقف اعتبار کل</p>
            <p className="text-lg font-bold text-blue-500">{formatNumber(stats.totalCreditLimit)} ریال</p>
          </div>
          <div className="card p-4 text-center border-l-4 border-orange-500">
            <FaCreditCard className="text-orange-500 text-2xl mx-auto mb-2" />
            <p className="text-dark-400 text-xs mb-1">اعتبار استفاده شده</p>
            <p className="text-lg font-bold text-orange-500">{formatNumber(stats.totalUsedCredit)} ریال</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <FaFilter className="text-dark-400" />
          <div className="relative flex-1 min-w-[200px]">
            <FaSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400" />
            <input
              type="text"
              placeholder="جستجوی نام یا شماره تماس کاربر..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
              className="input-field w-full pr-10"
            />
          </div>
          <Select
            value={filter.type}
            onChange={(e) => setFilter({ ...filter, type: e.target.value })}
            className="w-48"
            placeholder="همه انواع"
            options={[
              { value: '', label: 'همه انواع' },
              { value: 'cash', label: 'کیف پول نقدی' },
              { value: 'credit', label: 'کیف پول اعتباری' }
            ]}
          />
        </div>
      </div>

      {/* Wallets Table */}
      {loading ? (
        <div className="flex justify-center py-10">
          <FaSpinner className="animate-spin text-gold text-3xl" />
        </div>
      ) : wallets.length === 0 ? (
        <div className="card p-10 text-center text-dark-400">
          کیف پولی یافت نشد
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-800">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-medium text-dark-400">کاربر</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-dark-400">نوع</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-dark-400">موجودی</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-dark-400">سقف اعتبار</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-dark-400">اعتبار استفاده شده</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-dark-400">وضعیت</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-dark-400">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {wallets.map((wallet) => (
                  <tr key={wallet._id} className="hover:bg-dark-800/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center text-gold">
                          {wallet.user?.firstName?.[0]}
                        </div>
                        <div>
                          <p className="font-medium">{wallet.user?.firstName} {wallet.user?.lastName}</p>
                          <p className="text-sm text-dark-400">{wallet.user?.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        wallet.type === 'cash' ? 'bg-green-500/20 text-green-500' : 'bg-blue-500/20 text-blue-500'
                      }`}>
                        {wallet.type === 'cash' ? 'نقدی' : 'اعتباری'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold text-gold">
                      {formatNumber(wallet.balance)} ریال
                    </td>
                    <td className="px-4 py-3">
                      {wallet.type === 'credit' ? formatNumber(wallet.creditLimit) + ' ریال' : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {wallet.type === 'credit' ? formatNumber(wallet.usedCredit) + ' ریال' : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        wallet.isActive ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                      }`}>
                        {wallet.isActive ? 'فعال' : 'غیرفعال'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => handleViewWallet(wallet)}
                        className="text-gold hover:text-gold-400"
                        title="مشاهده و مدیریت"
                      >
                        <FaHistory />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.total > pagination.limit && (
            <div className="p-4 border-t border-dark-700 flex items-center justify-between">
              <span className="text-sm text-dark-400">
                نمایش {(pagination.page - 1) * pagination.limit + 1} تا {Math.min(pagination.page * pagination.limit, pagination.total)} از {pagination.total}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 rounded bg-dark-800 disabled:opacity-50"
                >
                  قبلی
                </button>
                <button
                  onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                  disabled={pagination.page * pagination.limit >= pagination.total}
                  className="px-3 py-1 rounded bg-dark-800 disabled:opacity-50"
                >
                  بعدی
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Wallet Details Modal */}
      {selectedWallet && !operationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FaWallet className="text-gold" />
                مدیریت کیف پول
              </h2>
              <button onClick={() => setSelectedWallet(null)} className="text-dark-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            {/* Wallet Info */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-dark-800 p-4 rounded-lg">
                <p className="text-dark-400 text-sm">کاربر</p>
                <p className="font-bold">{selectedWallet.user?.firstName} {selectedWallet.user?.lastName}</p>
                <p className="text-sm text-dark-400">{selectedWallet.user?.phone}</p>
              </div>
              <div className="bg-dark-800 p-4 rounded-lg">
                <p className="text-dark-400 text-sm">نوع کیف پول</p>
                <p className="font-bold">{selectedWallet.type === 'cash' ? 'نقدی' : 'اعتباری'}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-green-500/10 rounded-lg">
                <p className="text-dark-400 text-sm">موجودی</p>
                <p className="text-xl font-bold text-green-500">{formatNumber(selectedWallet.balance)} ریال</p>
              </div>
              {selectedWallet.type === 'credit' && (
                <>
                  <div className="text-center p-4 bg-blue-500/10 rounded-lg">
                    <p className="text-dark-400 text-sm">سقف اعتبار</p>
                    <p className="text-xl font-bold text-blue-500">{formatNumber(selectedWallet.creditLimit)} ریال</p>
                  </div>
                  <div className="text-center p-4 bg-orange-500/10 rounded-lg">
                    <p className="text-dark-400 text-sm">استفاده شده</p>
                    <p className="text-xl font-bold text-orange-500">{formatNumber(selectedWallet.usedCredit)} ریال</p>
                  </div>
                </>
              )}
            </div>

            {/* دکمه‌های عملیات */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {selectedWallet.type === 'cash' && (
                <>
                  <button
                    onClick={() => setOperationModal('deposit')}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-green-500/20 text-green-500 rounded-lg hover:bg-green-500/30 transition"
                  >
                    <FaArrowDown /> واریز
                  </button>
                  <button
                    onClick={() => setOperationModal('withdraw')}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-red-500/20 text-red-500 rounded-lg hover:bg-red-500/30 transition"
                  >
                    <FaArrowUp /> برداشت
                  </button>
                </>
              )}
              {selectedWallet.type === 'credit' && (
                <>
                  <button
                    onClick={() => setOperationModal('creditIncrease')}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-500/20 text-blue-500 rounded-lg hover:bg-blue-500/30 transition"
                  >
                    <FaPlus /> افزایش اعتبار
                  </button>
                  <button
                    onClick={() => setOperationModal('creditDecrease')}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-orange-500/20 text-orange-500 rounded-lg hover:bg-orange-500/30 transition"
                  >
                    <FaMinus /> کاهش اعتبار
                  </button>
                </>
              )}
            </div>

            {/* Transactions */}
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <FaHistory className="text-gold" />
              آخرین تراکنش‌ها
            </h3>

            {loadingTransactions ? (
              <div className="flex justify-center py-6">
                <FaSpinner className="animate-spin text-gold" />
              </div>
            ) : transactions.length === 0 ? (
              <p className="text-center text-dark-400 py-6">تراکنشی یافت نشد</p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {transactions.map((tx) => {
                  const typeInfo = getTransactionTypeLabel(tx.type);
                  const isPositive = tx.amount > 0 || tx.type.includes('deposit') || tx.type.includes('sell') || tx.type.includes('refund') || tx.type.includes('increase');
                  return (
                    <div key={tx._id} className="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${isPositive ? 'bg-green-500' : 'bg-red-500'}`} />
                        <div>
                          <p className={`text-sm font-medium ${typeInfo.color}`}>{typeInfo.label}</p>
                          <p className="text-xs text-dark-400">{formatDate(tx.createdAt)}</p>
                        </div>
                      </div>
                      <p className={`font-bold ${isPositive ? 'text-green-500' : 'text-red-500'}`}>
                        {isPositive ? '+' : ''}{formatNumber(Math.abs(tx.amount))} ریال
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Operation Modal */}
      {operationModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{getOperationTitle()}</h2>
              <button onClick={() => setOperationModal(null)} className="text-dark-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-dark-400 text-sm mb-2">کاربر</p>
              <p className="font-bold">{selectedWallet?.user?.firstName} {selectedWallet?.user?.lastName}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-dark-400 text-sm mb-1">مبلغ (ریال)</label>
                <input
                  type="number"
                  value={operationAmount}
                  onChange={(e) => setOperationAmount(e.target.value)}
                  className="input-field w-full"
                  placeholder="مثال: 10000000"
                />
              </div>

              <div>
                <label className="block text-dark-400 text-sm mb-1">توضیحات (اختیاری)</label>
                <textarea
                  value={operationDescription}
                  onChange={(e) => setOperationDescription(e.target.value)}
                  className="input-field w-full"
                  rows={2}
                  placeholder="توضیحات..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setOperationModal(null)}
                className="flex-1 px-4 py-2 bg-dark-700 rounded-lg hover:bg-dark-600 transition"
              >
                انصراف
              </button>
              <button
                onClick={handleOperation}
                disabled={operationLoading || !operationAmount}
                className="flex-1 px-4 py-2 bg-gold text-dark-900 rounded-lg hover:bg-gold-400 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {operationLoading ? <FaSpinner className="animate-spin" /> : null}
                تایید
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminWallets;
