import { useState, useEffect } from 'react';
import { FaFilter, FaTimes } from 'react-icons/fa';
import { requestAPI } from '../../services/api';
import toast from 'react-hot-toast';
import jalaliMoment from 'jalali-moment';

const AdminRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', type: '', visibility: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchRequests();
  }, [filter, page]);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20, ...filter };
      const res = await requestAPI.getAll(params);
      setRequests(res.data.data);
      setTotalPages(res.data.pages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('علت رد:');
    if (!reason) return;
    try {
      await requestAPI.reject(id, reason);
      toast.success('درخواست رد شد');
      fetchRequests();
    } catch (e) {
      toast.error('خطا');
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      pending: { label: 'در انتظار', class: 'badge-warning' },
      waiting_public: { label: 'در انتظار انتشار', class: 'badge-warning' },
      public: { label: 'عمومی', class: 'badge-info' },
      private: { label: 'خصوصی', class: 'badge-gold' },
      accepted: { label: 'پذیرفته', class: 'badge-success' },
      in_progress: { label: 'در حال انجام', class: 'badge-info' },
      completed: { label: 'تکمیل', class: 'badge-success' },
      cancelled: { label: 'لغو', class: 'badge-danger' },
      rejected: { label: 'رد شده', class: 'badge-danger' }
    };
    const s = map[status] || { label: status, class: 'badge-info' };
    return <span className={`badge ${s.class}`}>{s.label}</span>;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">مدیریت درخواست‌ها</h1>

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
            <option value="rejected">رد شده</option>
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
              onClick={() => setFilter({ status: '', type: '', visibility: '' })}
              className="btn-dark flex items-center gap-2"
            >
              <FaTimes /> پاک کردن
            </button>
          )}
        </div>
      </div>

      {/* جدول */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="loading-spinner"></div>
        </div>
      ) : (
        <div className="card-dark overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="text-right p-4">کاربر</th>
                <th className="text-right p-4">نوع</th>
                <th className="text-right p-4">ارز</th>
                <th className="text-right p-4">مقدار</th>
                <th className="text-right p-4">مبلغ</th>
                <th className="text-right p-4">صراف</th>
                <th className="text-right p-4">وضعیت</th>
                <th className="text-right p-4">تاریخ</th>
                <th className="text-right p-4">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {requests.map((req) => (
                <tr key={req._id} className="table-row">
                  <td className="p-4">
                    <div>
                      <p className="text-white">{req.user?.firstName} {req.user?.lastName}</p>
                      <p className="text-dark-500 text-xs">{req.user?.email}</p>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={req.type === 'buy' ? 'text-green-400' : 'text-red-400'}>
                      {req.type === 'buy' ? 'خرید' : 'فروش'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <span>{req.currency?.symbol}</span>
                      <span className="text-white">{req.currency?.nameFa}</span>
                    </div>
                  </td>
                  <td className="p-4 text-white">{req.amount?.toLocaleString()}</td>
                  <td className="p-4 text-gold-500">{req.finalPrice?.toLocaleString()}</td>
                  <td className="p-4 text-dark-300">
                    {req.acceptedBy?.firstName || req.originalSarafi?.firstName || '-'}
                  </td>
                  <td className="p-4">{getStatusBadge(req.status)}</td>
                  <td className="p-4 text-dark-400 text-sm">
                    {jalaliMoment(req.createdAt).format('jYYYY/jMM/jDD')}
                  </td>
                  <td className="p-4">
                    {['pending', 'public'].includes(req.status) && (
                      <button
                        onClick={() => handleReject(req._id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        رد کردن
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
                page === i + 1 ? 'bg-gold-500 text-dark-900' : 'bg-dark-800 text-white'
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

export default AdminRequests;
