import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { FaShoppingCart, FaMoneyBill, FaSpinner } from 'react-icons/fa';
import { requestAPI, publicAPI } from '../../services/api';

const NewRequest = () => {
  const navigate = useNavigate();
  const [currencies, setCurrencies] = useState([]);
  const [type, setType] = useState('buy');
  const [selectedCurrency, setSelectedCurrency] = useState(null);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [calculating, setCalculating] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm();

  useEffect(() => {
    const fetchCurrencies = async () => {
      try {
        const res = await publicAPI.getRates();
        setCurrencies(res.data.data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchCurrencies();
  }, []);

  const getRate = () => {
    if (!selectedCurrency) return 0;
    return type === 'buy' ? selectedCurrency.sellRate : selectedCurrency.buyRate;
  };

  const getTotalPrice = () => {
    const amt = parseFloat(amount) || 0;
    return amt * getRate();
  };

  const onSubmit = async () => {
    if (!selectedCurrency) {
      toast.error('لطفا ارز مورد نظر را انتخاب کنید');
      return;
    }

    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast.error('لطفا مقدار معتبر وارد کنید');
      return;
    }

    setLoading(true);
    try {
      await requestAPI.create({
        type,
        currencyId: selectedCurrency._id,
        amount: amt
      });
      toast.success('درخواست با موفقیت ثبت شد');
      navigate('/dashboard/requests');
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در ثبت درخواست');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-8">درخواست جدید</h1>

      {/* انتخاب نوع */}
      <div className="card-dark mb-6">
        <h2 className="text-lg font-bold text-white mb-4">نوع درخواست</h2>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${
              type === 'buy'
                ? 'border-green-500 bg-green-500/10 text-green-500'
                : 'border-dark-600 text-dark-400 hover:border-dark-500'
            }`}
            onClick={() => setType('buy')}
          >
            <FaShoppingCart className="text-3xl" />
            <span className="font-bold">خرید ارز</span>
            <span className="text-sm opacity-75">می‌خواهم ارز بخرم</span>
          </button>
          <button
            type="button"
            className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${
              type === 'sell'
                ? 'border-red-500 bg-red-500/10 text-red-500'
                : 'border-dark-600 text-dark-400 hover:border-dark-500'
            }`}
            onClick={() => setType('sell')}
          >
            <FaMoneyBill className="text-3xl" />
            <span className="font-bold">فروش ارز</span>
            <span className="text-sm opacity-75">می‌خواهم ارز بفروشم</span>
          </button>
        </div>
      </div>

      {/* انتخاب ارز */}
      <div className="card-dark mb-6">
        <h2 className="text-lg font-bold text-white mb-4">انتخاب ارز</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {currencies.map((curr) => (
            <button
              key={curr._id}
              type="button"
              className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                selectedCurrency?._id === curr._id
                  ? 'border-gold-500 bg-gold-500/10'
                  : 'border-dark-600 hover:border-dark-500'
              }`}
              onClick={() => setSelectedCurrency(curr)}
            >
              <span className="text-2xl">{curr.symbol}</span>
              <div className="text-right">
                <p className="text-white font-medium text-sm">{curr.nameFa}</p>
                <p className="text-dark-500 text-xs">{curr.code}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* مقدار */}
      <div className="card-dark mb-6">
        <h2 className="text-lg font-bold text-white mb-4">مقدار</h2>
        <div className="relative">
          <input
            type="number"
            className="input-dark text-2xl h-16"
            placeholder="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
          {selectedCurrency && (
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-500">
              {selectedCurrency.nameFa}
            </span>
          )}
        </div>
      </div>

      {/* خلاصه */}
      {selectedCurrency && amount && (
        <div className="card-gold mb-6">
          <h2 className="text-lg font-bold text-white mb-4">خلاصه درخواست</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-dark-300">نوع:</span>
              <span className="text-white font-bold">
                {type === 'buy' ? 'خرید' : 'فروش'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-300">ارز:</span>
              <span className="text-white font-bold">{selectedCurrency.nameFa}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-300">مقدار:</span>
              <span className="text-white font-bold">{parseFloat(amount).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-dark-300">نرخ:</span>
              <span className="text-white font-bold">{getRate().toLocaleString()} تومان</span>
            </div>
            <div className="border-t border-dark-600 my-4"></div>
            <div className="flex justify-between text-lg">
              <span className="text-dark-300">مبلغ کل:</span>
              <span className="text-gold-500 font-bold">{getTotalPrice().toLocaleString()} تومان</span>
            </div>
          </div>
        </div>
      )}

      {/* دکمه ثبت */}
      <button
        onClick={onSubmit}
        disabled={loading || !selectedCurrency || !amount}
        className="btn-gold w-full flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <FaSpinner className="animate-spin" />
            در حال ثبت...
          </>
        ) : (
          'ثبت درخواست'
        )}
      </button>

      <p className="text-dark-500 text-sm text-center mt-4">
        پس از ثبت درخواست، صراف شما ۱ ساعت فرصت بررسی دارد.
      </p>
    </div>
  );
};

export default NewRequest;
