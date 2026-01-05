import { useState, useEffect } from 'react';
import { FaWallet, FaHistory, FaSpinner, FaDollarSign, FaEuroSign, FaCoins } from 'react-icons/fa';
import WalletCard from '../../components/wallet/WalletCard';
import TransactionHistory from '../../components/wallet/TransactionHistory';
import api from '../../services/api';

const Wallet = () => {
  const [walletData, setWalletData] = useState({
    cash: null,
    credit: null,
    currencyBalances: [],
    totalRialValue: 0
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    try {
      setLoading(true);
      const response = await api.get('/wallets/my');
      const data = response.data.data;
      setWalletData({
        cash: data.cash,
        credit: data.credit,
        currencyBalances: data.currencyBalances || [],
        totalRialValue: data.totalRialValue || 0,
        cashBalance: data.cashBalance || 0
      });
    } catch (error) {
      console.error('خطا در دریافت کیف پول:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('fa-IR').format(num || 0);
  };

  // ارزش ریالی کل = موجودی ارزها + اعتبار باقیمانده
  const totalBalance = (walletData.totalRialValue || 0) +
    ((walletData.credit?.creditLimit || 0) - (walletData.credit?.usedCredit || 0));

  // آیکون ارز
  const getCurrencyIcon = (code) => {
    if (code === 'USD') return <FaDollarSign className="text-green-500" />;
    if (code === 'EUR') return <FaEuroSign className="text-blue-500" />;
    return <FaCoins className="text-gold" />;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <FaSpinner className="animate-spin text-gold text-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <FaWallet className="text-gold" />
          کیف پول
        </h1>
      </div>

      {/* Total Balance */}
      <div className="card p-6 bg-gradient-to-r from-gold/20 to-yellow-600/20 border-gold/30">
        <p className="text-dark-400 text-sm mb-2">موجودی کل (نقد + اعتبار)</p>
        <p className="text-4xl font-bold text-gold">
          {formatNumber(totalBalance)}
          <span className="text-lg mr-2">ریال</span>
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-dark-700">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-3 font-medium transition-colors ${
            activeTab === 'overview'
              ? 'text-gold border-b-2 border-gold'
              : 'text-dark-400 hover:text-white'
          }`}
        >
          نمای کلی
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`px-4 py-3 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'history'
              ? 'text-gold border-b-2 border-gold'
              : 'text-dark-400 hover:text-white'
          }`}
        >
          <FaHistory />
          تاریخچه تراکنش‌ها
        </button>
      </div>

      {/* Content */}
      {activeTab === 'overview' ? (
        <div className="space-y-6">
          {/* موجودی ارزها */}
          {walletData.currencyBalances && walletData.currencyBalances.length > 0 && (
            <div className="card p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <FaCoins className="text-gold" />
                موجودی ارزها
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {walletData.currencyBalances.map((cb, index) => (
                  <div
                    key={cb.currency || index}
                    className="bg-dark-800 rounded-xl p-4 border border-dark-700 hover:border-gold/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-dark-700 flex items-center justify-center">
                        {getCurrencyIcon(cb.currencyCode)}
                      </div>
                      <div>
                        <p className="font-bold text-white">{cb.currencyName || cb.currencyCode}</p>
                        <p className="text-xs text-dark-400">{cb.currencyCode}</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-dark-400 text-sm">موجودی:</span>
                        <span className="font-bold text-gold text-lg">
                          {formatNumber(cb.amount)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-dark-400">ارزش ریالی:</span>
                        <span className="text-green-500">
                          {formatNumber(cb.rialValue)} ریال
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-dark-500">
                        <span>نرخ فروش:</span>
                        <span>{formatNumber(cb.sellRate)} ریال</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* کیف پول‌های نقدی و اعتباری */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <WalletCard wallet={walletData.cash} type="cash" currencyBalances={walletData.currencyBalances} />
            <WalletCard wallet={walletData.credit} type="credit" />
          </div>
        </div>
      ) : (
        <div>
          <h2 className="text-lg font-bold mb-4">تاریخچه تراکنش‌ها</h2>
          <TransactionHistory limit={15} />
        </div>
      )}

      {/* Info Box */}
      <div className="card p-4 bg-dark-800/50 border-dark-600">
        <h3 className="font-bold mb-2 text-gold">راهنما</h3>
        <ul className="text-sm text-dark-400 space-y-1">
          <li>• کیف پول نقدی: موجودی ریالی و ارزی شما</li>
          <li>• کیف پول اعتباری: اعتبار داده شده توسط صراف که باید بازپرداخت شود</li>
          <li>• ارزش ریالی کل بر اساس نرخ لحظه‌ای ارزها محاسبه می‌شود</li>
          <li>• برای خرید ارز، ابتدا از موجودی نقدی و سپس از اعتبار استفاده می‌شود</li>
        </ul>
      </div>
    </div>
  );
};

export default Wallet;
