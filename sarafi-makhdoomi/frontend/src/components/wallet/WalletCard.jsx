import { FaWallet, FaCreditCard, FaArrowUp, FaArrowDown } from 'react-icons/fa';

const WalletCard = ({ wallet, type = 'cash' }) => {
  const isCash = type === 'cash';

  const formatNumber = (num) => {
    return new Intl.NumberFormat('fa-IR').format(num || 0);
  };

  const availableCredit = wallet?.creditLimit - wallet?.usedCredit || 0;

  return (
    <div className={`card p-6 ${isCash ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-gold'}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {isCash ? (
            <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center">
              <FaWallet className="text-green-500 text-xl" />
            </div>
          ) : (
            <div className="w-12 h-12 bg-gold/20 rounded-full flex items-center justify-center">
              <FaCreditCard className="text-gold text-xl" />
            </div>
          )}
          <div>
            <h3 className="font-bold text-lg">
              {isCash ? 'کیف پول نقدی' : 'کیف پول اعتباری'}
            </h3>
            <p className="text-dark-400 text-sm">
              {wallet?.isActive ? 'فعال' : 'غیرفعال'}
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {isCash ? (
          <div>
            <p className="text-dark-400 text-sm">موجودی</p>
            <p className="text-2xl font-bold text-green-500">
              {formatNumber(wallet?.balance)} <span className="text-sm">ریال</span>
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-dark-400 text-sm">سقف اعتبار</p>
                <p className="text-lg font-bold text-gold">
                  {formatNumber(wallet?.creditLimit)} <span className="text-xs">ریال</span>
                </p>
              </div>
              <div>
                <p className="text-dark-400 text-sm">اعتبار مصرف‌شده</p>
                <p className="text-lg font-bold text-red-500">
                  {formatNumber(wallet?.usedCredit)} <span className="text-xs">ریال</span>
                </p>
              </div>
            </div>
            <div className="pt-3 border-t border-dark-700">
              <p className="text-dark-400 text-sm">اعتبار قابل استفاده</p>
              <p className="text-2xl font-bold text-gold">
                {formatNumber(availableCredit)} <span className="text-sm">ریال</span>
              </p>
            </div>
          </>
        )}
      </div>

      {wallet?.lastTransaction && (
        <div className="mt-4 pt-3 border-t border-dark-700 text-dark-400 text-xs">
          آخرین تراکنش: {new Date(wallet.lastTransaction).toLocaleDateString('fa-IR')}
        </div>
      )}
    </div>
  );
};

export default WalletCard;
