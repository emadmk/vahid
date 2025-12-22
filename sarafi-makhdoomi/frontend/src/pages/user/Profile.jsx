import { useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { FaUser, FaLock, FaTelegram, FaSpinner } from 'react-icons/fa';
import useAuthStore from '../../store/authStore';

const Profile = () => {
  const { user, updateProfile, changePassword } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);

  const { register: registerProfile, handleSubmit: handleProfileSubmit, formState: { errors: profileErrors } } = useForm({
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phone: user?.phone || '',
      nationalCode: user?.nationalCode || '',
      address: user?.address || '',
      city: user?.city || ''
    }
  });

  const { register: registerPassword, handleSubmit: handlePasswordSubmit, formState: { errors: passwordErrors }, watch, reset: resetPassword } = useForm();
  const newPassword = watch('newPassword');

  const onProfileSubmit = async (data) => {
    setLoading(true);
    const result = await updateProfile(data);
    setLoading(false);

    if (result.success) {
      toast.success('پروفایل بروزرسانی شد');
    } else {
      toast.error(result.message || 'خطا در بروزرسانی');
    }
  };

  const onPasswordSubmit = async (data) => {
    setLoading(true);
    const result = await changePassword(data.currentPassword, data.newPassword);
    setLoading(false);

    if (result.success) {
      toast.success('رمز عبور تغییر کرد');
      resetPassword();
    } else {
      toast.error(result.message || 'خطا در تغییر رمز عبور');
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-8">تنظیمات حساب</h1>

      {/* تب‌ها */}
      <div className="flex gap-4 mb-6">
        <button
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'profile'
              ? 'bg-gold-500 text-dark-900'
              : 'bg-dark-800 text-dark-400 hover:text-white'
          }`}
          onClick={() => setActiveTab('profile')}
        >
          <FaUser className="inline ml-2" />
          پروفایل
        </button>
        <button
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'password'
              ? 'bg-gold-500 text-dark-900'
              : 'bg-dark-800 text-dark-400 hover:text-white'
          }`}
          onClick={() => setActiveTab('password')}
        >
          <FaLock className="inline ml-2" />
          رمز عبور
        </button>
        <button
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            activeTab === 'telegram'
              ? 'bg-gold-500 text-dark-900'
              : 'bg-dark-800 text-dark-400 hover:text-white'
          }`}
          onClick={() => setActiveTab('telegram')}
        >
          <FaTelegram className="inline ml-2" />
          تلگرام
        </button>
      </div>

      {/* پروفایل */}
      {activeTab === 'profile' && (
        <div className="card-dark">
          <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-dark-400 text-sm mb-2">نام</label>
                <input
                  type="text"
                  className="input-dark"
                  {...registerProfile('firstName', { required: 'نام الزامی است' })}
                />
                {profileErrors.firstName && (
                  <p className="text-red-400 text-xs mt-1">{profileErrors.firstName.message}</p>
                )}
              </div>
              <div>
                <label className="block text-dark-400 text-sm mb-2">نام خانوادگی</label>
                <input
                  type="text"
                  className="input-dark"
                  {...registerProfile('lastName', { required: 'نام خانوادگی الزامی است' })}
                />
              </div>
            </div>

            <div>
              <label className="block text-dark-400 text-sm mb-2">ایمیل</label>
              <input
                type="email"
                className="input-dark bg-dark-700"
                value={user?.email}
                disabled
              />
              <p className="text-dark-500 text-xs mt-1">ایمیل قابل تغییر نیست</p>
            </div>

            <div>
              <label className="block text-dark-400 text-sm mb-2">شماره موبایل</label>
              <input
                type="tel"
                className="input-dark"
                {...registerProfile('phone')}
              />
            </div>

            <div>
              <label className="block text-dark-400 text-sm mb-2">کد ملی</label>
              <input
                type="text"
                className="input-dark"
                {...registerProfile('nationalCode')}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-dark-400 text-sm mb-2">شهر</label>
                <input
                  type="text"
                  className="input-dark"
                  {...registerProfile('city')}
                />
              </div>
              <div>
                <label className="block text-dark-400 text-sm mb-2">آدرس</label>
                <input
                  type="text"
                  className="input-dark"
                  {...registerProfile('address')}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-gold w-full flex items-center justify-center gap-2"
            >
              {loading ? <FaSpinner className="animate-spin" /> : 'ذخیره تغییرات'}
            </button>
          </form>
        </div>
      )}

      {/* رمز عبور */}
      {activeTab === 'password' && (
        <div className="card-dark">
          <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
            <div>
              <label className="block text-dark-400 text-sm mb-2">رمز عبور فعلی</label>
              <input
                type="password"
                className="input-dark"
                {...registerPassword('currentPassword', { required: 'رمز فعلی الزامی است' })}
              />
              {passwordErrors.currentPassword && (
                <p className="text-red-400 text-xs mt-1">{passwordErrors.currentPassword.message}</p>
              )}
            </div>

            <div>
              <label className="block text-dark-400 text-sm mb-2">رمز عبور جدید</label>
              <input
                type="password"
                className="input-dark"
                {...registerPassword('newPassword', {
                  required: 'رمز جدید الزامی است',
                  minLength: { value: 6, message: 'حداقل ۶ کاراکتر' }
                })}
              />
              {passwordErrors.newPassword && (
                <p className="text-red-400 text-xs mt-1">{passwordErrors.newPassword.message}</p>
              )}
            </div>

            <div>
              <label className="block text-dark-400 text-sm mb-2">تکرار رمز عبور</label>
              <input
                type="password"
                className="input-dark"
                {...registerPassword('confirmPassword', {
                  required: 'تکرار رمز الزامی است',
                  validate: v => v === newPassword || 'رمز مطابقت ندارد'
                })}
              />
              {passwordErrors.confirmPassword && (
                <p className="text-red-400 text-xs mt-1">{passwordErrors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-gold w-full flex items-center justify-center gap-2"
            >
              {loading ? <FaSpinner className="animate-spin" /> : 'تغییر رمز عبور'}
            </button>
          </form>
        </div>
      )}

      {/* تلگرام */}
      {activeTab === 'telegram' && (
        <div className="card-dark text-center">
          <FaTelegram className="text-6xl text-blue-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white mb-4">اتصال به ربات تلگرام</h3>
          <p className="text-dark-400 mb-6">
            با اتصال به ربات تلگرام، اعلان‌های درخواست‌ها را دریافت کنید.
          </p>

          {user?.telegramChatId ? (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
              <p className="text-green-400">
                ✓ تلگرام متصل است
                {user.telegramUsername && (
                  <span className="block text-sm mt-1">@{user.telegramUsername}</span>
                )}
              </p>
            </div>
          ) : (
            <a
              href="https://t.me/sarafi2026bot"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-gold inline-flex items-center gap-2"
            >
              <FaTelegram />
              اتصال به ربات
            </a>
          )}

          <p className="text-dark-500 text-sm mt-4">
            پس از شروع ربات، ایمیل خود را وارد کنید تا حساب شما متصل شود.
          </p>
        </div>
      )}
    </div>
  );
};

export default Profile;
