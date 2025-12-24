import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaPlus, FaFilter, FaTimes } from 'react-icons/fa';
import { requestAPI } from '../../services/api';
import jalaliMoment from 'jalali-moment';
import Countdown from 'react-countdown';

const Requests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', type: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchRequests();
  }, [filter, page]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (filter.status) params.status = filter.status;
      if (filter.type) params.type = filter.type;

      const res = await requestAPI.getMyRequests(params);
      setRequests(res.data.data);
      setTotalPages(res.data.pages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id) => {
    if (!confirm('آیا از لغو درخواست مطمئن هستید؟')) return;
    try {
      await requestAPI.cancel(id);
      fetchRequests();
    } catch (e) {
      console.error(e);
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      pending: { label: 'در انتظار بررسی', class: 'badge-warning' },
      waiting_public: { label: 'در انتظار انتشار', class: 'badge-warning' },
      public: { label: 'عمومی شده', class: 'badge-info' },
      private: { label: 'در پیگیری صراف', class: 'badge-gold' },
      accepted: { label: 'پذیرفته شده', class: 'badge-success' },
      in_progress: { label: 'در حال انجام', class: 'badge-info' },
      completed: { label: 'تکمیل شده', class: 'badge-success' },
      cancelled: { label: 'لغو شده', class: 'badge-danger' },
      rejected: { label: 'رد شده', class: 'badge-danger' }
    };
    const s = statusMap[status] || { label: status, class: 'badge-info' };
    return <span className={`badge ${s.class}`}>{s.label}</span>;
  };

  const CountdownRenderer = ({ hours, minutes, seconds, completed }) => {
    if (completed) return <span className="text-dark-500">منقضی</span>;
    return (
      <span className="text-gold-500 font-mono">
        {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    );
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">درخواست‌های من</h1>
        <Link to="/dashboard/new-request" className="btn-gold flex items-center gap-2">
          <FaPlus />
          درخواست جدید
        </Link>
      </div>

      {/* فیلترها */}
      <div className="card-dark mb-6">
        <div className="flex flex-wrap gap-4">
          <select
            className="input-dark w-auto"
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          >
            <option value="">همه وضعیت‌ها</option>
            <option value="pending">در انتظار</option>
            <option value="public">عمومی</option>
            <option value="private">خصوصی</option>
            <option value="completed">تکمیل شده</option>
            <option value="cancelled">لغو شده</option>
          </select>

          <select
            className="input-dark w-auto"
            value={filter.type}
            onChange={(e) => setFilter({ ...filter, type: e.target.value })}
          >
            <option value="">همه انواع</option>
            <option value="buy">خرید</option>
            <option value="sell">فروش</option>
          </select>

          {(filter.status || filter.type) && (
            <button
              onClick={() => setFilter({ status: '', type: '' })}
              className="btn-dark flex items-center gap-2"
            >
              <FaTimes />
              پاک کردن
            </button>
          )}
        </div>
      </div>

      {/* لیست */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="loading-spinner"></div>
        </div>
      ) : requests.length === 0 ? (
        <div className="card-dark text-center py-12">
          <p className="text-dark-500 mb-4">درخواستی یافت نشد</p>
          <Link to="/dashboard/new-request" className="btn-gold inline-flex items-center gap-2">
            <FaPlus />
            ثبت اولین درخواست
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div key={request._id} className="card-dark">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{request.currency?.symbol}</span>
                  <div>
                    <p className="text-white font-bold">
                      {request.type === 'buy' ? 'خرید' : 'فروش'} {request.amount} {request.currency?.nameFa}
                    </p>
                    <p className="text-dark-500 text-sm">
                      {jalaliMoment(request.createdAt).format('jYYYY/jMM/jDD - HH:mm')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* تایمر برای درخواست‌های pending */}
                  {request.status === 'pending' && request.timerExpiry && (
                    <div className="text-center">
                      <p className="text-dark-500 text-xs mb-1">زمان باقی‌مانده</p>
                      <Countdown
                        date={new Date(request.timerExpiry)}
                        renderer={CountdownRenderer}
                      />
                    </div>
                  )}

                  {getStatusBadge(request.status)}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-dark-700 flex flex-col md:flex-row justify-between gap-4">
                <div className="flex gap-6 text-sm">
                  <div>
                    <span className="text-dark-500">نرخ:</span>
                    <span className="text-white mr-2">{request.rate?.toLocaleString()} ریال</span>
                  </div>
                  <div>
                    <span className="text-dark-500">مبلغ کل:</span>
                    <span className="text-gold-500 font-bold mr-2">{request.finalPrice?.toLocaleString()} ریال</span>
                  </div>
                </div>

                {['pending', 'waiting_public', 'public'].includes(request.status) && (
                  <button
                    onClick={() => handleCancel(request._id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    لغو درخواست
                  </button>
                )}
              </div>

              {/* پیام وضعیت */}
              {request.status === 'private' && (
                <div className="mt-4 p-3 bg-gold-500/10 rounded-lg text-gold-400 text-sm">
                  صراف {request.acceptedBy?.firstName} {request.acceptedBy?.lastName} در حال پیگیری درخواست شما است و به زودی با شما تماس می‌گیرد.
                </div>
              )}

              {request.status === 'rejected' && request.rejectionReason && (
                <div className="mt-4 p-3 bg-red-500/10 rounded-lg text-red-400 text-sm">
                  علت رد: {request.rejectionReason}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* صفحه‌بندی */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: totalPages }, (_, i) => (
            <button
              key={i + 1}
              onClick={() => setPage(i + 1)}
              className={`w-10 h-10 rounded-lg ${
                page === i + 1
                  ? 'bg-gold-500 text-dark-900'
                  : 'bg-dark-800 text-white hover:bg-dark-700'
              }`}
            >
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Requests;
