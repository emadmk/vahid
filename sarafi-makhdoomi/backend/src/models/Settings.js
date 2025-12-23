const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  // اطلاعات سایت
  siteName: {
    type: String,
    default: 'صرافی گلدن 2026'
  },
  siteDescription: String,
  siteLogo: String,
  siteFavicon: String,

  // اطلاعات تماس
  contactPhone: String,
  contactEmail: String,
  contactAddress: String,
  workingHours: String,

  // شبکه‌های اجتماعی
  socialMedia: {
    telegram: String,
    instagram: String,
    whatsapp: String
  },

  // تنظیمات کارمزد
  feeSettings: {
    type: {
      type: String,
      enum: ['fixed', 'percentage'],
      default: 'percentage'
    },
    value: {
      type: Number,
      default: 0
    },
    minFee: {
      type: Number,
      default: 0
    },
    maxFee: {
      type: Number,
      default: 0
    }
  },

  // تنظیمات درخواست
  requestSettings: {
    timerDuration: {
      type: Number,
      default: 60 // دقیقه
    },
    minAmount: {
      type: Number,
      default: 0
    },
    maxAmount: {
      type: Number,
      default: 0
    },
    autoPublicAfterTimer: {
      type: Boolean,
      default: true
    }
  },

  // تنظیمات احراز هویت
  authSettings: {
    requirePhoneVerification: {
      type: Boolean,
      default: false
    },
    requireEmailVerification: {
      type: Boolean,
      default: true
    },
    requireDocuments: {
      type: Boolean,
      default: false
    },
    requiredDocuments: [{
      type: String,
      enum: ['nationalCard', 'selfie', 'address']
    }]
  },

  // تنظیمات ثبت‌نام
  registrationSettings: {
    allowUserRegistration: {
      type: Boolean,
      default: true
    },
    allowSarafiRegistration: {
      type: Boolean,
      default: true
    },
    requireAdminApproval: {
      type: Boolean,
      default: true
    }
  },

  // تنظیمات اعلان
  notificationSettings: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: false
    },
    telegramNotifications: {
      type: Boolean,
      default: true
    }
  },

  // متن‌های قابل تنظیم
  customTexts: {
    welcomeMessage: String,
    termsAndConditions: String,
    privacyPolicy: String,
    aboutUs: String
  },

  // تنظیمات نمایش
  displaySettings: {
    showRates: {
      type: Boolean,
      default: true
    },
    showPublicRequests: {
      type: Boolean,
      default: true
    }
  },

  // حالت تعمیر
  maintenanceMode: {
    enabled: {
      type: Boolean,
      default: false
    },
    message: String
  },

  // تنظیمات اسکرپر نرخ
  rateScraperSettings: {
    enabled: {
      type: Boolean,
      default: false
    },
    // منبع داده: 'tgju' یا 'telegram'
    source: {
      type: String,
      enum: ['tgju', 'telegram'],
      default: 'tgju'
    },
    intervalMinutes: {
      type: Number,
      default: 5
    },
    // ارزهای فعال برای به‌روزرسانی (همه ارزهایی که TGJU برمیگرداند)
    activeCurrencies: {
      type: [String],
      default: [
        // ارزها - همه ۲۳ ارز TGJU
        'USD', 'EUR', 'GBP', 'AED', 'TRY', 'CAD', 'AUD', 'CHF', 'CNY', 'JPY',
        'SAR', 'KWD', 'QAR', 'OMR', 'BHD', 'RUB', 'INR', 'PKR', 'AFN', 'IQD',
        'AZN', 'GEL', 'TMT',
        // طلا و سکه
        'GOLD_18K', 'GOLD_24K', 'GOLD_750', 'MESGHAL',
        'COIN_EMAMI', 'COIN_BAHAR', 'COIN_NIM', 'COIN_ROB', 'COIN_GERAMI',
        // نقره
        'SILVER_999', 'SILVER_925', 'GOLD_OUNCE', 'SILVER_OUNCE',
        // کریپتو
        'USDT', 'BTC', 'ETH'
      ]
    },
    // تنظیمات API تلگرام (در صورت استفاده از telegram)
    telegramApiId: String,
    telegramApiHash: String,
    telegramSession: String,
    dollarChannel: {
      type: String,
      default: 'dollar_tehran3bze'
    },
    goldChannel: {
      type: String,
      default: 'abshdh'
    },
    // ضرایب تبدیل (فقط برای تلگرام)
    conversionRates: {
      usdToEur: { type: Number, default: 0.92 },
      usdToGbp: { type: Number, default: 0.79 },
      usdToAed: { type: Number, default: 3.67 },
      usdToCad: { type: Number, default: 1.36 },
      usdToTry: { type: Number, default: 32.5 }
    },
    // اسپرد خرید/فروش (درصد)
    buySpread: { type: Number, default: 0.5 },
    sellSpread: { type: Number, default: 0.5 },
    // آخرین اجرا
    lastRun: Date,
    lastError: String
  }
}, {
  timestamps: true
});

// فقط یک رکورد تنظیمات داشته باشیم
settingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    settings = await this.create({});
  }
  return settings;
};

module.exports = mongoose.model('Settings', settingsSchema);
