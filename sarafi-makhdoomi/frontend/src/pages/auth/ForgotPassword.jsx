import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { FaEnvelope, FaLock, FaSpinner, FaArrowRight } from 'react-icons/fa';
import api from '../../services/api';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: email, 2: otp, 3: new password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const password = watch('password');

  const handleSendOtp = async (data) => {
    setLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: data.email });
      setEmail(data.email);
      setStep(2);
      toast.success('کد بازیابی ارسال شد');
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در ارسال کد');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error('کد ۶ رقمی را وارد کنید');
      return;
    }
    setStep(3);
  };

  const handleResetPassword = async (data) => {
    setLoading(true);
    try {
      await api.post('/auth/reset-password', {
        email,
        otp,
        newPassword: data.password
      });
      toast.success('رمز عبور با موفقیت تغییر کرد');
      navigate('/login');
    } catch (error) {
      toast.error(error.response?.data?.message || 'خطا در تغییر رمز عبور');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card-dark animate-fadeIn">
      <h2 className="text-2xl font-bold text-center text-white mb-4">بازیابی رمز عبور</h2>
      <p className="text-dark-400 text-center mb-8">
        {step === 1 && 'ایمیل خود را وارد کنید'}
        {step === 2 && 'کد ارسال شده را وارد کنید'}
        {step === 3 && 'رمز عبور جدید را وارد کنید'}
      </p>

      {step === 1 && (
        <form onSubmit={handleSubmit(handleSendOtp)} className="space-y-6">
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

          <button
            type="submit"
            disabled={loading}
            className="btn-gold w-full flex items-center justify-center gap-2"
          >
            {loading ? <FaSpinner className="animate-spin" /> : 'ارسال کد'}
          </button>
        </form>
      )}

      {step === 2 && (
        <div className="space-y-6">
          <div>
            <label className="block text-dark-400 text-sm mb-2">کد تایید</label>
            <input
              type="text"
              className="input-dark text-center text-2xl tracking-widest"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              placeholder="------"
            />
          </div>

          <button
            onClick={handleVerifyOtp}
            disabled={otp.length !== 6}
            className="btn-gold w-full"
          >
            ادامه
          </button>
        </div>
      )}

      {step === 3 && (
        <form onSubmit={handleSubmit(handleResetPassword)} className="space-y-6">
          <div>
            <label className="block text-dark-400 text-sm mb-2">رمز عبور جدید</label>
            <div className="relative">
              <FaLock className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-500" />
              <input
                type="password"
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
              <p className="text-red-400 text-sm mt-1">{errors.password.message}</p>
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
              <p className="text-red-400 text-sm mt-1">{errors.confirmPassword.message}</p>
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
      )}

      <div className="mt-6 text-center">
        <Link to="/login" className="text-gold-500 hover:text-gold-400 flex items-center justify-center gap-2">
          <FaArrowRight />
          بازگشت به صفحه ورود
        </Link>
      </div>
    </div>
  );
};

export default ForgotPassword;
