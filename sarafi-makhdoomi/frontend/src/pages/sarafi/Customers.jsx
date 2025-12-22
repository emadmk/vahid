import { useState, useEffect } from 'react';
import { FaSearch, FaCheck, FaQuestion, FaTimes } from 'react-icons/fa';
import { sarafiAPI } from '../../services/api';
import toast from 'react-hot-toast';
import jalaliMoment from 'jalali-moment';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', search: '' });

  useEffect(() => {
    fetchCustomers();
  }, [filter]);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await sarafiAPI.getCustomers(filter);
      setCustomers(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id) => {
    try {
      await sarafiAPI.approveCustomer(id);
      toast.success('مشتری تایید شد');
      fetchCustomers();
    } catch (e) {
      toast.error('خطا');
    }
  };

  const handleUnknown = async (id) => {
    try {
      await sarafiAPI.unknownCustomer(id);
      toast.success('برای ادمین ارسال شد');
      fetchCustomers();
    } catch (e) {
      toast.error('خطا');
    }
  };

  const handleReject = async (id) => {
    const reason = prompt('علت رد:');
    if (!reason) return;
    try {
      await sarafiAPI.rejectCustomer(id, reason);
      toast.success('مشتری رد شد');
      fetchCustomers();
    } catch (e) {
      toast.error('خطا');
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      pending: { label: 'در انتظار تایید', class: 'badge-warning' },
      approved: { label: 'تایید شده', class: 'badge-success' },
      unknown: { label: 'ارسال به ادمین', class: 'badge-info' },
      rejected: { label: 'رد شده', class: 'badge-danger' }
    };
    const s = map[status] || { label: status, class: 'badge-info' };
    return <span className={`badge ${s.class}`}>{s.label}</span>;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">مشتریان من</h1>

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
            <option value="pending">در انتظار تایید</option>
            <option value="approved">تایید شده</option>
            <option value="unknown">ارسال به ادمین</option>
          </select>
        </div>
      </div>

      {/* لیست */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="loading-spinner"></div>
        </div>
      ) : customers.length === 0 ? (
        <div className="card-dark text-center py-12">
          <p className="text-dark-500">مشتری یافت نشد</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.map((customer) => (
            <div key={customer._id} className="card-dark">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-500 text-xl font-bold">
                  {customer.firstName?.[0]}
                </div>
                <div>
                  <h3 className="text-white font-bold">{customer.firstName} {customer.lastName}</h3>
                  <p className="text-dark-400 text-sm">{customer.email}</p>
                </div>
              </div>

              <div className="space-y-2 text-sm mb-4">
                {customer.phone && (
                  <div className="flex justify-between">
                    <span className="text-dark-500">تلفن:</span>
                    <span className="text-white">{customer.phone}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-dark-500">تاریخ عضویت:</span>
                  <span className="text-white">{jalaliMoment(customer.createdAt).format('jYYYY/jMM/jDD')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-500">درخواست‌ها:</span>
                  <span className="text-white">{customer.totalRequests || 0}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-dark-700">
                {getStatusBadge(customer.sarafiApprovalStatus)}

                {customer.sarafiApprovalStatus === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(customer._id)}
                      className="w-8 h-8 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center hover:bg-green-500/20"
                      title="تایید"
                    >
                      <FaCheck />
                    </button>
                    <button
                      onClick={() => handleUnknown(customer._id)}
                      className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center hover:bg-blue-500/20"
                      title="نمیشناسم"
                    >
                      <FaQuestion />
                    </button>
                    <button
                      onClick={() => handleReject(customer._id)}
                      className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20"
                      title="رد"
                    >
                      <FaTimes />
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

export default Customers;
