import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { FaUser, FaEnvelope, FaLock, FaPhone, FaSpinner, FaUserTie } from 'react-icons/fa';
import useAuthStore from '../../store/authStore';
import { publicAPI } from '../../services/api';

const Register = () => {
  const { register: registerUser, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [sarafis, setSarafis] = useState([]);
  const [role, setRole] = useState('user');
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm();

  const password = watch('password');

  useEffect(() => {
    const fetchSarafis = async () => {
      try {
        const res = await publicAPI.getSarafis();
        setSarafis(res.data.data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchSarafis();
  }, []);

  const onSubmit = async (data) => {
    const userData = {
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
      password: data.password,
      phone: data.phone,
      role,
      selectedSarafi: role === 'user' ? data.selectedSarafi : undefined
    };

    const result = await registerUser(userData);

    if (result.success) {
      toast.success('ثبت‌نام موفق! کد تایید به ایمیل شما ارسال شد.');
      navigate('/verify-email', { state: { email: data.email } });
    } else {
      toast.error(result.message);
    }
  };

  return (
    <div className="card-dark animate-fadeIn">
      <h2 className="text-2xl font-bold text-center text-white mb-8">ثبت‌نام</h2>

      {/* انتخاب نوع کاربر */}
      <div className="flex gap-4 mb-6">
        <button
          type="button"
          className={`flex-1 py-3 rounded-lg border-2 transition-all ${
            role === 'user'
              ? 'border-gold-500 bg-gold-500/10 text-gold-500'
              : 'border-dark-600 text-dark-400 hover:border-dark-500'
          }`}
          onClick={() => setRole('user')}
        >
          <FaUser className="inline ml-2" />
          کاربر عادی
        </button>
        <button
          type="button"
          className={`flex-1 py-3 rounded-lg border-2 transition-all ${
            role === 'sarafi'
              ? 'border-gold-500 bg-gold-500/10 text-gold-500'
              : 'border-dark-600 text-dark-400 hover:border-dark-500'
          }`}
          onClick={() => setRole('sarafi')}
        >
          <FaUserTie className="inline ml-2" />
          صراف
        </button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-dark-400 text-sm mb-2">نام</label>
            <input
              type="text"
              className="input-dark"
              placeholder="نام"
              {...register('firstName', { required: 'نام الزامی است' })}
            />
            {errors.firstName && (
              <p className="text-red-400 text-xs mt-1">{errors.firstName.message}</p>
            )}
          </div>
          <div>
            <label className="block text-dark-400 text-sm mb-2">نام خانوادگی</label>
            <input
              type="text"
              className="input-dark"
              placeholder="نام خانوادگی"
              {...register('lastName', { required: 'نام خانوادگی الزامی است' })}
            />
            {errors.lastName && (
              <p className="text-red-400 text-xs mt-1">{errors.lastName.message}</p>
            )}
          </div>
        </div>

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
            <p className="text-red-400 text-xs mt-1">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label className="block text-dark-400 text-sm mb-2">شماره موبایل</label>
          <div className="relative">
            <FaPhone className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-500" />
            <input
              type="tel"
              className="input-dark pr-12"
              placeholder="۰۹۱۲۳۴۵۶۷۸۹"
              {...register('phone')}
            />
          </div>
        </div>

        {role === 'user' && sarafis.length > 0 && (
          <div>
            <label className="block text-dark-400 text-sm mb-2">انتخاب صراف</label>
            <select
              className="input-dark"
              {...register('selectedSarafi', { required: role === 'user' ? 'انتخاب صراف الزامی است' : false })}
            >
              <option value="">انتخاب کنید...</option>
              {sarafis.map((sarafi) => (
                <option key={sarafi._id} value={sarafi._id}>
                  {sarafi.firstName} {sarafi.lastName}
                  {sarafi.sarafiInfo?.businessName && ` - ${sarafi.sarafiInfo.businessName}`}
                </option>
              ))}
            </select>
            {errors.selectedSarafi && (
              <p className="text-red-400 text-xs mt-1">{errors.selectedSarafi.message}</p>
            )}
          </div>
        )}

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
          </div>
          {errors.password && (
            <p className="text-red-400 text-xs mt-1">{errors.password.message}</p>
          )}
        </div>

        <div>
          <label className="block text-dark-400 text-sm mb-2">تکرار رمز عبور</label>
          <input
            type="password"
            className="input-dark"
            placeholder="••••••••"
            {...register('confirmPassword', {
              required: 'تکرار رمز عبور الزامی است',
              validate: (value) => value === password || 'رمز عبور مطابقت ندارد'
            })}
          />
          {errors.confirmPassword && (
            <p className="text-red-400 text-xs mt-1">{errors.confirmPassword.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-gold w-full flex items-center justify-center gap-2 mt-6"
        >
          {isLoading ? (
            <>
              <FaSpinner className="animate-spin" />
              در حال ثبت‌نام...
            </>
          ) : (
            'ثبت‌نام'
          )}
        </button>
      </form>

      <p className="text-center text-dark-400 mt-6">
        قبلا ثبت‌نام کرده‌اید؟{' '}
        <Link to="/login" className="text-gold-500 hover:text-gold-400">
          وارد شوید
        </Link>
      </p>
    </div>
  );
};

export default Register;
