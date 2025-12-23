import { useState, useEffect } from 'react';
import { FaExchangeAlt, FaSpinner, FaCheck, FaTimes, FaPhone, FaEye, FaFilter } from 'react-icons/fa';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const statusLabels = {
  pending: { label: 'در انتظار تصمیم', color: 'bg-yellow-500/20 text-yellow-500' },
  approved: { label: 'تایید شده', color: 'bg-blue-500/20 text-blue-500' },
  processing: { label: 'در انتظار تماس', color: 'bg-purple-500/20 text-purple-500' },
  awaiting_currency: { label: 'انتظار وصول ارز', color: 'bg-orange-500/20 text-orange-500' },
  awaiting_rial: { label: 'انتظار وصول ریال', color: 'bg-orange-500/20 text-orange-500' },
  completed: { label: 'تکمیل شده', color: 'bg-green-500/20 text-green-500' },
  cancelled: { label: 'لغو شده', color: 'bg-red-500/20 text-red-500' }
};

const Trades = () => {
  const [trades, setTrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', type: '' });
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [deciding, setDeciding] = useState(false);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchData();
  }, [filter]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tradesRes, statsRes] = await Promise.all([
        api.get('/trades/sarafi/trades', { params: filter }),
        api.get('/trades/sarafi/stats')
      ]);
      setTrades(tradesRes.data.data);
      setStats(statsRes.data.data);
    } catch (error) {
      console.error('خطا در دریافت معاملات:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('fa-IR').format(num || 0);
  };

  const handleDecision = async (tradeId, decision, reason = '') => {
    try {
      setDeciding(true);
      await api.put(`/trades/sarafi/${tradeId}/decision`, { decision, reason });

      const messages = {
        instant: 'معامله تایید شد',
        callback: 'در انتظار تماس تلفنی',
        rejected: 'معامله رد شد'
      };
      toast.success(messages[decision]);

      setSelectedTrade(null);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در ثبت تصمیم');
    } finally {
      setDeciding(false);
    }
  };

  const handleCancel = async (tradeId) => {
    const reason = prompt('دلیل لغو:');
    if (!reason) return;

    try {
      await api.put(`/trades/sarafi/${tradeId}/cancel`, { reason, applyPenalty: false });
      toast.success('معامله لغو شد');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در لغو');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <FaExchangeAlt className="text-gold" />
          مدیریت معاملات
        </h1>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="card p-4 text-center">
            <p className="text-dark-400 text-sm">در انتظار</p>
            <p className="text-2xl font-bold text-yellow-500">{stats.pendingCount || 0}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-dark-400 text-sm">انتظار وصول ارز</p>
            <p className="text-2xl font-bold text-orange-500">{stats.awaitingCurrency || 0}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-dark-400 text-sm">انتظار وصول ریال</p>
            <p className="text-2xl font-bold text-orange-500">{stats.awaitingRial || 0}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-dark-400 text-sm">تعداد معاملات</p>
            <p className="text-2xl font-bold text-gold">{stats.totalTrades || 0}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-dark-400 text-sm">حجم معاملات</p>
            <p className="text-lg font-bold">{formatNumber(stats.totalVolume)} ریال</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-4 items-center">
        <FaFilter className="text-dark-400" />
        <select
          value={filter.status}
          onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          className="input-field w-auto"
        >
          <option value="">همه وضعیت‌ها</option>
          <option value="pending">در انتظار</option>
          <option value="approved">تایید شده</option>
          <option value="processing">در حال پردازش</option>
          <option value="completed">تکمیل شده</option>
          <option value="cancelled">لغو شده</option>
        </select>
        <select
          value={filter.type}
          onChange={(e) => setFilter({ ...filter, type: e.target.value })}
          className="input-field w-auto"
        >
          <option value="">همه انواع</option>
          <option value="buy">خرید</option>
          <option value="sell">فروش</option>
        </select>
      </div>

      {/* Trades List */}
      {loading ? (
        <div className="flex justify-center py-10">
          <FaSpinner className="animate-spin text-gold text-3xl" />
        </div>
      ) : trades.length === 0 ? (
        <div className="card p-10 text-center text-dark-400">
          معامله‌ای یافت نشد
        </div>
      ) : (
        <div className="space-y-4">
          {trades.map((trade) => {
            const status = statusLabels[trade.status] || statusLabels.pending;

            return (
              <div key={trade._id} className="card p-4">
                <div className="flex items-center justify-between flex-wrap gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{trade.currency?.symbol}</span>
                    <div>
                      <p className="font-bold">
                        {trade.type === 'buy' ? 'خرید' : 'فروش'} {formatNumber(trade.amount)} {trade.currency?.nameFa}
                      </p>
                      <p className="text-dark-400 text-sm">{trade.tradeNumber}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs ${status.color}`}>
                    {status.label}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
                  <div>
                    <p className="text-dark-400 text-xs">مشتری</p>
                    <p className="font-bold text-sm">{trade.customer?.firstName} {trade.customer?.lastName}</p>
                    {trade.customer?.phone && (
                      <a href={`tel:${trade.customer.phone}`} className="text-gold text-xs flex items-center gap-1">
                        <FaPhone /> {trade.customer.phone}
                      </a>
                    )}
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
                    <p className="font-bold text-green-500">{formatNumber(trade.commission?.amount)} ریال</p>
                  </div>
                  <div>
                    <p className="text-dark-400 text-xs">روش پرداخت</p>
                    <p className="font-bold text-sm">
                      {trade.paymentMethod === 'cash_wallet' ? 'نقدی' :
                       trade.paymentMethod === 'credit_wallet' ? 'اعتباری' :
                       trade.paymentMethod === 'mixed' ? 'ترکیبی' : '-'}
                    </p>
                  </div>
                </div>

                {/* Pending Decision */}
                {trade.status === 'pending' && (
                  <div className="flex gap-2 pt-3 border-t border-dark-700">
                    <button
                      onClick={() => handleDecision(trade._id, 'instant')}
                      className="btn-gold px-4 py-2 flex items-center gap-2"
                    >
                      <FaCheck /> تایید فوری
                    </button>
                    <button
                      onClick={() => handleDecision(trade._id, 'callback')}
                      className="btn-outline px-4 py-2 flex items-center gap-2"
                    >
                      <FaPhone /> نیاز به تماس
                    </button>
                    <button
                      onClick={() => {
                        const reason = prompt('دلیل رد:');
                        if (reason) handleDecision(trade._id, 'rejected', reason);
                      }}
                      className="bg-red-500/20 text-red-500 px-4 py-2 rounded flex items-center gap-2 hover:bg-red-500/30"
                    >
                      <FaTimes /> رد
                    </button>
                  </div>
                )}

                {/* Collection Status */}
                {['approved', 'processing', 'awaiting_currency', 'awaiting_rial'].includes(trade.status) && (
                  <div className="flex gap-4 pt-3 border-t border-dark-700 text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${
                        trade.currencyCollection?.status === 'collected' ? 'bg-green-500' : 'bg-yellow-500'
                      }`} />
                      وصول ارز: {trade.currencyCollection?.status === 'collected' ? 'انجام شده' : 'در انتظار'}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${
                        trade.rialCollection?.status === 'collected' ? 'bg-green-500' : 'bg-yellow-500'
                      }`} />
                      وصول ریال: {trade.rialCollection?.status === 'collected' ? 'انجام شده' : 'در انتظار'}
                    </div>
                    <button
                      onClick={() => handleCancel(trade._id)}
                      className="mr-auto text-red-500 hover:text-red-400"
                    >
                      لغو معامله
                    </button>
                  </div>
                )}

                <div className="mt-3 text-xs text-dark-400">
                  {new Date(trade.createdAt).toLocaleDateString('fa-IR')} - {new Date(trade.createdAt).toLocaleTimeString('fa-IR')}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Trades;
