import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { FaLock, FaSpinner, FaExclamationTriangle, FaEye, FaEyeSlash } from 'react-icons/fa';
import useAuthStore from '../../store/authStore';
import api from '../../services/api';

const ChangePassword = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const isRequired = location.state?.required || user?.mustChangePassword || user?.isTemporaryPassword;

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm();

  const newPassword = watch('newPassword');

  // اگر کاربر لاگین نیست، به صفحه لاگین هدایت شود
  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  const onSubmit = async (data) => {
    if (data.newPassword !== data.confirmPassword) {
      toast.error('رمز عبور جدید و تکرار آن مطابقت ندارند');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.put('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword
      });

      if (response.data.success) {
        toast.success('رمز عبور با موفقیت تغییر کرد');

        // هدایت به پنل مربوطه
        switch (user?.role) {
          case 'admin':
            navigate('/admin');
            break;
          case 'sarafi':
            navigate('/sarafi');
            break;
          default:
            navigate('/dashboard');
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در تغییر رمز عبور');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="card-dark animate-fadeIn max-w-md mx-auto">
      {/* هشدار اجباری بودن */}
      {isRequired && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mb-6 flex items-start gap-3">
          <FaExclamationTriangle className="text-amber-500 text-xl flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-amber-500 font-bold mb-1">تغییر رمز عبور الزامی است</h3>
            <p className="text-dark-400 text-sm">
              رمز عبور فعلی شما موقت است. برای ادامه استفاده از سیستم، باید یک رمز عبور جدید انتخاب کنید.
            </p>
          </div>
        </div>
      )}

      <h2 className="text-2xl font-bold text-center text-white mb-8">
        {isRequired ? 'انتخاب رمز عبور جدید' : 'تغییر رمز عبور'}
      </h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* رمز عبور فعلی */}
        <div>
          <label className="block text-dark-400 text-sm mb-2">
            {isRequired ? 'رمز عبور موقت' : 'رمز عبور فعلی'}
          </label>
          <div className="relative">
            <FaLock className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-500" />
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              className="input-dark pr-12 pl-12"
              placeholder="رمز عبور فعلی را وارد کنید"
              {...register('currentPassword', {
                required: 'رمز عبور فعلی الزامی است'
              })}
            />
            <button
              type="button"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
            >
              {showCurrentPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          {errors.currentPassword && (
            <p className="text-red-400 text-sm mt-1">{errors.currentPassword.message}</p>
          )}
        </div>

        {/* رمز عبور جدید */}
        <div>
          <label className="block text-dark-400 text-sm mb-2">رمز عبور جدید</label>
          <div className="relative">
            <FaLock className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-500" />
            <input
              type={showNewPassword ? 'text' : 'password'}
              className="input-dark pr-12 pl-12"
              placeholder="رمز عبور جدید را وارد کنید"
              {...register('newPassword', {
                required: 'رمز عبور جدید الزامی است',
                minLength: {
                  value: 8,
                  message: 'رمز عبور باید حداقل ۸ کاراکتر باشد'
                },
                pattern: {
                  value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                  message: 'رمز عبور باید شامل حروف بزرگ، کوچک و عدد باشد'
                }
              })}
            />
            <button
              type="button"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300"
              onClick={() => setShowNewPassword(!showNewPassword)}
            >
              {showNewPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          {errors.newPassword && (
            <p className="text-red-400 text-sm mt-1">{errors.newPassword.message}</p>
          )}

          {/* راهنمای رمز عبور */}
          <div className="mt-2 text-xs text-dark-500">
            <p>رمز عبور باید شامل موارد زیر باشد:</p>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              <li className={newPassword?.length >= 8 ? 'text-green-500' : ''}>حداقل ۸ کاراکتر</li>
              <li className={/[A-Z]/.test(newPassword || '') ? 'text-green-500' : ''}>حداقل یک حرف بزرگ</li>
              <li className={/[a-z]/.test(newPassword || '') ? 'text-green-500' : ''}>حداقل یک حرف کوچک</li>
              <li className={/\d/.test(newPassword || '') ? 'text-green-500' : ''}>حداقل یک عدد</li>
            </ul>
          </div>
        </div>

        {/* تکرار رمز عبور جدید */}
        <div>
          <label className="block text-dark-400 text-sm mb-2">تکرار رمز عبور جدید</label>
          <div className="relative">
            <FaLock className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-500" />
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              className="input-dark pr-12 pl-12"
              placeholder="رمز عبور جدید را مجددا وارد کنید"
              {...register('confirmPassword', {
                required: 'تکرار رمز عبور الزامی است',
                validate: value => value === newPassword || 'رمز عبور مطابقت ندارد'
              })}
            />
            <button
              type="button"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-red-400 text-sm mt-1">{errors.confirmPassword.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-gold w-full flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <FaSpinner className="animate-spin" />
              در حال ثبت...
            </>
          ) : (
            'ثبت رمز عبور جدید'
          )}
        </button>

        {/* دکمه خروج فقط در حالت اجباری */}
        {isRequired && (
          <button
            type="button"
            onClick={handleLogout}
            className="w-full text-center text-dark-400 hover:text-red-400 text-sm py-2"
          >
            خروج از حساب کاربری
          </button>
        )}
      </form>
    </div>
  );
};

export default ChangePassword;
