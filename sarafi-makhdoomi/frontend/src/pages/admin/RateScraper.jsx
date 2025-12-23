import { useState, useEffect } from 'react';
import {
  FaTelegram, FaCog, FaPlay, FaCheck, FaTimes,
  FaSync, FaClock, FaDollarSign, FaCoins, FaKey, FaPhone
} from 'react-icons/fa';
import api from '../../services/api';
import toast from 'react-hot-toast';
import jalaliMoment from 'jalali-moment';

const RateScraper = () => {
  const [settings, setSettings] = useState({
    enabled: false,
    intervalMinutes: 5,
    telegramApiId: '',
    telegramApiHash: '',
    dollarChannel: 'dollar_tehran3bze',
    goldChannel: 'abshdh',
    conversionRates: {
      usdToEur: 0.92,
      usdToGbp: 0.79,
      usdToAed: 3.67,
      usdToCad: 1.36,
      usdToTry: 32.5
    },
    buySpread: 0.5,
    sellSpread: 0.5,
    lastRun: null,
    lastError: null,
    telegramSession: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

  // احراز هویت تلگرام
  const [authStep, setAuthStep] = useState(0); // 0: not started, 1: waiting code, 2: done
  const [phoneNumber, setPhoneNumber] = useState('');
  const [phoneCodeHash, setPhoneCodeHash] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // تست کانال
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/admin/rate-scraper/settings');
      if (res.data.success) {
        setSettings(prev => ({ ...prev, ...res.data.data }));
        if (res.data.data.telegramSession) {
          setAuthStep(2);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put('/admin/rate-scraper/settings', settings);
      toast.success('تنظیمات ذخیره شد');
    } catch (e) {
      toast.error(e.response?.data?.message || 'خطا در ذخیره');
    } finally {
      setSaving(false);
    }
  };

  const handleRun = async () => {
    setRunning(true);
    try {
      const res = await api.post('/admin/rate-scraper/run');
      if (res.data.success) {
        toast.success('نرخ‌ها به‌روزرسانی شد');
        fetchSettings();
      } else {
        toast.error(res.data.message || res.data.error || 'خطا');
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'خطا در اجرا');
    } finally {
      setRunning(false);
    }
  };

  const handleStartAuth = async () => {
    if (!settings.telegramApiId || !settings.telegramApiHash || !phoneNumber) {
      toast.error('همه فیلدها را پر کنید');
      return;
    }

    setAuthLoading(true);
    try {
      const res = await api.post('/admin/rate-scraper/auth/start', {
        apiId: settings.telegramApiId,
        apiHash: settings.telegramApiHash,
        phoneNumber
      });

      if (res.data.success) {
        setPhoneCodeHash(res.data.phoneCodeHash);
        setAuthStep(1);
        toast.success('کد تایید به تلگرام شما ارسال شد');
      } else {
        toast.error(res.data.error || 'خطا');
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'خطا');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verifyCode) {
      toast.error('کد را وارد کنید');
      return;
    }

    setAuthLoading(true);
    try {
      const res = await api.post('/admin/rate-scraper/auth/verify', {
        phoneNumber,
        phoneCodeHash,
        code: verifyCode
      });

      if (res.data.success) {
        setAuthStep(2);
        toast.success('لاگین موفق به تلگرام');
        fetchSettings();
      } else {
        toast.error(res.data.error || 'کد نادرست');
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'خطا');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleTestChannel = async (channel, type) => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await api.post('/admin/rate-scraper/test-channel', {
        channelUsername: channel
      });

      if (res.data.success) {
        setTestResult({
          type,
          channel,
          message: res.data.data.message,
          dollarRate: res.data.data.parsedDollarRate,
          goldRate: res.data.data.parsedGoldRate
        });
      } else {
        toast.error(res.data.message || 'خطا');
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'خطا در تست');
    } finally {
      setTestLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">اسکرپر نرخ از تلگرام</h1>
        <div className="flex gap-3">
          <button
            onClick={handleRun}
            disabled={running || authStep !== 2}
            className="btn-gold flex items-center gap-2"
          >
            {running ? <FaSync className="animate-spin" /> : <FaPlay />}
            اجرای دستی
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            {saving ? <FaSync className="animate-spin" /> : <FaCheck />}
            ذخیره تنظیمات
          </button>
        </div>
      </div>

      {/* وضعیت */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card-dark">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
              settings.enabled ? 'bg-green-500/20' : 'bg-red-500/20'
            }`}>
              {settings.enabled ? (
                <FaCheck className="text-green-500 text-xl" />
              ) : (
                <FaTimes className="text-red-500 text-xl" />
              )}
            </div>
            <div>
              <p className="text-dark-400 text-sm">وضعیت</p>
              <p className={`font-bold ${settings.enabled ? 'text-green-500' : 'text-red-500'}`}>
                {settings.enabled ? 'فعال' : 'غیرفعال'}
              </p>
            </div>
          </div>
        </div>

        <div className="card-dark">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <FaClock className="text-blue-500 text-xl" />
            </div>
            <div>
              <p className="text-dark-400 text-sm">بازه به‌روزرسانی</p>
              <p className="text-white font-bold">هر {settings.intervalMinutes} دقیقه</p>
            </div>
          </div>
        </div>

        <div className="card-dark">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <FaSync className="text-purple-500 text-xl" />
            </div>
            <div>
              <p className="text-dark-400 text-sm">آخرین اجرا</p>
              <p className="text-white font-bold">
                {settings.lastRun
                  ? jalaliMoment(settings.lastRun).format('jYYYY/jMM/jDD HH:mm')
                  : 'هنوز اجرا نشده'}
              </p>
              {settings.lastError && (
                <p className="text-red-400 text-xs mt-1">{settings.lastError}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* تنظیمات API تلگرام */}
        <div className="card-dark">
          <div className="flex items-center gap-2 mb-4">
            <FaTelegram className="text-blue-400 text-xl" />
            <h3 className="text-white font-bold">احراز هویت تلگرام</h3>
            {authStep === 2 && (
              <span className="badge badge-success mr-auto">متصل</span>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-dark-700/50 rounded-lg p-4 text-sm text-dark-300">
              <p className="mb-2">برای دریافت API ID و API Hash:</p>
              <ol className="list-decimal mr-4 space-y-1">
                <li>به <a href="https://my.telegram.org" target="_blank" rel="noopener" className="text-blue-400 hover:underline">my.telegram.org</a> بروید</li>
                <li>با شماره تلگرام خود لاگین کنید</li>
                <li>روی "API development tools" کلیک کنید</li>
                <li>یک اپ بسازید و API ID و Hash را کپی کنید</li>
              </ol>
            </div>

            <div>
              <label className="block text-dark-400 text-sm mb-2">API ID</label>
              <input
                type="text"
                className="input-dark"
                placeholder="12345678"
                value={settings.telegramApiId}
                onChange={(e) => setSettings({ ...settings, telegramApiId: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-dark-400 text-sm mb-2">API Hash</label>
              <input
                type="text"
                className="input-dark"
                placeholder="abcdef1234567890..."
                value={settings.telegramApiHash}
                onChange={(e) => setSettings({ ...settings, telegramApiHash: e.target.value })}
              />
            </div>

            {authStep === 0 && (
              <>
                <div>
                  <label className="block text-dark-400 text-sm mb-2">شماره تلفن (با +98)</label>
                  <input
                    type="text"
                    className="input-dark"
                    placeholder="+989123456789"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleStartAuth}
                  disabled={authLoading}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {authLoading ? <FaSync className="animate-spin" /> : <FaPhone />}
                  ارسال کد تایید
                </button>
              </>
            )}

            {authStep === 1 && (
              <>
                <div>
                  <label className="block text-dark-400 text-sm mb-2">کد تایید تلگرام</label>
                  <input
                    type="text"
                    className="input-dark"
                    placeholder="12345"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleVerifyCode}
                  disabled={authLoading}
                  className="btn-primary w-full flex items-center justify-center gap-2"
                >
                  {authLoading ? <FaSync className="animate-spin" /> : <FaKey />}
                  تایید کد
                </button>
              </>
            )}

            {authStep === 2 && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 text-green-400 text-center">
                <FaCheck className="inline ml-2" />
                به تلگرام متصل هستید
              </div>
            )}
          </div>
        </div>

        {/* تنظیمات کانال‌ها */}
        <div className="card-dark">
          <div className="flex items-center gap-2 mb-4">
            <FaCog className="text-gold-500" />
            <h3 className="text-white font-bold">تنظیمات کانال‌ها</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-white">فعال کردن اسکرپر</label>
              <button
                onClick={() => setSettings({ ...settings, enabled: !settings.enabled })}
                className={`w-14 h-7 rounded-full transition-colors relative ${
                  settings.enabled ? 'bg-green-500' : 'bg-dark-600'
                }`}
              >
                <div className={`w-5 h-5 rounded-full bg-white absolute top-1 transition-all ${
                  settings.enabled ? 'right-1' : 'left-1'
                }`} />
              </button>
            </div>

            <div>
              <label className="block text-dark-400 text-sm mb-2">بازه به‌روزرسانی (دقیقه)</label>
              <input
                type="number"
                className="input-dark"
                min="1"
                max="60"
                value={settings.intervalMinutes}
                onChange={(e) => setSettings({ ...settings, intervalMinutes: parseInt(e.target.value) })}
              />
            </div>

            <div>
              <label className="block text-dark-400 text-sm mb-2 flex items-center gap-2">
                <FaDollarSign className="text-green-500" />
                کانال دلار (بدون @)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input-dark flex-1"
                  placeholder="dollar_tehran3bze"
                  value={settings.dollarChannel}
                  onChange={(e) => setSettings({ ...settings, dollarChannel: e.target.value })}
                />
                <button
                  onClick={() => handleTestChannel(settings.dollarChannel, 'dollar')}
                  disabled={testLoading || authStep !== 2}
                  className="btn-outline px-4"
                >
                  تست
                </button>
              </div>
            </div>

            <div>
              <label className="block text-dark-400 text-sm mb-2 flex items-center gap-2">
                <FaCoins className="text-yellow-500" />
                کانال طلا (بدون @)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className="input-dark flex-1"
                  placeholder="abshdh"
                  value={settings.goldChannel}
                  onChange={(e) => setSettings({ ...settings, goldChannel: e.target.value })}
                />
                <button
                  onClick={() => handleTestChannel(settings.goldChannel, 'gold')}
                  disabled={testLoading || authStep !== 2}
                  className="btn-outline px-4"
                >
                  تست
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-dark-400 text-sm mb-2">اسپرد خرید (%)</label>
                <input
                  type="number"
                  className="input-dark"
                  step="0.1"
                  min="0"
                  value={settings.buySpread}
                  onChange={(e) => setSettings({ ...settings, buySpread: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-dark-400 text-sm mb-2">اسپرد فروش (%)</label>
                <input
                  type="number"
                  className="input-dark"
                  step="0.1"
                  min="0"
                  value={settings.sellSpread}
                  onChange={(e) => setSettings({ ...settings, sellSpread: parseFloat(e.target.value) })}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ضرایب تبدیل */}
        <div className="card-dark lg:col-span-2">
          <h3 className="text-white font-bold mb-4">ضرایب تبدیل دلار به سایر ارزها</h3>
          <p className="text-dark-400 text-sm mb-4">
            این ضرایب برای محاسبه نرخ سایر ارزها بر اساس نرخ دلار استفاده می‌شوند.
            مثلاً اگر ضریب یورو 0.92 باشد، یعنی هر 1 دلار = 0.92 یورو
          </p>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-dark-400 text-sm mb-2">یورو (EUR)</label>
              <input
                type="number"
                className="input-dark"
                step="0.01"
                value={settings.conversionRates?.usdToEur || 0.92}
                onChange={(e) => setSettings({
                  ...settings,
                  conversionRates: { ...settings.conversionRates, usdToEur: parseFloat(e.target.value) }
                })}
              />
            </div>
            <div>
              <label className="block text-dark-400 text-sm mb-2">پوند (GBP)</label>
              <input
                type="number"
                className="input-dark"
                step="0.01"
                value={settings.conversionRates?.usdToGbp || 0.79}
                onChange={(e) => setSettings({
                  ...settings,
                  conversionRates: { ...settings.conversionRates, usdToGbp: parseFloat(e.target.value) }
                })}
              />
            </div>
            <div>
              <label className="block text-dark-400 text-sm mb-2">درهم (AED)</label>
              <input
                type="number"
                className="input-dark"
                step="0.01"
                value={settings.conversionRates?.usdToAed || 3.67}
                onChange={(e) => setSettings({
                  ...settings,
                  conversionRates: { ...settings.conversionRates, usdToAed: parseFloat(e.target.value) }
                })}
              />
            </div>
            <div>
              <label className="block text-dark-400 text-sm mb-2">دلار کانادا (CAD)</label>
              <input
                type="number"
                className="input-dark"
                step="0.01"
                value={settings.conversionRates?.usdToCad || 1.36}
                onChange={(e) => setSettings({
                  ...settings,
                  conversionRates: { ...settings.conversionRates, usdToCad: parseFloat(e.target.value) }
                })}
              />
            </div>
            <div>
              <label className="block text-dark-400 text-sm mb-2">لیر ترکیه (TRY)</label>
              <input
                type="number"
                className="input-dark"
                step="0.1"
                value={settings.conversionRates?.usdToTry || 32.5}
                onChange={(e) => setSettings({
                  ...settings,
                  conversionRates: { ...settings.conversionRates, usdToTry: parseFloat(e.target.value) }
                })}
              />
            </div>
          </div>
        </div>

        {/* نتیجه تست */}
        {testResult && (
          <div className="card-dark lg:col-span-2">
            <h3 className="text-white font-bold mb-4">نتیجه تست کانال: @{testResult.channel}</h3>

            <div className="bg-dark-700/50 rounded-lg p-4 mb-4">
              <p className="text-dark-400 text-sm mb-2">پیام:</p>
              <p className="text-white whitespace-pre-wrap text-sm">{testResult.message}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <p className="text-dark-400 text-sm mb-2">نرخ دلار استخراج شده:</p>
                {testResult.dollarRate ? (
                  <p className="text-green-400">
                    خرید: {testResult.dollarRate.buyRate?.toLocaleString()} -
                    فروش: {testResult.dollarRate.sellRate?.toLocaleString()}
                  </p>
                ) : (
                  <p className="text-red-400">استخراج نشد</p>
                )}
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                <p className="text-dark-400 text-sm mb-2">نرخ طلا استخراج شده:</p>
                {testResult.goldRate ? (
                  <p className="text-yellow-400">
                    خرید: {testResult.goldRate.buyRate?.toLocaleString()} -
                    فروش: {testResult.goldRate.sellRate?.toLocaleString()}
                  </p>
                ) : (
                  <p className="text-red-400">استخراج نشد</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RateScraper;
