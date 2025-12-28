import { useState, useEffect } from 'react';
import { FaSearch, FaCheck, FaQuestion, FaTimes, FaUserPlus, FaKey, FaSpinner, FaCopy } from 'react-icons/fa';
import { sarafiAPI } from '../../services/api';
import api from '../../services/api';
import toast from 'react-hot-toast';
import jalaliMoment from 'jalali-moment';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: '', search: '' });
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteData, setInviteData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    nationalCode: '',
    sendEmail: true
  });
  const [generatedPassword, setGeneratedPassword] = useState('');

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

  const handleInviteCustomer = async (e) => {
    e.preventDefault();
    if (!inviteData.email || !inviteData.firstName || !inviteData.lastName) {
      toast.error('ایمیل، نام و نام خانوادگی الزامی است');
      return;
    }

    setInviteLoading(true);
    try {
      const res = await api.post('/sarafi/invite-customer', inviteData);
      if (res.data.success) {
        toast.success('مشتری با موفقیت دعوت شد');
        if (res.data.data.temporaryPassword) {
          setGeneratedPassword(res.data.data.temporaryPassword);
        } else {
          setShowInviteModal(false);
          setInviteData({
            email: '',
            firstName: '',
            lastName: '',
            phone: '',
            nationalCode: '',
            sendEmail: true
          });
        }
        fetchCustomers();
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'خطا در دعوت مشتری');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleResetPassword = async (customerId) => {
    if (!confirm('آیا از بازنشانی رمز عبور این مشتری اطمینان دارید؟')) return;

    try {
      const res = await api.post(`/sarafi/customers/${customerId}/reset-password`, { sendEmail: true });
      if (res.data.success) {
        toast.success('رمز عبور موقت ارسال شد');
        if (res.data.data.temporaryPassword) {
          alert(`رمز عبور موقت: ${res.data.data.temporaryPassword}`);
        }
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'خطا');
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('کپی شد');
  };

  const closeInviteModal = () => {
    setShowInviteModal(false);
    setGeneratedPassword('');
    setInviteData({
      email: '',
      firstName: '',
      lastName: '',
      phone: '',
      nationalCode: '',
      sendEmail: true
    });
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
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">مشتریان من</h1>
        <button
          onClick={() => setShowInviteModal(true)}
          className="btn-gold flex items-center gap-2"
        >
          <FaUserPlus />
          دعوت مشتری جدید
        </button>
      </div>

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

                <div className="flex gap-2">
                  {customer.sarafiApprovalStatus === 'approved' && (
                    <button
                      onClick={() => handleResetPassword(customer._id)}
                      className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center hover:bg-amber-500/20"
                      title="بازنشانی رمز عبور"
                    >
                      <FaKey />
                    </button>
                  )}
                  {customer.sarafiApprovalStatus === 'pending' && (
                    <>
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
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* مودال دعوت مشتری */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card-dark w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">دعوت مشتری جدید</h2>
              <button onClick={closeInviteModal} className="text-dark-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            {generatedPassword ? (
              <div className="text-center">
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
                  <p className="text-green-500 mb-2">مشتری با موفقیت ایجاد شد!</p>
                  <p className="text-dark-400 text-sm">رمز عبور موقت:</p>
                  <div className="flex items-center justify-center gap-2 mt-2">
                    <code className="text-gold-500 text-xl font-mono">{generatedPassword}</code>
                    <button
                      onClick={() => copyToClipboard(generatedPassword)}
                      className="text-dark-400 hover:text-gold-500"
                    >
                      <FaCopy />
                    </button>
                  </div>
                  <p className="text-dark-500 text-xs mt-2">این رمز را به مشتری اطلاع دهید</p>
                </div>
                <button onClick={closeInviteModal} className="btn-gold w-full">
                  بستن
                </button>
              </div>
            ) : (
              <form onSubmit={handleInviteCustomer} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-dark-400 text-sm mb-2">نام *</label>
                    <input
                      type="text"
                      className="input-dark"
                      value={inviteData.firstName}
                      onChange={(e) => setInviteData({...inviteData, firstName: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-dark-400 text-sm mb-2">نام خانوادگی *</label>
                    <input
                      type="text"
                      className="input-dark"
                      value={inviteData.lastName}
                      onChange={(e) => setInviteData({...inviteData, lastName: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-dark-400 text-sm mb-2">ایمیل *</label>
                  <input
                    type="email"
                    className="input-dark"
                    value={inviteData.email}
                    onChange={(e) => setInviteData({...inviteData, email: e.target.value})}
                    required
                  />
                </div>

                <div>
                  <label className="block text-dark-400 text-sm mb-2">تلفن</label>
                  <input
                    type="tel"
                    className="input-dark"
                    value={inviteData.phone}
                    onChange={(e) => setInviteData({...inviteData, phone: e.target.value})}
                  />
                </div>

                <div>
                  <label className="block text-dark-400 text-sm mb-2">کد ملی</label>
                  <input
                    type="text"
                    className="input-dark"
                    value={inviteData.nationalCode}
                    onChange={(e) => setInviteData({...inviteData, nationalCode: e.target.value})}
                  />
                </div>

                <label className="flex items-center gap-2 text-dark-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={inviteData.sendEmail}
                    onChange={(e) => setInviteData({...inviteData, sendEmail: e.target.checked})}
                    className="rounded bg-dark-700 border-dark-600"
                  />
                  <span className="text-sm">ارسال ایمیل با رمز عبور موقت</span>
                </label>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeInviteModal}
                    className="flex-1 btn-dark"
                  >
                    انصراف
                  </button>
                  <button
                    type="submit"
                    disabled={inviteLoading}
                    className="flex-1 btn-gold flex items-center justify-center gap-2"
                  >
                    {inviteLoading ? <FaSpinner className="animate-spin" /> : <FaUserPlus />}
                    {inviteLoading ? 'در حال ثبت...' : 'دعوت'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Customers;
