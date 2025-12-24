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
      'sales_manager',       // مدیر فروش
      'manager',             // مدیر
      'operator'             // اپراتور
    ],
    required: true
  },

  // دسترسی‌ها
  permissions: {
    // ========== دسترسی‌های حسابدار ==========
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
    canCreateAccountingDoc: {
      type: Boolean,
      default: false
    },

    // ========== دسترسی‌های وصول ارزی ==========
    canConfirmCurrencyCollection: {
      type: Boolean,
      default: false
    },
    canViewCurrencyTrades: {
      type: Boolean,
      default: false
    },
    canUploadCurrencyReceipt: {
      type: Boolean,
      default: false
    },

    // ========== دسترسی‌های وصول ریالی ==========
    canConfirmRialCollection: {
      type: Boolean,
      default: false
    },
    canViewRialTrades: {
      type: Boolean,
      default: false
    },
    canUploadRialReceipt: {
      type: Boolean,
      default: false
    },

    // ========== دسترسی‌های مدیر فروش ==========
    canCreateOffers: {
      type: Boolean,
      default: false
    },
    canEditOffers: {
      type: Boolean,
      default: false
    },
    canCancelOffers: {
      type: Boolean,
      default: false
    },
    canBuyCurrency: {
      type: Boolean,
      default: false
    },
    canSellCurrency: {
      type: Boolean,
      default: false
    },
    canViewOrderBook: {
      type: Boolean,
      default: false
    },
    canViewMarketTape: {
      type: Boolean,
      default: false
    },

    // ========== دسترسی‌های عمومی ==========
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
    },
    canManageSpread: {
      type: Boolean,
      default: false
    },
    canSuspendCustomer: {
      type: Boolean,
      default: false
    },
    canChangeTier: {
      type: Boolean,
      default: false
    },
    canViewAuditLogs: {
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
        // حسابدار: دسترسی مالی و گزارش‌گیری، بدون دسترسی به معاملات
        this.permissions.canManageWallets = true;
        this.permissions.canViewTransactions = true;
        this.permissions.canManageCredit = false; // بدون اختیار شارژ اعتباری
        this.permissions.canGenerateReports = true;
        this.permissions.canViewCustomers = true;
        this.permissions.canCreateAccountingDoc = true;
        this.permissions.canViewAuditLogs = true;
        break;

      case 'currency_collector':
        // وصول ارزی: فقط ثبت و تایید وصول ارزی
        this.permissions.canConfirmCurrencyCollection = true;
        this.permissions.canViewCurrencyTrades = true;
        this.permissions.canViewCustomers = true;
        this.permissions.canUploadCurrencyReceipt = true;
        break;

      case 'rial_collector':
        // وصول ریالی: فقط ثبت و تایید وصول ریالی
        this.permissions.canConfirmRialCollection = true;
        this.permissions.canViewRialTrades = true;
        this.permissions.canViewCustomers = true;
        this.permissions.canUploadRialReceipt = true;
        break;

      case 'sales_manager':
        // مدیر فروش: دسترسی کامل به بازار و فروش
        this.permissions.canCreateOffers = true;
        this.permissions.canEditOffers = true;
        this.permissions.canCancelOffers = true;
        this.permissions.canBuyCurrency = true;
        this.permissions.canSellCurrency = true;
        this.permissions.canViewOrderBook = true;
        this.permissions.canViewMarketTape = true;
        this.permissions.canManageOffers = true;
        this.permissions.canViewTransactions = true;
        this.permissions.canViewCustomers = true;
        this.permissions.canApproveTrades = true; // قابل تایید معامله (با قواعد)
        break;

      case 'manager':
        // مدیر: همه دسترسی‌ها
        Object.keys(this.permissions.toObject()).forEach(key => {
          this.permissions[key] = true;
        });
        break;

      case 'operator':
        // اپراتور: دسترسی محدود به مشاهده و ثبت
        this.permissions.canViewTransactions = true;
        this.permissions.canViewCustomers = true;
        this.permissions.canManageOffers = true;
        this.permissions.canViewOrderBook = true;
        this.permissions.canViewMarketTape = true;
        break;
    }
  }
  next();
});

module.exports = mongoose.model('SarafiStaff', sarafiStaffSchema);
