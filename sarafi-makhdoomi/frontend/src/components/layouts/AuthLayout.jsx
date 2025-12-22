import { Outlet, Link } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="min-h-screen bg-dark-950 flex">
      {/* سمت راست - فرم */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* لوگو */}
          <Link to="/" className="flex items-center justify-center gap-3 mb-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
              <span className="text-dark-900 font-bold text-2xl">ص</span>
            </div>
          </Link>
          <h1 className="text-center text-gold-500 font-bold text-2xl mb-2">صرافی حاج عباس مخدومی</h1>
          <p className="text-center text-dark-400 text-sm mb-8">خرید و فروش ارز با بهترین نرخ</p>

          {/* فرم */}
          <Outlet />
        </div>
      </div>

      {/* سمت چپ - تصویر */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 items-center justify-center relative overflow-hidden">
        {/* پترن طلایی */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-gold-500 rounded-full blur-3xl"></div>
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-gold-600 rounded-full blur-3xl"></div>
        </div>

        {/* محتوا */}
        <div className="relative z-10 text-center p-12">
          <div className="w-32 h-32 mx-auto mb-8 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center animate-pulse-gold">
            <span className="text-dark-900 font-bold text-5xl">ص</span>
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">به صرافی ما خوش آمدید</h2>
          <p className="text-dark-300 text-lg leading-8 max-w-md">
            با ثبت‌نام در صرافی حاج عباس مخدومی، از امکان خرید و فروش ارز با بهترین نرخ بهره‌مند شوید.
          </p>

          <div className="mt-12 grid grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-gold-500 text-3xl font-bold mb-2">۲۴/۷</div>
              <div className="text-dark-400 text-sm">پشتیبانی</div>
            </div>
            <div className="text-center">
              <div className="text-gold-500 text-3xl font-bold mb-2">+۱۰۰۰</div>
              <div className="text-dark-400 text-sm">مشتری</div>
            </div>
            <div className="text-center">
              <div className="text-gold-500 text-3xl font-bold mb-2">۷+</div>
              <div className="text-dark-400 text-sm">نوع ارز</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
