import { useState, useEffect } from 'react';
import { FaTrophy, FaMedal, FaChartLine, FaSpinner, FaInfoCircle } from 'react-icons/fa';
import ScoreCard from '../../components/scoring/ScoreCard';
import api from '../../services/api';

const Score = () => {
  const [scoreData, setScoreData] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [scoreRes, leaderboardRes] = await Promise.all([
        api.get('/scoring/my-score'),
        api.get('/scoring/leaderboard/customers', { params: { limit: 10 } })
      ]);
      setScoreData(scoreRes.data.data);
      setLeaderboard(leaderboardRes.data.data);
    } catch (error) {
      console.error('خطا در دریافت اطلاعات:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    return new Intl.NumberFormat('fa-IR').format(num || 0);
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
          <FaTrophy className="text-gold" />
          امتیاز و رتبه‌بندی
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Score Card */}
        <div className="lg:col-span-2">
          <ScoreCard scoreData={scoreData} />
        </div>

        {/* Stats */}
        <div className="card p-6">
          <h3 className="font-bold mb-4 flex items-center gap-2">
            <FaChartLine className="text-gold" />
            آمار معاملات
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-dark-400">تعداد لغو</span>
              <span className="font-bold">{scoreData?.cancellationCount || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-dark-400">بلک‌پوینت</span>
              <span className="font-bold text-red-500">{scoreData?.blackPoints || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-dark-400">سطح فعلی</span>
              <span className="font-bold text-gold">{scoreData?.tierName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard */}
      <div className="card p-6">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <FaMedal className="text-gold" />
          برترین مشتریان
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-dark-700">
                <th className="text-right py-3 px-4 text-dark-400">رتبه</th>
                <th className="text-right py-3 px-4 text-dark-400">نام</th>
                <th className="text-right py-3 px-4 text-dark-400">امتیاز</th>
                <th className="text-right py-3 px-4 text-dark-400">سطح</th>
              </tr>
            </thead>
            <tbody>
              {leaderboard.map((user, index) => (
                <tr key={user.userId} className="border-b border-dark-800 hover:bg-dark-800/50">
                  <td className="py-3 px-4">
                    {index === 0 && <span className="text-2xl">🥇</span>}
                    {index === 1 && <span className="text-2xl">🥈</span>}
                    {index === 2 && <span className="text-2xl">🥉</span>}
                    {index > 2 && <span className="text-dark-400">{user.rank}</span>}
                  </td>
                  <td className="py-3 px-4 font-medium">{user.name}</td>
                  <td className="py-3 px-4 text-gold font-bold">{formatNumber(user.score)}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      user.tier === 'A' ? 'bg-gold/20 text-gold' :
                      user.tier === 'B' ? 'bg-gray-300/20 text-gray-300' :
                      user.tier === 'C' ? 'bg-orange-400/20 text-orange-400' :
                      'bg-dark-700 text-dark-400'
                    }`}>
                      {user.tier === 'A' ? 'طلایی' :
                       user.tier === 'B' ? 'نقره‌ای' :
                       user.tier === 'C' ? 'برنزی' : 'جدید'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info */}
      <div className="card p-4 bg-dark-800/50 border-dark-600">
        <h3 className="font-bold mb-2 flex items-center gap-2 text-gold">
          <FaInfoCircle />
          نحوه امتیازدهی
        </h3>
        <ul className="text-sm text-dark-400 space-y-1">
          <li>• به ازای هر 100 میلیون ریال معامله، 1 امتیاز دریافت می‌کنید</li>
          <li>• با رسیدن به 100 امتیاز به سطح برنزی ارتقا می‌یابید</li>
          <li>• با رسیدن به 500 امتیاز به سطح نقره‌ای ارتقا می‌یابید</li>
          <li>• با رسیدن به 1000 امتیاز به سطح طلایی ارتقا می‌یابید</li>
          <li className="text-red-400">• لغو معامله: کسر 100 امتیاز و 1 بلک‌پوینت</li>
        </ul>
      </div>
    </div>
  );
};

export default Score;
