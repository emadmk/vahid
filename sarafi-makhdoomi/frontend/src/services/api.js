import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor برای اضافه کردن token
api.interceptors.request.use(
  (config) => {
    const authStorage = localStorage.getItem('auth-storage');
    if (authStorage) {
      const { state } = JSON.parse(authStorage);
      if (state?.token) {
        config.headers.Authorization = `Bearer ${state.token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor برای مدیریت خطاها
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth-storage');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// سرویس‌های API

// عمومی
export const publicAPI = {
  getRates: () => api.get('/public/rates'),
  getSettings: () => api.get('/public/settings'),
  getSarafis: () => api.get('/public/sarafis')
};

// درخواست‌ها
export const requestAPI = {
  create: (data) => api.post('/requests', data),
  getMyRequests: (params) => api.get('/requests/my', { params }),
  getRequest: (id) => api.get(`/requests/${id}`),
  cancel: (id, reason) => api.put(`/requests/${id}/cancel`, { reason }),
  getPublic: (params) => api.get('/requests/public', { params }),

  // صراف
  getSarafiRequests: (params) => api.get('/requests/sarafi/list', { params }),
  setVisibility: (id, visibility) => api.put(`/requests/${id}/visibility`, { visibility }),
  accept: (id) => api.put(`/requests/${id}/accept`),
  setInProgress: (id, notes) => api.put(`/requests/${id}/in-progress`, { notes }),
  complete: (id) => api.put(`/requests/${id}/complete`),

  // ادمین
  getAll: (params) => api.get('/requests/admin/all', { params }),
  getStats: () => api.get('/requests/admin/stats'),
  reject: (id, reason) => api.put(`/requests/${id}/reject`, { reason })
};

// ادمین
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),

  // کاربران
  getUsers: (params) => api.get('/admin/users', { params }),
  getUser: (id) => api.get(`/admin/users/${id}`),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  approveUser: (id) => api.put(`/admin/users/${id}/approve`),
  rejectUser: (id, reason) => api.put(`/admin/users/${id}/reject`, { reason }),
  suspendUser: (id, reason) => api.put(`/admin/users/${id}/suspend`, { reason }),
  changeRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getUnknownUsers: () => api.get('/admin/users/unknown'),

  // ارزها
  getCurrencies: () => api.get('/admin/currencies'),
  createCurrency: (data) => api.post('/admin/currencies', data),
  updateCurrency: (id, data) => api.put(`/admin/currencies/${id}`, data),
  deleteCurrency: (id) => api.delete(`/admin/currencies/${id}`),
  updateRates: (rates) => api.put('/admin/currencies/rates/batch', { rates }),

  // تنظیمات
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data) => api.put('/admin/settings', data),

  // معاملات
  getTrades: (params) => api.get('/admin/trades', { params }),
  getTradeStats: () => api.get('/admin/trades/stats'),

  // کیف پول‌ها
  getWallets: (params) => api.get('/admin/wallets', { params }),
  getWalletStats: () => api.get('/admin/wallets/stats'),
  getWalletTransactions: (id) => api.get(`/admin/wallets/${id}/transactions`),

  // رده‌بندی مشتریان
  getCustomerTiers: () => api.get('/admin/customer-tiers'),
  getCustomerTierStats: () => api.get('/admin/customer-tiers/stats'),
  createCustomerTier: (data) => api.post('/admin/customer-tiers', data),
  updateCustomerTier: (id, data) => api.put(`/admin/customer-tiers/${id}`, data),
  deleteCustomerTier: (id) => api.delete(`/admin/customer-tiers/${id}`),

  // کارمزد
  getCommissions: () => api.get('/admin/commissions'),
  getCommissionStats: () => api.get('/admin/commissions/stats'),
  createCommission: (data) => api.post('/admin/commissions', data),
  updateCommission: (id, data) => api.put(`/admin/commissions/${id}`, data),
  deleteCommission: (id) => api.delete(`/admin/commissions/${id}`)
};

// صراف
export const sarafiAPI = {
  getDashboard: () => api.get('/sarafi/dashboard'),
  getProfile: () => api.get('/sarafi/profile'),
  updateProfile: (data) => api.put('/sarafi/profile', data),
  getCustomers: (params) => api.get('/sarafi/customers', { params }),
  approveCustomer: (id) => api.put(`/sarafi/customers/${id}/approve`),
  unknownCustomer: (id) => api.put(`/sarafi/customers/${id}/unknown`),
  rejectCustomer: (id, reason) => api.put(`/sarafi/customers/${id}/reject`, { reason }),
  getStats: (params) => api.get('/sarafi/stats', { params }),

  // کیف پول مشتریان
  getCustomerWallets: (customerId) => api.get(`/wallets/customer/${customerId}`),
  getCustomerTransactions: (customerId, params) => api.get(`/wallets/customer/${customerId}/transactions`, { params }),
  deposit: (data) => api.post('/wallets/deposit', data),
  withdraw: (data) => api.post('/wallets/withdraw', data),
  increaseCreditLimit: (data) => api.post('/wallets/credit/increase', data),
  decreaseCreditLimit: (data) => api.post('/wallets/credit/decrease', data),
  repayCredit: (data) => api.post('/wallets/credit/repay', data)
};

// اعلان‌ها
export const notificationAPI = {
  getAll: (params) => api.get('/notifications', { params }),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
  deleteAll: () => api.delete('/notifications/all')
};
