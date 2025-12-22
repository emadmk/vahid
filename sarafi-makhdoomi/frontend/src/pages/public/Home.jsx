import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaArrowLeft, FaExchangeAlt, FaShieldAlt, FaClock, FaHeadset } from 'react-icons/fa';
import { publicAPI } from '../../services/api';

const Home = () => {
  const [rates, setRates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await publicAPI.getRates();
        setRates(res.data.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchRates();
  }, []);

  const features = [
    { icon: FaExchangeAlt, title: 'معاملات آسان', desc: 'خرید و فروش ارز با چند کلیک ساده' },
    { icon: FaShieldAlt, title: 'امنیت بالا', desc: 'تراکنش‌های امن و محافظت شده' },
    { icon: FaClock, title: 'سرعت بالا', desc: 'پردازش سریع درخواست‌ها' },
    { icon: FaHeadset, title: 'پشتیبانی ۲۴/۷', desc: 'تیم پشتیبانی همیشه در دسترس' }
  ];

  return (
    <div>
      {/* هیرو */}
      <section className="relative min-h-[80vh] flex items-center overflow-hidden">
        {/* پترن پس‌زمینه */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-20 right-20 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 left-20 w-[500px] h-[500px] bg-gold-600/5 rounded-full blur-3xl"></div>
        </div>

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fadeIn">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                <span className="text-white">صرافی</span>
                <br />
                <span className="text-gold-gradient">گلدن 2026</span>
              </h1>
              <p className="text-dark-300 text-lg md:text-xl mb-8 leading-8">
                با بیش از سال‌ها تجربه در زمینه خرید و فروش ارز،
                بهترین نرخ‌ها را به شما ارائه می‌دهیم.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/register" className="btn-gold flex items-center gap-2">
                  شروع کنید
                  <FaArrowLeft />
                </Link>
                <Link to="/rates" className="btn-outline">
                  مشاهده نرخ‌ها
                </Link>
              </div>
            </div>

            {/* کارت نرخ‌ها */}
            <div className="card-dark p-8 animate-slideIn">
              <h2 className="text-gold-500 font-bold text-xl mb-6 flex items-center gap-2">
                <FaExchangeAlt />
                نرخ لحظه‌ای ارز
              </h2>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="loading-spinner"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {rates.slice(0, 5).map((rate) => (
                    <div key={rate._id} className="flex items-center justify-between p-4 bg-dark-800/50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{rate.symbol}</span>
                        <div>
                          <p className="text-white font-medium">{rate.nameFa}</p>
                          <p className="text-dark-500 text-xs">{rate.code}</p>
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-green-400 text-sm">خرید: {rate.buyRate?.toLocaleString()}</p>
                        <p className="text-red-400 text-sm">فروش: {rate.sellRate?.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Link to="/rates" className="block text-center text-gold-500 hover:text-gold-400 mt-6 text-sm">
                مشاهده همه نرخ‌ها ←
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ویژگی‌ها */}
      <section className="py-20 bg-dark-900/50">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">
            <span className="text-gold-gradient">چرا ما را انتخاب کنید؟</span>
          </h2>
          <p className="text-dark-400 text-center mb-12 max-w-2xl mx-auto">
            با صرافی گلدن 2026، تجربه‌ای متفاوت از خرید و فروش ارز داشته باشید
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="card-dark text-center p-8 hover:border-gold-500/50 transition-all duration-300">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gold-500/10 flex items-center justify-center text-gold-500">
                  <feature.icon className="w-8 h-8" />
                </div>
                <h3 className="text-white font-bold text-lg mb-2">{feature.title}</h3>
                <p className="text-dark-400 text-sm">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="card-gold text-center p-12">
            <h2 className="text-3xl font-bold text-white mb-4">آماده شروع هستید؟</h2>
            <p className="text-dark-300 mb-8 max-w-xl mx-auto">
              همین حالا ثبت‌نام کنید و از خدمات صرافی بهره‌مند شوید
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link to="/register" className="btn-gold">
                ثبت‌نام رایگان
              </Link>
              <Link to="/contact" className="btn-dark">
                تماس با ما
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
