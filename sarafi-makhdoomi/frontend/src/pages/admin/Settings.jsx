import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  FaSave, FaSpinner, FaCog, FaMoneyBillWave, FaClock, FaShieldAlt,
  FaUserLock, FaChartLine, FaExclamationTriangle, FaToggleOn,
  FaToggleOff, FaCalendarAlt, FaPercent, FaStore, FaUsers, FaBell
} from 'react-icons/fa';
import { adminAPI } from '../../services/api';

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [settings, setSettings] = useState({});

  const { register, handleSubmit, reset, watch, setValue } = useForm();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await adminAPI.getSettings();
      setSettings(res.data.data || {});
      reset(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      await adminAPI.updateSettings(data);
      toast.success('تنظیمات ذخیره شد');
    } catch (e) {
      toast.error('خطا در ذخیره');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'general', label: 'عمومی', icon: FaCog },
    { id: 'risk', label: 'مدیریت ریسک', icon: FaShieldAlt },
    { id: 'session', label: 'Session & Cut-Off', icon: FaClock },
    { id: 'rbac', label: 'دسترسی‌ها (RBAC)', icon: FaUserLock },
    { id: 'fee', label: 'کارمزد', icon: FaMoneyBillWave },
    { id: 'request', label: 'درخواست‌ها', icon: FaStore },
    { id: 'auth', label: 'احراز هویت', icon: FaUsers },
    { id: 'alerts', label: 'هشدارها', icon: FaBell }
  ];

  // Watch values for conditional rendering
  const exposureLimitEnabled = watch('riskSettings.exposureLimit.enabled');
  const preTradeEnabled = watch('riskSettings.preTrade.enabled');
  const circuitBreakerEnabled = watch('riskSettings.circuitBreaker.enabled');

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <FaCog className="text-gold" />
        تنظیمات سیستم
      </h1>

      {/* تب‌ها */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-gold text-dark-900'
                : 'bg-dark-800 text-dark-400 hover:text-white'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon className="text-sm" />
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* ========== تنظیمات عمومی ========== */}
        {activeTab === 'general' && (
          <div className="card space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FaCog className="text-gold" />
              اطلاعات سایت
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-dark-400 text-sm mb-2">نام سایت</label>
                <input type="text" className="input w-full" {...register('siteName')} />
              </div>
              <div>
                <label className="block text-dark-400 text-sm mb-2">تلفن تماس</label>
                <input type="text" className="input w-full" {...register('contactPhone')} />
              </div>
            </div>

            <div>
              <label className="block text-dark-400 text-sm mb-2">توضیحات سایت</label>
              <textarea className="input w-full" rows={3} {...register('siteDescription')}></textarea>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-dark-400 text-sm mb-2">ایمیل</label>
                <input type="email" className="input w-full" {...register('contactEmail')} />
              </div>
              <div>
                <label className="block text-dark-400 text-sm mb-2">ساعت کاری</label>
                <input type="text" className="input w-full" {...register('workingHours')} />
              </div>
            </div>

            <h3 className="text-white font-bold mt-6">شبکه‌های اجتماعی</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-dark-400 text-sm mb-2">تلگرام</label>
                <input type="text" className="input w-full" {...register('socialMedia.telegram')} />
              </div>
              <div>
                <label className="block text-dark-400 text-sm mb-2">اینستاگرام</label>
                <input type="text" className="input w-full" {...register('socialMedia.instagram')} />
              </div>
              <div>
                <label className="block text-dark-400 text-sm mb-2">واتساپ</label>
                <input type="text" className="input w-full" {...register('socialMedia.whatsapp')} />
              </div>
            </div>
          </div>
        )}

        {/* ========== تنظیمات ریسک ========== */}
        {activeTab === 'risk' && (
          <div className="space-y-6">
            {/* Exposure Limit */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FaChartLine className="text-gold" />
                  Exposure Limit (سقف تعهد)
                </h2>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    {...register('riskSettings.exposureLimit.enabled')}
                  />
                  <div className="w-11 h-6 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>

              {exposureLimitEnabled && (
                <div className="space-y-4 border-t border-dark-700 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-dark-400 text-sm mb-2">حداکثر تعهد کل (ریال)</label>
                      <input
                        type="number"
                        className="input w-full"
                        {...register('riskSettings.exposureLimit.maxTotalExposure')}
                      />
                      <p className="text-dark-500 text-xs mt-1">پیش‌فرض: 100 میلیارد ریال</p>
                    </div>
                    <div>
                      <label className="block text-dark-400 text-sm mb-2">اقدام در صورت رسیدن به سقف</label>
                      <select className="input w-full" {...register('riskSettings.exposureLimit.actionOnLimit')}>
                        <option value="block_new_orders">مسدود کردن سفارش‌های جدید</option>
                        <option value="block_market_orders">فقط مسدود کردن Market Orders</option>
                        <option value="warn_only">فقط هشدار</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Pre-Trade Risk Check */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FaShieldAlt className="text-blue-500" />
                  Pre-Trade Risk Check
                </h2>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    {...register('riskSettings.preTrade.enabled')}
                  />
                  <div className="w-11 h-6 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>

              {preTradeEnabled && (
                <div className="space-y-4 border-t border-dark-700 pt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <label className="flex items-center gap-2 cursor-pointer p-3 bg-dark-800 rounded-lg">
                      <input type="checkbox" className="w-4 h-4" {...register('riskSettings.preTrade.checkCustomerLimit')} />
                      <span className="text-dark-300 text-sm">سقف مشتری</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-3 bg-dark-800 rounded-lg">
                      <input type="checkbox" className="w-4 h-4" {...register('riskSettings.preTrade.checkBlackPoints')} />
                      <span className="text-dark-300 text-sm">بلک‌پوینت</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-3 bg-dark-800 rounded-lg">
                      <input type="checkbox" className="w-4 h-4" {...register('riskSettings.preTrade.checkVolatility')} />
                      <span className="text-dark-300 text-sm">نوسان</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer p-3 bg-dark-800 rounded-lg">
                      <input type="checkbox" className="w-4 h-4" {...register('riskSettings.preTrade.checkExposure')} />
                      <span className="text-dark-300 text-sm">Exposure</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-dark-400 text-sm mb-2">حداکثر بلک‌پوینت مجاز</label>
                    <input
                      type="number"
                      className="input w-full md:w-1/3"
                      {...register('riskSettings.preTrade.maxBlackPoints')}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Circuit Breaker */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FaExclamationTriangle className="text-red-500" />
                  Circuit Breaker
                </h2>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    {...register('riskSettings.circuitBreaker.enabled')}
                  />
                  <div className="w-11 h-6 bg-dark-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
                </label>
              </div>

              {circuitBreakerEnabled && (
                <div className="space-y-4 border-t border-dark-700 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-dark-400 text-sm mb-2">آستانه تغییر قیمت (%)</label>
                      <input
                        type="number"
                        step="0.1"
                        className="input w-full"
                        {...register('riskSettings.circuitBreaker.priceChangeThreshold')}
                      />
                    </div>
                    <div>
                      <label className="block text-dark-400 text-sm mb-2">بازه زمانی (ثانیه)</label>
                      <input
                        type="number"
                        className="input w-full"
                        {...register('riskSettings.circuitBreaker.timeWindow')}
                      />
                    </div>
                    <div>
                      <label className="block text-dark-400 text-sm mb-2">مدت توقف (ثانیه)</label>
                      <input
                        type="number"
                        className="input w-full"
                        {...register('riskSettings.circuitBreaker.freezeDuration')}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========== تنظیمات Session ========== */}
        {activeTab === 'session' && (
          <div className="card space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FaClock className="text-gold" />
              تنظیمات Session و Cut-Off
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-dark-400 text-sm mb-2">ساعت شروع بازار</label>
                <input
                  type="time"
                  className="input w-full"
                  {...register('sessionSettings.marketOpenTime')}
                />
              </div>
              <div>
                <label className="block text-dark-400 text-sm mb-2">ساعت پایان بازار</label>
                <input
                  type="time"
                  className="input w-full"
                  {...register('sessionSettings.marketCloseTime')}
                />
              </div>
              <div>
                <label className="block text-dark-400 text-sm mb-2">Cut-Off تسویه</label>
                <input
                  type="time"
                  className="input w-full"
                  {...register('sessionSettings.settlementCutoff')}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-dark-400 text-sm mb-2">نوع تسویه</label>
                <select className="input w-full" {...register('sessionSettings.settlementType')}>
                  <option value="T+0">T+0 (همان روز)</option>
                  <option value="T+1">T+1 (فردا)</option>
                  <option value="T+2">T+2 (دو روز بعد)</option>
                </select>
              </div>
              <div>
                <label className="block text-dark-400 text-sm mb-2">روزهای کاری</label>
                <div className="flex flex-wrap gap-2">
                  {['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنج‌شنبه', 'جمعه'].map((day, idx) => (
                    <label key={idx} className="flex items-center gap-1 bg-dark-800 px-3 py-1 rounded cursor-pointer">
                      <input
                        type="checkbox"
                        value={idx}
                        {...register('sessionSettings.workingDays')}
                        defaultChecked={idx < 6}
                      />
                      <span className="text-dark-300 text-sm">{day}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== RBAC ========== */}
        {activeTab === 'rbac' && (
          <div className="card space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FaUserLock className="text-gold" />
              مدیریت دسترسی‌ها (RBAC)
            </h2>

            <p className="text-dark-400 text-sm">
              جدول دسترسی نقش‌های مختلف در سیستم
            </p>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-dark-800">
                  <tr>
                    <th className="text-right p-3 text-dark-400 text-sm">عملیات</th>
                    <th className="text-center p-3 text-dark-400 text-sm">ادمین</th>
                    <th className="text-center p-3 text-dark-400 text-sm">صراف</th>
                    <th className="text-center p-3 text-dark-400 text-sm">حسابدار</th>
                    <th className="text-center p-3 text-dark-400 text-sm">وصول‌کننده</th>
                    <th className="text-center p-3 text-dark-400 text-sm">فروش</th>
                    <th className="text-center p-3 text-dark-400 text-sm">مشتری</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { action: 'مشاهده داشبورد', permissions: [true, true, true, true, true, true] },
                    { action: 'ایجاد سفارش', permissions: [true, true, false, false, true, true] },
                    { action: 'تایید سفارش', permissions: [true, true, false, false, false, false] },
                    { action: 'ثبت تسویه', permissions: [true, true, true, true, false, false] },
                    { action: 'مدیریت کارکنان', permissions: [true, true, false, false, false, false] },
                    { action: 'مشاهده گزارش‌ها', permissions: [true, true, true, false, true, false] },
                    { action: 'تنظیمات اسپرد', permissions: [true, true, false, false, false, false] },
                    { action: 'مدیریت مشتریان', permissions: [true, true, false, false, true, false] },
                    { action: 'تنظیمات سیستم', permissions: [true, false, false, false, false, false] },
                    { action: 'لاگ عملیات', permissions: [true, true, true, false, false, false] }
                  ].map((row, idx) => (
                    <tr key={idx} className="border-t border-dark-800">
                      <td className="p-3 text-white">{row.action}</td>
                      {row.permissions.map((hasAccess, pIdx) => (
                        <td key={pIdx} className="p-3 text-center">
                          {hasAccess ? (
                            <span className="text-green-500">✓</span>
                          ) : (
                            <span className="text-red-500">✗</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-dark-800 rounded-lg p-4">
              <h4 className="text-white font-bold mb-2">نقش‌های کارکنان صرافی</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-dark-700 rounded">
                  <span className="text-gold font-bold">حسابدار (Accountant)</span>
                  <p className="text-dark-400 mt-1">مشاهده گزارشات مالی، ثبت تسویه، بررسی تراکنش‌ها</p>
                </div>
                <div className="p-3 bg-dark-700 rounded">
                  <span className="text-blue-500 font-bold">وصول‌کننده ریالی (Rial Collector)</span>
                  <p className="text-dark-400 mt-1">ثبت وصول ریالی، پیگیری بدهی‌ها</p>
                </div>
                <div className="p-3 bg-dark-700 rounded">
                  <span className="text-green-500 font-bold">وصول‌کننده ارزی (FX Collector)</span>
                  <p className="text-dark-400 mt-1">ثبت وصول ارزی، مدیریت موجودی ارز</p>
                </div>
                <div className="p-3 bg-dark-700 rounded">
                  <span className="text-purple-500 font-bold">مدیر فروش (Sales Manager)</span>
                  <p className="text-dark-400 mt-1">ایجاد سفارش، مدیریت مشتریان، گزارش فروش</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========== تنظیمات کارمزد ========== */}
        {activeTab === 'fee' && (
          <div className="card space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FaMoneyBillWave className="text-gold" />
              تنظیمات کارمزد
            </h2>

            <div>
              <label className="block text-dark-400 text-sm mb-2">نوع کارمزد</label>
              <select className="input w-full md:w-1/2" {...register('feeSettings.type')}>
                <option value="percentage">درصدی</option>
                <option value="fixed">ثابت</option>
              </select>
            </div>

            <div>
              <label className="block text-dark-400 text-sm mb-2">مقدار کارمزد</label>
              <input type="number" className="input w-full md:w-1/2" {...register('feeSettings.value')} />
              <p className="text-dark-500 text-xs mt-1">برای درصدی: عدد بین 0 تا 100</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-dark-400 text-sm mb-2">حداقل کارمزد</label>
                <input type="number" className="input w-full" {...register('feeSettings.minFee')} />
              </div>
              <div>
                <label className="block text-dark-400 text-sm mb-2">حداکثر کارمزد</label>
                <input type="number" className="input w-full" {...register('feeSettings.maxFee')} />
              </div>
            </div>
          </div>
        )}

        {/* ========== تنظیمات درخواست ========== */}
        {activeTab === 'request' && (
          <div className="card space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FaStore className="text-gold" />
              تنظیمات درخواست
            </h2>

            <div>
              <label className="block text-dark-400 text-sm mb-2">مدت تایمر (دقیقه)</label>
              <input type="number" className="input w-full md:w-1/2" {...register('requestSettings.timerDuration')} />
              <p className="text-dark-500 text-xs mt-1">مدت زمانی که صراف برای تصمیم‌گیری دارد</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-dark-400 text-sm mb-2">حداقل مبلغ</label>
                <input type="number" className="input w-full" {...register('requestSettings.minAmount')} />
              </div>
              <div>
                <label className="block text-dark-400 text-sm mb-2">حداکثر مبلغ</label>
                <input type="number" className="input w-full" {...register('requestSettings.maxAmount')} />
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" className="w-5 h-5 rounded" {...register('requestSettings.autoPublicAfterTimer')} />
              <span className="text-dark-300">انتشار خودکار پس از اتمام تایمر</span>
            </label>
          </div>
        )}

        {/* ========== تنظیمات احراز هویت ========== */}
        {activeTab === 'auth' && (
          <div className="card space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FaUsers className="text-gold" />
              تنظیمات احراز هویت
            </h2>

            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-dark-800 rounded-lg">
                <input type="checkbox" className="w-5 h-5 rounded" {...register('authSettings.requireEmailVerification')} />
                <div>
                  <span className="text-white">تایید ایمیل الزامی</span>
                  <p className="text-dark-500 text-xs">کاربران باید ایمیل خود را تایید کنند</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-3 bg-dark-800 rounded-lg">
                <input type="checkbox" className="w-5 h-5 rounded" {...register('authSettings.requirePhoneVerification')} />
                <div>
                  <span className="text-white">تایید موبایل الزامی</span>
                  <p className="text-dark-500 text-xs">کاربران باید شماره موبایل خود را تایید کنند</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-3 bg-dark-800 rounded-lg">
                <input type="checkbox" className="w-5 h-5 rounded" {...register('authSettings.requireDocuments')} />
                <div>
                  <span className="text-white">مدارک احراز هویت الزامی</span>
                  <p className="text-dark-500 text-xs">آپلود کارت ملی و سلفی الزامی است</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-3 bg-dark-800 rounded-lg">
                <input type="checkbox" className="w-5 h-5 rounded" {...register('registrationSettings.requireAdminApproval')} />
                <div>
                  <span className="text-white">تایید ادمین برای ثبت‌نام</span>
                  <p className="text-dark-500 text-xs">کاربران جدید باید توسط ادمین تایید شوند</p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* ========== تنظیمات هشدارها ========== */}
        {activeTab === 'alerts' && (
          <div className="card space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FaBell className="text-gold" />
              تنظیمات هشدارها و اعلان‌ها
            </h2>

            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer p-3 bg-dark-800 rounded-lg">
                <input type="checkbox" className="w-5 h-5 rounded" defaultChecked />
                <div>
                  <span className="text-white">هشدار Exposure بالا</span>
                  <p className="text-dark-500 text-xs">ارسال هشدار وقتی تعهد صراف به سقف نزدیک می‌شود</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-3 bg-dark-800 rounded-lg">
                <input type="checkbox" className="w-5 h-5 rounded" defaultChecked />
                <div>
                  <span className="text-white">هشدار نوسان شدید</span>
                  <p className="text-dark-500 text-xs">ارسال هشدار در نوسانات شدید قیمت</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-3 bg-dark-800 rounded-lg">
                <input type="checkbox" className="w-5 h-5 rounded" defaultChecked />
                <div>
                  <span className="text-white">هشدار تاخیر وصول</span>
                  <p className="text-dark-500 text-xs">ارسال هشدار برای تسویه‌های معوق</p>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer p-3 bg-dark-800 rounded-lg">
                <input type="checkbox" className="w-5 h-5 rounded" defaultChecked />
                <div>
                  <span className="text-white">هشدار Cut-Off</span>
                  <p className="text-dark-500 text-xs">یادآوری نزدیک شدن به ساعت Cut-Off</p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* دکمه ذخیره */}
        <div className="mt-6 sticky bottom-4">
          <button
            type="submit"
            disabled={saving}
            className="btn-gold flex items-center gap-2 shadow-lg"
          >
            {saving ? <FaSpinner className="animate-spin" /> : <FaSave />}
            ذخیره تنظیمات
          </button>
        </div>
      </form>
    </div>
  );
};

export default Settings;
