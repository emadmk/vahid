import { useState, useEffect } from 'react';
import {
  FaMedal, FaSpinner, FaEdit, FaPlus, FaTimes,
  FaStar, FaUsers, FaPercent, FaSave, FaTrash
} from 'react-icons/fa';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

const tierColors = {
  A: { bg: 'bg-gold/20', text: 'text-gold', border: 'border-gold' },
  B: { bg: 'bg-blue-500/20', text: 'text-blue-500', border: 'border-blue-500' },
  C: { bg: 'bg-purple-500/20', text: 'text-purple-500', border: 'border-purple-500' },
  new: { bg: 'bg-gray-500/20', text: 'text-gray-400', border: 'border-gray-500' }
};

const AdminCustomerTiers = () => {
  const [tiers, setTiers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [selectedTier, setSelectedTier] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    minScore: 0,
    maxScore: null,
    benefits: {
      commissionDiscount: 0,
      prioritySupport: false,
      dedicatedManager: false,
      specialRates: false
    },
    color: '#d4af37',
    description: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tiersRes, customersRes, statsRes] = await Promise.all([
        api.get('/admin/customer-tiers'),
        api.get('/admin/users', { params: { role: 'user', limit: 100 } }),
        api.get('/admin/customer-tiers/stats')
      ]);
      setTiers(tiersRes.data.data || []);
      setCustomers(customersRes.data.data || []);
      setStats(statsRes.data.data);
    } catch (error) {
      console.error('خطا در دریافت اطلاعات:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (tier) => {
    setSelectedTier(tier);
    setFormData({
      name: tier.name,
      code: tier.code,
      minScore: tier.minScore,
      maxScore: tier.maxScore,
      benefits: tier.benefits || {
        commissionDiscount: 0,
        prioritySupport: false,
        dedicatedManager: false,
        specialRates: false
      },
      color: tier.color || '#d4af37',
      description: tier.description || ''
    });
    setIsEditing(true);
  };

  const handleCreate = () => {
    setSelectedTier(null);
    setFormData({
      name: '',
      code: '',
      minScore: 0,
      maxScore: null,
      benefits: {
        commissionDiscount: 0,
        prioritySupport: false,
        dedicatedManager: false,
        specialRates: false
      },
      color: '#d4af37',
      description: ''
    });
    setIsEditing(true);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (selectedTier) {
        await api.put(`/admin/customer-tiers/${selectedTier._id}`, formData);
        toast.success('رده با موفقیت ویرایش شد');
      } else {
        await api.post('/admin/customer-tiers', formData);
        toast.success('رده جدید ایجاد شد');
      }
      setIsEditing(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در ذخیره');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (tierId) => {
    if (!confirm('آیا از حذف این رده مطمئن هستید؟')) return;
    try {
      await api.delete(`/admin/customer-tiers/${tierId}`);
      toast.success('رده حذف شد');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در حذف');
    }
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('fa-IR').format(num || 0);
  };

  const getCustomersInTier = (tierCode) => {
    return customers.filter(c => c.tier === tierCode).length;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <FaSpinner className="animate-spin text-gold text-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <FaMedal className="text-gold" />
          مدیریت رده‌بندی مشتریان
        </h1>
        <button onClick={handleCreate} className="btn-gold px-4 py-2 flex items-center gap-2">
          <FaPlus /> رده جدید
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4 text-center border-l-4 border-gold">
            <FaStar className="text-gold text-2xl mx-auto mb-2" />
            <p className="text-dark-400 text-xs mb-1">رده A</p>
            <p className="text-2xl font-bold text-gold">{stats.tierA || 0}</p>
          </div>
          <div className="card p-4 text-center border-l-4 border-blue-500">
            <FaStar className="text-blue-500 text-2xl mx-auto mb-2" />
            <p className="text-dark-400 text-xs mb-1">رده B</p>
            <p className="text-2xl font-bold text-blue-500">{stats.tierB || 0}</p>
          </div>
          <div className="card p-4 text-center border-l-4 border-purple-500">
            <FaStar className="text-purple-500 text-2xl mx-auto mb-2" />
            <p className="text-dark-400 text-xs mb-1">رده C</p>
            <p className="text-2xl font-bold text-purple-500">{stats.tierC || 0}</p>
          </div>
          <div className="card p-4 text-center border-l-4 border-gray-500">
            <FaUsers className="text-gray-400 text-2xl mx-auto mb-2" />
            <p className="text-dark-400 text-xs mb-1">مشتریان جدید</p>
            <p className="text-2xl font-bold">{stats.tierNew || 0}</p>
          </div>
        </div>
      )}

      {/* Tiers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {['A', 'B', 'C', 'new'].map((tierCode) => {
          const tier = tiers.find(t => t.code === tierCode) || {
            code: tierCode,
            name: tierCode === 'new' ? 'مشتری جدید' : `رده ${tierCode}`,
            minScore: 0,
            benefits: { commissionDiscount: 0 }
          };
          const colors = tierColors[tierCode];
          const customerCount = getCustomersInTier(tierCode);

          return (
            <div key={tierCode} className={`card p-6 border-t-4 ${colors.border}`}>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-full ${colors.bg} flex items-center justify-center ${colors.text}`}>
                    <FaMedal className="text-xl" />
                  </div>
                  <div>
                    <h3 className={`font-bold ${colors.text}`}>{tier.name}</h3>
                    <p className="text-dark-400 text-xs">{customerCount} مشتری</p>
                  </div>
                </div>
                {tier._id && (
                  <button onClick={() => handleEdit(tier)} className="text-gold hover:text-gold-400">
                    <FaEdit />
                  </button>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-400">حداقل امتیاز:</span>
                  <span className="font-bold">{formatNumber(tier.minScore)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-dark-400">تخفیف کارمزد:</span>
                  <span className={`font-bold ${colors.text}`}>
                    {tier.benefits?.commissionDiscount || 0}%
                  </span>
                </div>
                {tier.benefits?.prioritySupport && (
                  <div className="flex items-center gap-2 text-sm text-green-500">
                    <FaStar className="text-xs" />
                    پشتیبانی ویژه
                  </div>
                )}
                {tier.benefits?.dedicatedManager && (
                  <div className="flex items-center gap-2 text-sm text-green-500">
                    <FaStar className="text-xs" />
                    مدیر اختصاصی
                  </div>
                )}
                {tier.benefits?.specialRates && (
                  <div className="flex items-center gap-2 text-sm text-green-500">
                    <FaStar className="text-xs" />
                    نرخ ویژه
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Customer List by Tier */}
      <div className="card p-6">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <FaUsers className="text-gold" />
          لیست مشتریان بر اساس رده
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-800">
              <tr>
                <th className="px-4 py-3 text-right text-sm font-medium text-dark-400">نام</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-dark-400">شماره تماس</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-dark-400">امتیاز</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-dark-400">رده</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-dark-400">حجم معاملات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-dark-700">
              {customers.slice(0, 20).map((customer) => {
                const colors = tierColors[customer.tier] || tierColors.new;
                return (
                  <tr key={customer._id} className="hover:bg-dark-800/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gold/20 flex items-center justify-center text-gold text-sm">
                          {customer.firstName?.[0]}
                        </div>
                        <span>{customer.firstName} {customer.lastName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-mono">{customer.phone}</td>
                    <td className="px-4 py-3">
                      <span className="font-bold">{formatNumber(customer.score || 0)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-3 py-1 rounded-full text-xs ${colors.bg} ${colors.text}`}>
                        {customer.tier === 'new' ? 'جدید' : `رده ${customer.tier}`}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {formatNumber(customer.financialInfo?.totalTradeVolume || 0)} ریال
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FaMedal className="text-gold" />
                {selectedTier ? 'ویرایش رده' : 'ایجاد رده جدید'}
              </h2>
              <button onClick={() => setIsEditing(false)} className="text-dark-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-dark-400 text-sm mb-1">نام رده</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field w-full"
                    placeholder="مثال: رده طلایی"
                  />
                </div>
                <div>
                  <label className="block text-dark-400 text-sm mb-1">کد رده</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="input-field w-full"
                    placeholder="A, B, C"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-dark-400 text-sm mb-1">حداقل امتیاز</label>
                  <input
                    type="number"
                    value={formData.minScore}
                    onChange={(e) => setFormData({ ...formData, minScore: parseInt(e.target.value) || 0 })}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-dark-400 text-sm mb-1">حداکثر امتیاز (خالی = بدون محدودیت)</label>
                  <input
                    type="number"
                    value={formData.maxScore || ''}
                    onChange={(e) => setFormData({ ...formData, maxScore: e.target.value ? parseInt(e.target.value) : null })}
                    className="input-field w-full"
                  />
                </div>
              </div>

              <div>
                <label className="block text-dark-400 text-sm mb-1">تخفیف کارمزد (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.benefits.commissionDiscount}
                  onChange={(e) => setFormData({
                    ...formData,
                    benefits: { ...formData.benefits, commissionDiscount: parseInt(e.target.value) || 0 }
                  })}
                  className="input-field w-full"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-dark-400 text-sm">مزایا</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.benefits.prioritySupport}
                    onChange={(e) => setFormData({
                      ...formData,
                      benefits: { ...formData.benefits, prioritySupport: e.target.checked }
                    })}
                    className="form-checkbox text-gold"
                  />
                  <span>پشتیبانی ویژه</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.benefits.dedicatedManager}
                    onChange={(e) => setFormData({
                      ...formData,
                      benefits: { ...formData.benefits, dedicatedManager: e.target.checked }
                    })}
                    className="form-checkbox text-gold"
                  />
                  <span>مدیر اختصاصی</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.benefits.specialRates}
                    onChange={(e) => setFormData({
                      ...formData,
                      benefits: { ...formData.benefits, specialRates: e.target.checked }
                    })}
                    className="form-checkbox text-gold"
                  />
                  <span>نرخ ویژه</span>
                </label>
              </div>

              <div>
                <label className="block text-dark-400 text-sm mb-1">توضیحات</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field w-full"
                  rows={3}
                  placeholder="توضیحات رده..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setIsEditing(false)} className="btn-outline flex-1">
                انصراف
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-gold flex-1 flex items-center justify-center gap-2">
                {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
                ذخیره
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCustomerTiers;
