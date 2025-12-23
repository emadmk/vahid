const mongoose = require('mongoose');

// مدل کارکنان صرافی - مدیریت نقش‌های مختلف در صرافی
const sarafiStaffSchema = new mongoose.Schema({
  // کاربر کارمند
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // صراف (مالک صرافی)
  sarafi: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // نقش در صرافی
  role: {
    type: String,
    enum: [
      'accountant',          // حسابدار
      'currency_collector',  // وصول ارزی
      'rial_collector',      // وصول ریالی
      'manager',             // مدیر
      'operator'             // اپراتور
    ],
    required: true
  },

  // دسترسی‌ها
  permissions: {
    // دسترسی‌های حسابدار
    canManageWallets: {
      type: Boolean,
      default: false
    },
    canViewTransactions: {
      type: Boolean,
      default: false
    },
    canManageCredit: {
      type: Boolean,
      default: false
    },
    canGenerateReports: {
      type: Boolean,
      default: false
    },

    // دسترسی‌های وصول ارزی
    canConfirmCurrencyCollection: {
      type: Boolean,
      default: false
    },
    canViewCurrencyTrades: {
      type: Boolean,
      default: false
    },

    // دسترسی‌های وصول ریالی
    canConfirmRialCollection: {
      type: Boolean,
      default: false
    },
    canViewRialTrades: {
      type: Boolean,
      default: false
    },

    // دسترسی‌های عمومی
    canViewCustomers: {
      type: Boolean,
      default: false
    },
    canManageOffers: {
      type: Boolean,
      default: false
    },
    canApproveTrades: {
      type: Boolean,
      default: false
    },
    canManageRates: {
      type: Boolean,
      default: false
    }
  },

  // وضعیت
  isActive: {
    type: Boolean,
    default: true
  },

  // تاریخ شروع همکاری
  startDate: {
    type: Date,
    default: Date.now
  },

  // تاریخ پایان همکاری
  endDate: {
    type: Date
  },

  // یادداشت
  notes: {
    type: String,
    maxlength: 500
  },

  // آخرین فعالیت
  lastActivity: {
    type: Date
  },

  // تعداد عملیات انجام شده
  operationsCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// ایندکس‌ها
sarafiStaffSchema.index({ user: 1, sarafi: 1 }, { unique: true });
sarafiStaffSchema.index({ sarafi: 1, role: 1 });
sarafiStaffSchema.index({ sarafi: 1, isActive: 1 });

// تنظیم دسترسی‌های پیش‌فرض بر اساس نقش
sarafiStaffSchema.pre('save', function(next) {
  if (this.isNew) {
    switch (this.role) {
      case 'accountant':
        this.permissions.canManageWallets = true;
        this.permissions.canViewTransactions = true;
        this.permissions.canManageCredit = true;
        this.permissions.canGenerateReports = true;
        this.permissions.canViewCustomers = true;
        break;

      case 'currency_collector':
        this.permissions.canConfirmCurrencyCollection = true;
        this.permissions.canViewCurrencyTrades = true;
        this.permissions.canViewCustomers = true;
        break;

      case 'rial_collector':
        this.permissions.canConfirmRialCollection = true;
        this.permissions.canViewRialTrades = true;
        this.permissions.canViewCustomers = true;
        break;

      case 'manager':
        // مدیر همه دسترسی‌ها را دارد
        Object.keys(this.permissions).forEach(key => {
          this.permissions[key] = true;
        });
        break;

      case 'operator':
        this.permissions.canViewTransactions = true;
        this.permissions.canViewCustomers = true;
        this.permissions.canManageOffers = true;
        break;
    }
  }
  next();
});

module.exports = mongoose.model('SarafiStaff', sarafiStaffSchema);
