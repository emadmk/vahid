import { useState, useEffect, useCallback } from 'react';
import {
  FaEdit, FaTrash, FaHistory, FaSpinner, FaSave, FaTimes,
  FaClock, FaExclamationTriangle, FaCheckCircle, FaChartLine,
  FaArrowUp, FaArrowDown
} from 'react-icons/fa';
import api from '../../services/api';
import toast from 'react-hot-toast';
import jalaliMoment from 'jalali-moment';

// کامپوننت شمارش معکوس نرخ
const RateCountdown = ({ validUntil, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!validUntil) {
      setTimeLeft(null);
      return;
    }

    const calculateTimeLeft = () => {
      const now = new Date().getTime();
      const expiry = new Date(validUntil).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft(null);
        if (onExpire) onExpire();
        return;
      }

      setIsExpired(false);
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds, total: diff });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [validUntil, onExpire]);

  if (!validUntil) {
    return <span className="text-dark-500 text-xs">بدون محدودیت</span>;
  }

  if (isExpired) {
    return (
      <div className="flex items-center gap-1 text-red-500">
        <FaExclamationTriangle className="text-xs animate-pulse" />
        <span className="text-xs font-bold">منقضی شده</span>
      </div>
    );
  }

  if (!timeLeft) {
    return <span className="text-dark-500 text-xs">...</span>;
  }

  // رنگ‌بندی بر اساس زمان باقی‌مانده
  let colorClass = 'text-green-500';
  if (timeLeft.total < 5 * 60 * 1000) { // کمتر از 5 دقیقه
    colorClass = 'text-red-500 animate-pulse';
  } else if (timeLeft.total < 15 * 60 * 1000) { // کمتر از 15 دقیقه
    colorClass = 'text-yellow-500';
  }

  return (
    <div className={`flex items-center gap-1 ${colorClass}`}>
      <FaClock className="text-xs" />
      <span className="font-mono text-sm font-bold">
        {String(timeLeft.hours).padStart(2, '0')}:
        {String(timeLeft.minutes).padStart(2, '0')}:
        {String(timeLeft.seconds).padStart(2, '0')}
      </span>
    </div>
  );
};

const SarafiRates = () => {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRate, setEditingRate] = useState(null);
  const [editData, setEditData] = useState({
    buyRate: '',
    sellRate: '',
    notes: '',
    validityMinutes: 30 // مدت اعتبار نرخ به دقیقه
  });
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [historyCurrency, setHistoryCurrency] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchRates();
    // بررسی دوره‌ای برای نرخ‌های منقضی شده
    const interval = setInterval(fetchRates, 60000); // هر دقیقه
    return () => clearInterval(interval);
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

  const handleRateExpire = useCallback((currencyId) => {
    // نوتیفیکیشن برای نرخ منقضی شده
    toast.error('یکی از نرخ‌های شما منقضی شده است', {
      icon: '⏰',
      duration: 5000
    });
  }, []);

  const handleEdit = (rate) => {
    setEditingRate(rate.currency._id);
    setEditData({
      buyRate: rate.buyRate,
      sellRate: rate.sellRate,
      notes: '',
      validityMinutes: 30
    });
  };

  const handleSave = async (currencyId) => {
    if (!editData.buyRate || !editData.sellRate) {
      toast.error('نرخ خرید و فروش الزامی است');
      return;
    }

    setSaving(true);
    try {
      await api.post(`/sarafi-rates/${currencyId}`, {
        buyRate: parseFloat(editData.buyRate),
        sellRate: parseFloat(editData.sellRate),
        notes: editData.notes,
        validityMinutes: editData.validityMinutes
      });
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
    setHistoryLoading(true);
    try {
      const res = await api.get(`/sarafi-rates/history/${currencyId}`);
      setHistoryData(res.data.data);
      setHistoryCurrency(currencyName);
      setShowHistory(true);
    } catch (e) {
      toast.error('خطا در دریافت تاریخچه');
    } finally {
      setHistoryLoading(false);
    }
  };

  const formatNumber = (num) => {
    return num?.toLocaleString('fa-IR') || '-';
  };

  // محاسبه درصد تغییر نرخ
  const calculateChange = (current, previous) => {
    if (!previous || previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    return change.toFixed(2);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <FaChartLine className="text-gold" />
            مدیریت نرخ‌ها
          </h1>
          <p className="text-dark-400 text-sm mt-1">ثبت و مدیریت نرخ لحظه‌ای ارزها</p>
        </div>
        <button
          onClick={fetchRates}
          className="btn-outline flex items-center gap-2"
        >
          <FaSpinner className={loading ? 'animate-spin' : ''} />
          بروزرسانی
        </button>
      </div>

      {/* راهنما */}
      <div className="card-dark mb-4">
        <div className="flex items-start gap-3">
          <FaClock className="text-gold text-xl mt-1" />
          <div>
            <p className="text-white font-medium mb-1">سیستم اعتبار نرخ</p>
            <p className="text-dark-400 text-sm">
              هر نرخ دارای زمان اعتبار است. پس از اتمام زمان، نرخ منقضی می‌شود و باید مجدداً تنظیم شود.
              رنگ شمارنده نشان‌دهنده وضعیت است:
              <span className="text-green-500 mx-2">سبز = عادی</span>
              <span className="text-yellow-500 mx-2">زرد = کمتر از ۱۵ دقیقه</span>
              <span className="text-red-500 mx-2">قرمز = کمتر از ۵ دقیقه</span>
            </p>
          </div>
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
              <tr className="text-dark-400 text-sm border-b border-dark-700">
                <th className="text-right py-3 px-4">ارز</th>
                <th className="text-right py-3 px-4">نرخ خرید</th>
                <th className="text-right py-3 px-4">نرخ فروش</th>
                <th className="text-center py-3 px-4">وضعیت</th>
                <th className="text-center py-3 px-4">زمان اعتبار</th>
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
                      <div>
                        <span className="text-green-500 font-medium">{formatNumber(rate.buyRate)}</span>
                        {rate.previousBuyRate && (
                          <div className="text-xs mt-1">
                            {rate.buyRate > rate.previousBuyRate ? (
                              <span className="text-green-400 flex items-center gap-1">
                                <FaArrowUp className="text-xs" />
                                +{calculateChange(rate.buyRate, rate.previousBuyRate)}%
                              </span>
                            ) : rate.buyRate < rate.previousBuyRate ? (
                              <span className="text-red-400 flex items-center gap-1">
                                <FaArrowDown className="text-xs" />
                                {calculateChange(rate.buyRate, rate.previousBuyRate)}%
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>
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
                      <div>
                        <span className="text-red-500 font-medium">{formatNumber(rate.sellRate)}</span>
                        {rate.previousSellRate && (
                          <div className="text-xs mt-1">
                            {rate.sellRate > rate.previousSellRate ? (
                              <span className="text-green-400 flex items-center gap-1">
                                <FaArrowUp className="text-xs" />
                                +{calculateChange(rate.sellRate, rate.previousSellRate)}%
                              </span>
                            ) : rate.sellRate < rate.previousSellRate ? (
                              <span className="text-red-400 flex items-center gap-1">
                                <FaArrowDown className="text-xs" />
                                {calculateChange(rate.sellRate, rate.previousSellRate)}%
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>
                    )}
                  </td>

                  <td className="py-4 px-4 text-center">
                    {rate.isCustom ? (
                      <span className="badge badge-success flex items-center gap-1 justify-center">
                        <FaCheckCircle className="text-xs" />
                        سفارشی
                      </span>
                    ) : (
                      <span className="badge badge-info">پیش‌فرض</span>
                    )}
                  </td>

                  <td className="py-4 px-4 text-center">
                    {editingRate === rate.currency._id ? (
                      <select
                        className="input-dark text-sm"
                        value={editData.validityMinutes}
                        onChange={(e) => setEditData({...editData, validityMinutes: parseInt(e.target.value)})}
                      >
                        <option value={5}>۵ دقیقه</option>
                        <option value={15}>۱۵ دقیقه</option>
                        <option value={30}>۳۰ دقیقه</option>
                        <option value={60}>۱ ساعت</option>
                        <option value={120}>۲ ساعت</option>
                        <option value={360}>۶ ساعت</option>
                        <option value={720}>۱۲ ساعت</option>
                        <option value={1440}>۲۴ ساعت</option>
                      </select>
                    ) : (
                      <RateCountdown
                        validUntil={rate.validUntil}
                        onExpire={() => handleRateExpire(rate.currency._id)}
                      />
                    )}
                  </td>

                  <td className="py-4 px-4 text-center">
                    <div className="text-dark-400 text-sm">
                      {rate.lastUpdate ? jalaliMoment(rate.lastUpdate).format('jYYYY/jMM/jDD') : '-'}
                    </div>
                    <div className="text-dark-500 text-xs">
                      {rate.lastUpdate ? jalaliMoment(rate.lastUpdate).format('HH:mm') : ''}
                    </div>
                    {rate.updatedBy && (
                      <div className="text-dark-500 text-xs mt-1">
                        توسط: {rate.updatedBy.firstName}
                      </div>
                    )}
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

      {/* نرخ‌های منقضی شده */}
      {rates.some(r => r.validUntil && new Date(r.validUntil) < new Date()) && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3">
          <FaExclamationTriangle className="text-red-500 text-xl flex-shrink-0" />
          <div>
            <p className="text-red-500 font-bold">نرخ‌های منقضی شده</p>
            <p className="text-dark-300 text-sm">
              برخی از نرخ‌های شما منقضی شده‌اند. لطفاً آنها را به‌روزرسانی کنید.
            </p>
          </div>
        </div>
      )}

      {/* مودال تاریخچه پیشرفته */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card-dark w-full max-w-3xl max-h-[85vh] overflow-hidden">
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-dark-700">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <FaHistory className="text-blue-500" />
                  تاریخچه تغییرات {historyCurrency}
                </h2>
                <p className="text-dark-400 text-sm mt-1">تمام تغییرات نرخ با جزئیات کامل</p>
              </div>
              <button onClick={() => setShowHistory(false)} className="text-dark-400 hover:text-white">
                <FaTimes />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[65vh]">
              {historyLoading ? (
                <div className="flex justify-center py-12">
                  <div className="loading-spinner"></div>
                </div>
              ) : historyData.length === 0 ? (
                <div className="text-center py-12">
                  <FaHistory className="text-dark-600 text-4xl mx-auto mb-3" />
                  <p className="text-dark-500">تاریخچه‌ای یافت نشد</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historyData.map((item, index) => (
                    <div key={index} className="bg-dark-800 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-dark-400 text-sm">
                            {jalaliMoment(item.createdAt).format('jYYYY/jMM/jDD')}
                          </span>
                          <span className="text-dark-500 text-xs">
                            {jalaliMoment(item.createdAt).format('HH:mm:ss')}
                          </span>
                        </div>
                        {item.changedBy && (
                          <span className="text-dark-400 text-sm">
                            توسط: {item.changedBy.firstName} {item.changedBy.lastName}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        {/* نرخ قبلی */}
                        <div className="bg-dark-700/50 rounded-lg p-3">
                          <p className="text-dark-500 text-xs mb-2">نرخ قبلی</p>
                          <div className="flex items-center gap-4">
                            <div>
                              <span className="text-dark-400 text-xs">خرید:</span>
                              <span className="text-green-500/70 mr-1">
                                {formatNumber(item.previousBuyRate)}
                              </span>
                            </div>
                            <div>
                              <span className="text-dark-400 text-xs">فروش:</span>
                              <span className="text-red-500/70 mr-1">
                                {formatNumber(item.previousSellRate)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* نرخ جدید */}
                        <div className="bg-dark-700/50 rounded-lg p-3">
                          <p className="text-dark-500 text-xs mb-2">نرخ جدید</p>
                          <div className="flex items-center gap-4">
                            <div>
                              <span className="text-dark-400 text-xs">خرید:</span>
                              <span className="text-green-500 font-medium mr-1">
                                {formatNumber(item.newBuyRate)}
                              </span>
                              {item.previousBuyRate && (
                                <span className={`text-xs mr-1 ${
                                  item.newBuyRate > item.previousBuyRate ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  ({item.newBuyRate > item.previousBuyRate ? '+' : ''}
                                  {calculateChange(item.newBuyRate, item.previousBuyRate)}%)
                                </span>
                              )}
                            </div>
                            <div>
                              <span className="text-dark-400 text-xs">فروش:</span>
                              <span className="text-red-500 font-medium mr-1">
                                {formatNumber(item.newSellRate)}
                              </span>
                              {item.previousSellRate && (
                                <span className={`text-xs mr-1 ${
                                  item.newSellRate > item.previousSellRate ? 'text-green-400' : 'text-red-400'
                                }`}>
                                  ({item.newSellRate > item.previousSellRate ? '+' : ''}
                                  {calculateChange(item.newSellRate, item.previousSellRate)}%)
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* یادداشت */}
                      {item.notes && (
                        <div className="mt-3 p-2 bg-dark-700/30 rounded text-dark-300 text-sm">
                          <span className="text-dark-500">یادداشت:</span> {item.notes}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SarafiRates;
