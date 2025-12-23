import { useState, useEffect } from 'react';
import {
  FaPercent, FaSpinner, FaEdit, FaPlus, FaTimes,
  FaSave, FaTrash, FaChartLine, FaCalculator
} from 'react-icons/fa';
import api from '../../services/api';
import { toast } from 'react-hot-toast';
import Select from '../../components/ui/Select';

const AdminCommissions = () => {
  const [rules, setRules] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRule, setSelectedRule] = useState(null);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'percentage',
    currency: '',
    tradeType: 'both',
    tiers: [
      { minAmount: 0, maxAmount: 100000000, rate: 0.5 },
      { minAmount: 100000001, maxAmount: 500000000, rate: 0.4 },
      { minAmount: 500000001, maxAmount: null, rate: 0.3 }
    ],
    flatRate: 0,
    minCommission: 10000,
    maxCommission: 50000000,
    isActive: true
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [rulesRes, currenciesRes, statsRes] = await Promise.all([
        api.get('/admin/commissions'),
        api.get('/admin/currencies'),
        api.get('/admin/commissions/stats')
      ]);
      setRules(rulesRes.data.data || []);
      setCurrencies(currenciesRes.data.data || []);
      setStats(statsRes.data.data);
    } catch (error) {
      console.error('خطا در دریافت اطلاعات:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rule) => {
    setSelectedRule(rule);
    setFormData({
      name: rule.name,
      type: rule.type,
      currency: rule.currency?._id || '',
      tradeType: rule.tradeType,
      tiers: rule.tiers || [{ minAmount: 0, maxAmount: null, rate: 0.5 }],
      flatRate: rule.flatRate || 0,
      minCommission: rule.minCommission || 10000,
      maxCommission: rule.maxCommission || 50000000,
      isActive: rule.isActive !== false
    });
    setIsEditing(true);
  };

  const handleCreate = () => {
    setSelectedRule(null);
    setFormData({
      name: '',
      type: 'percentage',
      currency: '',
      tradeType: 'both',
      tiers: [
        { minAmount: 0, maxAmount: 100000000, rate: 0.5 },
        { minAmount: 100000001, maxAmount: 500000000, rate: 0.4 },
        { minAmount: 500000001, maxAmount: null, rate: 0.3 }
      ],
      flatRate: 0,
      minCommission: 10000,
      maxCommission: 50000000,
      isActive: true
    });
    setIsEditing(true);
  };

  const handleAddTier = () => {
    setFormData({
      ...formData,
      tiers: [...formData.tiers, { minAmount: 0, maxAmount: null, rate: 0 }]
    });
  };

  const handleRemoveTier = (index) => {
    if (formData.tiers.length <= 1) return;
    const newTiers = formData.tiers.filter((_, i) => i !== index);
    setFormData({ ...formData, tiers: newTiers });
  };

  const handleTierChange = (index, field, value) => {
    const newTiers = [...formData.tiers];
    newTiers[index][field] = value === '' ? null : parseFloat(value);
    setFormData({ ...formData, tiers: newTiers });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (selectedRule) {
        await api.put(`/admin/commissions/${selectedRule._id}`, formData);
        toast.success('قانون کارمزد ویرایش شد');
      } else {
        await api.post('/admin/commissions', formData);
        toast.success('قانون کارمزد جدید ایجاد شد');
      }
      setIsEditing(false);
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در ذخیره');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (ruleId) => {
    if (!confirm('آیا از حذف این قانون مطمئن هستید؟')) return;
    try {
      await api.delete(`/admin/commissions/${ruleId}`);
      toast.success('قانون کارمزد حذف شد');
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در حذف');
    }
  };

  const handleToggleActive = async (rule) => {
    try {
      await api.put(`/admin/commissions/${rule._id}`, { isActive: !rule.isActive });
      toast.success(rule.isActive ? 'قانون غیرفعال شد' : 'قانون فعال شد');
      fetchData();
    } catch (error) {
      toast.error('خطا در تغییر وضعیت');
    }
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('fa-IR').format(num || 0);
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
          <FaPercent className="text-gold" />
          مدیریت کارمزد
        </h1>
        <button onClick={handleCreate} className="btn-gold px-4 py-2 flex items-center gap-2">
          <FaPlus /> قانون جدید
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="card p-4 text-center border-l-4 border-gold">
            <FaCalculator className="text-gold text-2xl mx-auto mb-2" />
            <p className="text-dark-400 text-xs mb-1">کارمزد امروز</p>
            <p className="text-xl font-bold text-gold">{formatNumber(stats.todayCommission)} ریال</p>
          </div>
          <div className="card p-4 text-center border-l-4 border-green-500">
            <FaChartLine className="text-green-500 text-2xl mx-auto mb-2" />
            <p className="text-dark-400 text-xs mb-1">کارمزد ماهانه</p>
            <p className="text-xl font-bold text-green-500">{formatNumber(stats.monthlyCommission)} ریال</p>
          </div>
          <div className="card p-4 text-center border-l-4 border-blue-500">
            <FaPercent className="text-blue-500 text-2xl mx-auto mb-2" />
            <p className="text-dark-400 text-xs mb-1">میانگین نرخ</p>
            <p className="text-xl font-bold text-blue-500">{stats.averageRate?.toFixed(2) || 0}%</p>
          </div>
          <div className="card p-4 text-center border-l-4 border-purple-500">
            <p className="text-dark-400 text-xs mb-1">تعداد قوانین فعال</p>
            <p className="text-2xl font-bold text-purple-500">{stats.activeRules || 0}</p>
          </div>
        </div>
      )}

      {/* Rules List */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-dark-700">
          <h2 className="font-bold">قوانین کارمزد</h2>
        </div>

        {rules.length === 0 ? (
          <div className="p-10 text-center text-dark-400">
            قانون کارمزدی تعریف نشده
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-dark-800">
                <tr>
                  <th className="px-4 py-3 text-right text-sm font-medium text-dark-400">نام</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-dark-400">نوع</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-dark-400">ارز</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-dark-400">نوع معامله</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-dark-400">نرخ‌ها</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-dark-400">وضعیت</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-dark-400">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {rules.map((rule) => (
                  <tr key={rule._id} className="hover:bg-dark-800/50">
                    <td className="px-4 py-3 font-medium">{rule.name}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs ${
                        rule.type === 'percentage' ? 'bg-blue-500/20 text-blue-500' : 'bg-green-500/20 text-green-500'
                      }`}>
                        {rule.type === 'percentage' ? 'درصدی' : 'ثابت'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {rule.currency ? (
                        <span className="flex items-center gap-2">
                          <span>{rule.currency.symbol}</span>
                          {rule.currency.nameFa}
                        </span>
                      ) : (
                        <span className="text-dark-400">همه ارزها</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {rule.tradeType === 'buy' ? 'خرید' :
                       rule.tradeType === 'sell' ? 'فروش' : 'همه'}
                    </td>
                    <td className="px-4 py-3">
                      {rule.type === 'percentage' && rule.tiers ? (
                        <div className="text-xs space-y-1">
                          {rule.tiers.slice(0, 2).map((tier, idx) => (
                            <div key={idx} className="text-dark-400">
                              {formatNumber(tier.minAmount)} - {tier.maxAmount ? formatNumber(tier.maxAmount) : '∞'}: <span className="text-gold">{tier.rate}%</span>
                            </div>
                          ))}
                          {rule.tiers.length > 2 && (
                            <div className="text-dark-500">+{rule.tiers.length - 2} نرخ دیگر</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gold font-bold">{formatNumber(rule.flatRate)} ریال</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggleActive(rule)}
                        className={`px-2 py-1 rounded-full text-xs ${
                          rule.isActive ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
                        }`}
                      >
                        {rule.isActive ? 'فعال' : 'غیرفعال'}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(rule)}
                          className="text-gold hover:text-gold-400"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(rule._id)}
                          className="text-red-500 hover:text-red-400"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Commission Calculator */}
      <div className="card p-6">
        <h2 className="font-bold mb-4 flex items-center gap-2">
          <FaCalculator className="text-gold" />
          محاسبه‌گر کارمزد
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-dark-400 text-sm mb-1">مبلغ معامله (ریال)</label>
            <input type="number" className="input-field w-full" placeholder="100,000,000" />
          </div>
          <div>
            <label className="block text-dark-400 text-sm mb-1">ارز</label>
            <Select
              placeholder="انتخاب ارز"
              options={[
                { value: '', label: 'انتخاب ارز' },
                ...currencies.map(c => ({ value: c._id, label: c.nameFa }))
              ]}
            />
          </div>
          <div>
            <label className="block text-dark-400 text-sm mb-1">نوع معامله</label>
            <Select
              options={[
                { value: 'buy', label: 'خرید' },
                { value: 'sell', label: 'فروش' }
              ]}
            />
          </div>
        </div>
        <div className="mt-4 p-4 bg-gold/10 rounded-lg text-center">
          <p className="text-dark-400 text-sm">کارمزد تخمینی</p>
          <p className="text-2xl font-bold text-gold">محاسبه کنید</p>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <FaPercent className="text-gold" />
                {selectedRule ? 'ویرایش قانون کارمزد' : 'ایجاد قانون جدید'}
              </h2>
              <button onClick={() => setIsEditing(false)} className="text-dark-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-dark-400 text-sm mb-1">نام قانون</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field w-full"
                  placeholder="مثال: کارمزد دلار"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-dark-400 text-sm mb-1">نوع کارمزد</label>
                  <Select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    options={[
                      { value: 'percentage', label: 'درصدی (پلکانی)' },
                      { value: 'flat', label: 'ثابت' }
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-dark-400 text-sm mb-1">ارز</label>
                  <Select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    placeholder="همه ارزها"
                    options={[
                      { value: '', label: 'همه ارزها' },
                      ...currencies.map(c => ({ value: c._id, label: c.nameFa }))
                    ]}
                  />
                </div>
              </div>

              <div>
                <label className="block text-dark-400 text-sm mb-1">نوع معامله</label>
                <Select
                  value={formData.tradeType}
                  onChange={(e) => setFormData({ ...formData, tradeType: e.target.value })}
                  options={[
                    { value: 'both', label: 'همه معاملات' },
                    { value: 'buy', label: 'فقط خرید' },
                    { value: 'sell', label: 'فقط فروش' }
                  ]}
                />
              </div>

              {formData.type === 'percentage' && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-dark-400 text-sm">نرخ‌های پلکانی</label>
                    <button
                      onClick={handleAddTier}
                      className="text-gold text-sm flex items-center gap-1 hover:text-gold-400"
                    >
                      <FaPlus className="text-xs" /> افزودن پله
                    </button>
                  </div>
                  <div className="space-y-2">
                    {formData.tiers.map((tier, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 bg-dark-800 rounded-lg">
                        <div className="flex-1 grid grid-cols-3 gap-2">
                          <input
                            type="number"
                            value={tier.minAmount}
                            onChange={(e) => handleTierChange(index, 'minAmount', e.target.value)}
                            className="input-field text-sm"
                            placeholder="از مبلغ"
                          />
                          <input
                            type="number"
                            value={tier.maxAmount || ''}
                            onChange={(e) => handleTierChange(index, 'maxAmount', e.target.value)}
                            className="input-field text-sm"
                            placeholder="تا مبلغ (خالی=∞)"
                          />
                          <input
                            type="number"
                            step="0.01"
                            value={tier.rate}
                            onChange={(e) => handleTierChange(index, 'rate', e.target.value)}
                            className="input-field text-sm"
                            placeholder="نرخ %"
                          />
                        </div>
                        {formData.tiers.length > 1 && (
                          <button
                            onClick={() => handleRemoveTier(index)}
                            className="text-red-500 hover:text-red-400"
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {formData.type === 'flat' && (
                <div>
                  <label className="block text-dark-400 text-sm mb-1">مبلغ ثابت (ریال)</label>
                  <input
                    type="number"
                    value={formData.flatRate}
                    onChange={(e) => setFormData({ ...formData, flatRate: parseInt(e.target.value) || 0 })}
                    className="input-field w-full"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-dark-400 text-sm mb-1">حداقل کارمزد (ریال)</label>
                  <input
                    type="number"
                    value={formData.minCommission}
                    onChange={(e) => setFormData({ ...formData, minCommission: parseInt(e.target.value) || 0 })}
                    className="input-field w-full"
                  />
                </div>
                <div>
                  <label className="block text-dark-400 text-sm mb-1">حداکثر کارمزد (ریال)</label>
                  <input
                    type="number"
                    value={formData.maxCommission}
                    onChange={(e) => setFormData({ ...formData, maxCommission: parseInt(e.target.value) || 0 })}
                    className="input-field w-full"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="form-checkbox text-gold"
                />
                <span>قانون فعال باشد</span>
              </label>
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

export default AdminCommissions;
