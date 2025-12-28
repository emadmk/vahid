import { FaDesktop, FaMobileAlt, FaCog } from 'react-icons/fa';
import { useState, useRef, useEffect } from 'react';
import useViewStore from '../../store/viewStore';

const ViewModeToggle = () => {
  const [showSettings, setShowSettings] = useState(false);
  const dropdownRef = useRef(null);

  const {
    viewMode,
    toggleViewMode,
    showAdvancedStats,
    showCharts,
    showMarketDepth,
    showOrderBook,
    compactMode,
    toggleAdvancedStats,
    toggleCharts,
    toggleMarketDepth,
    toggleOrderBook,
    toggleCompactMode
  } = useViewStore();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="flex items-center gap-2">
        {/* تاگل اصلی */}
        <button
          onClick={toggleViewMode}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            viewMode === 'professional'
              ? 'bg-gold-500 text-dark-900'
              : 'bg-dark-800 text-dark-400 hover:text-gold-500'
          }`}
          title={viewMode === 'professional' ? 'نمای حرفه‌ای' : 'نمای ساده'}
        >
          {viewMode === 'professional' ? (
            <>
              <FaDesktop className="w-4 h-4" />
              <span className="hidden sm:inline">حرفه‌ای</span>
            </>
          ) : (
            <>
              <FaMobileAlt className="w-4 h-4" />
              <span className="hidden sm:inline">ساده</span>
            </>
          )}
        </button>

        {/* دکمه تنظیمات */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`p-2 rounded-lg transition-colors ${
            showSettings ? 'bg-dark-700 text-gold-500' : 'text-dark-400 hover:text-gold-500'
          }`}
        >
          <FaCog className="w-4 h-4" />
        </button>
      </div>

      {/* منوی تنظیمات */}
      {showSettings && (
        <div className="absolute left-0 top-full mt-2 w-64 bg-dark-800 border border-dark-700 rounded-xl shadow-xl z-50">
          <div className="p-4">
            <h4 className="text-white font-medium mb-3">تنظیمات نمایش</h4>

            <div className="space-y-3">
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-dark-300 text-sm group-hover:text-white transition-colors">
                  آمار پیشرفته
                </span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={showAdvancedStats}
                    onChange={toggleAdvancedStats}
                    className="sr-only"
                  />
                  <div className={`w-10 h-5 rounded-full transition-colors ${
                    showAdvancedStats ? 'bg-gold-500' : 'bg-dark-600'
                  }`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      showAdvancedStats ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </div>
                </div>
              </label>

              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-dark-300 text-sm group-hover:text-white transition-colors">
                  نمودارها
                </span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={showCharts}
                    onChange={toggleCharts}
                    className="sr-only"
                  />
                  <div className={`w-10 h-5 rounded-full transition-colors ${
                    showCharts ? 'bg-gold-500' : 'bg-dark-600'
                  }`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      showCharts ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </div>
                </div>
              </label>

              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-dark-300 text-sm group-hover:text-white transition-colors">
                  عمق بازار
                </span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={showMarketDepth}
                    onChange={toggleMarketDepth}
                    className="sr-only"
                  />
                  <div className={`w-10 h-5 rounded-full transition-colors ${
                    showMarketDepth ? 'bg-gold-500' : 'bg-dark-600'
                  }`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      showMarketDepth ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </div>
                </div>
              </label>

              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-dark-300 text-sm group-hover:text-white transition-colors">
                  دفتر سفارشات
                </span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={showOrderBook}
                    onChange={toggleOrderBook}
                    className="sr-only"
                  />
                  <div className={`w-10 h-5 rounded-full transition-colors ${
                    showOrderBook ? 'bg-gold-500' : 'bg-dark-600'
                  }`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      showOrderBook ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </div>
                </div>
              </label>

              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-dark-300 text-sm group-hover:text-white transition-colors">
                  حالت فشرده
                </span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={compactMode}
                    onChange={toggleCompactMode}
                    className="sr-only"
                  />
                  <div className={`w-10 h-5 rounded-full transition-colors ${
                    compactMode ? 'bg-gold-500' : 'bg-dark-600'
                  }`}>
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                      compactMode ? 'translate-x-5' : 'translate-x-0.5'
                    }`} />
                  </div>
                </div>
              </label>
            </div>

            <div className="mt-4 pt-3 border-t border-dark-700">
              <p className="text-dark-500 text-xs">
                نمای حرفه‌ای برای کاربران با تجربه و نمای ساده برای کاربران تازه‌کار مناسب است.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewModeToggle;
