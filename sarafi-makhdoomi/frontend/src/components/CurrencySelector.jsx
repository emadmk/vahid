import { useState, useMemo } from 'react';
import { FaSearch, FaChevronDown, FaChevronUp, FaStar, FaTimes } from 'react-icons/fa';

/**
 * کامپوننت انتخاب ارز با دسته‌بندی و طراحی زیبا
 */
const CurrencySelector = ({
  currencies,
  selectedCurrency,
  onSelect,
  showRates = true,
  compact = false,
  className = ''
}) => {
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [showDropdown, setShowDropdown] = useState(false);

  // دسته‌بندی ارزها
  const categorizedCurrencies = useMemo(() => {
    const categories = {
      fiat: { name: 'ارزهای رایج', icon: '💵', items: [] },
      gold: { name: 'طلا و سکه', icon: '🪙', items: [] },
      crypto: { name: 'رمزارزها', icon: '₿', items: [] },
      other: { name: 'سایر', icon: '💱', items: [] }
    };

    currencies.forEach(currency => {
      const code = currency.code?.toUpperCase();

      // تشخیص دسته‌بندی بر اساس کد ارز
      if (['USD', 'EUR', 'GBP', 'AED', 'TRY', 'CAD', 'CHF', 'CNY', 'AUD', 'JPY',
           'SAR', 'KWD', 'QAR', 'OMR', 'BHD', 'INR', 'RUB', 'PKR', 'AFN',
           'IQD', 'AZN', 'GEL', 'TMT'].includes(code)) {
        categories.fiat.items.push(currency);
      } else if (['GOLD18', 'GOLD_18K', 'GOLD_24K', 'GOLD_750', 'MESGHAL',
                  'COIN_EMAMI', 'COIN_BAHAR', 'COIN_NIM', 'COIN_ROB', 'COIN_GERAMI',
                  'SILVER_999', 'SILVER_925'].some(g => code?.includes(g) || code?.includes('GOLD') || code?.includes('COIN') || code?.includes('SILVER'))) {
        categories.gold.items.push(currency);
      } else if (['BTC', 'ETH', 'USDT', 'USDC', 'BNB', 'XRP', 'ADA', 'SOL', 'DOGE', 'DOT'].includes(code)) {
        categories.crypto.items.push(currency);
      } else {
        categories.other.items.push(currency);
      }
    });

    return categories;
  }, [currencies]);

  // فیلتر ارزها بر اساس جستجو و دسته‌بندی
  const filteredCurrencies = useMemo(() => {
    let items = [];

    if (activeCategory === 'all') {
      items = currencies;
    } else {
      items = categorizedCurrencies[activeCategory]?.items || [];
    }

    if (search) {
      const searchLower = search.toLowerCase();
      items = items.filter(c =>
        c.code?.toLowerCase().includes(searchLower) ||
        c.name?.toLowerCase().includes(searchLower) ||
        c.nameFa?.toLowerCase().includes(searchLower) ||
        c.symbol?.toLowerCase().includes(searchLower)
      );
    }

    return items;
  }, [currencies, categorizedCurrencies, activeCategory, search]);

  const formatNumber = (num) => new Intl.NumberFormat('fa-IR').format(num || 0);

  // حالت dropdown برای موبایل یا compact
  if (compact) {
    return (
      <div className={`relative ${className}`}>
        {/* دکمه انتخاب شده */}
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-dark-800 border border-dark-700 hover:border-gold/50 transition-all"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">{selectedCurrency?.symbol}</span>
            <div className="text-right">
              <p className="text-white font-bold">{selectedCurrency?.code}</p>
              <p className="text-dark-400 text-xs">{selectedCurrency?.nameFa}</p>
            </div>
          </div>
          {showDropdown ? <FaChevronUp className="text-gold" /> : <FaChevronDown className="text-dark-400" />}
        </button>

        {/* Dropdown */}
        {showDropdown && (
          <div className="absolute top-full right-0 left-0 mt-2 bg-dark-900 border border-dark-700 rounded-xl shadow-xl z-50 max-h-80 overflow-hidden">
            {/* جستجو */}
            <div className="p-3 border-b border-dark-700">
              <div className="relative">
                <FaSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="جستجو..."
                  className="w-full bg-dark-800 border border-dark-700 rounded-lg py-2 pr-10 pl-3 text-sm text-white placeholder-dark-500 focus:border-gold focus:outline-none"
                />
              </div>
            </div>

            {/* لیست ارزها */}
            <div className="max-h-60 overflow-y-auto">
              {filteredCurrencies.map(currency => (
                <button
                  key={currency._id}
                  onClick={() => {
                    onSelect(currency);
                    setShowDropdown(false);
                    setSearch('');
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-dark-800 transition-all ${
                    selectedCurrency?._id === currency._id ? 'bg-gold/10 border-r-2 border-gold' : ''
                  }`}
                >
                  <span className="text-xl">{currency.symbol}</span>
                  <div className="flex-1 text-right">
                    <p className="text-white font-medium">{currency.code}</p>
                    <p className="text-dark-400 text-xs">{currency.nameFa}</p>
                  </div>
                  {showRates && (
                    <div className="text-left text-sm">
                      <p className="text-green-500">{formatNumber(currency.buyRate)}</p>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  // حالت کامل
  return (
    <div className={`rounded-xl bg-dark-900/50 border border-dark-800 overflow-hidden ${className}`}>
      {/* هدر */}
      <div className="flex items-center justify-between p-3 border-b border-dark-800">
        <span className="text-dark-400 text-sm">انتخاب ارز</span>

        {/* جستجو */}
        <div className="relative">
          <FaSearch className="absolute right-3 top-1/2 -translate-y-1/2 text-dark-500 text-xs" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="جستجو..."
            className="w-40 bg-dark-800 border border-dark-700 rounded-lg py-1.5 pr-8 pl-2 text-sm text-white placeholder-dark-500 focus:border-gold focus:outline-none"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-dark-500 hover:text-white"
            >
              <FaTimes className="text-xs" />
            </button>
          )}
        </div>
      </div>

      {/* تب‌های دسته‌بندی */}
      <div className="flex gap-1 p-2 border-b border-dark-800 overflow-x-auto">
        <button
          onClick={() => setActiveCategory('all')}
          className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all ${
            activeCategory === 'all'
              ? 'bg-gold text-dark-900 font-bold'
              : 'bg-dark-800 text-dark-400 hover:text-white'
          }`}
        >
          همه ({currencies.length})
        </button>
        {Object.entries(categorizedCurrencies).map(([key, cat]) => (
          cat.items.length > 0 && (
            <button
              key={key}
              onClick={() => setActiveCategory(key)}
              className={`px-3 py-1.5 rounded-lg text-xs whitespace-nowrap transition-all flex items-center gap-1 ${
                activeCategory === key
                  ? 'bg-gold text-dark-900 font-bold'
                  : 'bg-dark-800 text-dark-400 hover:text-white'
              }`}
            >
              <span>{cat.icon}</span>
              {cat.name} ({cat.items.length})
            </button>
          )
        ))}
      </div>

      {/* گرید ارزها */}
      <div className="p-3 max-h-80 overflow-y-auto">
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
          {filteredCurrencies.map(currency => (
            <button
              key={currency._id}
              onClick={() => onSelect(currency)}
              className={`relative group flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                selectedCurrency?._id === currency._id
                  ? 'bg-gold text-dark-900 shadow-lg shadow-gold/20'
                  : 'bg-dark-800 text-dark-300 hover:bg-dark-700 hover:text-white'
              }`}
            >
              {/* ایموجی/نماد */}
              <span className="text-xl">{currency.symbol}</span>

              {/* کد ارز */}
              <span className={`text-xs font-bold ${
                selectedCurrency?._id === currency._id ? 'text-dark-900' : 'text-white'
              }`}>
                {currency.code}
              </span>

              {/* نام فارسی */}
              <span className={`text-[10px] truncate w-full text-center ${
                selectedCurrency?._id === currency._id ? 'text-dark-700' : 'text-dark-500'
              }`}>
                {currency.nameFa}
              </span>

              {/* نشانگر انتخاب */}
              {selectedCurrency?._id === currency._id && (
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                  <FaStar className="text-[8px] text-white" />
                </div>
              )}
            </button>
          ))}
        </div>

        {filteredCurrencies.length === 0 && (
          <div className="text-center py-8 text-dark-500">
            ارزی یافت نشد
          </div>
        )}
      </div>

      {/* نمایش قیمت ارز انتخاب شده */}
      {showRates && selectedCurrency && (
        <div className="flex items-center justify-between p-3 border-t border-dark-800 bg-dark-800/50">
          <div className="flex items-center gap-2">
            <span className="text-xl">{selectedCurrency.symbol}</span>
            <span className="text-white font-bold">{selectedCurrency.code}</span>
            <span className="text-dark-400 text-sm">- {selectedCurrency.nameFa}</span>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-dark-500 text-xs">خرید</p>
              <p className="text-green-500 font-bold">{formatNumber(selectedCurrency.buyRate)}</p>
            </div>
            <div className="text-center">
              <p className="text-dark-500 text-xs">فروش</p>
              <p className="text-red-500 font-bold">{formatNumber(selectedCurrency.sellRate)}</p>
            </div>
            <div className="text-center">
              <p className="text-dark-500 text-xs">اسپرد</p>
              <p className="text-gold font-bold">
                {formatNumber((selectedCurrency.sellRate || 0) - (selectedCurrency.buyRate || 0))}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CurrencySelector;
