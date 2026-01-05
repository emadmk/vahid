import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaArrowRight, FaHandshake, FaCheck, FaTimes, FaExclamationTriangle, FaSpinner, FaEye, FaFilter } from 'react-icons/fa';
import api from '../../services/api';
import toast from 'react-hot-toast';
import jalaliMoment from 'jalali-moment';

const GroupSettlements = () => {
  const navigate = useNavigate();
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSettlement, setSelectedSettlement] = useState(null);
  const [filter, setFilter] = useState({ role: '', status: '' });
  const [confirming, setConfirming] = useState(false);
  const [showCollectionModal, setShowCollectionModal] = useState(null);
  const [collectionForm, setCollectionForm] = useState({ method: 'cash', notes: '' });

  useEffect(() => {
    fetchSettlements();
  }, [filter]);

  const fetchSettlements = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter.role) params.append('role', filter.role);
      if (filter.status) params.append('status', filter.status);

      const res = await api.get(`/sarafi-groups/settlements?${params.toString()}`);
      setSettlements(res.data.data || []);
    } catch (e) {
      toast.error('خطا در دریافت تسویه‌ها');
    } finally {
      setLoading(false);
    }
  };

  const fetchSettlementDetails = async (id) => {
    try {
      const res = await api.get(`/sarafi-groups/settlements/${id}`);
      setSelectedSettlement(res.data.data);
    } catch (e) {
      toast.error('خطا در دریافت جزئیات');
    }
  };

  const handleConfirm = async (id) => {
    setConfirming(true);
    try {
      await api.post(`/sarafi-groups/settlements/${id}/confirm`);
      toast.success('تسویه تایید شد');
      fetchSettlements();
      if (selectedSettlement?._id === id) {
        fetchSettlementDetails(id);
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'خطا');
    } finally {
      setConfirming(false);
    }
  };

  const handleRecordCollection = async () => {
    try {
      await api.post(`/sarafi-groups/settlements/${showCollectionModal}/customer-collection`, collectionForm);
      toast.success('وصول از مشتری ثبت شد');
      setShowCollectionModal(null);
      setCollectionForm({ method: 'cash', notes: '' });
      fetchSettlements();
      if (selectedSettlement?._id === showCollectionModal) {
        fetchSettlementDetails(showCollectionModal);
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'خطا');
    }
  };

  const handleDispute = async (id, reason) => {
    try {
      await api.post(`/sarafi-groups/settlements/${id}/dispute`, { reason });
      toast.success('اختلاف ثبت شد');
      fetchSettlements();
    } catch (e) {
      toast.error(e.response?.data?.message || 'خطا');
    }
  };

  const getStatusBadge = (status) => {
    const map = {
      pending: { label: 'در انتظار', class: 'badge-warning' },
      executor_settled: { label: 'تسویه صراف', class: 'badge-info' },
      customer_pending: { label: 'در انتظار وصول', class: 'badge-warning' },
      completed: { label: 'تکمیل شده', class: 'badge-success' },
      disputed: { label: 'اختلاف', class: 'badge-danger' },
      cancelled: { label: 'لغو شده', class: 'badge-dark' }
    };
    const s = map[status] || { label: status, class: 'badge-info' };
    return <span className={`badge ${s.class}`}>{s.label}</span>;
  };

  const getExecutorSettlementStatus = (settlement) => {
    const { executorSettlement } = settlement;
    if (executorSettlement?.status === 'completed') {
      return <span className="text-green-400">تکمیل شده</span>;
    }
    if (executorSettlement?.ownerConfirmed && executorSettlement?.executorConfirmed) {
      return <span className="text-green-400">تایید هر دو طرف</span>;
    }
    if (executorSettlement?.ownerConfirmed) {
      return <span className="text-yellow-400">تایید صراف مالک</span>;
    }
    if (executorSettlement?.executorConfirmed) {
      return <span className="text-yellow-400">تایید صراف اجراکننده</span>;
    }
    return <span className="text-dark-400">در انتظار تایید</span>;
  };

  return (
    <div>
      {/* هدر */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/sarafi/groups')} className="text-dark-400 hover:text-white">
            <FaArrowRight size={20} />
          </button>
          <h1 className="text-2xl font-bold text-white">تسویه‌های گروهی</h1>
        </div>
      </div>

      {/* فیلترها */}
      <div className="card-dark mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <FaFilter className="text-dark-400" />
          <select
            className="input-dark w-auto"
            value={filter.role}
            onChange={(e) => setFilter({ ...filter, role: e.target.value })}
          >
            <option value="">همه نقش‌ها</option>
            <option value="owner">من صراف مالک</option>
            <option value="executor">من صراف اجراکننده</option>
          </select>
          <select
            className="input-dark w-auto"
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
          >
            <option value="">همه وضعیت‌ها</option>
            <option value="pending">در انتظار</option>
            <option value="executor_settled">تسویه صراف</option>
            <option value="completed">تکمیل شده</option>
            <option value="disputed">اختلاف</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* لیست تسویه‌ها */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="loading-spinner"></div>
            </div>
          ) : settlements.length === 0 ? (
            <div className="card-dark text-center py-12">
              <FaHandshake className="text-4xl text-dark-600 mx-auto mb-4" />
              <p className="text-dark-500">هیچ تسویه‌ای یافت نشد</p>
            </div>
          ) : (
            <div className="space-y-4">
              {settlements.map((settlement) => (
                <div
                  key={settlement._id}
                  className={`card-dark cursor-pointer transition-all ${
                    selectedSettlement?._id === settlement._id ? 'ring-2 ring-gold-500' : ''
                  }`}
                  onClick={() => fetchSettlementDetails(settlement._id)}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-500">
                        <FaHandshake />
                      </div>
                      <div>
                        <p className="text-white font-bold">{settlement.settlementNumber}</p>
                        <p className="text-dark-500 text-xs">{settlement.group?.name}</p>
                      </div>
                    </div>
                    {getStatusBadge(settlement.status)}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-dark-500">صراف مالک:</p>
                      <p className="text-white">{settlement.ownerSarafi?.sarafiInfo?.name || `${settlement.ownerSarafi?.firstName} ${settlement.ownerSarafi?.lastName}`}</p>
                    </div>
                    <div>
                      <p className="text-dark-500">صراف اجراکننده:</p>
                      <p className="text-white">{settlement.executorSarafi?.sarafiInfo?.name || `${settlement.executorSarafi?.firstName} ${settlement.executorSarafi?.lastName}`}</p>
                    </div>
                    <div>
                      <p className="text-dark-500">مقدار:</p>
                      <p className="text-white">{settlement.amount} {settlement.currency?.code}</p>
                    </div>
                    <div>
                      <p className="text-dark-500">مبلغ تسویه:</p>
                      <p className="text-gold-400">{settlement.amounts?.interSarafiTotal?.toLocaleString()} ریال</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-3 pt-3 border-t border-dark-700">
                    <p className="text-dark-500 text-xs">
                      {jalaliMoment(settlement.createdAt).format('jYYYY/jMM/jDD - HH:mm')}
                    </p>
                    {getExecutorSettlementStatus(settlement)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* جزئیات */}
        <div className="lg:col-span-1">
          {selectedSettlement ? (
            <div className="card-dark sticky top-4">
              <h3 className="text-lg font-bold text-white mb-4">جزئیات تسویه</h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-dark-500">شماره:</span>
                  <span className="text-white font-mono">{selectedSettlement.settlementNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-500">وضعیت:</span>
                  {getStatusBadge(selectedSettlement.status)}
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-500">نوع معامله:</span>
                  <span className={selectedSettlement.tradeType === 'buy' ? 'text-green-400' : 'text-red-400'}>
                    {selectedSettlement.tradeType === 'buy' ? 'خرید' : 'فروش'}
                  </span>
                </div>

                <hr className="border-dark-700" />

                <div className="flex justify-between">
                  <span className="text-dark-500">نرخ پایه:</span>
                  <span className="text-white">{selectedSettlement.rates?.baseRate?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-500">اسپرد مالک:</span>
                  <span className="text-blue-400">{selectedSettlement.rates?.ownerSpread}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-500">اسپرد اجراکننده:</span>
                  <span className="text-green-400">{selectedSettlement.rates?.executorSpread}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-500">نرخ مشتری:</span>
                  <span className="text-gold-400 font-bold">{selectedSettlement.rates?.customerRate?.toLocaleString()}</span>
                </div>

                <hr className="border-dark-700" />

                <div className="flex justify-between">
                  <span className="text-dark-500">مبلغ کل مشتری:</span>
                  <span className="text-white">{selectedSettlement.amounts?.customerTotal?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-500">مبلغ تسویه B2B:</span>
                  <span className="text-gold-400">{selectedSettlement.amounts?.interSarafiTotal?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-500">سود مالک:</span>
                  <span className="text-blue-400">{selectedSettlement.amounts?.ownerProfit?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-dark-500">سود اجراکننده:</span>
                  <span className="text-green-400">{selectedSettlement.amounts?.executorProfit?.toLocaleString()}</span>
                </div>

                <hr className="border-dark-700" />

                {/* وضعیت تایید */}
                <div className="bg-dark-800 p-3 rounded-lg">
                  <p className="text-dark-400 text-xs mb-2">وضعیت تایید تسویه</p>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-dark-500">صراف مالک:</span>
                    {selectedSettlement.executorSettlement?.ownerConfirmed ? (
                      <span className="text-green-400 flex items-center gap-1"><FaCheck /> تایید شده</span>
                    ) : (
                      <span className="text-yellow-400">در انتظار</span>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-dark-500">صراف اجراکننده:</span>
                    {selectedSettlement.executorSettlement?.executorConfirmed ? (
                      <span className="text-green-400 flex items-center gap-1"><FaCheck /> تایید شده</span>
                    ) : (
                      <span className="text-yellow-400">در انتظار</span>
                    )}
                  </div>
                </div>

                {/* دکمه‌های عملیات */}
                <div className="space-y-2 pt-4">
                  {selectedSettlement.status === 'pending' && (
                    <button
                      onClick={() => handleConfirm(selectedSettlement._id)}
                      disabled={confirming}
                      className="w-full btn-gold flex items-center justify-center gap-2"
                    >
                      {confirming ? <FaSpinner className="animate-spin" /> : <FaCheck />}
                      تایید تسویه
                    </button>
                  )}

                  {selectedSettlement.isOwner && selectedSettlement.status === 'executor_settled' && (
                    <button
                      onClick={() => setShowCollectionModal(selectedSettlement._id)}
                      className="w-full btn-gold flex items-center justify-center gap-2"
                    >
                      <FaCheck />
                      ثبت وصول از مشتری
                    </button>
                  )}

                  {selectedSettlement.status !== 'completed' && selectedSettlement.status !== 'disputed' && (
                    <button
                      onClick={() => {
                        const reason = prompt('دلیل اختلاف را وارد کنید:');
                        if (reason) handleDispute(selectedSettlement._id, reason);
                      }}
                      className="w-full btn-dark text-red-400 flex items-center justify-center gap-2"
                    >
                      <FaExclamationTriangle />
                      ثبت اختلاف
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="card-dark text-center py-12">
              <FaEye className="text-4xl text-dark-600 mx-auto mb-4" />
              <p className="text-dark-500">یک تسویه را انتخاب کنید</p>
            </div>
          )}
        </div>
      </div>

      {/* مودال ثبت وصول */}
      {showCollectionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card-dark w-full max-w-md">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">ثبت وصول از مشتری</h2>
              <button onClick={() => setShowCollectionModal(null)} className="text-dark-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-dark-400 text-sm mb-2">روش وصول</label>
                <select
                  className="input-dark"
                  value={collectionForm.method}
                  onChange={(e) => setCollectionForm({ ...collectionForm, method: e.target.value })}
                >
                  <option value="cash">نقدی</option>
                  <option value="bank_transfer">انتقال بانکی</option>
                  <option value="wallet">کیف پول</option>
                  <option value="credit">اعتباری</option>
                </select>
              </div>

              <div>
                <label className="block text-dark-400 text-sm mb-2">یادداشت</label>
                <textarea
                  className="input-dark"
                  rows={3}
                  value={collectionForm.notes}
                  onChange={(e) => setCollectionForm({ ...collectionForm, notes: e.target.value })}
                  placeholder="توضیحات (اختیاری)"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCollectionModal(null)}
                  className="flex-1 btn-dark"
                >
                  انصراف
                </button>
                <button
                  onClick={handleRecordCollection}
                  className="flex-1 btn-gold"
                >
                  ثبت وصول
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupSettlements;
