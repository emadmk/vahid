import { useState, useEffect } from 'react';
import { FaSearch, FaCheck, FaTimes } from 'react-icons/fa';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import jalaliMoment from 'jalali-moment';

const Sarafis = () => {
  const [sarafis, setSarafis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', search: '' });

  useEffect(() => {
    fetchSarafis();
  }, [filter]);

  const fetchSarafis = async () => {
    setLoading(true);
    try {
      const params = { role: 'sarafi' };
      if (filter.status) params.status = filter.status;
      if (filter.search) params.search = filter.search;

      const res = await adminAPI.getUsers(params);
      setSarafis(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await adminAPI.approveUser(id);
      toast.success('صراف تایید شد');
      fetchSarafis();
    } catch (e) {
      toast.error('خطا');
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('علت رد:');
    if (!reason) return;
    try {
      await adminAPI.rejectUser(id, reason);
      toast.success('صراف رد شد');
      fetchSarafis();
    } catch (e) {
      toast.error('خطا');
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      pending: { label: 'در انتظار تایید', class: 'badge-warning' },
      approved: { label: 'فعال', class: 'badge-success' },
      rejected: { label: 'رد شده', class: 'badge-danger' },
      suspended: { label: 'تعلیق', class: 'badge-danger' }
    };
    const s = map[status] || { label: status, class: 'badge-info' };
    return <span className={`badge ${s.class}`}>{s.label}</span>;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">مدیریت صراف‌ها</h1>

      {/* فیلترها */}
      <div className="card-dark mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <FaSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-500" />
            <input
              type="text"
              className="input-dark pr-12"
              placeholder="جستجو..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            />
          </div>
          <select
            className="input-dark w-auto"
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          >
            <option value="">همه</option>
            <option value="pending">در انتظار</option>
            <option value="approved">فعال</option>
            <option value="suspended">تعلیق</option>
          </select>
        </div>
      </div>

      {/* کارت‌ها */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="loading-spinner"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sarafis.map((sarafi) => (
            <div key={sarafi._id} className="card-dark">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-500 text-xl font-bold">
                  {sarafi.firstName?.[0]}
                </div>
                <div>
                  <h3 className="text-white font-bold">{sarafi.firstName} {sarafi.lastName}</h3>
                  <p className="text-dark-400 text-sm">{sarafi.email}</p>
                </div>
              </div>

              {sarafi.sarafiInfo?.businessName && (
                <div className="mb-4 p-3 bg-dark-800/50 rounded-lg">
                  <p className="text-gold-500 font-medium">{sarafi.sarafiInfo.businessName}</p>
                  {sarafi.sarafiInfo.businessAddress && (
                    <p className="text-dark-400 text-sm mt-1">{sarafi.sarafiInfo.businessAddress}</p>
                  )}
                </div>
              )}

              <div className="flex justify-between items-center text-sm mb-4">
                <span className="text-dark-400">تلفن:</span>
                <span className="text-white">{sarafi.phone || '-'}</span>
              </div>

              <div className="flex justify-between items-center text-sm mb-4">
                <span className="text-dark-400">تاریخ ثبت:</span>
                <span className="text-white">{jalaliMoment(sarafi.createdAt).format('jYYYY/jMM/jDD')}</span>
              </div>

              <div className="flex justify-between items-center">
                {getStatusBadge(sarafi.status)}

                {sarafi.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(sarafi._id)}
                      className="btn-gold py-2 px-4 text-sm"
                    >
                      تایید
                    </button>
                    <button
                      onClick={() => handleReject(sarafi._id)}
                      className="btn-dark py-2 px-4 text-sm text-red-400"
                    >
                      رد
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Sarafis;
