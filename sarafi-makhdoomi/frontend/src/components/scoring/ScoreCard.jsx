import { FaStar, FaTrophy, FaArrowUp, FaBan } from 'react-icons/fa';

const tierInfo = {
  'A': { name: 'طلایی', color: 'text-gold', bg: 'bg-gold/20', icon: '🥇' },
  'B': { name: 'نقره‌ای', color: 'text-gray-300', bg: 'bg-gray-300/20', icon: '🥈' },
  'C': { name: 'برنزی', color: 'text-orange-400', bg: 'bg-orange-400/20', icon: '🥉' },
  'new': { name: 'جدید', color: 'text-dark-400', bg: 'bg-dark-700', icon: '🆕' }
};

const ScoreCard = ({ scoreData }) => {
  const tier = tierInfo[scoreData?.tier] || tierInfo['new'];

  const formatNumber = (num) => {
    return new Intl.NumberFormat('fa-IR').format(num || 0);
  };

  const progressToNext = scoreData?.pointsToNextTier
    ? Math.min(100, ((scoreData.score || 0) / ((scoreData.score || 0) + scoreData.pointsToNextTier)) * 100)
    : 100;

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <FaTrophy className="text-gold" />
          وضعیت امتیاز
        </h3>
        <div className={`px-3 py-1 rounded-full ${tier.bg} ${tier.color} text-sm font-bold flex items-center gap-1`}>
          <span>{tier.icon}</span>
          {tier.name}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center p-4 bg-dark-800 rounded-lg">
          <FaStar className="text-gold text-2xl mx-auto mb-2" />
          <p className="text-dark-400 text-sm">امتیاز کل</p>
          <p className="text-2xl font-bold">{formatNumber(scoreData?.score)}</p>
        </div>
        <div className="text-center p-4 bg-dark-800 rounded-lg">
          <FaBan className="text-red-500 text-2xl mx-auto mb-2" />
          <p className="text-dark-400 text-sm">بلک‌پوینت</p>
          <p className="text-2xl font-bold text-red-500">{formatNumber(scoreData?.blackPoints)}</p>
        </div>
      </div>

      {scoreData?.nextTier && (
        <div className="mb-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-dark-400">تا سطح {tierInfo[scoreData.nextTier]?.name}</span>
            <span className="text-gold">{formatNumber(scoreData.pointsToNextTier)} امتیاز</span>
          </div>
          <div className="w-full bg-dark-700 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-gold to-yellow-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${progressToNext}%` }}
            />
          </div>
        </div>
      )}

      {scoreData?.benefits && Object.keys(scoreData.benefits).length > 0 && (
        <div className="pt-4 border-t border-dark-700">
          <p className="text-sm text-dark-400 mb-2">مزایای سطح شما:</p>
          <div className="space-y-1 text-sm">
            {scoreData.benefits.commissionDiscount > 0 && (
              <p className="flex items-center gap-2">
                <FaArrowUp className="text-green-500" />
                {scoreData.benefits.commissionDiscount}% تخفیف کارمزد
              </p>
            )}
            {scoreData.benefits.specialOffersAccess && (
              <p className="flex items-center gap-2">
                <FaStar className="text-gold" />
                دسترسی به پیشنهادات ویژه
              </p>
            )}
            {scoreData.benefits.dedicatedSupport && (
              <p className="flex items-center gap-2">
                <FaTrophy className="text-gold" />
                پشتیبانی اختصاصی
              </p>
            )}
          </div>
        </div>
      )}

      {scoreData?.isSuspended && (
        <div className="mt-4 p-3 bg-red-500/20 border border-red-500 rounded-lg text-red-500 text-sm">
          <p className="font-bold">حساب شما تعلیق شده است</p>
          {scoreData.suspensionInfo?.reason && (
            <p className="mt-1">دلیل: {scoreData.suspensionInfo.reason}</p>
          )}
        </div>
      )}
    </div>
  );
};

export default ScoreCard;
