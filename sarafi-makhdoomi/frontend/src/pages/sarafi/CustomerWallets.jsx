import { useState, useEffect } from 'react';
import { FaSearch, FaWallet, FaPlus, FaMinus, FaCreditCard, FaHistory, FaTimes } from 'react-icons/fa';
import { sarafiAPI } from '../../services/api';
import toast from 'react-hot-toast';
import jalaliMoment from 'jalali-moment';

const CustomerWallets = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerWallets, setCustomerWallets] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [walletsLoading, setWalletsLoading] = useState(false);

  // مدال عملیات
  const [operationModal, setOperationModal] = useState({ open: false, type: '', customer: null });
  const [operationAmount, setOperationAmount] = useState('');
  const [operationDescription, setOperationDescription] = useState('');
  const [operationLoading, setOperationLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, [search]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await sarafiAPI.getCustomers({ search, status: 'approved' });
      setCustomers(res.data.data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomerWallets = async (customerId) => {
    setWalletsLoading(true);
    try {
      const [walletsRes, transactionsRes] = await Promise.all([
        sarafiAPI.getCustomerWallets(customerId),
        sarafiAPI.getCustomerTransactions(customerId, { limit: 20 })
      ]);
      setCustomerWallets(walletsRes.data.data || null);
      setTransactions(transactionsRes.data.data || []);
    } catch (e) {
      console.error(e);
      toast.error('خطا در دریافت اطلاعات کیف پول');
    } finally {
      setWalletsLoading(false);
    }
  };

  const handleSelectCustomer = (customer) => {
    setSelectedCustomer(customer);
    fetchCustomerWallets(customer._id);
  };

  const openOperationModal = (type) => {
    setOperationModal({ open: true, type, customer: selectedCustomer });
    setOperationAmount('');
    setOperationDescription('');
  };

  const closeOperationModal = () => {
    setOperationModal({ open: false, type: '', customer: null });
    setOperationAmount('');
    setOperationDescription('');
  };

  const handleOperation = async () => {
    if (!operationAmount || parseFloat(operationAmount) <= 0) {
      toast.error('مبلغ معتبر وارد کنید');
      return;
    }

    setOperationLoading(true);
    try {
      const amount = parseFloat(operationAmount);
      const customerId = operationModal.customer._id;

      switch (operationModal.type) {
        case 'deposit':
          await sarafiAPI.deposit({ customerId, amount, description: operationDescription });
          toast.success('واریز با موفقیت انجام شد');
          break;
        case 'withdraw':
          await sarafiAPI.withdraw({ customerId, amount, description: operationDescription });
          toast.success('برداشت با موفقیت انجام شد');
          break;
        case 'increase_credit':
          await sarafiAPI.increaseCreditLimit({ customerId, amount });
          toast.success('سقف اعتبار افزایش یافت');
          break;
        case 'decrease_credit':
          await sarafiAPI.decreaseCreditLimit({ customerId, amount });
          toast.success('سقف اعتبار کاهش یافت');
          break;
        case 'repay_credit':
          await sarafiAPI.repayCredit({ customerId, amount, description: operationDescription });
          toast.success('بازپرداخت اعتبار انجام شد');
          break;
        default:
          break;
      }

      closeOperationModal();
      fetchCustomerWallets(customerId);
    } catch (e) {
      toast.error(e.response?.data?.message || 'خطا در انجام عملیات');
    } finally {
      setOperationLoading(false);
    }
  };

  const getOperationTitle = () => {
    const titles = {
      deposit: 'واریز به کیف پول',
      withdraw: 'برداشت از کیف پول',
      increase_credit: 'افزایش سقف اعتبار',
      decrease_credit: 'کاهش سقف اعتبار',
      repay_credit: 'بازپرداخت اعتبار'
    };
    return titles[operationModal.type] || '';
  };

  const getTransactionType = (type) => {
    const types = {
      deposit: { label: 'واریز', class: 'text-green-500' },
      withdraw: { label: 'برداشت', class: 'text-red-500' },
      purchase: { label: 'خرید', class: 'text-blue-500' },
      sale: { label: 'فروش', class: 'text-purple-500' },
      credit_use: { label: 'استفاده اعتبار', class: 'text-orange-500' },
      credit_repay: { label: 'بازپرداخت', class: 'text-teal-500' },
      commission: { label: 'کارمزد', class: 'text-gray-500' }
    };
    return types[type] || { label: type, class: 'text-white' };
  };

  // API یک object با cash و credit برمی‌گردونه نه آرایه
  const cashWallet = Array.isArray(customerWallets)
    ? customerWallets.find(w => w.type === 'cash')
    : customerWallets?.cash;
  const creditWallet = Array.isArray(customerWallets)
    ? customerWallets.find(w => w.type === 'credit')
    : customerWallets?.credit;

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">مدیریت کیف پول مشتریان</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* لیست مشتریان */}
        <div className="lg:col-span-1">
          <div className="card-dark">
            <h2 className="text-lg font-bold text-white mb-4">مشتریان تایید شده</h2>

            {/* جستجو */}
            <div className="relative mb-4">
              <FaSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-500" />
              <input
                type="text"
                className="input-dark pr-12"
                placeholder="جستجوی مشتری..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* لیست */}
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="loading-spinner"></div>
              </div>
            ) : customers.length === 0 ? (
              <p className="text-dark-500 text-center py-8">مشتری یافت نشد</p>
            ) : (
              <div className="space-y-2 max-h-[500px] overflow-y-auto">
                {customers.map((customer) => (
                  <button
                    key={customer._id}
                    onClick={() => handleSelectCustomer(customer)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-right ${
                      selectedCustomer?._id === customer._id
                        ? 'bg-gold-500/20 border border-gold-500'
                        : 'bg-dark-800 hover:bg-dark-700 border border-transparent'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-500 font-bold">
                      {customer.firstName?.[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium truncate">
                        {customer.firstName} {customer.lastName}
                      </p>
                      <p className="text-dark-400 text-xs truncate">{customer.phone || customer.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* جزئیات کیف پول */}
        <div className="lg:col-span-2">
          {!selectedCustomer ? (
            <div className="card-dark flex flex-col items-center justify-center py-16">
              <FaWallet className="text-6xl text-dark-600 mb-4" />
              <p className="text-dark-500">یک مشتری را از لیست انتخاب کنید</p>
            </div>
          ) : walletsLoading ? (
            <div className="card-dark flex justify-center py-16">
              <div className="loading-spinner"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* اطلاعات مشتری */}
              <div className="card-dark">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-500 text-xl font-bold">
                      {selectedCustomer.firstName?.[0]}
                    </div>
                    <div>
                      <h3 className="text-white font-bold text-lg">
                        {selectedCustomer.firstName} {selectedCustomer.lastName}
                      </h3>
                      <p className="text-dark-400 text-sm">{selectedCustomer.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedCustomer(null)}
                    className="text-dark-400 hover:text-white"
                  >
                    <FaTimes />
                  </button>
                </div>
              </div>

              {/* کیف پول‌ها */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* کیف پول نقدی */}
                <div className="card-dark bg-gradient-to-br from-green-900/20 to-dark-800">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center">
                      <FaWallet className="text-green-500 text-xl" />
                    </div>
                    <div>
                      <p className="text-dark-400 text-sm">کیف پول نقدی</p>
                      <p className="text-white font-bold text-lg">
                        {(cashWallet?.balance || 0).toLocaleString()} ریال
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openOperationModal('deposit')}
                      className="flex-1 btn-primary py-2 text-sm"
                    >
                      <FaPlus className="ml-1" /> واریز
                    </button>
                    <button
                      onClick={() => openOperationModal('withdraw')}
                      className="flex-1 btn-outline py-2 text-sm"
                    >
                      <FaMinus className="ml-1" /> برداشت
                    </button>
                  </div>
                </div>

                {/* کیف پول اعتباری */}
                <div className="card-dark bg-gradient-to-br from-purple-900/20 to-dark-800">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
                      <FaCreditCard className="text-purple-500 text-xl" />
                    </div>
                    <div>
                      <p className="text-dark-400 text-sm">اعتبار</p>
                      <p className="text-white font-bold text-lg">
                        {(creditWallet?.creditLimit || 0).toLocaleString()} ریال
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span className="text-dark-400">مصرف شده:</span>
                      <span className="text-orange-500">
                        {(creditWallet?.usedCredit || 0).toLocaleString()} ریال
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-dark-400">باقیمانده:</span>
                      <span className="text-green-500">
                        {((creditWallet?.creditLimit || 0) - (creditWallet?.usedCredit || 0)).toLocaleString()} ریال
                      </span>
                    </div>
                    {/* نوار پیشرفت */}
                    <div className="h-2 bg-dark-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-orange-500"
                        style={{
                          width: `${creditWallet?.creditLimit > 0
                            ? ((creditWallet?.usedCredit || 0) / creditWallet?.creditLimit) * 100
                            : 0}%`
                        }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => openOperationModal('increase_credit')}
                      className="btn-primary py-2 text-xs"
                    >
                      <FaPlus className="ml-1" /> افزایش
                    </button>
                    <button
                      onClick={() => openOperationModal('decrease_credit')}
                      className="btn-outline py-2 text-xs"
                    >
                      <FaMinus className="ml-1" /> کاهش
                    </button>
                    <button
                      onClick={() => openOperationModal('repay_credit')}
                      className="btn-gold py-2 text-xs"
                      disabled={!creditWallet?.usedCredit}
                    >
                      بازپرداخت
                    </button>
                  </div>
                </div>
              </div>

              {/* تاریخچه تراکنش‌ها */}
              <div className="card-dark">
                <div className="flex items-center gap-2 mb-4">
                  <FaHistory className="text-gold-500" />
                  <h3 className="text-white font-bold">تراکنش‌های اخیر</h3>
                </div>

                {transactions.length === 0 ? (
                  <p className="text-dark-500 text-center py-8">تراکنشی یافت نشد</p>
                ) : (
                  <div className="space-y-3 max-h-[300px] overflow-y-auto">
                    {transactions.map((tx) => (
                      <div
                        key={tx._id}
                        className="flex items-center justify-between p-3 bg-dark-800 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            tx.type === 'deposit' || tx.type === 'credit_repay'
                              ? 'bg-green-500/20'
                              : 'bg-red-500/20'
                          }`}>
                            {tx.type === 'deposit' || tx.type === 'credit_repay' ? (
                              <FaPlus className={getTransactionType(tx.type).class} />
                            ) : (
                              <FaMinus className={getTransactionType(tx.type).class} />
                            )}
                          </div>
                          <div>
                            <p className={`font-medium ${getTransactionType(tx.type).class}`}>
                              {getTransactionType(tx.type).label}
                            </p>
                            <p className="text-dark-400 text-xs">
                              {jalaliMoment(tx.createdAt).format('jYYYY/jMM/jDD - HH:mm')}
                            </p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className={`font-bold ${
                            tx.type === 'deposit' || tx.type === 'credit_repay'
                              ? 'text-green-500'
                              : 'text-red-500'
                          }`}>
                            {tx.type === 'deposit' || tx.type === 'credit_repay' ? '+' : '-'}
                            {tx.amount?.toLocaleString()} ریال
                          </p>
                          {tx.description && (
                            <p className="text-dark-400 text-xs">{tx.description}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* مدال عملیات */}
      {operationModal.open && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-dark-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-dark-700">
              <h3 className="text-white font-bold text-lg">{getOperationTitle()}</h3>
              <button onClick={closeOperationModal} className="text-dark-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-dark-700/50 rounded-lg p-4">
                <p className="text-dark-400 text-sm">مشتری:</p>
                <p className="text-white font-bold">
                  {operationModal.customer?.firstName} {operationModal.customer?.lastName}
                </p>
              </div>

              <div>
                <label className="block text-dark-400 text-sm mb-2">مبلغ (ریال)</label>
                <input
                  type="number"
                  className="input-dark"
                  placeholder="0"
                  value={operationAmount}
                  onChange={(e) => setOperationAmount(e.target.value)}
                />
              </div>

              {['deposit', 'withdraw', 'repay_credit'].includes(operationModal.type) && (
                <div>
                  <label className="block text-dark-400 text-sm mb-2">توضیحات (اختیاری)</label>
                  <textarea
                    className="input-dark resize-none"
                    rows="2"
                    placeholder="توضیحات..."
                    value={operationDescription}
                    onChange={(e) => setOperationDescription(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 p-6 border-t border-dark-700">
              <button onClick={closeOperationModal} className="flex-1 btn-outline">
                انصراف
              </button>
              <button
                onClick={handleOperation}
                disabled={operationLoading}
                className="flex-1 btn-primary"
              >
                {operationLoading ? 'در حال انجام...' : 'تایید'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerWallets;
