import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { FaSpinner } from 'react-icons/fa';
import useAuthStore from '../../store/authStore';

const VerifyEmail = () => {
  const { verifyEmail, resendOtp, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || '';

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [resending, setResending] = useState(false);

  const handleChange = (index, value) => {
    if (value.length > 1) value = value[0];
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // فوکوس به خانه بعدی
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pastedData)) return;

    const newOtp = pastedData.split('');
    while (newOtp.length < 6) newOtp.push('');
    setOtp(newOtp);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = otp.join('');
    if (code.length !== 6) {
      toast.error('لطفا کد ۶ رقمی را وارد کنید');
      return;
    }

    const result = await verifyEmail(email, code);

    if (result.success) {
      toast.success('ایمیل با موفقیت تایید شد');
      const user = useAuthStore.getState().user;
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
    } else {
      toast.error(result.message);
    }
  };

  const handleResend = async () => {
    setResending(true);
    const result = await resendOtp(email);
    setResending(false);

    if (result.success) {
      toast.success('کد جدید ارسال شد');
    } else {
      toast.error(result.message || 'خطا در ارسال کد');
    }
  };

  return (
    <div className="card-dark animate-fadeIn text-center">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gold-500/10 flex items-center justify-center">
        <span className="text-gold-500 text-3xl">✉️</span>
      </div>

      <h2 className="text-2xl font-bold text-white mb-4">تایید ایمیل</h2>
      <p className="text-dark-400 mb-8">
        کد ۶ رقمی ارسال شده به <span className="text-gold-500">{email}</span> را وارد کنید
      </p>

      <form onSubmit={handleSubmit}>
        <div className="flex justify-center gap-3 mb-8" dir="ltr" onPaste={handlePaste}>
          {otp.map((digit, index) => (
            <input
              key={index}
              id={`otp-${index}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              className="w-12 h-14 text-center text-2xl font-bold bg-dark-800 border border-dark-600 rounded-lg text-white focus:border-gold-500 focus:outline-none"
              style={{ direction: 'ltr' }}
            />
          ))}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="btn-gold w-full flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <FaSpinner className="animate-spin" />
              در حال تایید...
            </>
          ) : (
            'تایید'
          )}
        </button>
      </form>

      <p className="text-dark-400 mt-6 text-sm">
        کد را دریافت نکردید؟{' '}
        <button
          onClick={handleResend}
          disabled={resending}
          className="text-gold-500 hover:text-gold-400 disabled:opacity-50"
        >
          {resending ? 'در حال ارسال...' : 'ارسال مجدد'}
        </button>
      </p>
    </div>
  );
};

export default VerifyEmail;
