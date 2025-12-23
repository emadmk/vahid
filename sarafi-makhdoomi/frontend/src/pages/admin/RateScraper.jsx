import { useState, useEffect } from 'react';
import {
  FaTelegram, FaCog, FaPlay, FaCheck, FaTimes,
  FaSync, FaClock, FaDollarSign, FaCoins, FaGlobe
} from 'react-icons/fa';
import api from '../../services/api';
import toast from 'react-hot-toast';
import jalaliMoment from 'jalali-moment';

// لیست ارزهای قابل انتخاب
const AVAILABLE_CURRENCIES = [
  { code: 'USD', name: 'دلار آمریکا', flag: '🇺🇸' },
  { code: 'EUR', name: 'یورو', flag: '🇪🇺' },
  { code: 'GBP', name: 'پوند انگلیس', flag: '🇬🇧' },
  { code: 'AED', name: 'درهم امارات', flag: '🇦🇪' },
  { code: 'TRY', name: 'لیر ترکیه', flag: '🇹🇷' },
  { code: 'CAD', name: 'دلار کانادا', flag: '🇨🇦' },
  { code: 'AUD', name: 'دلار استرالیا', flag: '🇦🇺' },
  { code: 'CHF', name: 'فرانک سوئیس', flag: '🇨🇭' },
  { code: 'CNY', name: 'یوان چین', flag: '🇨🇳' },
  { code: 'SAR', name: 'ریال سعودی', flag: '🇸🇦' },
  { code: 'KWD', name: 'دینار کویت', flag: '🇰🇼' },
  { code: 'QAR', name: 'ریال قطر', flag: '🇶🇦' },
  { code: 'RUB', name: 'روبل روسیه', flag: '🇷🇺' },
  { code: 'INR', name: 'روپیه هند', flag: '🇮🇳' },
  { code: 'AFN', name: 'افغانی', flag: '🇦🇫' },
  { code: 'IQD', name: 'دینار عراق', flag: '🇮🇶' }
];

const RateScraper = () => {
  const [settings, setSettings] = useState({
    enabled: false,
    source: 'tgju',
    intervalMinutes: 5,
    activeCurrencies: ['USD', 'EUR', 'GBP', 'AED', 'TRY', 'CAD'],
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

  // تست TGJU
  const [tgjuTestResult, setTgjuTestResult] = useState(null);
  const [tgjuTestLoading, setTgjuTestLoading] = useState(false);

  // تست کانال تلگرام
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
        toast.success(`${res.data.updatedCount || 0} ارز به‌روزرسانی شد`);
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

  const handleTestTgju = async () => {
    setTgjuTestLoading(true);
    setTgjuTestResult(null);
    try {
      const res = await api.post('/admin/rate-scraper/test-tgju');
      if (res.data.success) {
        setTgjuTestResult(res.data.rates);
        toast.success(res.data.message);
      } else {
        toast.error(res.data.message || 'خطا');
      }
    } catch (e) {
      toast.error(e.response?.data?.message || 'خطا در تست');
    } finally {
      setTgjuTestLoading(false);
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

  const toggleCurrency = (code) => {
    const current = settings.activeCurrencies || [];
    if (current.includes(code)) {
      setSettings({ ...settings, activeCurrencies: current.filter(c => c !== code) });
    } else {
      setSettings({ ...settings, activeCurrencies: [...current, code] });
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
        <h1 className="text-2xl font-bold text-white">اسکرپر نرخ ارز</h1>
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

      {/* وضعیت */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
            <div className="w-12 h-12 rounded-lg bg-gold-500/20 flex items-center justify-center">
              {settings.source === 'tgju' ? (
                <FaGlobe className="text-gold-500 text-xl" />
              ) : (
                <FaTelegram className="text-blue-500 text-xl" />
              )}
            </div>
            <div>
              <p className="text-dark-400 text-sm">منبع داده</p>
              <p className="text-white font-bold">
                {settings.source === 'tgju' ? 'TGJU.org' : 'تلگرام'}
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
              <p className="text-white font-bold text-sm">
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
        {/* تنظیمات اصلی */}
        <div className="card-dark">
          <div className="flex items-center gap-2 mb-4">
            <FaCog className="text-gold-500" />
            <h3 className="text-white font-bold">تنظیمات اصلی</h3>
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
              <label className="block text-dark-400 text-sm mb-2">منبع داده</label>
              <div className="flex gap-3">
                <button
                  onClick={() => setSettings({ ...settings, source: 'tgju' })}
                  className={`flex-1 py-3 px-4 rounded-lg border transition-all flex items-center justify-center gap-2 ${
                    settings.source === 'tgju'
                      ? 'bg-gold-500/20 border-gold-500 text-gold-500'
                      : 'border-dark-600 text-dark-400 hover:border-dark-500'
                  }`}
                >
                  <FaGlobe />
                  <span>TGJU.org</span>
                  <span className="text-xs">(پیشنهادی)</span>
                </button>
                <button
                  onClick={() => setSettings({ ...settings, source: 'telegram' })}
                  className={`flex-1 py-3 px-4 rounded-lg border transition-all flex items-center justify-center gap-2 ${
                    settings.source === 'telegram'
                      ? 'bg-blue-500/20 border-blue-500 text-blue-500'
                      : 'border-dark-600 text-dark-400 hover:border-dark-500'
                  }`}
                >
                  <FaTelegram />
                  <span>تلگرام</span>
                </button>
              </div>
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

        {/* انتخاب ارزها */}
        {settings.source === 'tgju' && (
          <div className="card-dark">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold">ارزهای فعال برای به‌روزرسانی</h3>
              <button
                onClick={handleTestTgju}
                disabled={tgjuTestLoading}
                className="btn-outline px-4 py-2 flex items-center gap-2"
              >
                {tgjuTestLoading ? <FaSync className="animate-spin" /> : <FaGlobe />}
                تست اتصال
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {AVAILABLE_CURRENCIES.map(currency => (
                <button
                  key={currency.code}
                  onClick={() => toggleCurrency(currency.code)}
                  className={`py-2 px-3 rounded-lg border text-sm transition-all flex items-center gap-2 ${
                    (settings.activeCurrencies || []).includes(currency.code)
                      ? 'bg-gold-500/20 border-gold-500 text-gold-500'
                      : 'border-dark-600 text-dark-400 hover:border-dark-500'
                  }`}
                >
                  <span>{currency.flag}</span>
                  <span>{currency.code}</span>
                </button>
              ))}
            </div>

            {/* نتیجه تست TGJU */}
            {tgjuTestResult && (
              <div className="mt-4 bg-green-500/10 border border-green-500/30 rounded-lg p-4">
                <p className="text-green-400 font-bold mb-2">✅ اتصال موفق - نرخ‌های دریافتی:</p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  {Object.entries(tgjuTestResult).slice(0, 9).map(([code, rate]) => (
                    <div key={code} className="text-dark-300">
                      <span className="text-gold-500">{code}:</span> {rate?.toLocaleString()}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* تنظیمات تلگرام */}
        {settings.source === 'telegram' && (
          <>
            <div className="card-dark">
              <div className="flex items-center gap-2 mb-4">
                <FaTelegram className="text-blue-500" />
                <h3 className="text-white font-bold">تنظیمات کانال‌ها</h3>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
                <p className="text-blue-400 text-sm">
                  نرخ‌ها از کانال‌های عمومی تلگرام خوانده می‌شوند. نیازی به API یا لاگین نیست!
                </p>
              </div>

              <div className="space-y-4">
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
              </div>
            </div>

            {/* ضرایب تبدیل برای تلگرام */}
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

            {/* نتیجه تست کانال تلگرام */}
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
          </>
        )}
      </div>
    </div>
  );
};

export default RateScraper;
