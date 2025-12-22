import { Outlet, Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { FaBars, FaTimes, FaUser, FaSignInAlt } from 'react-icons/fa';
import useAuthStore from '../../store/authStore';

const MainLayout = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  const navLinks = [
    { path: '/', label: 'صفحه اصلی' },
    { path: '/rates', label: 'نرخ ارز' },
    { path: '/about', label: 'درباره ما' },
    { path: '/contact', label: 'تماس با ما' }
  ];

  const getDashboardLink = () => {
    if (!user) return '/dashboard';
    switch (user.role) {
      case 'admin': return '/admin';
      case 'sarafi': return '/sarafi';
      default: return '/dashboard';
    }
  };

  return (
    <div className="min-h-screen bg-dark-950">
      {/* هدر */}
      <header className="glass-dark sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-20">
            {/* لوگو */}
            <Link to="/" className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
                <span className="text-dark-900 font-bold text-xl">ص</span>
              </div>
              <div>
                <h1 className="text-gold-500 font-bold text-lg">صرافی گلدن 2026</h1>
              </div>
            </Link>

            {/* منوی دسکتاپ */}
            <nav className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`nav-link ${location.pathname === link.path ? 'active' : ''}`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* دکمه‌های ورود */}
            <div className="hidden md:flex items-center gap-4">
              {isAuthenticated ? (
                <Link to={getDashboardLink()} className="btn-gold flex items-center gap-2">
                  <FaUser />
                  پنل کاربری
                </Link>
              ) : (
                <>
                  <Link to="/login" className="btn-outline flex items-center gap-2">
                    <FaSignInAlt />
                    ورود
                  </Link>
                  <Link to="/register" className="btn-gold">
                    ثبت‌نام
                  </Link>
                </>
              )}
            </div>

            {/* دکمه منو موبایل */}
            <button
              className="md:hidden text-gold-500 text-2xl"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? <FaTimes /> : <FaBars />}
            </button>
          </div>
        </div>

        {/* منوی موبایل */}
        {isMenuOpen && (
          <div className="md:hidden bg-dark-900 border-t border-dark-700 animate-fadeIn">
            <nav className="container mx-auto px-4 py-4 space-y-4">
              {navLinks.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`block py-2 ${location.pathname === link.path ? 'text-gold-500' : 'text-dark-300'}`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <div className="pt-4 border-t border-dark-700 space-y-3">
                {isAuthenticated ? (
                  <Link
                    to={getDashboardLink()}
                    className="btn-gold w-full flex items-center justify-center gap-2"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <FaUser />
                    پنل کاربری
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="btn-outline w-full flex items-center justify-center gap-2"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      ورود
                    </Link>
                    <Link
                      to="/register"
                      className="btn-gold w-full block text-center"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      ثبت‌نام
                    </Link>
                  </>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* محتوا */}
      <main>
        <Outlet />
      </main>

      {/* فوتر */}
      <footer className="bg-dark-900 border-t border-dark-800 mt-20">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* درباره ما */}
            <div>
              <h3 className="text-gold-500 font-bold text-lg mb-4">صرافی گلدن 2026</h3>
              <p className="text-dark-400 text-sm leading-7">
                با بیش از سال‌ها تجربه در زمینه خرید و فروش ارز، آماده ارائه بهترین خدمات به شما هستیم.
              </p>
            </div>

            {/* لینک‌های سریع */}
            <div>
              <h3 className="text-gold-500 font-bold text-lg mb-4">دسترسی سریع</h3>
              <ul className="space-y-2">
                {navLinks.map((link) => (
                  <li key={link.path}>
                    <Link to={link.path} className="text-dark-400 hover:text-gold-500 text-sm">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* تماس با ما */}
            <div>
              <h3 className="text-gold-500 font-bold text-lg mb-4">تماس با ما</h3>
              <ul className="space-y-2 text-dark-400 text-sm">
                <li>تلفن: ۰۲۱-XXXXXXXX</li>
                <li>ایمیل: info@sarafi.com</li>
                <li>آدرس: تهران</li>
              </ul>
            </div>

            {/* شبکه‌های اجتماعی */}
            <div>
              <h3 className="text-gold-500 font-bold text-lg mb-4">ما را دنبال کنید</h3>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 rounded-full bg-dark-800 flex items-center justify-center text-dark-400 hover:bg-gold-500 hover:text-dark-900 transition-all">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-dark-800 flex items-center justify-center text-dark-400 hover:bg-gold-500 hover:text-dark-900 transition-all">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-dark-800 mt-8 pt-8 text-center text-dark-500 text-sm">
            <p>© {new Date().getFullYear()} صرافی گلدن 2026 - تمامی حقوق محفوظ است</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
