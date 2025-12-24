import { useState, useEffect } from 'react';
import { FaPercent, FaToggleOn, FaToggleOff, FaTrash, FaSearch, FaFilter } from 'react-icons/fa';
import api from '../../services/api';
import toast from 'react-hot-toast';

const AdminSpreads = () => {
  const [spreads, setSpreads] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    sarafi: '',
    currency: '',
    isActive: ''
  });
  const [sarafis, setSarafis] = useState([]);
  const [currencies, setCurrencies] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });

  useEffect(() => {
    fetchSpreads();
    fetchStats();
    fetchSarafis();
    fetchCurrencies();
  }, [filters]);

  const fetchSpreads = async () => {
    try {
      setLoading(true);
      const params = { ...filters, page: pagination.page, limit: 20 };
      Object.keys(params).forEach(key => !params[key] && delete params[key]);

      const res = await api.get('/admin/spreads', { params });
      setSpreads(res.data.data);
      setPagination({
        page: pagination.page,
        pages: res.data.pages,
        total: res.data.total
      });
    } catch (error) {
      toast.error('خطا در دریافت اسپردها');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/spreads/stats');
      setStats(res.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchSarafis = async () => {
    try {
      const res = await api.get('/admin/users', { params: { role: 'sarafi' } });
      setSarafis(res.data.data || []);
    } catch (error) {
      console.error('Error fetching sarafis:', error);
    }
  };

  const fetchCurrencies = async () => {
    try {
      const res = await api.get('/admin/currencies');
      setCurrencies(res.data.data || []);
    } catch (error) {
      console.error('Error fetching currencies:', error);
    }
  };

  const handleToggle = async (id) => {
    try {
      await api.put(`/admin/spreads/${id}/toggle`);
      toast.success('وضعیت اسپرد تغییر کرد');
      fetchSpreads();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در تغییر وضعیت');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('آیا از حذف این اسپرد اطمینان دارید؟')) return;

    try {
      await api.delete(`/admin/spreads/${id}`);
      toast.success('اسپرد حذف شد');
      fetchSpreads();
      fetchStats();
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در حذف اسپرد');
    }
  };

  const getSpreadTypeLabel = (type) => {
    const types = {
      percentage: 'درصدی',
      fixed: 'ثابت',
      tiered: 'پلکانی'
    };
    return types[type] || type;
  };

  return (
    <div className="space-y-6">
      {/* هدر */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">مدیریت اسپردها</h1>
          <p className="text-dark-400 mt-1">مشاهده و مدیریت اسپردهای همه صرافی‌ها</p>
        </div>
      </div>

      {/* آمار */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gold-500/20 flex items-center justify-center">
                <FaPercent className="text-gold-500 text-xl" />
              </div>
              <div>
                <p className="text-dark-400 text-sm">کل اسپردها</p>
                <p className="text-2xl font-bold text-white">{stats.totalSpreads}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                <FaToggleOn className="text-green-500 text-xl" />
              </div>
              <div>
                <p className="text-dark-400 text-sm">اسپردهای فعال</p>
                <p className="text-2xl font-bold text-white">{stats.totalActive}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
                <FaFilter className="text-blue-500 text-xl" />
              </div>
              <div>
                <p className="text-dark-400 text-sm">تعداد صراف‌ها</p>
                <p className="text-2xl font-bold text-white">{stats.bySarafi?.length || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* فیلترها */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-dark-400 text-sm mb-2">صراف</label>
            <select
              className="input-field w-full"
              value={filters.sarafi}
              onChange={(e) => setFilters({ ...filters, sarafi: e.target.value })}
            >
              <option value="">همه صراف‌ها</option>
              {sarafis.map(s => (
                <option key={s._id} value={s._id}>
                  {s.sarafiName || `${s.firstName} ${s.lastName}`}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-dark-400 text-sm mb-2">ارز</label>
            <select
              className="input-field w-full"
              value={filters.currency}
              onChange={(e) => setFilters({ ...filters, currency: e.target.value })}
            >
              <option value="">همه ارزها</option>
              {currencies.map(c => (
                <option key={c._id} value={c._id}>{c.nameFa} ({c.code})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-dark-400 text-sm mb-2">وضعیت</label>
            <select
              className="input-field w-full"
              value={filters.isActive}
              onChange={(e) => setFilters({ ...filters, isActive: e.target.value })}
            >
              <option value="">همه</option>
              <option value="true">فعال</option>
              <option value="false">غیرفعال</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ sarafi: '', currency: '', isActive: '' })}
              className="btn-secondary w-full"
            >
              پاک کردن فیلتر
            </button>
          </div>
        </div>
      </div>

      {/* جدول */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="loading-spinner"></div>
          </div>
        ) : spreads.length === 0 ? (
          <div className="text-center py-12 text-dark-400">
            اسپردی یافت نشد
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-dark-700">
                  <th className="text-right py-4 px-4 text-dark-400 font-medium">صراف</th>
                  <th className="text-right py-4 px-4 text-dark-400 font-medium">ارز</th>
                  <th className="text-right py-4 px-4 text-dark-400 font-medium">نوع</th>
                  <th className="text-right py-4 px-4 text-dark-400 font-medium">اسپرد خرید</th>
                  <th className="text-right py-4 px-4 text-dark-400 font-medium">اسپرد فروش</th>
                  <th className="text-right py-4 px-4 text-dark-400 font-medium">وضعیت</th>
                  <th className="text-right py-4 px-4 text-dark-400 font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {spreads.map((spread) => (
                  <tr key={spread._id} className="border-b border-dark-800 hover:bg-dark-800/50">
                    <td className="py-4 px-4 text-white">
                      {spread.sarafi?.sarafiName || `${spread.sarafi?.firstName} ${spread.sarafi?.lastName}`}
                    </td>
                    <td className="py-4 px-4 text-white">
                      {spread.currency?.nameFa} ({spread.currency?.code})
                    </td>
                    <td className="py-4 px-4">
                      <span className="badge badge-info">{getSpreadTypeLabel(spread.type)}</span>
                    </td>
                    <td className="py-4 px-4 text-green-400">
                      {spread.type === 'percentage' ? `${spread.buySpread}%` : spread.buySpread?.toLocaleString()}
                    </td>
                    <td className="py-4 px-4 text-red-400">
                      {spread.type === 'percentage' ? `${spread.sellSpread}%` : spread.sellSpread?.toLocaleString()}
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => handleToggle(spread._id)}
                        className={`flex items-center gap-2 ${spread.isActive ? 'text-green-400' : 'text-dark-500'}`}
                      >
                        {spread.isActive ? (
                          <>
                            <FaToggleOn className="text-xl" />
                            <span>فعال</span>
                          </>
                        ) : (
                          <>
                            <FaToggleOff className="text-xl" />
                            <span>غیرفعال</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="py-4 px-4">
                      <button
                        onClick={() => handleDelete(spread._id)}
                        className="text-red-400 hover:text-red-300 p-2"
                        title="حذف"
                      >
                        <FaTrash />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* صفحه‌بندی */}
        {pagination.pages > 1 && (
          <div className="flex justify-center gap-2 p-4 border-t border-dark-700">
            {Array.from({ length: pagination.pages }, (_, i) => (
              <button
                key={i + 1}
                onClick={() => setPagination({ ...pagination, page: i + 1 })}
                className={`px-3 py-1 rounded ${
                  pagination.page === i + 1
                    ? 'bg-gold-500 text-dark-900'
                    : 'bg-dark-700 text-white hover:bg-dark-600'
                }`}
              >
                {i + 1}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* آمار به تفکیک صراف */}
      {stats?.bySarafi?.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-bold text-white mb-4">آمار به تفکیک صراف</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.bySarafi.map((item) => (
              <div key={item.sarafiId} className="bg-dark-800 rounded-lg p-4">
                <h4 className="text-white font-medium mb-2">{item.sarafiName}</h4>
                <div className="flex justify-between text-sm">
                  <span className="text-dark-400">تعداد اسپرد:</span>
                  <span className="text-white">{item.count}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-dark-400">فعال:</span>
                  <span className="text-green-400">{item.activeCount}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSpreads;
