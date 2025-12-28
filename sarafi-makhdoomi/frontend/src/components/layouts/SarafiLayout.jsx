import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import {
  FaHome, FaUsers, FaExchangeAlt, FaGlobe, FaUser, FaSignOutAlt,
  FaBars, FaTimes, FaBell, FaCalculator, FaCoins, FaMoneyBillWave, FaStore, FaWallet,
  FaPercent, FaBook, FaUserTie, FaHistory, FaReceipt, FaChartLine, FaComments,
  FaHandshake, FaLayerGroup
} from 'react-icons/fa';
import useAuthStore from '../../store/authStore';
import NotificationDropdown from '../common/NotificationDropdown';

const SarafiLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  const menuItems = [
    { path: '/sarafi', label: 'داشبورد', icon: FaHome },
    { path: '/sarafi/trading', label: 'پنل معاملاتی', icon: FaChartLine, isNew: true },
    { path: '/sarafi/trades', label: 'معاملات', icon: FaExchangeAlt },
    { path: '/sarafi/order-book', label: 'دفتر سفارشات', icon: FaBook },
    { path: '/sarafi/settlements', label: 'پنل وصول', icon: FaHandshake, isNew: true },
    { path: '/sarafi/spreads', label: 'مدیریت اسپرد', icon: FaPercent },
    { path: '/sarafi/receipts', label: 'رسیدها', icon: FaReceipt },
    { path: '/sarafi/accountant', label: 'حسابداری', icon: FaCalculator },
    { path: '/sarafi/currency-collection', label: 'وصول ارزی', icon: FaCoins },
    { path: '/sarafi/rial-collection', label: 'وصول ریالی', icon: FaMoneyBillWave },
    { path: '/sarafi/customer-wallets', label: 'کیف پول مشتریان', icon: FaWallet },
    { path: '/sarafi/customers', label: 'مشتریان', icon: FaUsers },
    { path: '/sarafi/staff', label: 'کارکنان', icon: FaUserTie },
    { path: '/sarafi/messages', label: 'پیام‌ها', icon: FaComments, isNew: true },
    { path: '/sarafi/audit-logs', label: 'لاگ عملیات', icon: FaHistory },
    { path: '/sarafi/profile', label: 'پروفایل', icon: FaUser }
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
            <Link to="/sarafi" className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
                <span className="text-dark-900 font-bold text-xl">ص</span>
              </div>
              <div>
                <h1 className="text-gold-500 font-bold">پنل صراف</h1>
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
                {item.isNew && (
                  <span className="mr-auto text-xs bg-green-500 text-white px-1.5 py-0.5 rounded">جدید</span>
                )}
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
                <p className="text-dark-500 text-xs">صراف</p>
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
            {/* اعلانات */}
            <NotificationDropdown basePath="/sarafi" />
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

export default SarafiLayout;
