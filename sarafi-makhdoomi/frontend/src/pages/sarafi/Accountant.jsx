import { useState, useEffect } from 'react';
import { FaCalculator, FaWallet, FaCreditCard, FaPlus, FaMinus, FaSpinner, FaSearch, FaHistory } from 'react-icons/fa';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const Accountant = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerWallets, setCustomerWallets] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

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
      const response = await api.get(`/wallets/customer/${customerId}`);
      setCustomerWallets(response.data.data);
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
    setShowModal(true);
  };

  const handleAction = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error('لطفا مبلغ معتبر وارد کنید');
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
    deposit: 'واریز به کیف پول نقدی',
    withdraw: 'برداشت از کیف پول نقدی',
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <FaCalculator className="text-gold" />
          پنل حسابداری
        </h1>
      </div>

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

      {/* Action Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">{modalTitles[modalType]}</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-dark-400 text-sm mb-2">مبلغ (ریال)</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="input-field w-full"
                  placeholder="مثال: 10000000"
                />
              </div>

              {['deposit', 'withdraw', 'creditRepay'].includes(modalType) && (
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
