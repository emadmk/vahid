import { useState, useEffect } from 'react';
import { FaArrowUp, FaArrowDown, FaExchangeAlt, FaCreditCard, FaSpinner } from 'react-icons/fa';
import api from '../../services/api';

const transactionTypes = {
  deposit: { label: 'واریز', icon: FaArrowDown, color: 'text-green-500', bg: 'bg-green-500/20' },
  withdraw: { label: 'برداشت', icon: FaArrowUp, color: 'text-red-500', bg: 'bg-red-500/20' },
  credit_use: { label: 'استفاده اعتبار', icon: FaCreditCard, color: 'text-orange-500', bg: 'bg-orange-500/20' },
  credit_repay: { label: 'بازپرداخت', icon: FaArrowDown, color: 'text-green-500', bg: 'bg-green-500/20' },
  credit_increase: { label: 'افزایش سقف', icon: FaArrowUp, color: 'text-gold', bg: 'bg-gold/20' },
  credit_decrease: { label: 'کاهش سقف', icon: FaArrowDown, color: 'text-orange-500', bg: 'bg-orange-500/20' },
  trade_buy: { label: 'خرید ارز', icon: FaExchangeAlt, color: 'text-blue-500', bg: 'bg-blue-500/20' },
  trade_sell: { label: 'فروش ارز', icon: FaExchangeAlt, color: 'text-purple-500', bg: 'bg-purple-500/20' },
  commission: { label: 'کارمزد', icon: FaArrowUp, color: 'text-red-500', bg: 'bg-red-500/20' },
  penalty: { label: 'جریمه', icon: FaArrowUp, color: 'text-red-500', bg: 'bg-red-500/20' },
  refund: { label: 'استرداد', icon: FaArrowDown, color: 'text-green-500', bg: 'bg-green-500/20' },
};

const TransactionHistory = ({ limit = 10 }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const fetchTransactions = async () => {
    try {
      setLoading(true);
      const response = await api.get('/wallets/transactions', {
        params: { limit, skip: (page - 1) * limit }
      });
      setTransactions(response.data.data);
      setTotal(response.data.total);
    } catch (error) {
      console.error('خطا در دریافت تراکنش‌ها:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [page]);

  const formatNumber = (num) => {
    return new Intl.NumberFormat('fa-IR').format(Math.abs(num || 0));
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <FaSpinner className="animate-spin text-gold text-2xl" />
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="text-center py-10 text-dark-400">
        تراکنشی یافت نشد
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((tx) => {
        const typeInfo = transactionTypes[tx.type] || {
          label: tx.type,
          icon: FaExchangeAlt,
          color: 'text-dark-400',
          bg: 'bg-dark-700'
        };
        const Icon = typeInfo.icon;

        return (
          <div key={tx._id} className="card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 ${typeInfo.bg} rounded-full flex items-center justify-center`}>
                <Icon className={`${typeInfo.color}`} />
              </div>
              <div>
                <p className="font-medium">{typeInfo.label}</p>
                <p className="text-dark-400 text-xs">{tx.description || tx.referenceNumber}</p>
                <p className="text-dark-500 text-xs">
                  {new Date(tx.createdAt).toLocaleDateString('fa-IR')} - {new Date(tx.createdAt).toLocaleTimeString('fa-IR')}
                </p>
              </div>
            </div>
            <div className="text-left">
              <p className={`font-bold ${tx.amount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                {tx.amount >= 0 ? '+' : '-'}{formatNumber(tx.amount)} ریال
              </p>
              <p className="text-dark-400 text-xs">
                مانده: {formatNumber(tx.balanceAfter)} ریال
              </p>
            </div>
          </div>
        );
      })}

      {total > limit && (
        <div className="flex justify-center gap-2 mt-4">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="btn-outline px-4 py-2 disabled:opacity-50"
          >
            قبلی
          </button>
          <span className="flex items-center px-4 text-dark-400">
            صفحه {page} از {Math.ceil(total / limit)}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / limit)}
            className="btn-outline px-4 py-2 disabled:opacity-50"
          >
            بعدی
          </button>
        </div>
      )}
    </div>
  );
};

export default TransactionHistory;
