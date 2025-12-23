import { useState, useEffect } from 'react';
import { FaMoneyBillWave, FaCheck, FaSpinner, FaPhone, FaUniversity } from 'react-icons/fa';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const RialCollection = () => {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [bankDetails, setBankDetails] = useState({
    bankName: '',
    accountNumber: '',
    trackingCode: ''
  });
  const [notes, setNotes] = useState('');
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    fetchTrades();
  }, []);

  const fetchTrades = async () => {
    try {
      setLoading(true);
      const response = await api.get('/trades/sarafi/trades', {
        params: { collectionType: 'rial' }
      });
      setTrades(response.data.data);
    } catch (error) {
      console.error('خطا در دریافت معاملات:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('fa-IR').format(num || 0);
  };

  const handleConfirmCollection = async (tradeId) => {
    try {
      setConfirming(true);
      await api.put(`/trades/sarafi/${tradeId}/rial-collection`, {
        bankDetails,
        notes
      });
      toast.success('وصول ریال تایید شد');
      setSelectedTrade(null);
      setBankDetails({ bankName: '', accountNumber: '', trackingCode: '' });
      setNotes('');
      fetchTrades();
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در تایید وصول');
    } finally {
      setConfirming(false);
    }
  };

  const pendingTrades = trades.filter(t =>
    t.rialCollection?.status !== 'collected' &&
    !['cancelled', 'completed'].includes(t.status)
  );

  const totalPending = pendingTrades.reduce((sum, t) => sum + t.totalAmount, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <FaMoneyBillWave className="text-gold" />
          پنل وصول ریالی
        </h1>
        <div className="bg-gold/20 text-gold px-4 py-2 rounded-lg font-bold">
          {pendingTrades.length} معامله در انتظار
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <p className="text-dark-400 text-sm">در انتظار وصول</p>
          <p className="text-3xl font-bold text-gold">{pendingTrades.length}</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-dark-400 text-sm">مجموع در انتظار</p>
          <p className="text-2xl font-bold text-gold">{formatNumber(totalPending)} ریال</p>
        </div>
        <div className="card p-4 text-center">
          <p className="text-dark-400 text-sm">وصول شده امروز</p>
          <p className="text-3xl font-bold text-green-500">
            {trades.filter(t => t.rialCollection?.status === 'collected').length}
          </p>
        </div>
      </div>

      {/* Trades List */}
      {loading ? (
        <div className="flex justify-center py-10">
          <FaSpinner className="animate-spin text-gold text-3xl" />
        </div>
      ) : pendingTrades.length === 0 ? (
        <div className="card p-10 text-center text-dark-400">
          معامله‌ای در انتظار وصول ریال نیست
        </div>
      ) : (
        <div className="space-y-4">
          {pendingTrades.map((trade) => (
            <div key={trade._id} className="card p-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
                    <FaMoneyBillWave className="text-green-500 text-xl" />
                  </div>
                  <div>
                    <p className="font-bold text-lg text-gold">
                      {formatNumber(trade.totalAmount)} ریال
                    </p>
                    <p className="text-dark-400 text-sm">{trade.tradeNumber}</p>
                  </div>
                </div>

                <div className="text-left">
                  <p className="text-dark-400 text-sm">مشتری</p>
                  <p className="font-bold">{trade.customer?.firstName} {trade.customer?.lastName}</p>
                  {trade.customer?.phone && (
                    <a href={`tel:${trade.customer.phone}`} className="text-gold text-sm flex items-center gap-1">
                      <FaPhone /> {trade.customer.phone}
                    </a>
                  )}
                </div>

                <div className="text-center">
                  <p className="text-dark-400 text-sm">ارز</p>
                  <p className="font-bold">{trade.currency?.nameFa}</p>
                  <p className="text-sm">{formatNumber(trade.amount)}</p>
                </div>

                <div className="text-center">
                  <p className="text-dark-400 text-sm">وضعیت ارز</p>
                  <span className={`px-2 py-1 rounded text-xs ${
                    trade.currencyCollection?.status === 'collected'
                      ? 'bg-green-500/20 text-green-500'
                      : 'bg-yellow-500/20 text-yellow-500'
                  }`}>
                    {trade.currencyCollection?.status === 'collected' ? 'وصول شده' : 'در انتظار'}
                  </span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedTrade(trade)}
                    className="btn-gold px-4 py-2 flex items-center gap-2"
                  >
                    <FaCheck /> تایید وصول
                  </button>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-dark-700 flex items-center justify-between text-sm text-dark-400">
                <span>نوع: {trade.type === 'buy' ? 'خرید' : 'فروش'}</span>
                <span>{new Date(trade.createdAt).toLocaleDateString('fa-IR')} - {new Date(trade.createdAt).toLocaleTimeString('fa-IR')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirm Modal */}
      {selectedTrade && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-md">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <FaUniversity className="text-gold" />
              تایید وصول ریال
            </h2>

            <div className="bg-dark-800 p-4 rounded-lg mb-4">
              <div className="flex items-center gap-3 mb-3">
                <FaMoneyBillWave className="text-green-500 text-2xl" />
                <div>
                  <p className="font-bold text-gold">{formatNumber(selectedTrade.totalAmount)} ریال</p>
                  <p className="text-dark-400 text-sm">{selectedTrade.tradeNumber}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-dark-400">مشتری:</p>
                  <p>{selectedTrade.customer?.firstName} {selectedTrade.customer?.lastName}</p>
                </div>
                <div>
                  <p className="text-dark-400">ارز:</p>
                  <p>{formatNumber(selectedTrade.amount)} {selectedTrade.currency?.nameFa}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-dark-400 text-sm mb-1">نام بانک</label>
                <input
                  type="text"
                  value={bankDetails.bankName}
                  onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                  className="input-field w-full"
                  placeholder="مثال: ملت"
                />
              </div>
              <div>
                <label className="block text-dark-400 text-sm mb-1">شماره حساب/کارت</label>
                <input
                  type="text"
                  value={bankDetails.accountNumber}
                  onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                  className="input-field w-full"
                  placeholder="شماره حساب یا کارت"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-dark-400 text-sm mb-1">کد پیگیری</label>
                <input
                  type="text"
                  value={bankDetails.trackingCode}
                  onChange={(e) => setBankDetails({ ...bankDetails, trackingCode: e.target.value })}
                  className="input-field w-full"
                  placeholder="کد پیگیری تراکنش"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-dark-400 text-sm mb-1">یادداشت (اختیاری)</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="input-field w-full"
                  rows={2}
                  placeholder="توضیحات..."
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedTrade(null);
                  setBankDetails({ bankName: '', accountNumber: '', trackingCode: '' });
                  setNotes('');
                }}
                className="btn-outline flex-1"
              >
                انصراف
              </button>
              <button
                onClick={() => handleConfirmCollection(selectedTrade._id)}
                disabled={confirming}
                className="btn-gold flex-1"
              >
                {confirming ? <FaSpinner className="animate-spin mx-auto" /> : 'تایید وصول'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RialCollection;
