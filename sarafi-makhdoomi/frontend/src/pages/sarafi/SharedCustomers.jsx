import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowRight, FaPlus, FaUsers, FaUserPlus, FaTrash, FaExchangeAlt, FaStar, FaCheck, FaTimes, FaSpinner, FaSearch } from 'react-icons/fa';
import api from '../../services/api';
import toast from 'react-hot-toast';
import jalaliMoment from 'jalali-moment';

const SharedCustomers = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState(null);
  const [myCustomers, setMyCustomers] = useState([]);
  const [availableCustomers, setAvailableCustomers] = useState([]);
  const [allMyCustomers, setAllMyCustomers] = useState([]);
  const [tab, setTab] = useState('available'); // 'available' | 'mine' | 'share'
  const [showTradeModal, setShowTradeModal] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [currencies, setCurrencies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // فرم معامله
  const [tradeForm, setTradeForm] = useState({
    type: 'buy',
    currencyId: '',
    amount: '',
    baseRate: '',
    executorSpreadPercent: 1
  });
  const [tradePreview, setTradePreview] = useState(null);
  const [submittingTrade, setSubmittingTrade] = useState(false);

  // فرم اشتراک‌گذاری
  const [shareForm, setShareForm] = useState({
    customerId: '',
    displayName: '',
    trustRating: 3,
    ownerSpread: { buy: 1, sell: 1 }
  });
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    fetchData();
    fetchCurrencies();
  }, [groupId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [groupRes, availableRes, myRes, customersRes] = await Promise.all([
        api.get(`/sarafi-groups/${groupId}`),
        api.get(`/sarafi-groups/${groupId}/available-customers`),
        api.get(`/sarafi-groups/${groupId}/my-shared-customers`),
        api.get('/customers')
      ]);

      setGroup(groupRes.data.data);
      setAvailableCustomers(availableRes.data.data || []);
      setMyCustomers(myRes.data.data || []);
      setAllMyCustomers(customersRes.data.data || []);
    } catch (e) {
      toast.error('خطا در دریافت اطلاعات');
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrencies = async () => {
    try {
      const res = await api.get('/public/currencies');
      setCurrencies(res.data.data || []);
    } catch (e) {
      console.error('Error fetching currencies:', e);
    }
  };

  // محاسبه پیش‌نمایش معامله
  const calculatePreview = async () => {
    if (!tradeForm.currencyId || !tradeForm.amount || !tradeForm.baseRate) return;

    try {
      const res = await api.post('/sarafi-groups/group-trade/preview', {
        sharedCustomerId: showTradeModal._id,
        type: tradeForm.type,
        currencyId: tradeForm.currencyId,
        amount: parseFloat(tradeForm.amount),
        executorSpreadPercent: parseFloat(tradeForm.executorSpreadPercent),
        baseRate: parseFloat(tradeForm.baseRate)
      });
      setTradePreview(res.data.data);
    } catch (e) {
      console.error('Preview error:', e);
    }
  };

  useEffect(() => {
    if (showTradeModal) {
      const timer = setTimeout(calculatePreview, 500);
      return () => clearTimeout(timer);
    }
  }, [tradeForm, showTradeModal]);

  // ثبت معامله گروهی
  const handleSubmitTrade = async () => {
    if (!tradeForm.currencyId || !tradeForm.amount || !tradeForm.baseRate) {
      toast.error('لطفا همه فیلدها را پر کنید');
      return;
    }

    setSubmittingTrade(true);
    try {
      await api.post('/sarafi-groups/group-trade', {
        sharedCustomerId: showTradeModal._id,
        type: tradeForm.type,
        currencyId: tradeForm.currencyId,
        amount: parseFloat(tradeForm.amount),
        baseRate: parseFloat(tradeForm.baseRate),
        executorSpreadPercent: parseFloat(tradeForm.executorSpreadPercent)
      });
      toast.success('معامله با موفقیت ثبت شد');
      setShowTradeModal(null);
      setTradeForm({ type: 'buy', currencyId: '', amount: '', baseRate: '', executorSpreadPercent: 1 });
      setTradePreview(null);
    } catch (e) {
      toast.error(e.response?.data?.message || 'خطا در ثبت معامله');
    } finally {
      setSubmittingTrade(false);
    }
  };

  // اشتراک‌گذاری مشتری
  const handleShareCustomer = async () => {
    if (!shareForm.customerId) {
      toast.error('لطفا مشتری را انتخاب کنید');
      return;
    }

    setSharing(true);
    try {
      await api.post(`/sarafi-groups/${groupId}/shared-customers`, {
        customerId: shareForm.customerId,
        displayName: shareForm.displayName || undefined,
        trustRating: shareForm.trustRating,
        ownerSpread: shareForm.ownerSpread
      });
      toast.success('مشتری به اشتراک گذاشته شد');
      setShowShareModal(false);
      setShareForm({ customerId: '', displayName: '', trustRating: 3, ownerSpread: { buy: 1, sell: 1 } });
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.message || 'خطا');
    } finally {
      setSharing(false);
    }
  };

  // حذف اشتراک‌گذاری
  const handleUnshare = async (customerId) => {
    if (!confirm('آیا از حذف اشتراک‌گذاری این مشتری اطمینان دارید؟')) return;

    try {
      await api.delete(`/sarafi-groups/shared-customers/${customerId}`);
      toast.success('اشتراک‌گذاری حذف شد');
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.message || 'خطا');
    }
  };

  const getTrustStars = (rating) => {
    return Array(5).fill(0).map((_, i) => (
      <FaStar key={i} className={i < rating ? 'text-gold-500' : 'text-dark-600'} />
    ));
  };

  const getVolumeLabel = (vol) => {
    const map = {
      low: 'کم',
      medium: 'متوسط',
      high: 'زیاد',
      very_high: 'خیلی زیاد'
    };
    return map[vol] || vol;
  };

  // فیلتر مشتریان که قبلا به اشتراک گذاشته نشده‌اند
  const unsharedCustomers = allMyCustomers.filter(c =>
    !myCustomers.some(sc => sc.customer?._id === c._id)
  );

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div>
      {/* هدر */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate('/sarafi/groups')} className="text-dark-400 hover:text-white">
          <FaArrowRight size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">{group?.name}</h1>
          <p className="text-dark-400 text-sm">مشتریان اشتراکی</p>
        </div>
      </div>

      {/* تب‌ها */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setTab('available')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            tab === 'available' ? 'bg-gold-500 text-dark-900' : 'bg-dark-800 text-dark-400 hover:text-white'
          }`}
        >
          <FaUsers className="inline ml-2" />
          مشتریان قابل دسترس ({availableCustomers.length})
        </button>
        <button
          onClick={() => setTab('mine')}
          className={`px-4 py-2 rounded-lg transition-colors ${
            tab === 'mine' ? 'bg-gold-500 text-dark-900' : 'bg-dark-800 text-dark-400 hover:text-white'
          }`}
        >
          <FaUserPlus className="inline ml-2" />
          مشتریان من ({myCustomers.length})
        </button>
      </div>

      {/* تب مشتریان قابل دسترس */}
      {tab === 'available' && (
        <div>
          {availableCustomers.length === 0 ? (
            <div className="card-dark text-center py-12">
              <FaUsers className="text-4xl text-dark-600 mx-auto mb-4" />
              <p className="text-dark-500">هیچ مشتری اشتراکی در این گروه وجود ندارد</p>
              <p className="text-dark-600 text-sm mt-2">اعضای گروه باید مشتریان خود را به اشتراک بگذارند</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableCustomers.map((customer) => (
                <div key={customer._id} className="card-dark">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-500 text-xl">
                        <FaUsers />
                      </div>
                      <div>
                        <h3 className="text-white font-bold">{customer.displayName}</h3>
                        <p className="text-dark-500 text-xs">{customer.ownerSarafi?.name}</p>
                      </div>
                    </div>
                    {customer.customerInfo?.isVerified && (
                      <FaCheck className="text-green-500" title="تایید شده" />
                    )}
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-dark-500">اعتبار:</span>
                      <div className="flex gap-1">{getTrustStars(customer.customerInfo?.trustRating || 3)}</div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dark-500">حجم معاملات:</span>
                      <span className="text-white">{getVolumeLabel(customer.customerInfo?.averageTradeVolume)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dark-500">معاملات موفق:</span>
                      <span className="text-white">{customer.customerInfo?.successfulTrades || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dark-500">اسپرد خرید:</span>
                      <span className="text-green-400">{customer.ownerSpread?.buy || 0}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dark-500">اسپرد فروش:</span>
                      <span className="text-red-400">{customer.ownerSpread?.sell || 0}%</span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setShowTradeModal(customer);
                      setTradeForm({ type: 'buy', currencyId: '', amount: '', baseRate: '', executorSpreadPercent: 1 });
                    }}
                    className="w-full btn-gold text-sm py-2 flex items-center justify-center gap-2"
                  >
                    <FaExchangeAlt />
                    ثبت معامله
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* تب مشتریان من */}
      {tab === 'mine' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowShareModal(true)}
              className="btn-gold flex items-center gap-2"
            >
              <FaPlus />
              اشتراک‌گذاری مشتری جدید
            </button>
          </div>

          {myCustomers.length === 0 ? (
            <div className="card-dark text-center py-12">
              <FaUserPlus className="text-4xl text-dark-600 mx-auto mb-4" />
              <p className="text-dark-500">شما هنوز مشتری‌ای به اشتراک نگذاشته‌اید</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myCustomers.map((sc) => (
                <div key={sc._id} className="card-dark">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xl">
                        <FaUsers />
                      </div>
                      <div>
                        <h3 className="text-white font-bold">{sc.displayName}</h3>
                        <p className="text-dark-500 text-xs">
                          {sc.customer?.firstName} {sc.customer?.lastName}
                        </p>
                      </div>
                    </div>
                    <span className={`badge ${sc.status === 'active' ? 'badge-success' : 'badge-warning'}`}>
                      {sc.status === 'active' ? 'فعال' : 'متوقف'}
                    </span>
                  </div>

                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-dark-500">معاملات گروهی:</span>
                      <span className="text-white">{sc.stats?.totalTrades || 0}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dark-500">درآمد شما:</span>
                      <span className="text-green-400">{(sc.stats?.totalOwnerEarnings || 0).toLocaleString()} ریال</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dark-500">اسپرد خرید:</span>
                      <span className="text-white">{sc.ownerSpread?.buy || 0}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-dark-500">اسپرد فروش:</span>
                      <span className="text-white">{sc.ownerSpread?.sell || 0}%</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleUnshare(sc._id)}
                    className="w-full btn-dark text-red-400 text-sm py-2 flex items-center justify-center gap-2"
                  >
                    <FaTrash />
                    حذف اشتراک‌گذاری
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* مودال ثبت معامله */}
      {showTradeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card-dark w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">ثبت معامله گروهی</h2>
              <button onClick={() => setShowTradeModal(null)} className="text-dark-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <div className="bg-dark-800 p-4 rounded-lg mb-6">
              <div className="flex items-center gap-3 mb-2">
                <FaUsers className="text-gold-500" />
                <span className="text-white font-bold">{showTradeModal.displayName}</span>
              </div>
              <p className="text-dark-500 text-sm">صراف مالک: {showTradeModal.ownerSarafi?.name}</p>
            </div>

            <div className="space-y-4">
              {/* نوع معامله */}
              <div>
                <label className="block text-dark-400 text-sm mb-2">نوع معامله</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setTradeForm({ ...tradeForm, type: 'buy' })}
                    className={`py-2 rounded-lg transition-colors ${
                      tradeForm.type === 'buy'
                        ? 'bg-green-500 text-white'
                        : 'bg-dark-800 text-dark-400'
                    }`}
                  >
                    خرید (مشتری می‌خرد)
                  </button>
                  <button
                    onClick={() => setTradeForm({ ...tradeForm, type: 'sell' })}
                    className={`py-2 rounded-lg transition-colors ${
                      tradeForm.type === 'sell'
                        ? 'bg-red-500 text-white'
                        : 'bg-dark-800 text-dark-400'
                    }`}
                  >
                    فروش (مشتری می‌فروشد)
                  </button>
                </div>
              </div>

              {/* ارز */}
              <div>
                <label className="block text-dark-400 text-sm mb-2">ارز</label>
                <select
                  className="input-dark"
                  value={tradeForm.currencyId}
                  onChange={(e) => setTradeForm({ ...tradeForm, currencyId: e.target.value })}
                >
                  <option value="">انتخاب کنید</option>
                  {currencies.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </div>

              {/* مقدار */}
              <div>
                <label className="block text-dark-400 text-sm mb-2">مقدار ارز</label>
                <input
                  type="number"
                  className="input-dark"
                  value={tradeForm.amount}
                  onChange={(e) => setTradeForm({ ...tradeForm, amount: e.target.value })}
                  placeholder="مثال: 1000"
                />
              </div>

              {/* نرخ پایه */}
              <div>
                <label className="block text-dark-400 text-sm mb-2">نرخ پایه (ریال)</label>
                <input
                  type="number"
                  className="input-dark"
                  value={tradeForm.baseRate}
                  onChange={(e) => setTradeForm({ ...tradeForm, baseRate: e.target.value })}
                  placeholder="نرخ بازار"
                />
              </div>

              {/* اسپرد شما */}
              <div>
                <label className="block text-dark-400 text-sm mb-2">اسپرد شما (%)</label>
                <input
                  type="number"
                  className="input-dark"
                  min={0}
                  max={10}
                  step={0.1}
                  value={tradeForm.executorSpreadPercent}
                  onChange={(e) => setTradeForm({ ...tradeForm, executorSpreadPercent: e.target.value })}
                />
                <p className="text-dark-500 text-xs mt-1">
                  اسپرد صراف مالک: {tradeForm.type === 'buy' ? showTradeModal.ownerSpread?.buy : showTradeModal.ownerSpread?.sell}%
                </p>
              </div>

              {/* پیش‌نمایش */}
              {tradePreview && (
                <div className="bg-dark-800 p-4 rounded-lg space-y-2">
                  <h4 className="text-dark-400 text-sm font-bold mb-3">پیش‌نمایش معامله</h4>
                  <div className="flex justify-between text-sm">
                    <span className="text-dark-500">نرخ پایه:</span>
                    <span className="text-white">{tradePreview.baseRate.toLocaleString()} ریال</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-dark-500">نرخ نهایی برای مشتری:</span>
                    <span className="text-gold-400 font-bold">{tradePreview.customerRate.toLocaleString()} ریال</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-dark-500">مبلغ کل:</span>
                    <span className="text-white">{tradePreview.customerTotal.toLocaleString()} ریال</span>
                  </div>
                  <hr className="border-dark-700 my-2" />
                  <div className="flex justify-between text-sm">
                    <span className="text-dark-500">سود صراف مالک:</span>
                    <span className="text-blue-400">{tradePreview.ownerProfit.toLocaleString()} ریال</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-dark-500">سود شما:</span>
                    <span className="text-green-400">{tradePreview.executorProfit.toLocaleString()} ریال</span>
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowTradeModal(null)}
                  className="flex-1 btn-dark"
                >
                  انصراف
                </button>
                <button
                  onClick={handleSubmitTrade}
                  disabled={submittingTrade}
                  className="flex-1 btn-gold flex items-center justify-center gap-2"
                >
                  {submittingTrade ? <FaSpinner className="animate-spin" /> : <FaExchangeAlt />}
                  {submittingTrade ? 'در حال ثبت...' : 'ثبت معامله'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* مودال اشتراک‌گذاری مشتری */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="card-dark w-full max-w-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-white">اشتراک‌گذاری مشتری</h2>
              <button onClick={() => setShowShareModal(false)} className="text-dark-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <div className="space-y-4">
              {/* انتخاب مشتری */}
              <div>
                <label className="block text-dark-400 text-sm mb-2">انتخاب مشتری</label>
                <select
                  className="input-dark"
                  value={shareForm.customerId}
                  onChange={(e) => setShareForm({ ...shareForm, customerId: e.target.value })}
                >
                  <option value="">انتخاب کنید</option>
                  {unsharedCustomers.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.firstName} {c.lastName} - {c.phone}
                    </option>
                  ))}
                </select>
                {unsharedCustomers.length === 0 && (
                  <p className="text-dark-500 text-xs mt-1">همه مشتریان شما قبلا به اشتراک گذاشته شده‌اند</p>
                )}
              </div>

              {/* نام نمایشی */}
              <div>
                <label className="block text-dark-400 text-sm mb-2">نام نمایشی (اختیاری)</label>
                <input
                  type="text"
                  className="input-dark"
                  value={shareForm.displayName}
                  onChange={(e) => setShareForm({ ...shareForm, displayName: e.target.value })}
                  placeholder="نام مستعار برای نمایش به سایر صراف‌ها"
                />
                <p className="text-dark-500 text-xs mt-1">اگر خالی بگذارید، یک نام تصادفی تولید می‌شود</p>
              </div>

              {/* رتبه اعتماد */}
              <div>
                <label className="block text-dark-400 text-sm mb-2">رتبه اعتماد</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setShareForm({ ...shareForm, trustRating: star })}
                      className="text-2xl transition-colors"
                    >
                      <FaStar className={star <= shareForm.trustRating ? 'text-gold-500' : 'text-dark-600'} />
                    </button>
                  ))}
                </div>
              </div>

              {/* اسپرد */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-dark-400 text-sm mb-2">اسپرد خرید (%)</label>
                  <input
                    type="number"
                    className="input-dark"
                    min={0}
                    max={10}
                    step={0.5}
                    value={shareForm.ownerSpread.buy}
                    onChange={(e) => setShareForm({
                      ...shareForm,
                      ownerSpread: { ...shareForm.ownerSpread, buy: parseFloat(e.target.value) || 0 }
                    })}
                  />
                </div>
                <div>
                  <label className="block text-dark-400 text-sm mb-2">اسپرد فروش (%)</label>
                  <input
                    type="number"
                    className="input-dark"
                    min={0}
                    max={10}
                    step={0.5}
                    value={shareForm.ownerSpread.sell}
                    onChange={(e) => setShareForm({
                      ...shareForm,
                      ownerSpread: { ...shareForm.ownerSpread, sell: parseFloat(e.target.value) || 0 }
                    })}
                  />
                </div>
              </div>
              <p className="text-dark-500 text-xs">این اسپرد به سود شما در هر معامله اضافه می‌شود</p>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowShareModal(false)}
                  className="flex-1 btn-dark"
                >
                  انصراف
                </button>
                <button
                  onClick={handleShareCustomer}
                  disabled={sharing || !shareForm.customerId}
                  className="flex-1 btn-gold flex items-center justify-center gap-2"
                >
                  {sharing ? <FaSpinner className="animate-spin" /> : <FaPlus />}
                  {sharing ? 'در حال اشتراک‌گذاری...' : 'اشتراک‌گذاری'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SharedCustomers;
