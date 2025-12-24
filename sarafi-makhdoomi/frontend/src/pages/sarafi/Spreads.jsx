import { useState, useEffect } from 'react';
import { FaPercent, FaCoins, FaEdit, FaSave, FaTimes, FaHistory, FaToggleOn, FaToggleOff, FaCalculator } from 'react-icons/fa';
import api from '../../services/api';
import toast from 'react-hot-toast';

const SarafiSpreads = () => {
  const [spreads, setSpreads] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [showPriceCalc, setShowPriceCalc] = useState(false);
  const [priceCalcData, setPriceCalcData] = useState({
    currencyId: '',
    side: 'buy',
    amount: 1,
    customerTier: 'new'
  });
  const [calculatedPrice, setCalculatedPrice] = useState(null);

  const [newSpread, setNewSpread] = useState({
    currencyId: '',
    spreadType: 'percentage',
    buySpread: 0,
    sellSpread: 0,
    useTierSpread: false,
    tierSpread: {
      new: { buySpread: 0, sellSpread: 0 },
      C: { buySpread: 0, sellSpread: 0 },
      B: { buySpread: 0, sellSpread: 0 },
      A: { buySpread: 0, sellSpread: 0 }
    },
    minSpread: 0,
    maxSpread: 0,
    notes: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [spreadsRes, currenciesRes] = await Promise.all([
        api.get('/spreads'),
        api.get('/public/currencies')
      ]);
      setSpreads(spreadsRes.data.data || []);
      setCurrencies(currenciesRes.data.data || []);
    } catch (error) {
      toast.error('خطا در دریافت اطلاعات');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSpread = async () => {
    if (!newSpread.currencyId) {
      toast.error('لطفا ارز را انتخاب کنید');
      return;
    }
    try {
      const res = await api.post('/spreads', newSpread);
      setSpreads([...spreads, res.data.data]);
      setShowAddModal(false);
      setNewSpread({
        currencyId: '',
        spreadType: 'percentage',
        buySpread: 0,
        sellSpread: 0,
        useTierSpread: false,
        tierSpread: {
          new: { buySpread: 0, sellSpread: 0 },
          C: { buySpread: 0, sellSpread: 0 },
          B: { buySpread: 0, sellSpread: 0 },
          A: { buySpread: 0, sellSpread: 0 }
        },
        minSpread: 0,
        maxSpread: 0,
        notes: ''
      });
      toast.success('اسپرد ایجاد شد');
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در ایجاد اسپرد');
    }
  };

  const handleQuickUpdate = async (id, buySpread, sellSpread) => {
    try {
      const res = await api.put(`/spreads/${id}/quick-update`, { buySpread, sellSpread });
      setSpreads(spreads.map(s => s._id === id ? res.data.data : s));
      setEditingId(null);
      toast.success('اسپرد به‌روز شد');
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در به‌روزرسانی');
    }
  };

  const handleToggle = async (id) => {
    try {
      const res = await api.put(`/spreads/${id}/toggle`);
      setSpreads(spreads.map(s => s._id === id ? res.data.data : s));
      toast.success(res.data.message);
    } catch (error) {
      toast.error('خطا در تغییر وضعیت');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('آیا از حذف این اسپرد مطمئن هستید؟')) return;
    try {
      await api.delete(`/spreads/${id}`);
      setSpreads(spreads.filter(s => s._id !== id));
      toast.success('اسپرد حذف شد');
    } catch (error) {
      toast.error('خطا در حذف');
    }
  };

  const fetchHistory = async (id) => {
    try {
      const res = await api.get(`/spreads/${id}/history`);
      setHistoryData(res.data.data);
      setShowHistoryModal(id);
    } catch (error) {
      toast.error('خطا در دریافت تاریخچه');
    }
  };

  const calculatePrice = async () => {
    if (!priceCalcData.currencyId) {
      toast.error('ارز را انتخاب کنید');
      return;
    }
    try {
      const res = await api.post('/spreads/calculate-price', priceCalcData);
      setCalculatedPrice(res.data.data);
    } catch (error) {
      toast.error('خطا در محاسبه');
    }
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('fa-IR').format(num || 0);
  };

  const startEdit = (spread) => {
    setEditingId(spread._id);
    setEditForm({
      buySpread: spread.buySpread,
      sellSpread: spread.sellSpread
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
            <FaPercent className="text-gold" />
            مدیریت اسپرد
          </h1>
          <p className="text-dark-400 text-sm mt-1">تنظیم اختلاف قیمت خرید و فروش ارزها</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowPriceCalc(true)}
            className="btn-outline flex items-center gap-2"
          >
            <FaCalculator />
            محاسبه قیمت
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="btn-gold flex items-center gap-2"
          >
            <FaCoins />
            افزودن اسپرد جدید
          </button>
        </div>
      </div>

      {/* لیست اسپردها */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-800">
              <tr>
                <th className="text-right p-4 text-dark-400">ارز</th>
                <th className="text-right p-4 text-dark-400">نوع</th>
                <th className="text-right p-4 text-dark-400">اسپرد خرید</th>
                <th className="text-right p-4 text-dark-400">اسپرد فروش</th>
                <th className="text-right p-4 text-dark-400">Tier مشتری</th>
                <th className="text-center p-4 text-dark-400">وضعیت</th>
                <th className="text-center p-4 text-dark-400">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {spreads.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center p-8 text-dark-500">
                    هیچ اسپردی تعریف نشده است
                  </td>
                </tr>
              ) : (
                spreads.map((spread) => (
                  <tr key={spread._id} className="border-t border-dark-800 hover:bg-dark-800/50">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{spread.currency?.symbol}</span>
                        <div>
                          <p className="text-white font-medium">{spread.currency?.nameFa}</p>
                          <p className="text-dark-500 text-xs">{spread.currency?.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        spread.spreadType === 'percentage' ? 'bg-blue-500/20 text-blue-500' : 'bg-purple-500/20 text-purple-500'
                      }`}>
                        {spread.spreadType === 'percentage' ? 'درصدی' : 'ثابت'}
                      </span>
                    </td>
                    <td className="p-4">
                      {editingId === spread._id ? (
                        <input
                          type="number"
                          value={editForm.buySpread}
                          onChange={(e) => setEditForm({ ...editForm, buySpread: e.target.value })}
                          className="input w-24"
                          step="0.01"
                        />
                      ) : (
                        <span className="text-green-500 font-medium">
                          {spread.spreadType === 'percentage' ? `${spread.buySpread}%` : formatNumber(spread.buySpread)}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {editingId === spread._id ? (
                        <input
                          type="number"
                          value={editForm.sellSpread}
                          onChange={(e) => setEditForm({ ...editForm, sellSpread: e.target.value })}
                          className="input w-24"
                          step="0.01"
                        />
                      ) : (
                        <span className="text-red-500 font-medium">
                          {spread.spreadType === 'percentage' ? `${spread.sellSpread}%` : formatNumber(spread.sellSpread)}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {spread.useTierSpread ? (
                        <span className="text-gold text-xs">فعال</span>
                      ) : (
                        <span className="text-dark-500 text-xs">غیرفعال</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      <button onClick={() => handleToggle(spread._id)} className="text-xl">
                        {spread.isActive ? (
                          <FaToggleOn className="text-green-500" />
                        ) : (
                          <FaToggleOff className="text-dark-500" />
                        )}
                      </button>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        {editingId === spread._id ? (
                          <>
                            <button
                              onClick={() => handleQuickUpdate(spread._id, editForm.buySpread, editForm.sellSpread)}
                              className="p-2 rounded-lg bg-green-500/20 text-green-500 hover:bg-green-500/30"
                            >
                              <FaSave />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-2 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30"
                            >
                              <FaTimes />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => startEdit(spread)}
                              className="p-2 rounded-lg bg-blue-500/20 text-blue-500 hover:bg-blue-500/30"
                              title="ویرایش سریع"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => fetchHistory(spread._id)}
                              className="p-2 rounded-lg bg-purple-500/20 text-purple-500 hover:bg-purple-500/30"
                              title="تاریخچه"
                            >
                              <FaHistory />
                            </button>
                            <button
                              onClick={() => handleDelete(spread._id)}
                              className="p-2 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30"
                              title="حذف"
                            >
                              <FaTimes />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* مودال افزودن اسپرد */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">افزودن اسپرد جدید</h2>
              <button onClick={() => setShowAddModal(false)} className="text-dark-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-dark-300 mb-2">ارز</label>
                <select
                  value={newSpread.currencyId}
                  onChange={(e) => setNewSpread({ ...newSpread, currencyId: e.target.value })}
                  className="input w-full"
                >
                  <option value="">انتخاب کنید</option>
                  {currencies.filter(c => !spreads.find(s => s.currency?._id === c._id)).map(c => (
                    <option key={c._id} value={c._id}>{c.nameFa} ({c.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-dark-300 mb-2">نوع اسپرد</label>
                <select
                  value={newSpread.spreadType}
                  onChange={(e) => setNewSpread({ ...newSpread, spreadType: e.target.value })}
                  className="input w-full"
                >
                  <option value="percentage">درصدی</option>
                  <option value="fixed">ثابت (ریال)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-dark-300 mb-2">
                    اسپرد خرید {newSpread.spreadType === 'percentage' ? '(%)' : '(ریال)'}
                  </label>
                  <input
                    type="number"
                    value={newSpread.buySpread}
                    onChange={(e) => setNewSpread({ ...newSpread, buySpread: parseFloat(e.target.value) || 0 })}
                    className="input w-full"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-dark-300 mb-2">
                    اسپرد فروش {newSpread.spreadType === 'percentage' ? '(%)' : '(ریال)'}
                  </label>
                  <input
                    type="number"
                    value={newSpread.sellSpread}
                    onChange={(e) => setNewSpread({ ...newSpread, sellSpread: parseFloat(e.target.value) || 0 })}
                    className="input w-full"
                    step="0.01"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="useTierSpread"
                  checked={newSpread.useTierSpread}
                  onChange={(e) => setNewSpread({ ...newSpread, useTierSpread: e.target.checked })}
                  className="w-4 h-4"
                />
                <label htmlFor="useTierSpread" className="text-dark-300">اسپرد بر اساس سطح مشتری</label>
              </div>

              {newSpread.useTierSpread && (
                <div className="bg-dark-800 rounded-xl p-4 space-y-3">
                  {['new', 'C', 'B', 'A'].map(tier => (
                    <div key={tier} className="flex items-center gap-4">
                      <span className="text-dark-300 w-20">
                        {tier === 'new' ? 'جدید' : tier === 'C' ? 'برنزی' : tier === 'B' ? 'نقره‌ای' : 'طلایی'}
                      </span>
                      <input
                        type="number"
                        placeholder="خرید"
                        value={newSpread.tierSpread[tier].buySpread}
                        onChange={(e) => setNewSpread({
                          ...newSpread,
                          tierSpread: {
                            ...newSpread.tierSpread,
                            [tier]: { ...newSpread.tierSpread[tier], buySpread: parseFloat(e.target.value) || 0 }
                          }
                        })}
                        className="input flex-1"
                        step="0.01"
                      />
                      <input
                        type="number"
                        placeholder="فروش"
                        value={newSpread.tierSpread[tier].sellSpread}
                        onChange={(e) => setNewSpread({
                          ...newSpread,
                          tierSpread: {
                            ...newSpread.tierSpread,
                            [tier]: { ...newSpread.tierSpread[tier], sellSpread: parseFloat(e.target.value) || 0 }
                          }
                        })}
                        className="input flex-1"
                        step="0.01"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div>
                <label className="block text-dark-300 mb-2">یادداشت</label>
                <textarea
                  value={newSpread.notes}
                  onChange={(e) => setNewSpread({ ...newSpread, notes: e.target.value })}
                  className="input w-full"
                  rows="2"
                />
              </div>
            </div>

            <div className="flex gap-4 mt-6">
              <button onClick={handleAddSpread} className="btn-gold flex-1">
                ذخیره
              </button>
              <button onClick={() => setShowAddModal(false)} className="btn-outline flex-1">
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* مودال تاریخچه */}
      {showHistoryModal && historyData && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FaHistory className="text-gold" />
                تاریخچه تغییرات
              </h2>
              <button onClick={() => setShowHistoryModal(null)} className="text-dark-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4">
              {historyData.auditLogs?.length > 0 ? (
                historyData.auditLogs.map((log, idx) => (
                  <div key={idx} className="bg-dark-800 rounded-xl p-4">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-white font-medium">{log.description}</span>
                      <span className="text-dark-500 text-xs">
                        {new Date(log.createdAt).toLocaleDateString('fa-IR')}
                      </span>
                    </div>
                    {log.previousValues && (
                      <div className="text-sm text-dark-400">
                        قبل: خرید {log.previousValues.buySpread}% | فروش {log.previousValues.sellSpread}%
                      </div>
                    )}
                    {log.newValues && (
                      <div className="text-sm text-green-500">
                        بعد: خرید {log.newValues.buySpread}% | فروش {log.newValues.sellSpread}%
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-dark-500 text-center">تاریخچه‌ای وجود ندارد</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* مودال محاسبه قیمت */}
      {showPriceCalc && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FaCalculator className="text-gold" />
                محاسبه قیمت مشتری
              </h2>
              <button onClick={() => setShowPriceCalc(false)} className="text-dark-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-dark-300 mb-2">ارز</label>
                <select
                  value={priceCalcData.currencyId}
                  onChange={(e) => setPriceCalcData({ ...priceCalcData, currencyId: e.target.value })}
                  className="input w-full"
                >
                  <option value="">انتخاب کنید</option>
                  {currencies.map(c => (
                    <option key={c._id} value={c._id}>{c.nameFa} ({c.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-dark-300 mb-2">نوع معامله</label>
                <select
                  value={priceCalcData.side}
                  onChange={(e) => setPriceCalcData({ ...priceCalcData, side: e.target.value })}
                  className="input w-full"
                >
                  <option value="buy">خرید مشتری</option>
                  <option value="sell">فروش مشتری</option>
                </select>
              </div>

              <div>
                <label className="block text-dark-300 mb-2">سطح مشتری</label>
                <select
                  value={priceCalcData.customerTier}
                  onChange={(e) => setPriceCalcData({ ...priceCalcData, customerTier: e.target.value })}
                  className="input w-full"
                >
                  <option value="new">جدید</option>
                  <option value="C">برنزی (C)</option>
                  <option value="B">نقره‌ای (B)</option>
                  <option value="A">طلایی (A)</option>
                </select>
              </div>

              <div>
                <label className="block text-dark-300 mb-2">مقدار</label>
                <input
                  type="number"
                  value={priceCalcData.amount}
                  onChange={(e) => setPriceCalcData({ ...priceCalcData, amount: parseFloat(e.target.value) || 1 })}
                  className="input w-full"
                />
              </div>

              <button onClick={calculatePrice} className="btn-gold w-full">
                محاسبه
              </button>

              {calculatedPrice && (
                <div className="bg-dark-800 rounded-xl p-4 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-dark-400">قیمت بازار:</span>
                    <span className="text-white">{formatNumber(calculatedPrice.marketPrice)} ریال</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-400">اسپرد:</span>
                    <span className="text-orange-500">
                      {calculatedPrice.spreadValue}{calculatedPrice.spreadType === 'percentage' ? '%' : ' ریال'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-dark-400">مقدار اسپرد:</span>
                    <span className="text-orange-500">{formatNumber(calculatedPrice.spreadAmount)} ریال</span>
                  </div>
                  <div className="flex justify-between border-t border-dark-700 pt-2 mt-2">
                    <span className="text-gold font-bold">قیمت نهایی:</span>
                    <span className="text-gold font-bold text-lg">{formatNumber(calculatedPrice.finalPrice)} ریال</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SarafiSpreads;
