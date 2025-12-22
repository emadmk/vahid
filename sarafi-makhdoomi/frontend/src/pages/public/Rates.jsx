import { useState, useEffect } from 'react';
import { FaSync } from 'react-icons/fa';
import { publicAPI } from '../../services/api';
import jalaliMoment from 'jalali-moment';

const Rates = () => {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  const fetchRates = async () => {
    setLoading(true);
    try {
      const res = await publicAPI.getRates();
      setRates(res.data.data);
      setLastUpdate(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRates();
    const interval = setInterval(fetchRates, 60000); // هر دقیقه
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gold-gradient mb-4">نرخ لحظه‌ای ارز</h1>
        <p className="text-dark-400">قیمت‌های به‌روز خرید و فروش ارز</p>
      </div>

      <div className="flex justify-between items-center mb-8">
        <div className="text-dark-400 text-sm">
          {lastUpdate && (
            <>
              آخرین بروزرسانی: {jalaliMoment(lastUpdate).format('HH:mm:ss - jYYYY/jMM/jDD')}
            </>
          )}
        </div>
        <button
          onClick={fetchRates}
          disabled={loading}
          className="btn-outline flex items-center gap-2 text-sm py-2 px-4"
        >
          <FaSync className={loading ? 'animate-spin' : ''} />
          بروزرسانی
        </button>
      </div>

      {loading && rates.length === 0 ? (
        <div className="flex justify-center py-20">
          <div className="loading-spinner"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rates.map((rate) => (
            <div key={rate._id} className="card-dark hover:border-gold-500/50 transition-all duration-300">
              <div className="flex items-center gap-4 mb-6">
                <span className="text-4xl">{rate.symbol}</span>
                <div>
                  <h3 className="text-white font-bold text-xl">{rate.nameFa}</h3>
                  <p className="text-dark-500 text-sm">{rate.code}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-green-500/10 rounded-xl">
                  <span className="text-dark-300">نرخ خرید</span>
                  <span className="text-green-400 font-bold text-xl">
                    {rate.buyRate?.toLocaleString()}
                    <span className="text-sm mr-1 text-dark-500">تومان</span>
                  </span>
                </div>

                <div className="flex justify-between items-center p-4 bg-red-500/10 rounded-xl">
                  <span className="text-dark-300">نرخ فروش</span>
                  <span className="text-red-400 font-bold text-xl">
                    {rate.sellRate?.toLocaleString()}
                    <span className="text-sm mr-1 text-dark-500">تومان</span>
                  </span>
                </div>
              </div>

              {rate.unit && rate.unit !== '1' && (
                <p className="text-dark-500 text-xs mt-4 text-center">
                  قیمت هر {rate.unit}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Rates;
