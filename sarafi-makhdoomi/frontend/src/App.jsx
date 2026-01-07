import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useEffect } from 'react';
import useAuthStore from './store/authStore';
import { TourProvider } from './components/Tour';

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
import ChangePassword from './pages/auth/ChangePassword';

// صفحات کاربر
import UserDashboard from './pages/user/Dashboard';
import UserProfile from './pages/user/Profile';
import UserWallet from './pages/user/Wallet';
import UserScore from './pages/user/Score';
import UserMarket from './pages/user/Market';
import UserInstantTrade from './pages/user/InstantTrade';
import UserProTrade from './pages/user/ProTrade';

// صفحات صراف
import SarafiDashboard from './pages/sarafi/Dashboard';
import SarafiCustomers from './pages/sarafi/Customers';
import SarafiProfile from './pages/sarafi/Profile';
import SarafiInstantTrade from './pages/sarafi/InstantTrade';
import SarafiProTrade from './pages/sarafi/ProTrade';
import SarafiAccountant from './pages/sarafi/Accountant';
import SarafiCustomerWallets from './pages/sarafi/CustomerWallets';
import SarafiSpreads from './pages/sarafi/Spreads';
import SarafiStaff from './pages/sarafi/Staff';
import SarafiAuditLogs from './pages/sarafi/AuditLogs';
import SarafiReceipts from './pages/sarafi/Receipts';
import SarafiSettlementPanel from './pages/sarafi/SettlementPanel';
import SarafiRates from './pages/sarafi/Rates';
import MessagesPage from './pages/shared/Messages';
import NotificationsPage from './pages/shared/Notifications';
import SarafiGroups from './pages/sarafi/Groups';
import SharedCustomers from './pages/sarafi/SharedCustomers';
import GroupSettlements from './pages/sarafi/GroupSettlements';
import GroupTrades from './pages/sarafi/GroupTrades';
import AllTrades from './pages/sarafi/AllTrades';
import SarafiProfitLoss from './pages/sarafi/ProfitLoss';
import SarafiCRM from './pages/sarafi/CRM';

// صفحات ادمین
import AdminDashboard from './pages/admin/Dashboard';
import AdminUsers from './pages/admin/Users';
import AdminSarafis from './pages/admin/Sarafis';
import AdminCurrencies from './pages/admin/Currencies';
import AdminSettings from './pages/admin/Settings';
import AdminInstantTrades from './pages/admin/InstantTrades';
import AdminProTrades from './pages/admin/ProTrades';
import AdminWallets from './pages/admin/Wallets';
import AdminCustomerTiers from './pages/admin/CustomerTiers';
import AdminCommissions from './pages/admin/Commissions';
import AdminRateScraper from './pages/admin/RateScraper';
import AdminReceipts from './pages/admin/Receipts';
import AdminAuditLogs from './pages/admin/AuditLogs';
import AdminSpreads from './pages/admin/Spreads';

// کامپوننت محافظ روت
const ProtectedRoute = ({ children, roles = [] }) => {
  const { isAuthenticated, user } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // گروه‌بندی نقش‌ها: کارکنان صرافی می‌توانند به پنل صراف دسترسی داشته باشند
  const roleGroups = {
    sarafi: ['sarafi', 'staff_rial', 'staff_currency', 'accountant', 'staff', 'crm']
  };

  const hasAccess = roles.length === 0 || roles.some(role => {
    if (role === user?.role) return true;
    if (roleGroups[role] && roleGroups[role].includes(user?.role)) return true;
    return false;
  });

  if (!hasAccess) {
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
      <TourProvider>
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
          <Route path="/change-password" element={<ChangePassword />} />
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
          <Route path="instant-trade" element={<UserInstantTrade />} />
          <Route path="pro-trade" element={<UserProTrade />} />
          <Route path="market" element={<UserMarket />} />
          <Route path="score" element={<UserScore />} />
          <Route path="profile" element={<UserProfile />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
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
          <Route path="instant-trade" element={<SarafiInstantTrade />} />
          <Route path="pro-trade" element={<SarafiProTrade />} />
          <Route path="spreads" element={<SarafiSpreads />} />
          <Route path="receipts" element={<SarafiReceipts />} />
          <Route path="accountant" element={<SarafiAccountant />} />
          <Route path="customer-wallets" element={<SarafiCustomerWallets />} />
          <Route path="customers" element={<SarafiCustomers />} />
          <Route path="staff" element={<SarafiStaff />} />
          <Route path="audit-logs" element={<SarafiAuditLogs />} />
          <Route path="profile" element={<SarafiProfile />} />
          <Route path="settlements" element={<SarafiSettlementPanel />} />
          <Route path="rates" element={<SarafiRates />} />
          <Route path="groups" element={<SarafiGroups />} />
          <Route path="groups/:groupId/shared-customers" element={<SharedCustomers />} />
          <Route path="group-trades" element={<GroupTrades />} />
          <Route path="group-settlements" element={<GroupSettlements />} />
          <Route path="all-trades" element={<AllTrades />} />
          <Route path="profit-loss" element={<SarafiProfitLoss />} />
          <Route path="crm" element={<SarafiCRM />} />
          <Route path="messages" element={<MessagesPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
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
          <Route path="instant-trades" element={<AdminInstantTrades />} />
          <Route path="pro-trades" element={<AdminProTrades />} />
          <Route path="receipts" element={<AdminReceipts />} />
          <Route path="wallets" element={<AdminWallets />} />
          <Route path="customer-tiers" element={<AdminCustomerTiers />} />
          <Route path="commissions" element={<AdminCommissions />} />
          <Route path="spreads" element={<AdminSpreads />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="sarafis" element={<AdminSarafis />} />
          <Route path="currencies" element={<AdminCurrencies />} />
          <Route path="audit-logs" element={<AdminAuditLogs />} />
          <Route path="rate-scraper" element={<AdminRateScraper />} />
          <Route path="settings" element={<AdminSettings />} />
          <Route path="notifications" element={<NotificationsPage />} />
        </Route>

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </TourProvider>
    </BrowserRouter>
  );
}

export default App;
