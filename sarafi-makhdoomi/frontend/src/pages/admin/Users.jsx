import { useState, useEffect } from 'react';
import { FaSearch, FaCheck, FaTimes, FaBan, FaEdit } from 'react-icons/fa';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';
import jalaliMoment from 'jalali-moment';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', search: '' });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [filter, page]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20, role: 'user' };
      if (filter.status) params.status = filter.status;
      if (filter.search) params.search = filter.search;

      const res = await adminAPI.getUsers(params);
      setUsers(res.data.data);
      setTotalPages(res.data.pages);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await adminAPI.approveUser(id);
      toast.success('کاربر تایید شد');
      fetchUsers();
    } catch (e) {
      toast.error('خطا در تایید کاربر');
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('علت رد:');
    if (!reason) return;
    try {
      await adminAPI.rejectUser(id, reason);
      toast.success('کاربر رد شد');
      fetchUsers();
    } catch (e) {
      toast.error('خطا');
    }
  };

  const handleSuspend = async (id) => {
    const reason = prompt('علت تعلیق:');
    if (!reason) return;
    try {
      await adminAPI.suspendUser(id, reason);
      toast.success('کاربر تعلیق شد');
      fetchUsers();
    } catch (e) {
      toast.error('خطا');
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      pending: { label: 'در انتظار', class: 'badge-warning' },
      approved: { label: 'تایید شده', class: 'badge-success' },
      rejected: { label: 'رد شده', class: 'badge-danger' },
      suspended: { label: 'تعلیق', class: 'badge-danger' }
    };
    const s = map[status] || { label: status, class: 'badge-info' };
    return <span className={`badge ${s.class}`}>{s.label}</span>;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">مدیریت کاربران</h1>

      {/* فیلترها */}
      <div className="card-dark mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <FaSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-500" />
            <input
              type="text"
              className="input-dark pr-12"
              placeholder="جستجوی نام، ایمیل..."
              value={filter.search}
              onChange={(e) => setFilter({ ...filter, search: e.target.value })}
            />
          </div>
          <select
            className="input-dark w-auto"
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          >
            <option value="">همه وضعیت‌ها</option>
            <option value="pending">در انتظار</option>
            <option value="approved">تایید شده</option>
            <option value="rejected">رد شده</option>
            <option value="suspended">تعلیق</option>
          </select>
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
                <th className="text-right p-4">ایمیل</th>
                <th className="text-right p-4">صراف</th>
                <th className="text-right p-4">وضعیت</th>
                <th className="text-right p-4">تاریخ</th>
                <th className="text-right p-4">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id} className="table-row">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-500">
                        {user.firstName?.[0]}
                      </div>
                      <div>
                        <p className="text-white font-medium">{user.firstName} {user.lastName}</p>
                        <p className="text-dark-500 text-xs">{user.phone}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-dark-300">{user.email}</td>
                  <td className="p-4 text-dark-300">
                    {user.selectedSarafi?.firstName} {user.selectedSarafi?.lastName}
                  </td>
                  <td className="p-4">{getStatusBadge(user.status)}</td>
                  <td className="p-4 text-dark-400 text-sm">
                    {jalaliMoment(user.createdAt).format('jYYYY/jMM/jDD')}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      {user.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(user._id)}
                            className="w-8 h-8 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center hover:bg-green-500/20"
                            title="تایید"
                          >
                            <FaCheck />
                          </button>
                          <button
                            onClick={() => handleReject(user._id)}
                            className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20"
                            title="رد"
                          >
                            <FaTimes />
                          </button>
                        </>
                      )}
                      {user.status === 'approved' && (
                        <button
                          onClick={() => handleSuspend(user._id)}
                          className="w-8 h-8 rounded-lg bg-yellow-500/10 text-yellow-500 flex items-center justify-center hover:bg-yellow-500/20"
                          title="تعلیق"
                        >
                          <FaBan />
                        </button>
                      )}
                    </div>
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
                page === i + 1 ? 'bg-gold-500 text-dark-900' : 'bg-dark-800 text-white hover:bg-dark-700'
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

export default Users;
