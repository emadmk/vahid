import { useState, useEffect } from 'react';
import {
  FaChartLine, FaChartPie, FaMoneyBillWave, FaCoins, FaCalendarAlt,
  FaArrowUp, FaArrowDown, FaSpinner, FaDownload, FaFilter, FaExchangeAlt,
  FaUserFriends, FaPercent, FaTrophy
} from 'react-icons/fa';
import {
  LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import api from '../../services/api';
import toast from 'react-hot-toast';

const ProfitLoss = () => {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30d');
  const [profitData, setProfitData] = useState(null);
  const [groupProfitData, setGroupProfitData] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [trades, setTrades] = useState([]);
  const [groupTrades, setGroupTrades] = useState([]);
  const [activeChart, setActiveChart] = useState('profit'); // profit | commission | volume
  const [activeTab, setActiveTab] = useState('all'); // all | own | group

  const COLORS = ['#f5b50a', '#22c55e', '#3b82f6', '#a855f7', '#ef4444', '#06b6d4'];

  useEffect(() => {
    fetchProfitData();
  }, [period]);

  const fetchProfitData = async () => {
    setLoading(true);
    try {
      const [statsRes, tradesRes, groupStatsRes] = await Promise.all([
        api.get('/trades/sarafi/stats', { params: { period } }),
        api.get('/trades/sarafi/trades', { params: { status: 'completed', limit: 100 } }),
        api.get('/trades/sarafi/group-trade-stats', { params: { period } }).catch(() => ({ data: { data: {} } }))
      ]);

      const stats = statsRes.data.data || {};
      const groupStats = groupStatsRes.data.data || {};

      setProfitData({
        totalProfit: stats.totalCommission || 0,
        todayProfit: stats.todayCommission || 0,
        totalVolume: stats.totalVolume || 0,
        totalTrades: stats.totalTrades || 0,
        todayTrades: stats.todayTrades || 0,
        completedToday: stats.completedToday || 0,
        avgCommission: stats.totalTrades ? Math.round(stats.totalCommission / stats.totalTrades) : 0,
        buyProfit: Math.round((stats.buyCount / (stats.totalTrades || 1)) * stats.totalCommission) || 0,
        sellProfit: Math.round((stats.sellCount / (stats.totalTrades || 1)) * stats.totalCommission) || 0
      });

      setGroupProfitData({
        totalProfit: groupStats.totalCommission || 0,
        todayProfit: groupStats.todayCommission || 0,
        totalVolume: groupStats.totalVolume || 0,
        totalTrades: groupStats.totalTrades || 0,
        todayTrades: groupStats.todayTrades || 0,
        completedToday: groupStats.completedToday || 0,
        avgCommission: groupStats.totalTrades ? Math.round(groupStats.totalCommission / groupStats.totalTrades) : 0,
        buyProfit: Math.round((groupStats.buyCount / (groupStats.totalTrades || 1)) * groupStats.totalCommission) || 0,
        sellProfit: Math.round((groupStats.sellCount / (groupStats.totalTrades || 1)) * groupStats.totalCommission) || 0
      });

      // پردازش داده‌های نمودار
      const completedTrades = tradesRes.data.data || [];
      setTrades(completedTrades);
      setGroupTrades(groupStats.trades || []);

      // گروه‌بندی بر اساس تاریخ (همه معاملات + گروهی)
      const grouped = {};
      const allTrades = [...completedTrades, ...(groupStats.trades || [])];
      allTrades.forEach(trade => {
        const date = new Date(trade.createdAt).toLocaleDateString('fa-IR');
        if (!grouped[date]) {
          grouped[date] = { date, profit: 0, commission: 0, volume: 0, trades: 0 };
        }
        grouped[date].profit += (trade.commission?.amount || 0);
        grouped[date].commission += (trade.commission?.amount || 0);
        grouped[date].volume += (trade.totalAmount || 0);
        grouped[date].trades += 1;
      });

      setChartData(Object.values(grouped).reverse().slice(-14));
    } catch (error) {
      console.error('Error fetching profit data:', error);
      toast.error('خطا در دریافت اطلاعات');
    } finally {
      setLoading(false);
    }
  };

  // محاسبه مجموع سود و زیان (خودی + گروهی)
  const totalStats = {
    totalProfit: (profitData?.totalProfit || 0) + (groupProfitData?.totalProfit || 0),
    todayProfit: (profitData?.todayProfit || 0) + (groupProfitData?.todayProfit || 0),
    totalVolume: (profitData?.totalVolume || 0) + (groupProfitData?.totalVolume || 0),
    totalTrades: (profitData?.totalTrades || 0) + (groupProfitData?.totalTrades || 0),
    todayTrades: (profitData?.todayTrades || 0) + (groupProfitData?.todayTrades || 0),
    completedToday: (profitData?.completedToday || 0) + (groupProfitData?.completedToday || 0)
  };

  // انتخاب داده‌ها بر اساس تب فعال
  const getActiveData = () => {
    if (activeTab === 'own') return profitData;
    if (activeTab === 'group') return groupProfitData;
    return totalStats;
  };

  const getActiveTrades = () => {
    if (activeTab === 'own') return trades;
    if (activeTab === 'group') return groupTrades;
    return [...trades, ...groupTrades].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  };

  const formatNumber = (num) => new Intl.NumberFormat('fa-IR').format(Math.round(num || 0));
  const formatDate = (date) => new Date(date).toLocaleDateString('fa-IR');

  const activeData = getActiveData();
  const activeTrades = getActiveTrades();

  const pieData = [
    { name: 'معاملات خرید', value: activeData?.buyProfit || 0, color: '#22c55e' },
    { name: 'معاملات فروش', value: activeData?.sellProfit || 0, color: '#ef4444' }
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <FaSpinner className="animate-spin text-gold text-3xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* هدر */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold flex items-center gap-3">
          <FaChartLine className="text-gold" />
          سود و زیان
        </h1>

        <div className="flex items-center gap-3 flex-wrap">
          {/* تب نوع معاملات */}
          <div className="flex items-center gap-2 bg-dark-800 rounded-lg p-1">
            {[
              { value: 'all', label: 'همه', icon: FaChartLine },
              { value: 'own', label: 'خودی', icon: FaMoneyBillWave },
              { value: 'group', label: 'گروهی', icon: FaUserFriends }
            ].map(t => (
              <button
                key={t.value}
                onClick={() => setActiveTab(t.value)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors flex items-center gap-1.5 ${
                  activeTab === t.value
                    ? t.value === 'group' ? 'bg-purple-500 text-white font-bold' : 'bg-gold text-dark-900 font-bold'
                    : 'text-dark-400 hover:text-white'
                }`}
              >
                <t.icon className="text-xs" />
                {t.label}
              </button>
            ))}
          </div>

          {/* فیلتر دوره */}
          <div className="flex items-center gap-2 bg-dark-800 rounded-lg p-1">
            {[
              { value: '7d', label: 'هفته' },
              { value: '30d', label: 'ماه' },
              { value: '90d', label: '۳ ماه' },
              { value: '1y', label: 'سال' }
            ].map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                  period === p.value
                    ? 'bg-gold text-dark-900 font-bold'
                    : 'text-dark-400 hover:text-white'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* نمایش آمار گروهی در کنار خودی */}
      {groupProfitData && groupProfitData.totalTrades > 0 && activeTab === 'all' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-4 border-r-4 border-gold bg-gradient-to-l from-gold/5 to-transparent">
            <div className="flex items-center gap-2 mb-3">
              <FaMoneyBillWave className="text-gold" />
              <span className="text-white font-bold">معاملات خودی</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-dark-400 text-xs">سود کل</p>
                <p className="text-gold font-bold text-lg">{formatNumber(profitData?.totalProfit)}</p>
              </div>
              <div>
                <p className="text-dark-400 text-xs">تعداد معاملات</p>
                <p className="text-white font-bold text-lg">{profitData?.totalTrades || 0}</p>
              </div>
            </div>
          </div>
          <div className="card p-4 border-r-4 border-purple-500 bg-gradient-to-l from-purple-500/5 to-transparent">
            <div className="flex items-center gap-2 mb-3">
              <FaUserFriends className="text-purple-500" />
              <span className="text-white font-bold">معاملات گروهی</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-dark-400 text-xs">سود کل</p>
                <p className="text-purple-400 font-bold text-lg">{formatNumber(groupProfitData?.totalProfit)}</p>
              </div>
              <div>
                <p className="text-dark-400 text-xs">تعداد معاملات</p>
                <p className="text-white font-bold text-lg">{groupProfitData?.totalTrades || 0}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* کارت‌های آمار */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`card p-5 border-r-4 ${activeTab === 'group' ? 'border-purple-500' : 'border-gold'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-400 text-sm mb-1">سود کل {activeTab === 'group' && '(گروهی)'}</p>
              <p className={`text-2xl font-bold ${activeTab === 'group' ? 'text-purple-400' : 'text-gold'}`}>{formatNumber(activeData?.totalProfit)}</p>
              <p className="text-dark-500 text-xs">ریال</p>
            </div>
            <div className={`w-14 h-14 rounded-full ${activeTab === 'group' ? 'bg-purple-500/20' : 'bg-gold/20'} flex items-center justify-center`}>
              <FaTrophy className={`${activeTab === 'group' ? 'text-purple-500' : 'text-gold'} text-2xl`} />
            </div>
          </div>
        </div>

        <div className="card p-5 border-r-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-400 text-sm mb-1">سود امروز</p>
              <p className="text-2xl font-bold text-green-500">{formatNumber(activeData?.todayProfit)}</p>
              <p className="text-dark-500 text-xs">ریال</p>
            </div>
            <div className="w-14 h-14 rounded-full bg-green-500/20 flex items-center justify-center">
              <FaArrowUp className="text-green-500 text-2xl" />
            </div>
          </div>
        </div>

        <div className="card p-5 border-r-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-400 text-sm mb-1">حجم معاملات</p>
              <p className="text-2xl font-bold text-blue-500">{formatNumber(activeData?.totalVolume)}</p>
              <p className="text-dark-500 text-xs">ریال</p>
            </div>
            <div className="w-14 h-14 rounded-full bg-blue-500/20 flex items-center justify-center">
              <FaExchangeAlt className="text-blue-500 text-2xl" />
            </div>
          </div>
        </div>

        <div className="card p-5 border-r-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-dark-400 text-sm mb-1">میانگین کارمزد هر معامله</p>
              <p className="text-2xl font-bold text-purple-500">{formatNumber(activeData?.avgCommission)}</p>
              <p className="text-dark-500 text-xs">ریال</p>
            </div>
            <div className="w-14 h-14 rounded-full bg-purple-500/20 flex items-center justify-center">
              <FaPercent className="text-purple-500 text-2xl" />
            </div>
          </div>
        </div>
      </div>

      {/* نمودارها */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* نمودار خطی */}
        <div className="lg:col-span-2 card p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-white flex items-center gap-2">
              <FaChartLine className="text-gold" />
              روند سود
            </h2>
            <div className="flex gap-2">
              {[
                { key: 'profit', label: 'سود', color: '#f5b50a' },
                { key: 'volume', label: 'حجم', color: '#3b82f6' },
                { key: 'trades', label: 'تعداد', color: '#22c55e' }
              ].map(c => (
                <button
                  key={c.key}
                  onClick={() => setActiveChart(c.key)}
                  className={`px-3 py-1 rounded text-xs transition-colors ${
                    activeChart === c.key
                      ? 'bg-gold text-dark-900'
                      : 'bg-dark-800 text-dark-400'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f5b50a" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f5b50a" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorVolume" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorTrades" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#333" />
              <XAxis dataKey="date" stroke="#666" tick={{ fill: '#999', fontSize: 12 }} />
              <YAxis stroke="#666" tick={{ fill: '#999', fontSize: 12 }} tickFormatter={val => formatNumber(val)} />
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                labelStyle={{ color: '#fff' }}
                formatter={(value) => [formatNumber(value), activeChart === 'profit' ? 'سود' : activeChart === 'volume' ? 'حجم' : 'تعداد']}
              />
              <Area
                type="monotone"
                dataKey={activeChart}
                stroke={activeChart === 'profit' ? '#f5b50a' : activeChart === 'volume' ? '#3b82f6' : '#22c55e'}
                fillOpacity={1}
                fill={`url(#color${activeChart.charAt(0).toUpperCase() + activeChart.slice(1)})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* نمودار دایره‌ای */}
        <div className="card p-5">
          <h2 className="font-bold text-white flex items-center gap-2 mb-4">
            <FaChartPie className="text-gold" />
            توزیع سود
          </h2>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: '8px' }}
                formatter={(value) => [formatNumber(value) + ' ریال', '']}
              />
              <Legend
                wrapperStyle={{ color: '#999' }}
                formatter={(value) => <span style={{ color: '#999' }}>{value}</span>}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                <span className="text-dark-400">معاملات خرید</span>
              </div>
              <span className="text-white font-bold">{formatNumber(activeData?.buyProfit)} ریال</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                <span className="text-dark-400">معاملات فروش</span>
              </div>
              <span className="text-white font-bold">{formatNumber(activeData?.sellProfit)} ریال</span>
            </div>
          </div>
        </div>
      </div>

      {/* جدول معاملات */}
      <div className="card overflow-hidden">
        <div className="p-4 border-b border-dark-800 flex items-center justify-between">
          <h2 className="font-bold text-white flex items-center gap-2">
            {activeTab === 'group' ? <FaUserFriends className="text-purple-500" /> : <FaMoneyBillWave className="text-gold" />}
            جزئیات معاملات {activeTab === 'group' ? 'گروهی' : activeTab === 'own' ? 'خودی' : ''}
          </h2>
          <span className="text-dark-500 text-sm">{activeTrades.length} معامله</span>
        </div>
        <div className="overflow-x-auto max-h-96">
          <table className="w-full">
            <thead className="bg-dark-800 sticky top-0">
              <tr>
                <th className="text-right p-3 text-dark-400 text-sm">تاریخ</th>
                <th className="text-right p-3 text-dark-400 text-sm">شماره</th>
                <th className="text-right p-3 text-dark-400 text-sm">نوع</th>
                <th className="text-right p-3 text-dark-400 text-sm">ارز</th>
                <th className="text-right p-3 text-dark-400 text-sm">مقدار</th>
                <th className="text-right p-3 text-dark-400 text-sm">حجم</th>
                <th className="text-right p-3 text-dark-400 text-sm">کارمزد</th>
                {activeTab !== 'own' && <th className="text-right p-3 text-dark-400 text-sm">صراف</th>}
              </tr>
            </thead>
            <tbody>
              {activeTrades.length === 0 ? (
                <tr>
                  <td colSpan={activeTab !== 'own' ? 8 : 7} className="text-center p-8 text-dark-500">
                    معامله‌ای یافت نشد
                  </td>
                </tr>
              ) : (
                activeTrades.map(trade => (
                  <tr key={trade._id} className={`border-t border-dark-800 hover:bg-dark-800/30 ${trade.isGroupTrade ? 'bg-purple-500/5' : ''}`}>
                    <td className="p-3 text-dark-400 text-sm">{formatDate(trade.createdAt)}</td>
                    <td className="p-3 text-gold text-sm">{trade.tradeNumber}</td>
                    <td className="p-3">
                      <span className={`flex items-center gap-1 text-sm ${
                        trade.type === 'buy' ? 'text-green-500' : 'text-red-500'
                      }`}>
                        {trade.type === 'buy' ? <FaArrowUp /> : <FaArrowDown />}
                        {trade.type === 'buy' ? 'خرید' : 'فروش'}
                      </span>
                    </td>
                    <td className="p-3 text-white text-sm">{trade.currency?.code}</td>
                    <td className="p-3 text-white text-sm">{formatNumber(trade.amount)}</td>
                    <td className="p-3 text-white text-sm">{formatNumber(trade.totalAmount)}</td>
                    <td className="p-3 text-green-500 font-bold text-sm">{formatNumber(trade.commission?.amount || 0)}</td>
                    {activeTab !== 'own' && (
                      <td className="p-3 text-sm">
                        {trade.isGroupTrade ? (
                          <span className="text-purple-400 flex items-center gap-1">
                            <FaUserFriends className="text-xs" />
                            {trade.ownerSarafi?.sarafiInfo?.name || trade.ownerSarafi?.sarafiInfo?.alias || `${trade.ownerSarafi?.firstName || ''} ${trade.ownerSarafi?.lastName || ''}`.trim() || '-'}
                          </span>
                        ) : (
                          <span className="text-dark-500">-</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* آمار اضافی */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-4 text-center">
          <FaExchangeAlt className={`${activeTab === 'group' ? 'text-purple-500' : 'text-gold'} text-2xl mx-auto mb-2`} />
          <p className="text-2xl font-bold text-white">{activeData?.totalTrades || 0}</p>
          <p className="text-dark-400 text-sm">تعداد کل معاملات {activeTab === 'group' && 'گروهی'}</p>
        </div>
        <div className="card p-4 text-center">
          <FaCalendarAlt className="text-blue-500 text-2xl mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{activeData?.todayTrades || 0}</p>
          <p className="text-dark-400 text-sm">معاملات امروز</p>
        </div>
        <div className="card p-4 text-center">
          <FaCoins className="text-green-500 text-2xl mx-auto mb-2" />
          <p className="text-2xl font-bold text-white">{activeData?.completedToday || 0}</p>
          <p className="text-dark-400 text-sm">تکمیل شده امروز</p>
        </div>
      </div>
    </div>
  );
};

export default ProfitLoss;
