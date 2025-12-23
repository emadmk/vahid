import { useState, useEffect } from 'react';
import {
  FaTelegram, FaCog, FaPlay, FaCheck, FaTimes,
  FaSync, FaClock, FaDollarSign, FaCoins
} from 'react-icons/fa';
import api from '../../services/api';
import toast from 'react-hot-toast';
import jalaliMoment from 'jalali-moment';

const RateScraper = () => {
  const [settings, setSettings] = useState({
    enabled: false,
    intervalMinutes: 5,
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
    lastError: null
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [running, setRunning] = useState(false);

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
        toast.success('کانال با موفقیت خوانده شد');
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
            disabled={running}
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

      {/* راهنما */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-6">
        <p className="text-blue-400">
          <FaTelegram className="inline ml-2" />
          این سیستم نرخ‌ها را از کانال‌های عمومی تلگرام می‌خواند و به‌صورت خودکار در سیستم به‌روزرسانی می‌کند.
          نیازی به API یا لاگین تلگرام نیست!
        </p>
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
                  disabled={testLoading}
                  className="btn-outline px-4"
                >
                  {testLoading ? <FaSync className="animate-spin" /> : 'تست'}
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
                  disabled={testLoading}
                  className="btn-outline px-4"
                >
                  {testLoading ? <FaSync className="animate-spin" /> : 'تست'}
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
        <div className="card-dark">
          <h3 className="text-white font-bold mb-4">ضرایب تبدیل دلار به سایر ارزها</h3>
          <p className="text-dark-400 text-sm mb-4">
            نرخ سایر ارزها بر اساس نرخ دلار و این ضرایب محاسبه می‌شوند.
          </p>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div className="grid grid-cols-3 gap-4">
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
                <label className="block text-dark-400 text-sm mb-2">دلار کانادا</label>
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
                <label className="block text-dark-400 text-sm mb-2">لیر ترکیه</label>
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
        </div>

        {/* نتیجه تست */}
        {testResult && (
          <div className="card-dark lg:col-span-2">
            <h3 className="text-white font-bold mb-4">نتیجه تست کانال: @{testResult.channel}</h3>

            <div className="bg-dark-700/50 rounded-lg p-4 mb-4">
              <p className="text-dark-400 text-sm mb-2">آخرین پیام:</p>
              <p className="text-white whitespace-pre-wrap text-sm">{testResult.message}</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className={`rounded-lg p-4 ${testResult.dollarRate ? 'bg-green-500/10 border border-green-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                <p className="text-dark-400 text-sm mb-2">نرخ دلار استخراج شده:</p>
                {testResult.dollarRate ? (
                  <div>
                    <p className="text-green-400 text-lg font-bold">
                      خرید: {testResult.dollarRate.buyRate?.toLocaleString()} تومان
                    </p>
                    <p className="text-green-400 text-lg font-bold">
                      فروش: {testResult.dollarRate.sellRate?.toLocaleString()} تومان
                    </p>
                  </div>
                ) : (
                  <p className="text-red-400">استخراج نشد - فرمت پیام با الگوها مطابقت ندارد</p>
                )}
              </div>
              <div className={`rounded-lg p-4 ${testResult.goldRate ? 'bg-yellow-500/10 border border-yellow-500/30' : 'bg-red-500/10 border border-red-500/30'}`}>
                <p className="text-dark-400 text-sm mb-2">نرخ طلا استخراج شده:</p>
                {testResult.goldRate ? (
                  <div>
                    <p className="text-yellow-400 text-lg font-bold">
                      خرید: {testResult.goldRate.buyRate?.toLocaleString()} تومان
                    </p>
                    <p className="text-yellow-400 text-lg font-bold">
                      فروش: {testResult.goldRate.sellRate?.toLocaleString()} تومان
                    </p>
                  </div>
                ) : (
                  <p className="text-red-400">استخراج نشد - فرمت پیام با الگوها مطابقت ندارد</p>
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
