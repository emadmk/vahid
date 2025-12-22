import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { FaSpinner } from 'react-icons/fa';
import { sarafiAPI } from '../../services/api';

const SarafiProfile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const { register, handleSubmit, reset } = useForm();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await sarafiAPI.getProfile();
        reset(res.data.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const onSubmit = async (data) => {
    setSaving(true);
    try {
      await sarafiAPI.updateProfile(data);
      toast.success('پروفایل بروزرسانی شد');
    } catch (e) {
      toast.error('خطا در بروزرسانی');
    } finally {
      setSaving(false);
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
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-8">پروفایل صراف</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* اطلاعات شخصی */}
        <div className="card-dark">
          <h2 className="text-lg font-bold text-white mb-4">اطلاعات شخصی</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-dark-400 text-sm mb-2">نام</label>
              <input
                type="text"
                className="input-dark"
                {...register('firstName')}
              />
            </div>
            <div>
              <label className="block text-dark-400 text-sm mb-2">نام خانوادگی</label>
              <input
                type="text"
                className="input-dark"
                {...register('lastName')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-dark-400 text-sm mb-2">تلفن</label>
              <input
                type="tel"
                className="input-dark"
                {...register('phone')}
              />
            </div>
            <div>
              <label className="block text-dark-400 text-sm mb-2">کد ملی</label>
              <input
                type="text"
                className="input-dark"
                {...register('nationalCode')}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-dark-400 text-sm mb-2">آدرس</label>
            <textarea
              className="input-dark"
              rows={2}
              {...register('address')}
            ></textarea>
          </div>
        </div>

        {/* اطلاعات کسب‌وکار */}
        <div className="card-dark">
          <h2 className="text-lg font-bold text-white mb-4">اطلاعات صرافی</h2>

          <div>
            <label className="block text-dark-400 text-sm mb-2">نام صرافی</label>
            <input
              type="text"
              className="input-dark"
              {...register('sarafiInfo.businessName')}
            />
          </div>

          <div className="mt-4">
            <label className="block text-dark-400 text-sm mb-2">شماره پروانه</label>
            <input
              type="text"
              className="input-dark"
              {...register('sarafiInfo.businessLicense')}
            />
          </div>

          <div className="mt-4">
            <label className="block text-dark-400 text-sm mb-2">آدرس صرافی</label>
            <textarea
              className="input-dark"
              rows={2}
              {...register('sarafiInfo.businessAddress')}
            ></textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-dark-400 text-sm mb-2">تلفن صرافی</label>
              <input
                type="tel"
                className="input-dark"
                {...register('sarafiInfo.businessPhone')}
              />
            </div>
            <div>
              <label className="block text-dark-400 text-sm mb-2">ساعات کاری</label>
              <input
                type="text"
                className="input-dark"
                placeholder="مثال: ۹ صبح تا ۶ عصر"
                {...register('sarafiInfo.workingHours')}
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="block text-dark-400 text-sm mb-2">توضیحات</label>
            <textarea
              className="input-dark"
              rows={3}
              {...register('sarafiInfo.description')}
            ></textarea>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="btn-gold w-full flex items-center justify-center gap-2"
        >
          {saving ? <FaSpinner className="animate-spin" /> : 'ذخیره تغییرات'}
        </button>
      </form>
    </div>
  );
};

export default SarafiProfile;
