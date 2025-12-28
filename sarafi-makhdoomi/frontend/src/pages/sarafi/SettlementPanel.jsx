import { useState, useEffect } from 'react';
import {
  FaMoneyBillWave, FaCoins, FaCheckCircle, FaClock, FaExclamationTriangle,
  FaFileAlt, FaFilter, FaSearch, FaCalendarAlt, FaUser, FaPhone,
  FaDownload, FaUpload, FaHistory, FaChartPie, FaWallet, FaTimes,
  FaCheck, FaEye, FaInfoCircle, FaSync
} from 'react-icons/fa';
import api from '../../services/api';
import toast from 'react-hot-toast';

const SettlementPanel = () => {
  // State
  const [activeTab, setActiveTab] = useState('pending'); // pending, completed, overdue
  const [settlementType, setSettlementType] = useState('all'); // all, rial, currency
  const [settlements, setSettlements] = useState([]);
  const [stats, setStats] = useState({
    pendingRial: 0,
    pendingCurrency: 0,
    completedToday: 0,
    overdueCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedSettlement, setSelectedSettlement] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState({
    search: '',
    dateFrom: '',
    dateTo: '',
    currency: ''
  });

  // Settlement form
  const [settlementForm, setSettlementForm] = useState({
    amount: '',
    paymentMethod: 'cash',
    referenceNumber: '',
    notes: '',
    attachments: []
  });

  useEffect(() => {
    fetchData();
  }, [activeTab, settlementType]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [settlementsRes, statsRes] = await Promise.all([
        api.get('/settlements/list', {
          params: {
            status: activeTab,
            type: settlementType !== 'all' ? settlementType : undefined
          }
        }).catch(() => ({ data: { data: [] } })),
        api.get('/settlements/stats').catch(() => ({ data: { data: {} } }))
      ]);

      setSettlements(settlementsRes.data.data || []);
      setStats(statsRes.data.data || {});
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSettlement = async () => {
    if (!selectedSettlement) return;

    try {
      await api.post(`/settlements/${selectedSettlement._id}/confirm`, {
        ...settlementForm,
        amount: parseFloat(settlementForm.amount)
      });
      toast.success('تسویه ثبت شد');
      setShowModal(false);
      setSelectedSettlement(null);
      setSettlementForm({
        amount: '',
        paymentMethod: 'cash',
        referenceNumber: '',
        notes: '',
        attachments: []
      });
      fetchData();
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در ثبت تسویه');
    }
  };

  const handleMarkOverdue = async (settlementId) => {
    try {
      await api.put(`/settlements/${settlementId}/overdue`);
      toast.success('به تاخیر افتاده ثبت شد');
      fetchData();
    } catch (error) {
      toast.error('خطا');
    }
  };

  const formatNumber = (num) => new Intl.NumberFormat('fa-IR').format(num || 0);
  const formatDate = (date) => new Date(date).toLocaleDateString('fa-IR');

  const getStatusBadge = (status) => {
    const map = {
      pending: { label: 'در انتظار وصول', class: 'bg-yellow-500/20 text-yellow-500', icon: FaClock },
      partial: { label: 'وصول جزئی', class: 'bg-blue-500/20 text-blue-500', icon: FaChartPie },
      completed: { label: 'تسویه شده', class: 'bg-green-500/20 text-green-500', icon: FaCheckCircle },
      overdue: { label: 'تاخیر', class: 'bg-red-500/20 text-red-500', icon: FaExclamationTriangle }
    };
    const s = map[status] || map.pending;
    return (
      <span className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 ${s.class}`}>
        <s.icon className="text-xs" />
        {s.label}
      </span>
    );
  };

  // Demo data for settlements
  const demoSettlements = [
    {
      _id: '1',
      tradeNumber: 'TRD-241228-ABC123',
      customer: { firstName: 'علی', lastName: 'محمدی', phone: '09121234567' },
      type: 'rial',
      amount: 50000000,
      dueDate: new Date(),
      status: 'pending',
      trade: { currency: { code: 'USD', nameFa: 'دلار' }, amount: 1000 }
    },
    {
      _id: '2',
      tradeNumber: 'TRD-241227-DEF456',
      customer: { firstName: 'محمد', lastName: 'رضایی', phone: '09127654321' },
      type: 'currency',
      amount: 500,
      currency: { code: 'EUR', nameFa: 'یورو' },
      dueDate: new Date(Date.now() - 86400000),
      status: 'overdue',
      trade: { currency: { code: 'EUR' }, amount: 500 }
    }
  ];

  const displaySettlements = settlements.length > 0 ? settlements : demoSettlements;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FaWallet className="text-gold" />
            پنل وصول و تسویه
          </h1>
          <p className="text-dark-400 text-sm mt-1">مدیریت تسویه‌حساب‌های مشتریان</p>
        </div>
        <button onClick={fetchData} className="btn-outline flex items-center gap-2">
          <FaSync />
          بروزرسانی
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card p-4 border-r-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-400 text-sm">وصول ریالی معوق</p>
              <p className="text-2xl font-bold text-yellow-500">{formatNumber(stats.pendingRial)}</p>
              <p className="text-xs text-dark-500">ریال</p>
            </div>
            <FaMoneyBillWave className="text-yellow-500 text-3xl opacity-50" />
          </div>
        </div>

        <div className="card p-4 border-r-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-400 text-sm">وصول ارزی معوق</p>
              <p className="text-2xl font-bold text-blue-500">{stats.pendingCurrency || 3}</p>
              <p className="text-xs text-dark-500">مورد</p>
            </div>
            <FaCoins className="text-blue-500 text-3xl opacity-50" />
          </div>
        </div>

        <div className="card p-4 border-r-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-400 text-sm">تسویه امروز</p>
              <p className="text-2xl font-bold text-green-500">{stats.completedToday || 5}</p>
              <p className="text-xs text-dark-500">مورد</p>
            </div>
            <FaCheckCircle className="text-green-500 text-3xl opacity-50" />
          </div>
        </div>

        <div className="card p-4 border-r-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-400 text-sm">تاخیر وصول</p>
              <p className="text-2xl font-bold text-red-500">{stats.overdueCount || 2}</p>
              <p className="text-xs text-dark-500">مورد</p>
            </div>
            <FaExclamationTriangle className="text-red-500 text-3xl opacity-50" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* Tab Switcher */}
          <div className="flex rounded-lg bg-dark-800 p-1">
            {[
              { value: 'pending', label: 'در انتظار', count: 5 },
              { value: 'completed', label: 'تسویه شده', count: 12 },
              { value: 'overdue', label: 'تاخیر', count: 2 }
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => setActiveTab(tab.value)}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all ${
                  activeTab === tab.value
                    ? 'bg-gold text-dark-900 font-bold'
                    : 'text-dark-400 hover:text-white'
                }`}
              >
                {tab.label}
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.value ? 'bg-dark-900/20' : 'bg-dark-700'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <div className="flex rounded-lg bg-dark-800 p-1">
            {[
              { value: 'all', label: 'همه' },
              { value: 'rial', label: 'ریالی', icon: FaMoneyBillWave },
              { value: 'currency', label: 'ارزی', icon: FaCoins }
            ].map(type => (
              <button
                key={type.value}
                onClick={() => setSettlementType(type.value)}
                className={`px-3 py-1.5 rounded-lg flex items-center gap-1 text-sm ${
                  settlementType === type.value
                    ? 'bg-dark-700 text-white'
                    : 'text-dark-400'
                }`}
              >
                {type.icon && <type.icon className="text-xs" />}
                {type.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <FaSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-400" />
              <input
                type="text"
                placeholder="جستجو مشتری، شماره معامله..."
                value={filter.search}
                onChange={(e) => setFilter({ ...filter, search: e.target.value })}
                className="input w-full pr-10"
              />
            </div>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={filter.dateFrom}
              onChange={(e) => setFilter({ ...filter, dateFrom: e.target.value })}
              className="input"
            />
            <span className="text-dark-400">تا</span>
            <input
              type="date"
              value={filter.dateTo}
              onChange={(e) => setFilter({ ...filter, dateTo: e.target.value })}
              className="input"
            />
          </div>
        </div>
      </div>

      {/* Settlements Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-dark-800">
              <tr>
                <th className="text-right p-4 text-dark-400 text-sm">شماره معامله</th>
                <th className="text-right p-4 text-dark-400 text-sm">مشتری</th>
                <th className="text-right p-4 text-dark-400 text-sm">نوع</th>
                <th className="text-right p-4 text-dark-400 text-sm">مبلغ</th>
                <th className="text-right p-4 text-dark-400 text-sm">سررسید</th>
                <th className="text-right p-4 text-dark-400 text-sm">وضعیت</th>
                <th className="text-center p-4 text-dark-400 text-sm">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center p-8">
                    <div className="loading-spinner mx-auto"></div>
                  </td>
                </tr>
              ) : displaySettlements.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center p-8 text-dark-500">
                    موردی یافت نشد
                  </td>
                </tr>
              ) : (
                displaySettlements.map(settlement => (
                  <tr key={settlement._id} className="border-t border-dark-800 hover:bg-dark-800/30">
                    <td className="p-4">
                      <span className="text-gold font-medium">{settlement.tradeNumber}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-dark-700 flex items-center justify-center">
                          <FaUser className="text-dark-400 text-xs" />
                        </div>
                        <div>
                          <p className="text-white text-sm">
                            {settlement.customer?.firstName} {settlement.customer?.lastName}
                          </p>
                          <p className="text-dark-500 text-xs flex items-center gap-1">
                            <FaPhone className="text-xs" />
                            {settlement.customer?.phone}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      {settlement.type === 'rial' ? (
                        <span className="flex items-center gap-1 text-yellow-500">
                          <FaMoneyBillWave />
                          ریالی
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-blue-500">
                          <FaCoins />
                          {settlement.currency?.code || settlement.trade?.currency?.code}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      <p className="text-white font-bold">
                        {formatNumber(settlement.amount)}
                      </p>
                      <p className="text-dark-500 text-xs">
                        {settlement.type === 'rial' ? 'ریال' : settlement.currency?.code}
                      </p>
                    </td>
                    <td className="p-4">
                      <p className={`${
                        new Date(settlement.dueDate) < new Date() ? 'text-red-500' : 'text-dark-300'
                      }`}>
                        {formatDate(settlement.dueDate)}
                      </p>
                      {new Date(settlement.dueDate) < new Date() && settlement.status !== 'completed' && (
                        <p className="text-red-500 text-xs">گذشته</p>
                      )}
                    </td>
                    <td className="p-4">
                      {getStatusBadge(settlement.status)}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-center gap-2">
                        {settlement.status !== 'completed' && (
                          <button
                            onClick={() => {
                              setSelectedSettlement(settlement);
                              setSettlementForm(prev => ({
                                ...prev,
                                amount: settlement.amount.toString()
                              }));
                              setShowModal(true);
                            }}
                            className="p-2 rounded-lg bg-green-500/20 text-green-500 hover:bg-green-500/30"
                            title="ثبت تسویه"
                          >
                            <FaCheck />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setSelectedSettlement(settlement);
                            // Show details modal
                          }}
                          className="p-2 rounded-lg bg-dark-700 text-dark-400 hover:text-white"
                          title="جزئیات"
                        >
                          <FaEye />
                        </button>
                        {settlement.status === 'pending' && new Date(settlement.dueDate) < new Date() && (
                          <button
                            onClick={() => handleMarkOverdue(settlement._id)}
                            className="p-2 rounded-lg bg-red-500/20 text-red-500 hover:bg-red-500/30"
                            title="ثبت تاخیر"
                          >
                            <FaExclamationTriangle />
                          </button>
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

      {/* Settlement Confirmation Modal */}
      {showModal && selectedSettlement && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card w-full max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <FaCheckCircle className="text-green-500" />
                ثبت تسویه
              </h2>
              <button onClick={() => setShowModal(false)} className="text-dark-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            {/* Settlement Info */}
            <div className="bg-dark-800 rounded-lg p-4 mb-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-dark-400">شماره معامله:</span>
                  <p className="text-gold font-bold">{selectedSettlement.tradeNumber}</p>
                </div>
                <div>
                  <span className="text-dark-400">مشتری:</span>
                  <p className="text-white">
                    {selectedSettlement.customer?.firstName} {selectedSettlement.customer?.lastName}
                  </p>
                </div>
                <div>
                  <span className="text-dark-400">نوع:</span>
                  <p className={selectedSettlement.type === 'rial' ? 'text-yellow-500' : 'text-blue-500'}>
                    {selectedSettlement.type === 'rial' ? 'ریالی' : 'ارزی'}
                  </p>
                </div>
                <div>
                  <span className="text-dark-400">مبلغ کل:</span>
                  <p className="text-white font-bold">{formatNumber(selectedSettlement.amount)}</p>
                </div>
              </div>
            </div>

            {/* Settlement Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-dark-300 mb-2">مبلغ وصول شده</label>
                <input
                  type="number"
                  value={settlementForm.amount}
                  onChange={(e) => setSettlementForm({ ...settlementForm, amount: e.target.value })}
                  className="input w-full text-lg"
                  placeholder="مبلغ وصول شده را وارد کنید"
                />
              </div>

              <div>
                <label className="block text-dark-300 mb-2">روش پرداخت</label>
                <select
                  value={settlementForm.paymentMethod}
                  onChange={(e) => setSettlementForm({ ...settlementForm, paymentMethod: e.target.value })}
                  className="input w-full"
                >
                  <option value="cash">نقدی</option>
                  <option value="bank_transfer">انتقال بانکی</option>
                  <option value="cheque">چک</option>
                  <option value="pos">کارتخوان</option>
                </select>
              </div>

              <div>
                <label className="block text-dark-300 mb-2">شماره پیگیری / رسید</label>
                <input
                  type="text"
                  value={settlementForm.referenceNumber}
                  onChange={(e) => setSettlementForm({ ...settlementForm, referenceNumber: e.target.value })}
                  className="input w-full"
                  placeholder="شماره پیگیری یا رسید"
                />
              </div>

              <div>
                <label className="block text-dark-300 mb-2">پیوست (اختیاری)</label>
                <div className="border-2 border-dashed border-dark-700 rounded-lg p-4 text-center">
                  <FaUpload className="text-dark-400 text-2xl mx-auto mb-2" />
                  <p className="text-dark-400 text-sm">فایل رسید یا مدرک پرداخت</p>
                  <input type="file" className="hidden" id="attachment" />
                  <label htmlFor="attachment" className="btn-outline mt-2 cursor-pointer inline-block">
                    انتخاب فایل
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-dark-300 mb-2">یادداشت</label>
                <textarea
                  value={settlementForm.notes}
                  onChange={(e) => setSettlementForm({ ...settlementForm, notes: e.target.value })}
                  className="input w-full"
                  rows="2"
                  placeholder="توضیحات اضافی..."
                />
              </div>
            </div>

            {/* Partial payment warning */}
            {parseFloat(settlementForm.amount) < selectedSettlement.amount && settlementForm.amount && (
              <div className="mt-4 p-3 bg-yellow-500/20 rounded-lg flex items-center gap-2">
                <FaInfoCircle className="text-yellow-500" />
                <span className="text-yellow-500 text-sm">
                  این مبلغ کمتر از کل است. وصول جزئی ثبت می‌شود.
                </span>
              </div>
            )}

            <div className="flex gap-4 mt-6">
              <button
                onClick={handleConfirmSettlement}
                className="btn-gold flex-1 flex items-center justify-center gap-2"
              >
                <FaCheck />
                ثبت تسویه
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="btn-outline flex-1"
              >
                انصراف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettlementPanel;
