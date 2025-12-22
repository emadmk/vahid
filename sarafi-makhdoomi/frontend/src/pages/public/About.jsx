import { FaCheckCircle } from 'react-icons/fa';

const About = () => {
  const features = [
    'بیش از سال‌ها تجربه در خرید و فروش ارز',
    'ارائه بهترین نرخ‌ها در بازار',
    'تیم حرفه‌ای و مجرب',
    'پشتیبانی ۲۴ ساعته',
    'امنیت بالا در تراکنش‌ها',
    'سرعت بالا در پردازش درخواست‌ها'
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gold-gradient mb-4">درباره ما</h1>
        <p className="text-dark-400">با صرافی حاج عباس مخدومی بیشتر آشنا شوید</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        <div className="card-dark p-8">
          <div className="w-full h-64 bg-gradient-to-br from-gold-500/20 to-gold-600/10 rounded-xl flex items-center justify-center">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center">
              <span className="text-dark-900 font-bold text-5xl">ص</span>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-white mb-6">صرافی حاج عباس مخدومی</h2>
          <p className="text-dark-300 leading-8 mb-6">
            صرافی حاج عباس مخدومی با سال‌ها تجربه در زمینه خرید و فروش ارز،
            آماده ارائه بهترین خدمات به مشتریان گرامی است.
            ما با تکیه بر اصول صداقت، امانت‌داری و سرعت در ارائه خدمات،
            تلاش می‌کنیم تا بهترین تجربه را برای شما رقم بزنیم.
          </p>

          <div className="space-y-3">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-3">
                <FaCheckCircle className="text-gold-500 flex-shrink-0" />
                <span className="text-dark-300">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* آمار */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-16">
        {[
          { value: '+۱۰۰۰', label: 'مشتری راضی' },
          { value: '+۱۰', label: 'سال تجربه' },
          { value: '۷+', label: 'نوع ارز' },
          { value: '۲۴/۷', label: 'پشتیبانی' }
        ].map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default About;
