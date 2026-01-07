import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import {
  FaHome, FaUsers, FaExchangeAlt, FaUser, FaSignOutAlt,
  FaBars, FaTimes, FaCalculator, FaCoins, FaWallet,
  FaPercent, FaUserTie, FaHistory, FaReceipt, FaChartLine, FaComments,
  FaHandshake, FaDollarSign, FaUserFriends, FaChevronDown, FaChevronLeft,
  FaBriefcase, FaChartPie, FaClipboardList, FaCog, FaStore, FaHeadset
} from 'react-icons/fa';
import useAuthStore from '../../store/authStore';
import NotificationDropdown from '../common/NotificationDropdown';
import { HelpButton, useTourAutoStart } from '../Tour';
import api from '../../services/api';

const SarafiLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [pendingGroupTrades, setPendingGroupTrades] = useState(0);
  const [expandedSections, setExpandedSections] = useState(['trading', 'groups', 'financial', 'settlement', 'crm', 'customers', 'system']);
  const { user, logout } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();

  // شروع خودکار تور در اولین بازدید
  useTourAutoStart('sarafi', 1500);

  // دریافت تعداد معاملات گروهی در انتظار
  useEffect(() => {
    const fetchGroupTradesCount = async () => {
      try {
        const res = await api.get('/sarafi-groups/settlements', { params: { status: 'pending' } });
        const count = res.data.data?.length || 0;
        setPendingGroupTrades(count);
      } catch (error) {
        console.error('Error fetching group trades count:', error);
      }
    };
    fetchGroupTradesCount();
    const interval = setInterval(fetchGroupTradesCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // ساختار منو با دسته‌بندی
  const menuSections = [
    {
      id: 'trading',
      title: 'معاملات',
      icon: FaBriefcase,
      color: 'from-blue-500 to-blue-600',
      textColor: 'text-blue-400',
      bgColor: 'bg-blue-500/10',
      items: [
        { path: '/sarafi', label: 'داشبورد', icon: FaHome },
        { path: '/sarafi/instant-trade', label: 'خرید و فروش فوری', icon: FaExchangeAlt },
        { path: '/sarafi/pro-trade', label: 'خرید و فروش حرفه‌ای', icon: FaChartLine },
        { path: '/sarafi/all-trades', label: 'معاملات', icon: FaHistory, isNew: true }
      ]
    },
    {
      id: 'groups',
      title: 'گروه‌های صراف',
      icon: FaUserFriends,
      color: 'from-indigo-500 to-indigo-600',
      textColor: 'text-indigo-400',
      bgColor: 'bg-indigo-500/10',
      items: [
        { path: '/sarafi/groups', label: 'مدیریت گروه‌ها', icon: FaUserFriends, badge: pendingGroupTrades },
        { path: '/sarafi/group-trades', label: 'معاملات گروهی', icon: FaExchangeAlt }
      ]
    },
    {
      id: 'financial',
      title: 'مدیریت مالی',
      icon: FaChartPie,
      color: 'from-emerald-500 to-emerald-600',
      textColor: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      items: [
        { path: '/sarafi/rates', label: 'مدیریت نرخ‌ها', icon: FaDollarSign },
        { path: '/sarafi/spreads', label: 'مدیریت اسپرد', icon: FaPercent },
        { path: '/sarafi/profit-loss', label: 'سود و زیان', icon: FaCoins }
      ]
    },
    {
      id: 'settlement',
      title: 'تسویه و حسابداری',
      icon: FaClipboardList,
      color: 'from-amber-500 to-amber-600',
      textColor: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      items: [
        { path: '/sarafi/settlements', label: 'پنل وصول', icon: FaHandshake },
        { path: '/sarafi/accountant', label: 'حسابداری', icon: FaCalculator, isNew: true }
      ]
    },
    {
      id: 'crm',
      title: 'پنل CRM',
      icon: FaHeadset,
      color: 'from-pink-500 to-rose-600',
      textColor: 'text-pink-400',
      bgColor: 'bg-pink-500/10',
      items: [
        { path: '/sarafi/crm', label: 'مدیریت ارتباط مشتری', icon: FaHeadset, isNew: true }
      ]
    },
    {
      id: 'customers',
      title: 'مشتریان',
      icon: FaUsers,
      color: 'from-purple-500 to-purple-600',
      textColor: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      items: [
        { path: '/sarafi/customers', label: 'مشتریان', icon: FaUsers },
        { path: '/sarafi/customer-wallets', label: 'کیف پول مشتریان', icon: FaWallet }
      ]
    },
    {
      id: 'system',
      title: 'سیستم',
      icon: FaCog,
      color: 'from-slate-500 to-slate-600',
      textColor: 'text-slate-400',
      bgColor: 'bg-slate-500/10',
      items: [
        { path: '/sarafi/messages', label: 'پیام‌ها', icon: FaComments },
        { path: '/sarafi/audit-logs', label: 'لاگ عملیات', icon: FaHistory },
        { path: '/sarafi/staff', label: 'کارکنان', icon: FaUserTie },
        { path: '/sarafi/profile', label: 'پروفایل', icon: FaUser }
      ]
    }
  ];

  const toggleSection = (sectionId) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const isActive = (path) => location.pathname === path;

  const isSectionActive = (section) =>
    section.items.some(item => location.pathname === item.path);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-dark-950 flex">
      {/* سایدبار */}
      <aside
        data-tour="sidebar"
        className={`fixed lg:static inset-y-0 right-0 z-50 w-72 bg-gradient-to-b from-dark-900 via-dark-900 to-dark-950 border-l border-dark-800/50 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}
      >
        <div className="flex flex-col h-full">
          {/* هدر سایدبار */}
          <div className="p-5 border-b border-dark-800/50">
            <Link to="/sarafi" className="flex items-center gap-3 group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gold-400 via-gold-500 to-gold-600 flex items-center justify-center shadow-lg shadow-gold-500/20 group-hover:shadow-gold-500/40 transition-shadow">
                <FaStore className="text-dark-900 text-xl" />
              </div>
              <div>
                <h1 className="text-gold-500 font-bold text-lg">پنل صراف</h1>
                <p className="text-dark-500 text-xs">صرافی گلدن 2026</p>
              </div>
            </Link>
          </div>

          {/* منو با دسته‌بندی */}
          <nav className="flex-1 p-3 overflow-y-auto custom-scrollbar">
            <div className="space-y-3">
              {menuSections.map((section, sectionIndex) => (
                <div key={section.id} className="relative">
                  {/* تیتر بخش */}
                  <button
                    onClick={() => toggleSection(section.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group
                      ${isSectionActive(section) ? section.bgColor : 'hover:bg-dark-800/50'}
                    `}
                  >
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${section.color} flex items-center justify-center shadow-md`}>
                      <section.icon className="text-white text-sm" />
                    </div>
                    <span className={`font-medium text-sm ${isSectionActive(section) ? section.textColor : 'text-dark-300 group-hover:text-white'}`}>
                      {section.title}
                    </span>
                    <FaChevronDown
                      className={`mr-auto text-dark-500 text-xs transition-transform duration-200 ${expandedSections.includes(section.id) ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* آیتم‌های بخش */}
                  <div className={`overflow-hidden transition-all duration-300 ${expandedSections.includes(section.id) ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="mt-1 mr-4 pr-3 border-r border-dark-800/50 space-y-0.5">
                      {section.items.map((item) => (
                        <Link
                          key={item.path}
                          to={item.path}
                          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-200
                            ${isActive(item.path)
                              ? `bg-gradient-to-l ${section.color} text-white shadow-md`
                              : 'text-dark-400 hover:text-white hover:bg-dark-800/50'
                            }
                          `}
                        >
                          <item.icon className={`w-4 h-4 ${isActive(item.path) ? 'text-white' : ''}`} />
                          <span>{item.label}</span>
                          {item.badge > 0 && (
                            <span className="mr-auto text-xs bg-red-500 text-white px-2 py-0.5 rounded-full min-w-[22px] text-center font-medium animate-pulse">
                              {item.badge}
                            </span>
                          )}
                          {item.isNew && (
                            <span className="mr-auto text-[10px] bg-gradient-to-r from-green-500 to-emerald-500 text-white px-2 py-0.5 rounded-full font-medium">
                              جدید
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* خط جداکننده */}
                  {sectionIndex < menuSections.length - 1 && (
                    <div className="mt-3 mx-3 border-b border-dark-800/30"></div>
                  )}
                </div>
              ))}
            </div>
          </nav>

          {/* پروفایل کاربر */}
          <div className="p-4 border-t border-dark-800/50 bg-dark-900/50">
            <div className="flex items-center gap-3 mb-3 p-2 rounded-xl bg-dark-800/30">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-dark-900 font-bold shadow-lg shadow-gold-500/20">
                {user?.firstName?.[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm truncate">{user?.firstName} {user?.lastName}</p>
                <p className="text-dark-500 text-xs flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  صراف فعال
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-red-400 hover:text-white hover:bg-red-500/20 border border-red-500/20 hover:border-red-500/40 transition-all duration-200"
            >
              <FaSignOutAlt />
              <span className="text-sm font-medium">خروج از حساب</span>
            </button>
          </div>
        </div>
      </aside>

      {/* محتوای اصلی */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* هدر */}
        <header className="h-16 bg-dark-900/80 backdrop-blur-xl border-b border-dark-800/50 flex items-center justify-between px-6 sticky top-0 z-40">
          <button
            className="lg:hidden text-gold-500 text-xl p-2 rounded-lg hover:bg-dark-800 transition-colors"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <FaTimes /> : <FaBars />}
          </button>

          <div className="flex items-center gap-4">
            {/* راهنما */}
            <HelpButton userRole="sarafi" />

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
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* استایل اسکرول سفارشی */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(212, 175, 55, 0.3);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(212, 175, 55, 0.5);
        }
      `}</style>
    </div>
  );
};

export default SarafiLayout;
