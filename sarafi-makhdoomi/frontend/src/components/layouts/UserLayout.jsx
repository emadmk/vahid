import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  FaHome, FaPlus, FaList, FaGlobe, FaUser, FaSignOutAlt,
  FaBars, FaTimes, FaWallet, FaStar, FaStore, FaExchangeAlt, FaBook,
  FaComments, FaBell
} from 'react-icons/fa';
import useAuthStore from '../../store/authStore';
import ViewModeToggle from '../common/ViewModeToggle';
import NotificationDropdown from '../common/NotificationDropdown';

const UserLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { path: '/dashboard', label: 'داشبورد', icon: FaHome },
    { path: '/dashboard/wallet', label: 'کیف پول', icon: FaWallet },
    { path: '/dashboard/trades', label: 'معاملات', icon: FaExchangeAlt },
    { path: '/dashboard/orders', label: 'سفارشات', icon: FaBook },
    { path: '/dashboard/market', label: 'بازار', icon: FaStore },
    { path: '/dashboard/score', label: 'امتیاز', icon: FaStar },
    { path: '/dashboard/new-request', label: 'درخواست جدید', icon: FaPlus },
    { path: '/dashboard/requests', label: 'درخواست‌های من', icon: FaList },
    { path: '/dashboard/public-requests', label: 'درخواست‌های عمومی', icon: FaGlobe },
    { path: '/dashboard/messages', label: 'پیام‌ها', icon: FaComments, isNew: true },
    { path: '/dashboard/profile', label: 'پروفایل', icon: FaUser }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getStatusBadge = () => {
    switch (user?.status) {
      case 'approved':
        return <span className="badge badge-success">تایید شده</span>;
      case 'pending':
        return <span className="badge badge-warning">در انتظار تایید</span>;
      case 'rejected':
        return <span className="badge badge-danger">رد شده</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex">
      {/* سایدبار */}
      <aside className={`fixed lg:static inset-y-0 right-0 z-50 w-64 bg-dark-900 border-l border-dark-800 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
        <div className="flex flex-col h-full">
          {/* هدر سایدبار */}
          <div className="p-6 border-b border-dark-800">
            <Link to="/dashboard" className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
                <span className="text-dark-900 font-bold text-xl">ص</span>
              </div>
              <div>
                <h1 className="text-gold-500 font-bold">پنل کاربری</h1>
                <p className="text-dark-500 text-xs">صرافی گلدن 2026</p>
              </div>
            </Link>
          </div>

          {/* منو */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {menuItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
                {item.isNew && (
                  <span className="mr-auto text-xs bg-green-500 text-white px-1.5 py-0.5 rounded">جدید</span>
                )}
              </Link>
            ))}
          </nav>

          {/* پروفایل */}
          <div className="p-4 border-t border-dark-800">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-500">
                {user?.firstName?.[0]}
              </div>
              <div>
                <p className="text-white font-medium text-sm">{user?.firstName} {user?.lastName}</p>
                {getStatusBadge()}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors mt-4"
            >
              <FaSignOutAlt />
              <span>خروج</span>
            </button>
          </div>
        </div>
      </aside>

      {/* محتوای اصلی */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* هدر */}
        <header className="h-16 bg-dark-900/80 backdrop-blur-sm border-b border-dark-800 flex items-center justify-between px-6 sticky top-0 z-40">
          <button
            className="lg:hidden text-gold-500 text-xl"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <FaTimes /> : <FaBars />}
          </button>

          <div className="flex-1 lg:hidden text-center">
            <span className="text-gold-500 font-bold">صرافی گلدن 2026</span>
          </div>

          <div className="flex items-center gap-4">
            {/* تاگل نمای ساده/حرفه‌ای */}
            <ViewModeToggle />

            {/* اعلانات */}
            <NotificationDropdown basePath="/dashboard" />
          </div>
        </header>

        {/* پیام وضعیت */}
        {user?.status === 'pending' && (
          <div className="bg-yellow-500/10 border-b border-yellow-500/30 px-6 py-3 text-yellow-400 text-sm">
            حساب شما در انتظار تایید است. پس از تایید توسط صراف یا ادمین می‌توانید درخواست ثبت کنید.
          </div>
        )}

        {user?.status === 'rejected' && (
          <div className="bg-red-500/10 border-b border-red-500/30 px-6 py-3 text-red-400 text-sm">
            متاسفانه درخواست شما رد شده است. {user?.rejectionReason && `علت: ${user.rejectionReason}`}
          </div>
        )}

        {/* محتوا */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>

      {/* اورلی موبایل */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default UserLayout;
