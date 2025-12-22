import { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaSave } from 'react-icons/fa';
import { adminAPI } from '../../services/api';
import toast from 'react-hot-toast';

const Currencies = () => {
  const [currencies, setCurrencies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [rates, setRates] = useState({});
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCurrency, setNewCurrency] = useState({
    name: '', nameFa: '', symbol: '', code: '', buyRate: 0, sellRate: 0, type: 'fiat'
  });

  useEffect(() => {
    fetchCurrencies();
  }, []);

  const fetchCurrencies = async () => {
    try {
      const res = await adminAPI.getCurrencies();
      setCurrencies(res.data.data);
      const ratesObj = {};
      res.data.data.forEach(c => {
        ratesObj[c._id] = { buyRate: c.buyRate, sellRate: c.sellRate };
      });
      setRates(ratesObj);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRateChange = (id, field, value) => {
    setRates(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: parseFloat(value) || 0 }
    }));
  };

  const handleSaveRates = async () => {
    try {
      const ratesArray = Object.entries(rates).map(([id, data]) => ({
        id, buyRate: data.buyRate, sellRate: data.sellRate
      }));
      await adminAPI.updateRates(ratesArray);
      toast.success('نرخ‌ها ذخیره شد');
      setEditMode(false);
      fetchCurrencies();
    } catch (e) {
      toast.error('خطا در ذخیره');
    }
  };

  const handleAddCurrency = async () => {
    try {
      await adminAPI.createCurrency(newCurrency);
      toast.success('ارز اضافه شد');
      setShowAddModal(false);
      setNewCurrency({ name: '', nameFa: '', symbol: '', code: '', buyRate: 0, sellRate: 0, type: 'fiat' });
      fetchCurrencies();
    } catch (e) {
      toast.error('خطا');
    }
  };

  const handleToggleActive = async (id, isActive) => {
    try {
      await adminAPI.updateCurrency(id, { isActive: !isActive });
      fetchCurrencies();
    } catch (e) {
      toast.error('خطا');
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-white">مدیریت ارزها</h1>
        <div className="flex gap-3">
          {editMode ? (
            <button onClick={handleSaveRates} className="btn-gold flex items-center gap-2">
              <FaSave /> ذخیره نرخ‌ها
            </button>
          ) : (
            <button onClick={() => setEditMode(true)} className="btn-outline flex items-center gap-2">
              <FaEdit /> ویرایش نرخ‌ها
            </button>
          )}
          <button onClick={() => setShowAddModal(true)} className="btn-gold flex items-center gap-2">
            <FaPlus /> ارز جدید
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="loading-spinner"></div>
        </div>
      ) : (
        <div className="card-dark overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="table-header">
                <th className="text-right p-4">ارز</th>
                <th className="text-right p-4">کد</th>
                <th className="text-right p-4">نرخ خرید</th>
                <th className="text-right p-4">نرخ فروش</th>
                <th className="text-right p-4">نوع</th>
                <th className="text-right p-4">وضعیت</th>
                <th className="text-right p-4">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {currencies.map((curr) => (
                <tr key={curr._id} className="table-row">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{curr.symbol}</span>
                      <span className="text-white font-medium">{curr.nameFa}</span>
                    </div>
                  </td>
                  <td className="p-4 text-dark-300">{curr.code}</td>
                  <td className="p-4">
                    {editMode ? (
                      <input
                        type="number"
                        className="input-dark w-32"
                        value={rates[curr._id]?.buyRate || 0}
                        onChange={(e) => handleRateChange(curr._id, 'buyRate', e.target.value)}
                      />
                    ) : (
                      <span className="text-green-400">{curr.buyRate?.toLocaleString()}</span>
                    )}
                  </td>
                  <td className="p-4">
                    {editMode ? (
                      <input
                        type="number"
                        className="input-dark w-32"
                        value={rates[curr._id]?.sellRate || 0}
                        onChange={(e) => handleRateChange(curr._id, 'sellRate', e.target.value)}
                      />
                    ) : (
                      <span className="text-red-400">{curr.sellRate?.toLocaleString()}</span>
                    )}
                  </td>
                  <td className="p-4">
                    <span className="badge badge-info">
                      {curr.type === 'fiat' ? 'فیات' : curr.type === 'crypto' ? 'رمزارز' : 'طلا'}
                    </span>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => handleToggleActive(curr._id, curr.isActive)}
                      className={`badge ${curr.isActive ? 'badge-success' : 'badge-danger'}`}
                    >
                      {curr.isActive ? 'فعال' : 'غیرفعال'}
                    </button>
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => handleToggleActive(curr._id, curr.isActive)}
                      className="text-dark-400 hover:text-gold-500"
                    >
                      <FaEdit />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* مودال افزودن ارز */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="card-dark w-full max-w-md mx-4">
            <h2 className="text-xl font-bold text-white mb-6">افزودن ارز جدید</h2>
            <div className="space-y-4">
              <input
                type="text"
                className="input-dark"
                placeholder="نام انگلیسی (USD)"
                value={newCurrency.name}
                onChange={(e) => setNewCurrency({ ...newCurrency, name: e.target.value })}
              />
              <input
                type="text"
                className="input-dark"
                placeholder="نام فارسی (دلار)"
                value={newCurrency.nameFa}
                onChange={(e) => setNewCurrency({ ...newCurrency, nameFa: e.target.value })}
              />
              <input
                type="text"
                className="input-dark"
                placeholder="نماد"
                value={newCurrency.symbol}
                onChange={(e) => setNewCurrency({ ...newCurrency, symbol: e.target.value })}
              />
              <input
                type="text"
                className="input-dark"
                placeholder="کد"
                value={newCurrency.code}
                onChange={(e) => setNewCurrency({ ...newCurrency, code: e.target.value })}
              />
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  className="input-dark"
                  placeholder="نرخ خرید"
                  value={newCurrency.buyRate}
                  onChange={(e) => setNewCurrency({ ...newCurrency, buyRate: parseFloat(e.target.value) })}
                />
                <input
                  type="number"
                  className="input-dark"
                  placeholder="نرخ فروش"
                  value={newCurrency.sellRate}
                  onChange={(e) => setNewCurrency({ ...newCurrency, sellRate: parseFloat(e.target.value) })}
                />
              </div>
              <select
                className="input-dark"
                value={newCurrency.type}
                onChange={(e) => setNewCurrency({ ...newCurrency, type: e.target.value })}
              >
                <option value="fiat">فیات</option>
                <option value="crypto">رمزارز</option>
                <option value="gold">طلا</option>
              </select>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleAddCurrency} className="btn-gold flex-1">افزودن</button>
              <button onClick={() => setShowAddModal(false)} className="btn-dark flex-1">انصراف</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Currencies;
