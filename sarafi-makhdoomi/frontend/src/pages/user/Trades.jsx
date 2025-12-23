import { useState, useEffect } from 'react';
import { FaExchangeAlt, FaSpinner, FaCheck, FaTimes, FaClock, FaEye } from 'react-icons/fa';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const statusLabels = {
  pending: { label: 'در انتظار', color: 'bg-yellow-500/20 text-yellow-500' },
  approved: { label: 'تایید شده', color: 'bg-blue-500/20 text-blue-500' },
  processing: { label: 'در حال پردازش', color: 'bg-purple-500/20 text-purple-500' },
  awaiting_currency: { label: 'در انتظار وصول ارز', color: 'bg-orange-500/20 text-orange-500' },
  awaiting_rial: { label: 'در انتظار وصول ریال', color: 'bg-orange-500/20 text-orange-500' },
  completed: { label: 'تکمیل شده', color: 'bg-green-500/20 text-green-500' },
  cancelled: { label: 'لغو شده', color: 'bg-red-500/20 text-red-500' },
  disputed: { label: 'اختلاف', color: 'bg-red-500/20 text-red-500' }
};

const Trades = () => {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [selectedTrade, setSelectedTrade] = useState(null);

  useEffect(() => {
    fetchTrades();
  }, [filter]);

  const fetchTrades = async () => {
    try {
      setLoading(true);
      const response = await api.get('/trades/my-trades', {
        params: { status: filter || undefined }
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

  const handleCancel = async (tradeId) => {
    const reason = prompt('لطفا دلیل لغو را وارد کنید:');
    if (!reason) return;

    try {
      await api.put(`/trades/${tradeId}/cancel`, { reason });
      toast.success('معامله لغو شد. 100 امتیاز کسر و 1 بلک‌پوینت اضافه شد.');
      fetchTrades();
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در لغو معامله');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <FaExchangeAlt className="text-gold" />
          معاملات من
        </h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="input-field w-auto"
        >
          <option value="">همه وضعیت‌ها</option>
          <option value="pending">در انتظار</option>
          <option value="approved">تایید شده</option>
          <option value="processing">در حال پردازش</option>
          <option value="completed">تکمیل شده</option>
          <option value="cancelled">لغو شده</option>
        </select>
      </div>

      {/* Trades List */}
      {loading ? (
        <div className="flex justify-center py-10">
          <FaSpinner className="animate-spin text-gold text-3xl" />
        </div>
      ) : trades.length === 0 ? (
        <div className="text-center py-10 text-dark-400">
          معامله‌ای یافت نشد
        </div>
      ) : (
        <div className="space-y-4">
          {trades.map((trade) => {
            const status = statusLabels[trade.status] || statusLabels.pending;

            return (
              <div key={trade._id} className="card p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{trade.currency?.symbol}</span>
                    <div>
                      <p className="font-bold">
                        {trade.type === 'buy' ? 'خرید' : 'فروش'} {trade.currency?.nameFa}
                      </p>
                      <p className="text-dark-400 text-sm">{trade.tradeNumber}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs ${status.color}`}>
                    {status.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div>
                    <p className="text-dark-400 text-xs">مقدار</p>
                    <p className="font-bold">{formatNumber(trade.amount)}</p>
                  </div>
                  <div>
                    <p className="text-dark-400 text-xs">نرخ</p>
                    <p className="font-bold">{formatNumber(trade.rate)} ریال</p>
                  </div>
                  <div>
                    <p className="text-dark-400 text-xs">مبلغ کل</p>
                    <p className="font-bold text-gold">{formatNumber(trade.totalAmount)} ریال</p>
                  </div>
                  <div>
                    <p className="text-dark-400 text-xs">کارمزد</p>
                    <p className="font-bold text-red-400">{formatNumber(trade.commission?.amount)} ریال</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-dark-700">
                  <p className="text-dark-400 text-sm">
                    <FaClock className="inline ml-1" />
                    {new Date(trade.createdAt).toLocaleDateString('fa-IR')}
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedTrade(trade)}
                      className="btn-outline px-3 py-1 text-sm flex items-center gap-1"
                    >
                      <FaEye /> جزئیات
                    </button>
                    {['pending', 'approved', 'processing'].includes(trade.status) && (
                      <button
                        onClick={() => handleCancel(trade._id)}
                        className="px-3 py-1 text-sm bg-red-500/20 text-red-500 rounded hover:bg-red-500/30 flex items-center gap-1"
                      >
                        <FaTimes /> لغو
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Trade Detail Modal */}
      {selectedTrade && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">جزئیات معامله</h2>
              <button onClick={() => setSelectedTrade(null)} className="text-dark-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-dark-400 text-sm">شماره معامله</p>
                  <p className="font-bold">{selectedTrade.tradeNumber}</p>
                </div>
                <div>
                  <p className="text-dark-400 text-sm">وضعیت</p>
                  <span className={`px-2 py-1 rounded text-xs ${statusLabels[selectedTrade.status]?.color}`}>
                    {statusLabels[selectedTrade.status]?.label}
                  </span>
                </div>
                <div>
                  <p className="text-dark-400 text-sm">نوع</p>
                  <p className="font-bold">{selectedTrade.type === 'buy' ? 'خرید' : 'فروش'}</p>
                </div>
                <div>
                  <p className="text-dark-400 text-sm">ارز</p>
                  <p className="font-bold">{selectedTrade.currency?.nameFa}</p>
                </div>
                <div>
                  <p className="text-dark-400 text-sm">مقدار</p>
                  <p className="font-bold">{formatNumber(selectedTrade.amount)}</p>
                </div>
                <div>
                  <p className="text-dark-400 text-sm">نرخ</p>
                  <p className="font-bold">{formatNumber(selectedTrade.rate)} ریال</p>
                </div>
                <div>
                  <p className="text-dark-400 text-sm">مبلغ کل</p>
                  <p className="font-bold text-gold">{formatNumber(selectedTrade.totalAmount)} ریال</p>
                </div>
                <div>
                  <p className="text-dark-400 text-sm">کارمزد</p>
                  <p className="font-bold text-red-400">{formatNumber(selectedTrade.commission?.amount)} ریال</p>
                </div>
                <div>
                  <p className="text-dark-400 text-sm">مبلغ نهایی</p>
                  <p className="font-bold text-green-500">{formatNumber(selectedTrade.netAmount)} ریال</p>
                </div>
                <div>
                  <p className="text-dark-400 text-sm">روش پرداخت</p>
                  <p className="font-bold">
                    {selectedTrade.paymentMethod === 'cash_wallet' ? 'نقدی' :
                     selectedTrade.paymentMethod === 'credit_wallet' ? 'اعتباری' : 'ترکیبی'}
                  </p>
                </div>
              </div>

              {selectedTrade.sarafiDecision?.decision && (
                <div className="pt-4 border-t border-dark-700">
                  <p className="text-dark-400 text-sm mb-2">تصمیم صراف</p>
                  <p className="font-bold">
                    {selectedTrade.sarafiDecision.decision === 'instant' ? 'تایید فوری' :
                     selectedTrade.sarafiDecision.decision === 'callback' ? 'نیاز به تماس' : 'رد شده'}
                  </p>
                </div>
              )}

              {selectedTrade.scoring?.customerScoreAwarded > 0 && (
                <div className="pt-4 border-t border-dark-700">
                  <p className="text-dark-400 text-sm mb-2">امتیاز دریافتی</p>
                  <p className="font-bold text-gold">+{selectedTrade.scoring.customerScoreAwarded} امتیاز</p>
                </div>
              )}
            </div>

            <button
              onClick={() => setSelectedTrade(null)}
              className="btn-outline w-full mt-6"
            >
              بستن
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Trades;
