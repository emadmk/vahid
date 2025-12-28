import { useState, useEffect } from 'react';
import { FaEdit, FaTrash, FaHistory, FaSpinner, FaSave, FaTimes } from 'react-icons/fa';
import api from '../../services/api';
import toast from 'react-hot-toast';
import jalaliMoment from 'jalali-moment';

const SarafiRates = () => {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRate, setEditingRate] = useState(null);
  const [editData, setEditData] = useState({ buyRate: '', sellRate: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [historyCurrency, setHistoryCurrency] = useState(null);

  useEffect(() => {
    fetchRates();
  }, []);

  const fetchRates = async () => {
    setLoading(true);
    try {
      const res = await api.get('/sarafi-rates');
      setRates(res.data.data);
    } catch (e) {
      toast.error('خطا در دریافت نرخ‌ها');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rate) => {
    setEditingRate(rate.currency._id);
    setEditData({
      buyRate: rate.buyRate,
      sellRate: rate.sellRate,
      notes: ''
    });
  };

  const handleSave = async (currencyId) => {
    if (!editData.buyRate || !editData.sellRate) {
      toast.error('نرخ خرید و فروش الزامی است');
      return;
    }

    setSaving(true);
    try {
      await api.post(`/sarafi-rates/${currencyId}`, editData);
      toast.success('نرخ با موفقیت ذخیره شد');
      setEditingRate(null);
      fetchRates();
    } catch (e) {
      toast.error(e.response?.data?.message || 'خطا در ذخیره نرخ');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (currencyId) => {
    if (!confirm('آیا از حذف نرخ سفارشی و برگشت به نرخ پیش‌فرض مطمئن هستید؟')) return;

    try {
      await api.delete(`/sarafi-rates/${currencyId}`);
      toast.success('نرخ سفارشی حذف شد');
      fetchRates();
    } catch (e) {
      toast.error(e.response?.data?.message || 'خطا');
    }
  };

  const fetchHistory = async (currencyId, currencyName) => {
    try {
      const res = await api.get(`/sarafi-rates/history/${currencyId}`);
      setHistoryData(res.data.data);
      setHistoryCurrency(currencyName);
      setShowHistory(true);
    } catch (e) {
      toast.error('خطا در دریافت تاریخچه');
    }
  };

  const formatNumber = (num) => {
    return num?.toLocaleString('fa-IR') || '-';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">مدیریت نرخ‌ها</h1>
      </div>

      <div className="card-dark mb-4">
        <p className="text-dark-400 text-sm">
          در این بخش می‌توانید نرخ‌های سفارشی خود را برای هر ارز تعیین کنید. اگر نرخ سفارشی تعیین نکنید، نرخ پیش‌فرض سیستم استفاده می‌شود.
        </p>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="loading-spinner"></div>
        </div>
      ) : (
        <div className="card-dark overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-dark-400 text-sm border-b border-dark-700">
                <th className="text-right py-3 px-4">ارز</th>
                <th className="text-right py-3 px-4">نرخ خرید</th>
                <th className="text-right py-3 px-4">نرخ فروش</th>
                <th className="text-center py-3 px-4">سفارشی</th>
                <th className="text-center py-3 px-4">آخرین به‌روزرسانی</th>
                <th className="text-center py-3 px-4">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((rate) => (
                <tr key={rate.currency._id} className="border-b border-dark-700/50 hover:bg-dark-700/30">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{rate.currency.symbol || rate.currency.icon}</span>
                      <div>
                        <p className="text-white font-medium">{rate.currency.nameFa}</p>
                        <p className="text-dark-500 text-xs">{rate.currency.code}</p>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-4">
                    {editingRate === rate.currency._id ? (
                      <input
                        type="number"
                        className="input-dark w-32"
                        value={editData.buyRate}
                        onChange={(e) => setEditData({...editData, buyRate: e.target.value})}
                      />
                    ) : (
                      <span className="text-green-500 font-medium">{formatNumber(rate.buyRate)}</span>
                    )}
                  </td>

                  <td className="py-4 px-4">
                    {editingRate === rate.currency._id ? (
                      <input
                        type="number"
                        className="input-dark w-32"
                        value={editData.sellRate}
                        onChange={(e) => setEditData({...editData, sellRate: e.target.value})}
                      />
                    ) : (
                      <span className="text-red-500 font-medium">{formatNumber(rate.sellRate)}</span>
                    )}
                  </td>

                  <td className="py-4 px-4 text-center">
                    {rate.isCustom ? (
                      <span className="badge badge-success">سفارشی</span>
                    ) : (
                      <span className="badge badge-info">پیش‌فرض</span>
                    )}
                  </td>

                  <td className="py-4 px-4 text-center text-dark-400 text-sm">
                    {rate.lastUpdate ? jalaliMoment(rate.lastUpdate).format('jYYYY/jMM/jDD HH:mm') : '-'}
                  </td>

                  <td className="py-4 px-4">
                    <div className="flex items-center justify-center gap-2">
                      {editingRate === rate.currency._id ? (
                        <>
                          <button
                            onClick={() => handleSave(rate.currency._id)}
                            disabled={saving}
                            className="w-8 h-8 rounded-lg bg-green-500/10 text-green-500 flex items-center justify-center hover:bg-green-500/20"
                            title="ذخیره"
                          >
                            {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
                          </button>
                          <button
                            onClick={() => setEditingRate(null)}
                            className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20"
                            title="انصراف"
                          >
                            <FaTimes />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(rate)}
                            className="w-8 h-8 rounded-lg bg-gold-500/10 text-gold-500 flex items-center justify-center hover:bg-gold-500/20"
                            title="ویرایش"
                          >
                            <FaEdit />
                          </button>
                          <button
                            onClick={() => fetchHistory(rate.currency._id, rate.currency.nameFa)}
                            className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-500 flex items-center justify-center hover:bg-blue-500/20"
                            title="تاریخچه"
                          >
                            <FaHistory />
                          </button>
                          {rate.isCustom && (
                            <button
                              onClick={() => handleDelete(rate.currency._id)}
                              className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 flex items-center justify-center hover:bg-red-500/20"
                              title="حذف نرخ سفارشی"
                            >
                              <FaTrash />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* مودال تاریخچه */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card-dark w-full max-w-2xl max-h-[80vh] overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">تاریخچه تغییرات {historyCurrency}</h2>
              <button onClick={() => setShowHistory(false)} className="text-dark-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[60vh]">
              {historyData.length === 0 ? (
                <p className="text-dark-500 text-center py-8">تاریخچه‌ای یافت نشد</p>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="text-dark-400 text-sm border-b border-dark-700">
                      <th className="text-right py-2 px-3">تاریخ</th>
                      <th className="text-right py-2 px-3">نرخ قبلی</th>
                      <th className="text-right py-2 px-3">نرخ جدید</th>
                      <th className="text-right py-2 px-3">توسط</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historyData.map((item, index) => (
                      <tr key={index} className="border-b border-dark-700/50 text-sm">
                        <td className="py-2 px-3 text-dark-400">
                          {jalaliMoment(item.createdAt).format('jYYYY/jMM/jDD HH:mm')}
                        </td>
                        <td className="py-2 px-3">
                          <div className="text-dark-500">
                            <span className="text-green-500/70">{formatNumber(item.previousBuyRate)}</span>
                            {' / '}
                            <span className="text-red-500/70">{formatNumber(item.previousSellRate)}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3">
                          <div>
                            <span className="text-green-500">{formatNumber(item.newBuyRate)}</span>
                            {' / '}
                            <span className="text-red-500">{formatNumber(item.newSellRate)}</span>
                          </div>
                        </td>
                        <td className="py-2 px-3 text-dark-400">
                          {item.changedBy?.firstName} {item.changedBy?.lastName}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SarafiRates;
