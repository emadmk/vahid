import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // ورود
      login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/auth/login', { email, password });
          const { token, data } = response.data;

          set({
            user: data.user,
            token,
            isAuthenticated: true,
            isLoading: false
          });

          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          return { success: true };
        } catch (error) {
          const message = error.response?.data?.message || 'خطا در ورود';
          set({ error: message, isLoading: false });
          return { success: false, message, requireVerification: error.response?.data?.requireVerification };
        }
      },

      // ثبت‌نام
      register: async (userData) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/auth/register', userData);
          set({ isLoading: false });
          return { success: true, data: response.data };
        } catch (error) {
          const message = error.response?.data?.message || 'خطا در ثبت‌نام';
          set({ error: message, isLoading: false });
          return { success: false, message };
        }
      },

      // تایید ایمیل
      verifyEmail: async (email, otp) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/auth/verify-email', { email, otp });
          const { token, data } = response.data;

          set({
            user: data.user,
            token,
            isAuthenticated: true,
            isLoading: false
          });

          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          return { success: true };
        } catch (error) {
          const message = error.response?.data?.message || 'کد تایید نامعتبر است';
          set({ error: message, isLoading: false });
          return { success: false, message };
        }
      },

      // ارسال مجدد OTP
      resendOtp: async (email) => {
        try {
          await api.post('/auth/resend-otp', { email });
          return { success: true };
        } catch (error) {
          return { success: false, message: error.response?.data?.message };
        }
      },

      // دریافت اطلاعات کاربر
      getMe: async () => {
        const token = get().token;
        if (!token) return;

        try {
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          const response = await api.get('/auth/me');
          set({ user: response.data.data, isAuthenticated: true });
        } catch (error) {
          set({ user: null, token: null, isAuthenticated: false });
        }
      },

      // بروزرسانی پروفایل
      updateProfile: async (data) => {
        try {
          const response = await api.put('/auth/profile', data);
          set({ user: response.data.data });
          return { success: true };
        } catch (error) {
          return { success: false, message: error.response?.data?.message };
        }
      },

      // تغییر رمز عبور
      changePassword: async (currentPassword, newPassword) => {
        try {
          await api.put('/auth/change-password', { currentPassword, newPassword });
          return { success: true };
        } catch (error) {
          return { success: false, message: error.response?.data?.message };
        }
      },

      // خروج
      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
        delete api.defaults.headers.common['Authorization'];
      },

      // پاک کردن خطا
      clearError: () => set({ error: null })
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ token: state.token, user: state.user })
    }
  )
);

export default useAuthStore;
