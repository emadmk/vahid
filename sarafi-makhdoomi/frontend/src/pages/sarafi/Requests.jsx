import { useState, useEffect } from 'react';
import { FaCheck, FaGlobe, FaLock, FaPlay, FaCheckCircle } from 'react-icons/fa';
import { requestAPI } from '../../services/api';
import toast from 'react-hot-toast';
import jalaliMoment from 'jalali-moment';
import Countdown from 'react-countdown';

const SarafiRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', visibility: '' });

  useEffect(() => {
    fetchRequests();
  }, [filter]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await requestAPI.getSarafiRequests(filter);
      setRequests(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSetPublic = async (id) => {
    try {
      await requestAPI.setVisibility(id, 'public');
      toast.success('درخواست به بخش عمومی منتقل شد');
      fetchRequests();
    } catch (e) {
      toast.error('خطا');
    }
  };

  const handleSetPrivate = async (id) => {
    try {
      await requestAPI.setVisibility(id, 'private');
      toast.success('درخواست در پیگیری شماست');
      fetchRequests();
    } catch (e) {
      toast.error('خطا');
    }
  };

  const handleInProgress = async (id) => {
    try {
      await requestAPI.setInProgress(id);
      toast.success('وضعیت تغییر کرد');
      fetchRequests();
    } catch (e) {
      toast.error('خطا');
    }
  };

  const handleComplete = async (id) => {
    try {
      await requestAPI.complete(id);
      toast.success('درخواست تکمیل شد');
      fetchRequests();
    } catch (e) {
      toast.error('خطا');
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      pending: { label: 'در انتظار تصمیم', class: 'badge-warning' },
      public: { label: 'عمومی', class: 'badge-info' },
      private: { label: 'خصوصی', class: 'badge-gold' },
      accepted: { label: 'پذیرفته', class: 'badge-success' },
      in_progress: { label: 'در حال انجام', class: 'badge-info' },
      completed: { label: 'تکمیل شده', class: 'badge-success' }
    };
    const s = map[status] || { label: status, class: 'badge-info' };
    return <span className={`badge ${s.class}`}>{s.label}</span>;
  };

  const CountdownRenderer = ({ hours, minutes, seconds, completed }) => {
    if (completed) return <span className="text-red-500">منقضی</span>;
    return (
      <span className="text-gold-500 font-mono">
        {String(hours).padStart(2, '0')}:{String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </span>
    );
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">درخواست‌های مشتریان</h1>

      {/* فیلترها */}
      <div className="card-dark mb-6">
        <div className="flex flex-wrap gap-4">
          <select
            className="input-dark w-auto"
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          >
            <option value="">همه وضعیت‌ها</option>
            <option value="pending">در انتظار تصمیم</option>
            <option value="private">خصوصی</option>
            <option value="in_progress">در حال انجام</option>
            <option value="completed">تکمیل شده</option>
          </select>
        </div>
      </div>

      {/* لیست */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="loading-spinner"></div>
        </div>
      ) : requests.length === 0 ? (
        <div className="card-dark text-center py-12">
          <p className="text-dark-500">درخواستی وجود ندارد</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div key={request._id} className="card-dark">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="text-3xl">{request.currency?.symbol}</span>
                  <div>
                    <p className="text-white font-bold">
                      {request.type === 'buy' ? 'خرید' : 'فروش'} {request.amount} {request.currency?.nameFa}
                    </p>
                    <p className="text-dark-500 text-sm">
                      {request.user?.firstName} {request.user?.lastName}
                      {request.user?.phone && ` - ${request.user.phone}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {/* تایمر */}
                  {request.status === 'pending' && request.timerExpiry && (
                    <div className="text-center">
                      <p className="text-dark-500 text-xs mb-1">زمان باقی‌مانده</p>
                      <Countdown date={new Date(request.timerExpiry)} renderer={CountdownRenderer} />
                    </div>
                  )}
                  {getStatusBadge(request.status)}
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-dark-700">
                <div className="flex flex-wrap gap-6 text-sm mb-4">
                  <div>
                    <span className="text-dark-500">مبلغ:</span>
                    <span className="text-gold-500 font-bold mr-2">{request.finalPrice?.toLocaleString()} تومان</span>
                  </div>
                  <div>
                    <span className="text-dark-500">تاریخ:</span>
                    <span className="text-white mr-2">{jalaliMoment(request.createdAt).format('jYYYY/jMM/jDD HH:mm')}</span>
                  </div>
                  {request.user?.email && (
                    <div>
                      <span className="text-dark-500">ایمیل:</span>
                      <span className="text-white mr-2">{request.user.email}</span>
                    </div>
                  )}
                </div>

                {/* دکمه‌های عملیات */}
                <div className="flex flex-wrap gap-3">
                  {request.status === 'pending' && (
                    <>
                      <button
                        onClick={() => handleSetPrivate(request._id)}
                        className="btn-gold py-2 px-4 text-sm flex items-center gap-2"
                      >
                        <FaLock /> پیگیری خصوصی
                      </button>
                      <button
                        onClick={() => handleSetPublic(request._id)}
                        className="btn-outline py-2 px-4 text-sm flex items-center gap-2"
                      >
                        <FaGlobe /> انتشار عمومی
                      </button>
                    </>
                  )}

                  {['private', 'accepted'].includes(request.status) && (
                    <button
                      onClick={() => handleInProgress(request._id)}
                      className="btn-gold py-2 px-4 text-sm flex items-center gap-2"
                    >
                      <FaPlay /> شروع انجام
                    </button>
                  )}

                  {request.status === 'in_progress' && (
                    <button
                      onClick={() => handleComplete(request._id)}
                      className="btn-gold py-2 px-4 text-sm flex items-center gap-2"
                    >
                      <FaCheckCircle /> تکمیل درخواست
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SarafiRequests;
