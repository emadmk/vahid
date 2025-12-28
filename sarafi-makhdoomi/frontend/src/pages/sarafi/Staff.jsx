import { useState, useEffect } from 'react';
import {
  FaUserTie, FaPlus, FaEdit, FaTrash, FaTimes, FaToggleOn, FaToggleOff,
  FaCalculator, FaCoins, FaMoneyBillWave, FaUsers, FaChartLine, FaShieldAlt,
  FaKey, FaEye, FaEyeSlash, FaSync, FaCopy, FaCheck
} from 'react-icons/fa';
import api from '../../services/api';
import toast from 'react-hot-toast';

const SarafiStaff = () => {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [generatedPassword, setGeneratedPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedStaffForPassword, setSelectedStaffForPassword] = useState(null);
  const [resetting, setResetting] = useState(false);

  const roleLabels = {
    accountant: { label: 'حسابدار', icon: FaCalculator, color: 'text-blue-500' },
    currency_collector: { label: 'وصول ارزی', icon: FaCoins, color: 'text-orange-500' },
    rial_collector: { label: 'وصول ریالی', icon: FaMoneyBillWave, color: 'text-green-500' },
    manager: { label: 'مدیر', icon: FaUserTie, color: 'text-purple-500' },
    operator: { label: 'اپراتور', icon: FaUsers, color: 'text-cyan-500' },
    sales_manager: { label: 'مدیر فروش', icon: FaChartLine, color: 'text-gold' }
  };

  const allPermissions = [
    { key: 'canViewTrades', label: 'مشاهده معاملات' },
    { key: 'canApproveTrades', label: 'تایید معاملات' },
    { key: 'canRejectTrades', label: 'رد معاملات' },
    { key: 'canViewCustomers', label: 'مشاهده مشتریان' },
    { key: 'canManageCustomers', label: 'مدیریت مشتریان' },
    { key: 'canViewWallets', label: 'مشاهده کیف پول' },
    { key: 'canManageWallets', label: 'مدیریت کیف پول' },
    { key: 'canViewReports', label: 'مشاهده گزارشات' },
    { key: 'canManageSettings', label: 'مدیریت تنظیمات' },
    { key: 'canCollectCurrency', label: 'وصول ارزی' },
    { key: 'canCollectRial', label: 'وصول ریالی' },
    { key: 'canCreateAccountingDoc', label: 'ایجاد سند حسابداری' },
    { key: 'canUploadCurrencyReceipt', label: 'آپلود رسید ارزی' },
    { key: 'canUploadRialReceipt', label: 'آپلود رسید ریالی' },
    { key: 'canCreateOffers', label: 'ایجاد پیشنهاد' },
    { key: 'canEditOffers', label: 'ویرایش پیشنهاد' },
    { key: 'canCancelOffers', label: 'لغو پیشنهاد' },
    { key: 'canBuyCurrency', label: 'خرید ارز' },
    { key: 'canSellCurrency', label: 'فروش ارز' },
    { key: 'canViewOrderBook', label: 'مشاهده دفتر سفارش' },
    { key: 'canViewMarketTape', label: 'مشاهده نوار بازار' },
    { key: 'canManageSpread', label: 'مدیریت اسپرد' },
    { key: 'canSuspendCustomer', label: 'تعلیق مشتری' },
    { key: 'canChangeTier', label: 'تغییر سطح مشتری' },
    { key: 'canViewAuditLogs', label: 'مشاهده لاگ‌ها' }
  ];

  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    password: '',
    mustChangePassword: true,
    role: 'operator',
    permissions: {}
  });

  useEffect(() => {
    fetchStaff();
  }, []);

  const fetchStaff = async () => {
    try {
      const res = await api.get('/sarafi/staff');
      setStaff(res.data.data || []);
    } catch (error) {
      toast.error('خطا در دریافت لیست کارکنان');
    } finally {
      setLoading(false);
    }
  };

  // تولید رمز عبور تصادفی
  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$%';
    let password = '';
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData({ ...formData, password });
    return password;
  };

  // کپی کردن رمز
  const copyPassword = (password) => {
    navigator.clipboard.writeText(password);
    toast.success('رمز عبور کپی شد');
  };

  const handleSubmit = async () => {
    if (!formData.email || !formData.firstName || !formData.lastName) {
      toast.error('اطلاعات کامل نیست');
      return;
    }

    // بررسی رمز عبور برای کارمند جدید
    if (!editingStaff && !formData.password) {
      toast.error('رمز عبور الزامی است');
      return;
    }

    if (!editingStaff && formData.password.length < 6) {
      toast.error('رمز عبور باید حداقل ۶ کاراکتر باشد');
      return;
    }

    try {
      if (editingStaff) {
        await api.put(`/sarafi/staff/${editingStaff._id}`, formData);
        toast.success('کارمند به‌روزرسانی شد');
      } else {
        const res = await api.post('/sarafi/staff', formData);
        toast.success('کارمند اضافه شد');

        // نمایش رمز عبور تولید شده
        if (res.data.data?.temporaryPassword || formData.password) {
          setGeneratedPassword(res.data.data?.temporaryPassword || formData.password);
          setShowPasswordModal(true);
        }
      }
      fetchStaff();
      closeModal();
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در ذخیره');
    }
  };

  // ریست رمز عبور کارمند
  const handleResetPassword = async (staffMember) => {
    setSelectedStaffForPassword(staffMember);
    setResetting(true);

    try {
      const res = await api.post(`/sarafi/staff/${staffMember._id}/reset-password`);
      if (res.data.data?.temporaryPassword) {
        setGeneratedPassword(res.data.data.temporaryPassword);
        setShowPasswordModal(true);
      }
      toast.success('رمز عبور جدید تنظیم شد');
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در ریست رمز عبور');
    } finally {
      setResetting(false);
      setSelectedStaffForPassword(null);
    }
  };

  const handleToggleStatus = async (staffId) => {
    try {
      await api.put(`/sarafi/staff/${staffId}/toggle-status`);
      fetchStaff();
      toast.success('وضعیت تغییر کرد');
    } catch (error) {
      toast.error('خطا در تغییر وضعیت');
    }
  };

  const handleDelete = async (staffId) => {
    if (!confirm('آیا از حذف این کارمند مطمئن هستید؟')) return;
    try {
      await api.delete(`/sarafi/staff/${staffId}`);
      fetchStaff();
      toast.success('کارمند حذف شد');
    } catch (error) {
      toast.error('خطا در حذف');
    }
  };

  const openEditModal = (staffMember) => {
    setEditingStaff(staffMember);
    setFormData({
      email: staffMember.user?.email || '',
      firstName: staffMember.user?.firstName || '',
      lastName: staffMember.user?.lastName || '',
      phone: staffMember.user?.phone || '',
      password: '',
      mustChangePassword: false,
      role: staffMember.role,
      permissions: staffMember.permissions || {}
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingStaff(null);
    setFormData({
      email: '',
      firstName: '',
      lastName: '',
      phone: '',
      password: '',
      mustChangePassword: true,
      role: 'operator',
      permissions: {}
    });
    setShowPassword(false);
  };

  const togglePermission = (key) => {
    setFormData({
      ...formData,
      permissions: {
        ...formData.permissions,
        [key]: !formData.permissions[key]
      }
    });
  };

  const applyRoleDefaults = (role) => {
    const defaults = {
      accountant: {
        canViewTrades: true,
        canViewCustomers: true,
        canViewWallets: true,
        canManageWallets: true,
        canViewReports: true,
        canCreateAccountingDoc: true
      },
      currency_collector: {
        canViewTrades: true,
        canCollectCurrency: true,
        canUploadCurrencyReceipt: true
      },
      rial_collector: {
        canViewTrades: true,
        canCollectRial: true,
        canUploadRialReceipt: true
      },
      manager: {
        canViewTrades: true,
        canApproveTrades: true,
        canRejectTrades: true,
        canViewCustomers: true,
        canManageCustomers: true,
        canViewWallets: true,
        canManageWallets: true,
        canViewReports: true,
        canManageSettings: true,
        canViewAuditLogs: true
      },
      operator: {
        canViewTrades: true,
        canViewCustomers: true
      },
      sales_manager: {
        canViewTrades: true,
        canViewCustomers: true,
        canManageCustomers: true,
        canCreateOffers: true,
        canEditOffers: true,
        canCancelOffers: true,
        canBuyCurrency: true,
        canSellCurrency: true,
        canViewOrderBook: true,
        canViewMarketTape: true,
        canManageSpread: true,
        canSuspendCustomer: true,
        canChangeTier: true
      }
    };

    setFormData({
      ...formData,
      role,
      permissions: defaults[role] || {}
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* هدر */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FaUserTie className="text-gold" />
            مدیریت کارکنان
          </h1>
          <p className="text-dark-400 text-sm mt-1">تعریف کارمندان و تنظیم سطوح دسترسی</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-gold flex items-center gap-2"
        >
          <FaPlus />
          افزودن کارمند
        </button>
      </div>

      {/* لیست کارکنان */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {staff.length === 0 ? (
          <div className="col-span-full card p-8 text-center text-dark-500">
            هیچ کارمندی تعریف نشده است
          </div>
        ) : (
          staff.map((member) => {
            const roleInfo = roleLabels[member.role] || { label: member.role, icon: FaUsers, color: 'text-gray-500' };
            const Icon = roleInfo.icon;

            return (
              <div key={member._id} className={`card p-4 ${!member.isActive ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full bg-dark-800 flex items-center justify-center ${roleInfo.color}`}>
                      <Icon className="text-xl" />
                    </div>
                    <div>
                      <h3 className="text-white font-bold">
                        {member.user?.firstName} {member.user?.lastName}
                      </h3>
                      <p className="text-dark-500 text-sm">{member.user?.email}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleToggleStatus(member._id)}
                    className="text-xl"
                  >
                    {member.isActive ? (
                      <FaToggleOn className="text-green-500" />
                    ) : (
                      <FaToggleOff className="text-dark-500" />
                    )}
                  </button>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-3 py-1 rounded-full text-sm ${roleInfo.color} bg-dark-800`}>
                    {roleInfo.label}
                  </span>
                  {member.user?.phone && (
                    <span className="text-dark-500 text-sm">{member.user.phone}</span>
                  )}
                </div>

                {/* نشانگر الزام تغییر رمز */}
                {member.user?.mustChangePassword && (
                  <div className="mb-3 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg flex items-center gap-2">
                    <FaKey className="text-yellow-500 text-sm" />
                    <span className="text-yellow-500 text-xs">در انتظار تغییر رمز</span>
                  </div>
                )}

                <div className="flex flex-wrap gap-1 mb-4">
                  {Object.entries(member.permissions || {})
                    .filter(([_, v]) => v)
                    .slice(0, 5)
                    .map(([key]) => {
                      const perm = allPermissions.find(p => p.key === key);
                      return (
                        <span key={key} className="px-2 py-0.5 bg-dark-800 text-dark-400 text-xs rounded">
                          {perm?.label || key}
                        </span>
                      );
                    })}
                  {Object.entries(member.permissions || {}).filter(([_, v]) => v).length > 5 && (
                    <span className="px-2 py-0.5 bg-gold/20 text-gold text-xs rounded">
                      +{Object.entries(member.permissions).filter(([_, v]) => v).length - 5} مورد دیگر
                    </span>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => openEditModal(member)}
                    className="flex-1 btn-outline py-2 flex items-center justify-center gap-2"
                  >
                    <FaEdit />
                    ویرایش
                  </button>
                  <button
                    onClick={() => handleResetPassword(member)}
                    disabled={resetting && selectedStaffForPassword?._id === member._id}
                    className="p-2 rounded-lg bg-blue-500/20 text-blue-500 hover:bg-blue-500/30"
                    title="ریست رمز عبور"
                  >
                    {resetting && selectedStaffForPassword?._id === member._id ? (
                      <FaSync className="animate-spin" />
                    ) : (
                      <FaKey />
                    )}
                  </button>
                  <button
                    onClick={() => handleDelete(member._id)}
                    className="p-2 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* مودال افزودن/ویرایش */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                {editingStaff ? 'ویرایش کارمند' : 'افزودن کارمند جدید'}
              </h2>
              <button onClick={closeModal} className="text-dark-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-dark-300 mb-2">نام *</label>
                  <input
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="block text-dark-300 mb-2">نام خانوادگی *</label>
                  <input
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                    className="input w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-dark-300 mb-2">ایمیل *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input w-full"
                    disabled={!!editingStaff}
                  />
                </div>
                <div>
                  <label className="block text-dark-300 mb-2">تلفن</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input w-full"
                  />
                </div>
              </div>

              {/* بخش رمز عبور - فقط برای کارمند جدید */}
              {!editingStaff && (
                <div className="bg-dark-800 rounded-xl p-4 space-y-4">
                  <div className="flex items-center gap-2 text-gold mb-2">
                    <FaKey />
                    <span className="font-bold">تنظیمات رمز عبور</span>
                  </div>

                  <div>
                    <label className="block text-dark-300 mb-2">رمز عبور *</label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="input w-full pl-24"
                        placeholder="حداقل ۶ کاراکتر"
                      />
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="text-dark-400 hover:text-white p-1"
                        >
                          {showPassword ? <FaEyeSlash /> : <FaEye />}
                        </button>
                        <button
                          type="button"
                          onClick={generatePassword}
                          className="text-gold hover:text-gold/80 p-1"
                          title="تولید رمز تصادفی"
                        >
                          <FaSync />
                        </button>
                      </div>
                    </div>
                    <p className="text-dark-500 text-xs mt-1">
                      رمز عبور باید حداقل ۶ کاراکتر باشد
                    </p>
                  </div>

                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.mustChangePassword}
                      onChange={(e) => setFormData({ ...formData, mustChangePassword: e.target.checked })}
                      className="w-5 h-5 rounded"
                    />
                    <div>
                      <span className="text-dark-300">الزام تغییر رمز در اولین ورود</span>
                      <p className="text-dark-500 text-xs">کارمند در اولین ورود باید رمز خود را تغییر دهد</p>
                    </div>
                  </label>
                </div>
              )}

              <div>
                <label className="block text-dark-300 mb-2">نقش</label>
                <select
                  value={formData.role}
                  onChange={(e) => applyRoleDefaults(e.target.value)}
                  className="input w-full"
                >
                  {Object.entries(roleLabels).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-dark-300 mb-2 flex items-center gap-2">
                  <FaShieldAlt />
                  دسترسی‌ها
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 bg-dark-800 rounded-xl p-4">
                  {allPermissions.map(perm => (
                    <label
                      key={perm.key}
                      className="flex items-center gap-2 cursor-pointer hover:bg-dark-700 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={formData.permissions[perm.key] || false}
                        onChange={() => togglePermission(perm.key)}
                        className="w-4 h-4"
                      />
                      <span className="text-sm text-dark-300">{perm.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button onClick={handleSubmit} className="btn-gold flex-1">
                ذخیره
              </button>
              <button onClick={closeModal} className="btn-outline flex-1">
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال نمایش رمز عبور */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <FaCheck className="text-green-500 text-2xl" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">رمز عبور تنظیم شد</h2>
            <p className="text-dark-400 text-sm mb-6">
              لطفاً این رمز عبور را یادداشت کنید. پس از بستن این پنجره امکان مشاهده مجدد وجود ندارد.
            </p>

            <div className="bg-dark-800 rounded-xl p-4 mb-6">
              <p className="text-dark-500 text-sm mb-2">رمز عبور موقت:</p>
              <div className="flex items-center justify-center gap-3">
                <code className="text-2xl font-mono text-gold tracking-wider">
                  {generatedPassword}
                </code>
                <button
                  onClick={() => copyPassword(generatedPassword)}
                  className="p-2 rounded-lg bg-gold/20 text-gold hover:bg-gold/30"
                  title="کپی"
                >
                  <FaCopy />
                </button>
              </div>
            </div>

            <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg mb-6 text-right">
              <p className="text-yellow-500 text-sm">
                ⚠️ کارمند در اولین ورود باید رمز عبور خود را تغییر دهد.
              </p>
            </div>

            <button
              onClick={() => {
                setShowPasswordModal(false);
                setGeneratedPassword('');
              }}
              className="btn-gold w-full"
            >
              متوجه شدم
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SarafiStaff;
