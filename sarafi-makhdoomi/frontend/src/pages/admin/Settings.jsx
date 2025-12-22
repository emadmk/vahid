import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { FaSave, FaSpinner } from 'react-icons/fa';
import { adminAPI } from '../../services/api';

const Settings = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await adminAPI.getSettings();
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
    { id: 'general', label: 'عمومی' },
    { id: 'fee', label: 'کارمزد' },
    { id: 'request', label: 'درخواست‌ها' },
    { id: 'auth', label: 'احراز هویت' }
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-6">تنظیمات سیستم</h1>

      {/* تب‌ها */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`px-6 py-3 rounded-lg font-medium whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? 'bg-gold-500 text-dark-900'
                : 'bg-dark-800 text-dark-400 hover:text-white'
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* تنظیمات عمومی */}
        {activeTab === 'general' && (
          <div className="card-dark space-y-6">
            <h2 className="text-lg font-bold text-white">اطلاعات سایت</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-dark-400 text-sm mb-2">نام سایت</label>
                <input
                  type="text"
                  className="input-dark"
                  {...register('siteName')}
                />
              </div>
              <div>
                <label className="block text-dark-400 text-sm mb-2">تلفن تماس</label>
                <input
                  type="text"
                  className="input-dark"
                  {...register('contactPhone')}
                />
              </div>
            </div>

            <div>
              <label className="block text-dark-400 text-sm mb-2">توضیحات سایت</label>
              <textarea
                className="input-dark"
                rows={3}
                {...register('siteDescription')}
              ></textarea>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-dark-400 text-sm mb-2">ایمیل</label>
                <input
                  type="email"
                  className="input-dark"
                  {...register('contactEmail')}
                />
              </div>
              <div>
                <label className="block text-dark-400 text-sm mb-2">ساعت کاری</label>
                <input
                  type="text"
                  className="input-dark"
                  {...register('workingHours')}
                />
              </div>
            </div>

            <div>
              <label className="block text-dark-400 text-sm mb-2">آدرس</label>
              <textarea
                className="input-dark"
                rows={2}
                {...register('contactAddress')}
              ></textarea>
            </div>

            <h3 className="text-white font-bold mt-6">شبکه‌های اجتماعی</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-dark-400 text-sm mb-2">تلگرام</label>
                <input
                  type="text"
                  className="input-dark"
                  {...register('socialMedia.telegram')}
                />
              </div>
              <div>
                <label className="block text-dark-400 text-sm mb-2">اینستاگرام</label>
                <input
                  type="text"
                  className="input-dark"
                  {...register('socialMedia.instagram')}
                />
              </div>
              <div>
                <label className="block text-dark-400 text-sm mb-2">واتساپ</label>
                <input
                  type="text"
                  className="input-dark"
                  {...register('socialMedia.whatsapp')}
                />
              </div>
            </div>
          </div>
        )}

        {/* تنظیمات کارمزد */}
        {activeTab === 'fee' && (
          <div className="card-dark space-y-6">
            <h2 className="text-lg font-bold text-white">تنظیمات کارمزد</h2>

            <div>
              <label className="block text-dark-400 text-sm mb-2">نوع کارمزد</label>
              <select className="input-dark" {...register('feeSettings.type')}>
                <option value="percentage">درصدی</option>
                <option value="fixed">ثابت</option>
              </select>
            </div>

            <div>
              <label className="block text-dark-400 text-sm mb-2">مقدار کارمزد</label>
              <input
                type="number"
                className="input-dark"
                {...register('feeSettings.value')}
              />
              <p className="text-dark-500 text-xs mt-1">برای درصدی: عدد بین 0 تا 100</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-dark-400 text-sm mb-2">حداقل کارمزد</label>
                <input
                  type="number"
                  className="input-dark"
                  {...register('feeSettings.minFee')}
                />
              </div>
              <div>
                <label className="block text-dark-400 text-sm mb-2">حداکثر کارمزد</label>
                <input
                  type="number"
                  className="input-dark"
                  {...register('feeSettings.maxFee')}
                />
              </div>
            </div>
          </div>
        )}

        {/* تنظیمات درخواست */}
        {activeTab === 'request' && (
          <div className="card-dark space-y-6">
            <h2 className="text-lg font-bold text-white">تنظیمات درخواست</h2>

            <div>
              <label className="block text-dark-400 text-sm mb-2">مدت تایمر (دقیقه)</label>
              <input
                type="number"
                className="input-dark"
                {...register('requestSettings.timerDuration')}
              />
              <p className="text-dark-500 text-xs mt-1">مدت زمانی که صراف برای تصمیم‌گیری دارد</p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-dark-400 text-sm mb-2">حداقل مبلغ</label>
                <input
                  type="number"
                  className="input-dark"
                  {...register('requestSettings.minAmount')}
                />
              </div>
              <div>
                <label className="block text-dark-400 text-sm mb-2">حداکثر مبلغ</label>
                <input
                  type="number"
                  className="input-dark"
                  {...register('requestSettings.maxAmount')}
                />
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-5 h-5 rounded bg-dark-700 border-dark-600"
                {...register('requestSettings.autoPublicAfterTimer')}
              />
              <span className="text-dark-300">انتشار خودکار پس از اتمام تایمر</span>
            </label>
          </div>
        )}

        {/* تنظیمات احراز هویت */}
        {activeTab === 'auth' && (
          <div className="card-dark space-y-6">
            <h2 className="text-lg font-bold text-white">تنظیمات احراز هویت</h2>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-5 h-5 rounded bg-dark-700 border-dark-600"
                {...register('authSettings.requireEmailVerification')}
              />
              <span className="text-dark-300">تایید ایمیل الزامی</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-5 h-5 rounded bg-dark-700 border-dark-600"
                {...register('authSettings.requirePhoneVerification')}
              />
              <span className="text-dark-300">تایید موبایل الزامی</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-5 h-5 rounded bg-dark-700 border-dark-600"
                {...register('authSettings.requireDocuments')}
              />
              <span className="text-dark-300">مدارک احراز هویت الزامی</span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-5 h-5 rounded bg-dark-700 border-dark-600"
                {...register('registrationSettings.requireAdminApproval')}
              />
              <span className="text-dark-300">تایید ادمین برای ثبت‌نام</span>
            </label>
          </div>
        )}

        {/* دکمه ذخیره */}
        <div className="mt-6">
          <button
            type="submit"
            disabled={saving}
            className="btn-gold flex items-center gap-2"
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
