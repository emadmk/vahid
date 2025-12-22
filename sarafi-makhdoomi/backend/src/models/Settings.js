const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  // اطلاعات سایت
  siteName: {
    type: String,
    default: 'صرافی حاج عباس مخدومی'
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
