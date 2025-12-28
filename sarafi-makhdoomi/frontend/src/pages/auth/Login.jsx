import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { FaEnvelope, FaLock, FaSpinner } from 'react-icons/fa';
import useAuthStore from '../../store/authStore';

const Login = () => {
  const { login, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm();

  const onSubmit = async (data) => {
    const result = await login(data.email, data.password);

    if (result.success) {
      const user = useAuthStore.getState().user;

      // بررسی الزام تغییر رمز عبور
      if (result.requirePasswordChange || user?.mustChangePassword || user?.isTemporaryPassword) {
        toast.success('لطفا رمز عبور خود را تغییر دهید');
        navigate('/change-password', { state: { required: true } });
        return;
      }

      toast.success('ورود موفقیت‌آمیز بود');
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
    } else if (result.requireVerification) {
      navigate('/verify-email', { state: { email: data.email } });
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="card-dark animate-fadeIn">
      <h2 className="text-2xl font-bold text-center text-white mb-8">ورود به حساب</h2>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="block text-dark-400 text-sm mb-2">ایمیل</label>
          <div className="relative">
            <FaEnvelope className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-500" />
            <input
              type="email"
              className="input-dark pr-12"
              placeholder="example@email.com"
              {...register('email', {
                required: 'ایمیل الزامی است',
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: 'ایمیل معتبر نیست'
                }
              })}
            />
          </div>
          {errors.email && (
            <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-dark-400 text-sm mb-2">رمز عبور</label>
          <div className="relative">
            <FaLock className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              className="input-dark pr-12"
              placeholder="••••••••"
              {...register('password', {
                required: 'رمز عبور الزامی است',
                minLength: {
                  value: 6,
                  message: 'رمز عبور باید حداقل ۶ کاراکتر باشد'
                }
              })}
            />
            <button
              type="button"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? 'مخفی' : 'نمایش'}
            </button>
          </div>
          {errors.password && (
            <p className="text-red-400 text-sm mt-1">{errors.password.message}</p>
          )}
        </div>

        <div className="flex justify-between items-center">
          <label className="flex items-center gap-2 text-dark-400 text-sm cursor-pointer">
            <input type="checkbox" className="rounded bg-dark-700 border-dark-600" />
            <span>مرا به خاطر بسپار</span>
          </label>
          <Link to="/forgot-password" className="text-gold-500 text-sm hover:text-gold-400">
            فراموشی رمز عبور
          </Link>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-gold w-full flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <FaSpinner className="animate-spin" />
              در حال ورود...
            </>
          ) : (
            'ورود'
          )}
        </button>
      </form>

      <p className="text-center text-dark-400 mt-6">
        حساب ندارید؟{' '}
        <Link to="/register" className="text-gold-500 hover:text-gold-400">
          ثبت‌نام کنید
        </Link>
      </p>
    </div>
  );
};

export default Login;
