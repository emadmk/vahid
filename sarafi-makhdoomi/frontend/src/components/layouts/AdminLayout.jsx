import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  FaHome, FaUsers, FaExchangeAlt, FaCoins, FaCog, FaSignOutAlt,
  FaBars, FaTimes, FaBell, FaUserTie, FaWallet, FaMedal, FaPercent, FaTelegram
} from 'react-icons/fa';
import useAuthStore from '../../store/authStore';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { path: '/admin', label: 'داشبورد', icon: FaHome },
    { path: '/admin/trades', label: 'معاملات', icon: FaExchangeAlt },
    { path: '/admin/wallets', label: 'کیف پول‌ها', icon: FaWallet },
    { path: '/admin/users', label: 'کاربران', icon: FaUsers },
    { path: '/admin/sarafis', label: 'صراف‌ها', icon: FaUserTie },
    { path: '/admin/customer-tiers', label: 'رده‌بندی مشتریان', icon: FaMedal },
    { path: '/admin/commissions', label: 'کارمزد', icon: FaPercent },
    { path: '/admin/currencies', label: 'ارزها', icon: FaCoins },
    { path: '/admin/rate-scraper', label: 'اسکرپر نرخ', icon: FaTelegram },
    { path: '/admin/requests', label: 'درخواست‌ها (قدیم)', icon: FaExchangeAlt },
    { path: '/admin/settings', label: 'تنظیمات', icon: FaCog }
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-dark-950 flex">
      {/* سایدبار */}
      <aside className={`fixed lg:static inset-y-0 right-0 z-50 w-64 bg-dark-900 border-l border-dark-800 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
        <div className="flex flex-col h-full">
          {/* هدر سایدبار */}
          <div className="p-6 border-b border-dark-800">
            <Link to="/admin" className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
                <span className="text-dark-900 font-bold text-xl">ص</span>
              </div>
              <div>
                <h1 className="text-gold-500 font-bold">پنل ادمین</h1>
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
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* پروفایل */}
          <div className="p-4 border-t border-dark-800">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-gold-500/20 flex items-center justify-center text-gold-500">
                {user?.firstName?.[0]}
              </div>
              <div>
                <p className="text-white font-medium text-sm">{user?.firstName} {user?.lastName}</p>
                <p className="text-dark-500 text-xs">ادمین</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2 rounded-lg text-red-400 hover:bg-red-500/10 transition-colors"
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

          <div className="flex items-center gap-4">
            <button className="relative text-dark-400 hover:text-gold-500 transition-colors">
              <FaBell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                3
              </span>
            </button>
          </div>
        </header>

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

export default AdminLayout;
