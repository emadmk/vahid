import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import useAuthStore from './store/authStore';

// لایوت‌ها
import MainLayout from './components/layouts/MainLayout';
import AuthLayout from './components/layouts/AuthLayout';
import AdminLayout from './components/layouts/AdminLayout';
import SarafiLayout from './components/layouts/SarafiLayout';
import UserLayout from './components/layouts/UserLayout';

// صفحات عمومی
import Home from './pages/public/Home';
import Rates from './pages/public/Rates';
import About from './pages/public/About';
import Contact from './pages/public/Contact';

// صفحات احراز هویت
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import VerifyEmail from './pages/auth/VerifyEmail';
import ForgotPassword from './pages/auth/ForgotPassword';

// صفحات کاربر
import UserDashboard from './pages/user/Dashboard';
import UserRequests from './pages/user/Requests';
import NewRequest from './pages/user/NewRequest';
import UserProfile from './pages/user/Profile';
import PublicRequests from './pages/user/PublicRequests';
import UserWallet from './pages/user/Wallet';
import UserScore from './pages/user/Score';
import UserMarket from './pages/user/Market';
import UserTrades from './pages/user/Trades';

// صفحات صراف
import SarafiDashboard from './pages/sarafi/Dashboard';
import SarafiRequests from './pages/sarafi/Requests';
import SarafiCustomers from './pages/sarafi/Customers';
import SarafiPublicRequests from './pages/sarafi/PublicRequests';
import SarafiProfile from './pages/sarafi/Profile';
import SarafiTrades from './pages/sarafi/Trades';
import SarafiAccountant from './pages/sarafi/Accountant';
import SarafiCurrencyCollection from './pages/sarafi/CurrencyCollection';
import SarafiRialCollection from './pages/sarafi/RialCollection';

// صفحات ادمین
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminSarafis from './pages/admin/Sarafis';
import AdminRequests from './pages/admin/Requests';
import AdminCurrencies from './pages/admin/Currencies';
import AdminSettings from './pages/admin/Settings';

// کامپوننت محافظ روت
const ProtectedRoute = ({ children, roles = [] }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (roles.length > 0 && !roles.includes(user?.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
};

function App() {
  const { getMe, token } = useAuthStore();

  useEffect(() => {
    if (token) {
      getMe();
    }
  }, [token]);

  return (
    <BrowserRouter>
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e293b',
            color: '#fff',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '16px'
          },
          success: {
            iconTheme: {
              primary: '#d4af37',
              secondary: '#1e293b'
            }
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#1e293b'
            }
          }
        }}
      />

      <Routes>
        {/* صفحات عمومی */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/rates" element={<Rates />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
        </Route>

        {/* صفحات احراز هویت */}
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
        </Route>

        {/* پنل کاربر */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute roles={['user']}>
              <UserLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<UserDashboard />} />
          <Route path="wallet" element={<UserWallet />} />
          <Route path="trades" element={<UserTrades />} />
          <Route path="market" element={<UserMarket />} />
          <Route path="score" element={<UserScore />} />
          <Route path="requests" element={<UserRequests />} />
          <Route path="new-request" element={<NewRequest />} />
          <Route path="public-requests" element={<PublicRequests />} />
          <Route path="profile" element={<UserProfile />} />
        </Route>

        {/* پنل صراف */}
        <Route
          path="/sarafi"
          element={
            <ProtectedRoute roles={['sarafi']}>
              <SarafiLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<SarafiDashboard />} />
          <Route path="trades" element={<SarafiTrades />} />
          <Route path="accountant" element={<SarafiAccountant />} />
          <Route path="currency-collection" element={<SarafiCurrencyCollection />} />
          <Route path="rial-collection" element={<SarafiRialCollection />} />
          <Route path="requests" element={<SarafiRequests />} />
          <Route path="customers" element={<SarafiCustomers />} />
          <Route path="public-requests" element={<SarafiPublicRequests />} />
          <Route path="profile" element={<SarafiProfile />} />
        </Route>

        {/* پنل ادمین */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute roles={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="sarafis" element={<AdminSarafis />} />
          <Route path="requests" element={<AdminRequests />} />
          <Route path="currencies" element={<AdminCurrencies />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
