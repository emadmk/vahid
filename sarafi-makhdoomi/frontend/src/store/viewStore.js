import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useViewStore = create(
  persist(
    (set, get) => ({
      // نمای فعلی: 'simple' | 'professional'
      viewMode: 'simple',

      // تنظیمات نمایش
      showAdvancedStats: false,
      showCharts: true,
      showMarketDepth: false,
      showOrderBook: false,
      compactMode: false,

      // تغییر نمای اصلی
      setViewMode: (mode) => {
        set({ viewMode: mode });
        if (mode === 'professional') {
          set({
            showAdvancedStats: true,
            showCharts: true,
            showMarketDepth: true,
            showOrderBook: true
          });
        } else {
          set({
            showAdvancedStats: false,
            showCharts: true,
            showMarketDepth: false,
            showOrderBook: false
          });
        }
      },

      // تاگل نمای حرفه‌ای/ساده
      toggleViewMode: () => {
        const current = get().viewMode;
        get().setViewMode(current === 'simple' ? 'professional' : 'simple');
      },

      // تنظیمات جزئی
      toggleAdvancedStats: () => set((state) => ({ showAdvancedStats: !state.showAdvancedStats })),
      toggleCharts: () => set((state) => ({ showCharts: !state.showCharts })),
      toggleMarketDepth: () => set((state) => ({ showMarketDepth: !state.showMarketDepth })),
      toggleOrderBook: () => set((state) => ({ showOrderBook: !state.showOrderBook })),
      toggleCompactMode: () => set((state) => ({ compactMode: !state.compactMode }))
    }),
    {
      name: 'golden-view-preferences'
    }
  )
);

export default useViewStore;
