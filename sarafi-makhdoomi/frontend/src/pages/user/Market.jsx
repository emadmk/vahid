import { useState, useEffect } from 'react';
import { FaStore, FaArrowUp, FaArrowDown, FaSpinner, FaFilter, FaPlus } from 'react-icons/fa';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const Market = () => {
  const [offers, setOffers] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ type: '', currency: '' });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOffer, setNewOffer] = useState({
    type: 'buy',
    currency: '',
    amount: '',
    price: ''
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [offersRes, currenciesRes] = await Promise.all([
        api.get('/market/offers', { params: filter }),
        api.get('/public/rates')
      ]);
      setOffers(offersRes.data.data);
      setCurrencies(currenciesRes.data.data);
    } catch (error) {
      console.error('خطا در دریافت اطلاعات:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('fa-IR').format(num || 0);
  };

  const handleAcceptOffer = async (offerId) => {
    if (!confirm('آیا از پذیرش این پیشنهاد اطمینان دارید؟')) return;

    try {
      await api.post(`/market/offers/${offerId}/accept`);
      toast.success('پیشنهاد پذیرفته شد');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در پذیرش پیشنهاد');
    }
  };

  const handleCreateOffer = async (e) => {
    e.preventDefault();

    if (!newOffer.currency || !newOffer.amount || !newOffer.price) {
      toast.error('لطفا تمام فیلدها را پر کنید');
      return;
    }

    try {
      setCreating(true);
      await api.post('/market/offers', {
        ...newOffer,
        amount: parseFloat(newOffer.amount),
        price: parseFloat(newOffer.price)
      });
      toast.success('پیشنهاد با موفقیت ثبت شد');
      setShowCreateModal(false);
      setNewOffer({ type: 'buy', currency: '', amount: '', price: '' });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در ثبت پیشنهاد');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <FaStore className="text-gold" />
          بازار
        </h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-gold flex items-center gap-2"
        >
          <FaPlus />
          ثبت پیشنهاد
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-4 items-center">
        <FaFilter className="text-dark-400" />
        <select
          value={filter.type}
          onChange={(e) => setFilter({ ...filter, type: e.target.value })}
          className="input-field w-auto"
        >
          <option value="">همه</option>
          <option value="buy">خرید</option>
          <option value="sell">فروش</option>
        </select>
        <select
          value={filter.currency}
          onChange={(e) => setFilter({ ...filter, currency: e.target.value })}
          className="input-field w-auto"
        >
          <option value="">همه ارزها</option>
          {currencies.map((c) => (
            <option key={c._id} value={c._id}>{c.nameFa}</option>
          ))}
        </select>
      </div>

      {/* Offers List */}
      {loading ? (
        <div className="flex justify-center py-10">
          <FaSpinner className="animate-spin text-gold text-3xl" />
        </div>
      ) : offers.length === 0 ? (
        <div className="text-center py-10 text-dark-400">
          پیشنهادی یافت نشد
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {offers.map((offer) => (
            <div key={offer._id} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`flex items-center gap-2 ${offer.type === 'buy' ? 'text-green-500' : 'text-red-500'}`}>
                  {offer.type === 'buy' ? <FaArrowDown /> : <FaArrowUp />}
                  <span className="font-bold">{offer.type === 'buy' ? 'خرید' : 'فروش'}</span>
                </div>
                <span className="text-2xl">{offer.currency?.symbol}</span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between">
                  <span className="text-dark-400">ارز:</span>
                  <span className="font-bold">{offer.currency?.nameFa}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">مقدار:</span>
                  <span className="font-bold">{formatNumber(offer.remainingAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">قیمت:</span>
                  <span className="font-bold text-gold">{formatNumber(offer.price)} ریال</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-400">ارائه‌دهنده:</span>
                  <span className="text-sm">{offer.offeredBy?.sarafiInfo?.businessName || offer.offeredBy?.firstName}</span>
                </div>
              </div>

              <button
                onClick={() => handleAcceptOffer(offer._id)}
                className="btn-gold w-full"
              >
                پذیرش پیشنهاد
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Create Offer Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4">ثبت پیشنهاد جدید</h2>
            <form onSubmit={handleCreateOffer} className="space-y-4">
              <div>
                <label className="block text-dark-400 text-sm mb-2">نوع</label>
                <select
                  value={newOffer.type}
                  onChange={(e) => setNewOffer({ ...newOffer, type: e.target.value })}
                  className="input-field w-full"
                >
                  <option value="buy">می‌خواهم بخرم</option>
                  <option value="sell">می‌خواهم بفروشم</option>
                </select>
              </div>
              <div>
                <label className="block text-dark-400 text-sm mb-2">ارز</label>
                <select
                  value={newOffer.currency}
                  onChange={(e) => setNewOffer({ ...newOffer, currency: e.target.value })}
                  className="input-field w-full"
                >
                  <option value="">انتخاب کنید</option>
                  {currencies.map((c) => (
                    <option key={c._id} value={c._id}>{c.nameFa}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-dark-400 text-sm mb-2">مقدار</label>
                <input
                  type="number"
                  value={newOffer.amount}
                  onChange={(e) => setNewOffer({ ...newOffer, amount: e.target.value })}
                  className="input-field w-full"
                  placeholder="مثال: 1000"
                />
              </div>
              <div>
                <label className="block text-dark-400 text-sm mb-2">قیمت پیشنهادی (ریال)</label>
                <input
                  type="number"
                  value={newOffer.price}
                  onChange={(e) => setNewOffer({ ...newOffer, price: e.target.value })}
                  className="input-field w-full"
                  placeholder="مثال: 50000"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="btn-outline flex-1"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="btn-gold flex-1"
                >
                  {creating ? <FaSpinner className="animate-spin mx-auto" /> : 'ثبت'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Market;
