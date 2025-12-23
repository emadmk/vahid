import { useState, useEffect } from 'react';
import { FaWallet, FaHistory, FaSpinner } from 'react-icons/fa';
import WalletCard from '../../components/wallet/WalletCard';
import TransactionHistory from '../../components/wallet/TransactionHistory';
import api from '../../services/api';

const Wallet = () => {
  const [wallets, setWallets] = useState({ cash: null, credit: null });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    try {
      setLoading(true);
      const response = await api.get('/wallets/my-wallets');
      setWallets(response.data.data);
    } catch (error) {
      console.error('خطا در دریافت کیف پول:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('fa-IR').format(num || 0);
  };

  const totalBalance = (wallets.cash?.balance || 0) +
    ((wallets.credit?.creditLimit || 0) - (wallets.credit?.usedCredit || 0));

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <WalletCard wallet={wallets.cash} type="cash" />
          <WalletCard wallet={wallets.credit} type="credit" />
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
          <li>• کیف پول نقدی: موجودی واقعی شما که می‌توانید برداشت کنید</li>
          <li>• کیف پول اعتباری: اعتبار داده شده توسط صراف که باید بازپرداخت شود</li>
          <li>• برای خرید ارز، ابتدا از موجودی نقدی و سپس از اعتبار استفاده می‌شود</li>
        </ul>
      </div>
    </div>
  );
};

export default Wallet;
