import { FaPhone, FaEnvelope, FaMapMarkerAlt, FaClock, FaTelegram, FaInstagram, FaWhatsapp } from 'react-icons/fa';

const Contact = () => {
  const contactInfo = [
    { icon: FaPhone, label: 'تلفن', value: '۰۲۱-XXXXXXXX' },
    { icon: FaEnvelope, label: 'ایمیل', value: 'info@sarafi-makhdoomi.com' },
    { icon: FaMapMarkerAlt, label: 'آدرس', value: 'تهران' },
    { icon: FaClock, label: 'ساعت کاری', value: 'شنبه تا پنج‌شنبه ۹ الی ۱۸' }
  ];

  const socialLinks = [
    { icon: FaTelegram, label: 'تلگرام', href: '#', color: 'bg-blue-500' },
    { icon: FaInstagram, label: 'اینستاگرام', href: '#', color: 'bg-pink-500' },
    { icon: FaWhatsapp, label: 'واتساپ', href: '#', color: 'bg-green-500' }
  ];

  return (
    <div className="container mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gold-gradient mb-4">تماس با ما</h1>
        <p className="text-dark-400">ما آماده پاسخگویی به سوالات شما هستیم</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* اطلاعات تماس */}
        <div>
          <h2 className="text-2xl font-bold text-white mb-6">راه‌های ارتباطی</h2>

          <div className="space-y-4">
            {contactInfo.map((item, index) => (
              <div key={index} className="card-dark flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gold-500/10 flex items-center justify-center text-gold-500">
                  <item.icon className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-dark-500 text-sm">{item.label}</p>
                  <p className="text-white font-medium">{item.value}</p>
                </div>
              </div>
            ))}
          </div>

          {/* شبکه‌های اجتماعی */}
          <div className="mt-8">
            <h3 className="text-lg font-bold text-white mb-4">ما را دنبال کنید</h3>
            <div className="flex gap-4">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.href}
                  className={`w-12 h-12 rounded-full ${social.color} flex items-center justify-center text-white hover:scale-110 transition-transform`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* فرم تماس */}
        <div className="card-dark">
          <h2 className="text-2xl font-bold text-white mb-6">ارسال پیام</h2>

          <form className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-dark-400 text-sm mb-2">نام</label>
                <input
                  type="text"
                  className="input-dark"
                  placeholder="نام خود را وارد کنید"
                />
              </div>
              <div>
                <label className="block text-dark-400 text-sm mb-2">تلفن</label>
                <input
                  type="tel"
                  className="input-dark"
                  placeholder="شماره تماس"
                />
              </div>
            </div>

            <div>
              <label className="block text-dark-400 text-sm mb-2">ایمیل</label>
              <input
                type="email"
                className="input-dark"
                placeholder="ایمیل خود را وارد کنید"
              />
            </div>

            <div>
              <label className="block text-dark-400 text-sm mb-2">موضوع</label>
              <input
                type="text"
                className="input-dark"
                placeholder="موضوع پیام"
              />
            </div>

            <div>
              <label className="block text-dark-400 text-sm mb-2">پیام</label>
              <textarea
                rows={5}
                className="input-dark resize-none"
                placeholder="متن پیام خود را بنویسید..."
              ></textarea>
            </div>

            <button type="submit" className="btn-gold w-full">
              ارسال پیام
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Contact;
