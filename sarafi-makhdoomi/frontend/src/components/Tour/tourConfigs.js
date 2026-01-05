// تنظیمات تور برای صفحات مختلف

// ===================== پنل کاربر =====================

// تور پنل کاربر - داشبورد
export const userDashboardTour = {
  id: 'user-dashboard',
  steps: [
    {
      target: '[data-tour="wallet-balance"]',
      title: 'موجودی کیف پول',
      content: 'موجودی نقدی و اعتباری کیف پول شما در این بخش نمایش داده می‌شود.',
      position: 'bottom'
    },
    {
      target: '[data-tour="stats-cards"]',
      title: 'آمار معاملات',
      content: 'تعداد معاملات، معاملات در جریان و سایر آمار شما در این بخش قابل مشاهده است.',
      position: 'bottom'
    },
    {
      target: '[data-tour="quick-actions"]',
      title: 'دسترسی سریع',
      content: 'از این دکمه‌ها می‌توانید به سرعت معامله جدید ثبت کنید یا به بخش‌های مختلف دسترسی پیدا کنید.',
      position: 'bottom'
    },
    {
      target: '[data-tour="sidebar"]',
      title: 'منوی کناری',
      content: 'از این منو به تمام بخش‌های پنل کاربری دسترسی دارید: کیف پول، معاملات، بازار و پروفایل.',
      position: 'left'
    }
  ]
};

// تور پنل کاربر - کیف پول
export const userWalletTour = {
  id: 'user-wallet',
  steps: [
    {
      target: '[data-tour="wallet-summary"]',
      title: 'خلاصه کیف پول',
      content: 'موجودی نقدی، اعتباری و سقف اعتبار شما در این بخش نمایش داده می‌شود.',
      position: 'bottom'
    },
    {
      target: '[data-tour="transactions"]',
      title: 'تراکنش‌ها',
      content: 'تمام واریزها، برداشت‌ها و تراکنش‌های کیف پول شما در این لیست قابل مشاهده است.',
      position: 'top'
    }
  ]
};

// تور پنل کاربر - معامله فوری
export const userInstantTradeTour = {
  id: 'user-instant-trade',
  steps: [
    {
      target: '[data-tour="currency-selector"]',
      title: 'انتخاب ارز',
      content: 'ارز مورد نظر برای خرید یا فروش را از این لیست انتخاب کنید. ارزها به دسته‌های مختلف تقسیم شده‌اند.',
      position: 'bottom'
    },
    {
      target: '[data-tour="trade-type"]',
      title: 'نوع معامله',
      content: 'مشخص کنید می‌خواهید ارز بخرید یا بفروشید. نرخ معامله متناسب با نوع معامله نمایش داده می‌شود.',
      position: 'bottom'
    },
    {
      target: '[data-tour="trade-amount"]',
      title: 'مقدار معامله',
      content: 'مقدار ارز مورد نظر را وارد کنید. مبلغ کل به صورت خودکار محاسبه می‌شود.',
      position: 'top'
    },
    {
      target: '[data-tour="submit-trade"]',
      title: 'ثبت معامله',
      content: 'پس از بررسی اطلاعات، معامله را ثبت کنید. معامله پس از تایید صراف نهایی می‌شود.',
      position: 'top'
    }
  ]
};

// تور پنل کاربر - معامله حرفه‌ای
export const userProTradeTour = {
  id: 'user-pro-trade',
  steps: [
    {
      target: '[data-tour="order-book"]',
      title: 'دفتر سفارشات',
      content: 'سفارشات خرید و فروش سایر کاربران را در این بخش مشاهده کنید.',
      position: 'bottom'
    },
    {
      target: '[data-tour="order-form"]',
      title: 'فرم سفارش',
      content: 'سفارش خرید یا فروش خود را با قیمت دلخواه ثبت کنید.',
      position: 'bottom'
    },
    {
      target: '[data-tour="my-orders"]',
      title: 'سفارشات من',
      content: 'سفارشات باز و تاریخچه سفارشات خود را در این بخش ببینید.',
      position: 'top'
    }
  ]
};

// تور پنل کاربر - بازار
export const userMarketTour = {
  id: 'user-market',
  steps: [
    {
      target: '[data-tour="market-rates"]',
      title: 'نرخ لحظه‌ای',
      content: 'نرخ خرید و فروش تمام ارزها را به صورت لحظه‌ای مشاهده کنید.',
      position: 'bottom'
    },
    {
      target: '[data-tour="currency-list"]',
      title: 'لیست ارزها',
      content: 'روی هر ارز کلیک کنید تا جزئیات بیشتر و نمودار قیمت را ببینید.',
      position: 'top'
    }
  ]
};

// تور پنل کاربر - امتیاز
export const userScoreTour = {
  id: 'user-score',
  steps: [
    {
      target: '[data-tour="score-summary"]',
      title: 'امتیاز شما',
      content: 'امتیاز کل و سطح کاربری شما در این بخش نمایش داده می‌شود.',
      position: 'bottom'
    },
    {
      target: '[data-tour="score-benefits"]',
      title: 'مزایای امتیاز',
      content: 'با افزایش امتیاز، از تخفیف کارمزد و سقف اعتبار بیشتر برخوردار شوید.',
      position: 'top'
    }
  ]
};

// تور پنل کاربر - پروفایل
export const userProfileTour = {
  id: 'user-profile',
  steps: [
    {
      target: '[data-tour="profile-info"]',
      title: 'اطلاعات پروفایل',
      content: 'اطلاعات شخصی و وضعیت حساب کاربری خود را مشاهده و ویرایش کنید.',
      position: 'bottom'
    },
    {
      target: '[data-tour="profile-settings"]',
      title: 'تنظیمات',
      content: 'تنظیمات امنیتی و اعلان‌ها را از این بخش مدیریت کنید.',
      position: 'top'
    }
  ]
};

// ===================== پنل صراف =====================

// تور پنل صراف - داشبورد
export const sarafiDashboardTour = {
  id: 'sarafi-dashboard',
  steps: [
    {
      target: '[data-tour="stats-cards"]',
      title: 'آمار کلی',
      content: 'در این بخش آمار کلی صرافی شما نمایش داده می‌شود: تعداد مشتریان، معاملات امروز، و گردش مالی.',
      position: 'bottom'
    },
    {
      target: '[data-tour="recent-trades"]',
      title: 'معاملات اخیر',
      content: 'لیست آخرین معاملات انجام شده در صرافی شما. می‌توانید وضعیت هر معامله را مشاهده کنید.',
      position: 'top'
    },
    {
      target: '[data-tour="sidebar"]',
      title: 'منوی کناری',
      content: 'از این منو به بخش‌های مختلف پنل دسترسی دارید: مشتریان، معاملات، گزارشات و تنظیمات.',
      position: 'left'
    }
  ]
};

// تور پنل صراف - معاملات فوری
export const sarafiInstantTradeTour = {
  id: 'sarafi-instant-trade',
  steps: [
    {
      target: '[data-tour="currency-selector"]',
      title: 'انتخاب ارز',
      content: 'از این بخش ارز مورد نظر را انتخاب کنید. ارزها به دسته‌های مختلف تقسیم شده‌اند و می‌توانید جستجو کنید.',
      position: 'bottom'
    },
    {
      target: '[data-tour="new-trade-btn"]',
      title: 'معامله جدید',
      content: 'با کلیک روی این دکمه، فرم ثبت معامله جدید باز می‌شود. مشتری، نوع معامله و مقدار را وارد کنید.',
      position: 'bottom'
    },
    {
      target: '[data-tour="trade-filters"]',
      title: 'فیلتر معاملات',
      content: 'از این فیلترها برای مشاهده معاملات بر اساس وضعیت استفاده کنید: در انتظار، تایید شده، وصول و...',
      position: 'bottom'
    },
    {
      target: '[data-tour="trades-table"]',
      title: 'لیست معاملات',
      content: 'تمام معاملات فوری در این جدول نمایش داده می‌شوند. از ستون عملیات می‌توانید معاملات را تایید، رد یا تکمیل کنید.',
      position: 'top'
    }
  ]
};

// تور پنل صراف - معاملات حرفه‌ای
export const sarafiProTradeTour = {
  id: 'sarafi-pro-trade',
  steps: [
    {
      target: '[data-tour="currency-selector"]',
      title: 'انتخاب ارز',
      content: 'ارز مورد نظر برای مشاهده سفارشات را انتخاب کنید.',
      position: 'bottom'
    },
    {
      target: '[data-tour="order-book"]',
      title: 'دفتر سفارشات',
      content: 'سفارشات خرید و فروش مشتریان را در این بخش مشاهده و مدیریت کنید.',
      position: 'bottom'
    },
    {
      target: '[data-tour="pending-orders"]',
      title: 'سفارشات در انتظار',
      content: 'سفارشاتی که نیاز به تایید یا تطبیق دارند در این بخش نمایش داده می‌شوند.',
      position: 'top'
    }
  ]
};

// تور پنل صراف - مدیریت نرخ‌ها
export const sarafiRatesTour = {
  id: 'sarafi-rates',
  steps: [
    {
      target: '[data-tour="rate-list"]',
      title: 'لیست نرخ‌ها',
      content: 'نرخ خرید و فروش تمام ارزها را در این بخش مشاهده و ویرایش کنید.',
      position: 'bottom'
    },
    {
      target: '[data-tour="rate-source"]',
      title: 'منبع نرخ',
      content: 'نرخ‌ها می‌توانند دستی، از منبع آنلاین یا ترکیبی باشند.',
      position: 'top'
    }
  ]
};

// تور پنل صراف - پنل وصول
export const sarafiSettlementsTour = {
  id: 'sarafi-settlements',
  steps: [
    {
      target: '[data-tour="pending-settlements"]',
      title: 'در انتظار وصول',
      content: 'معاملاتی که نیاز به وصول دارند در این بخش نمایش داده می‌شوند.',
      position: 'bottom'
    },
    {
      target: '[data-tour="settlement-actions"]',
      title: 'عملیات وصول',
      content: 'با کلیک روی هر معامله می‌توانید وصول را تایید کنید.',
      position: 'top'
    }
  ]
};

// تور پنل صراف - مدیریت اسپرد
export const sarafiSpreadsTour = {
  id: 'sarafi-spreads',
  steps: [
    {
      target: '[data-tour="spread-list"]',
      title: 'اسپرد ارزها',
      content: 'اسپرد (تفاوت نرخ خرید و فروش) هر ارز را در این بخش تنظیم کنید.',
      position: 'bottom'
    },
    {
      target: '[data-tour="spread-edit"]',
      title: 'ویرایش اسپرد',
      content: 'با کلیک روی هر ارز می‌توانید اسپرد آن را تغییر دهید.',
      position: 'top'
    }
  ]
};

// تور پنل صراف - رسیدها
export const sarafiReceiptsTour = {
  id: 'sarafi-receipts',
  steps: [
    {
      target: '[data-tour="receipt-list"]',
      title: 'لیست رسیدها',
      content: 'تمام رسیدهای صادر شده در این بخش قابل مشاهده هستند.',
      position: 'bottom'
    },
    {
      target: '[data-tour="receipt-print"]',
      title: 'چاپ رسید',
      content: 'با کلیک روی هر رسید می‌توانید آن را چاپ کنید.',
      position: 'top'
    }
  ]
};

// تور پنل صراف - حسابداری
export const sarafiAccountantTour = {
  id: 'sarafi-accountant',
  steps: [
    {
      target: '[data-tour="pending-accounting"]',
      title: 'در انتظار حسابداری',
      content: 'معاملاتی که نیاز به تایید حسابداری دارند در این بخش نمایش داده می‌شوند.',
      position: 'bottom'
    },
    {
      target: '[data-tour="accounting-actions"]',
      title: 'عملیات حسابداری',
      content: 'معاملات را تایید یا رد کنید.',
      position: 'top'
    }
  ]
};

// تور پنل صراف - کیف پول مشتریان
export const sarafiCustomerWalletsTour = {
  id: 'sarafi-customer-wallets',
  steps: [
    {
      target: '[data-tour="wallet-list"]',
      title: 'کیف پول مشتریان',
      content: 'موجودی کیف پول تمام مشتریان را در این بخش مشاهده کنید.',
      position: 'bottom'
    },
    {
      target: '[data-tour="wallet-actions"]',
      title: 'عملیات کیف پول',
      content: 'می‌توانید موجودی مشتری را شارژ کنید یا اعتبار اختصاص دهید.',
      position: 'top'
    }
  ]
};

// تور پنل صراف - مشتریان
export const sarafiCustomersTour = {
  id: 'sarafi-customers',
  steps: [
    {
      target: '[data-tour="add-customer-btn"]',
      title: 'افزودن مشتری',
      content: 'با کلیک روی این دکمه، مشتری جدید اضافه کنید. اطلاعات هویتی و شماره تماس الزامی است.',
      position: 'bottom'
    },
    {
      target: '[data-tour="customer-search"]',
      title: 'جستجوی مشتری',
      content: 'با وارد کردن نام، شماره تماس یا کد ملی، مشتری مورد نظر را جستجو کنید.',
      position: 'bottom'
    },
    {
      target: '[data-tour="customers-list"]',
      title: 'لیست مشتریان',
      content: 'تمام مشتریان ثبت شده در این لیست نمایش داده می‌شوند. می‌توانید اطلاعات، کیف پول و معاملات هر مشتری را مشاهده کنید.',
      position: 'top'
    }
  ]
};

// تور پنل صراف - گروه‌های صراف
export const sarafiGroupsTour = {
  id: 'sarafi-groups',
  steps: [
    {
      target: '[data-tour="group-list"]',
      title: 'گروه‌های صراف',
      content: 'گروه‌هایی که عضو آنها هستید یا ایجاد کرده‌اید در این بخش نمایش داده می‌شوند.',
      position: 'bottom'
    },
    {
      target: '[data-tour="create-group"]',
      title: 'ایجاد گروه',
      content: 'با کلیک روی این دکمه می‌توانید گروه جدید ایجاد کنید و صراف‌های دیگر را دعوت کنید.',
      position: 'bottom'
    }
  ]
};

// تور پنل صراف - کارکنان
export const sarafiStaffTour = {
  id: 'sarafi-staff',
  steps: [
    {
      target: '[data-tour="staff-list"]',
      title: 'لیست کارکنان',
      content: 'کارکنان صرافی شما در این بخش نمایش داده می‌شوند.',
      position: 'bottom'
    },
    {
      target: '[data-tour="add-staff"]',
      title: 'افزودن کارمند',
      content: 'کارمند جدید اضافه کنید و دسترسی‌های لازم را تعیین کنید.',
      position: 'bottom'
    }
  ]
};

// تور پنل صراف - لاگ عملیات
export const sarafiAuditLogsTour = {
  id: 'sarafi-audit-logs',
  steps: [
    {
      target: '[data-tour="logs-list"]',
      title: 'لاگ عملیات',
      content: 'تمام عملیات انجام شده در صرافی شما در این بخش ثبت می‌شود.',
      position: 'bottom'
    },
    {
      target: '[data-tour="logs-filter"]',
      title: 'فیلتر لاگ‌ها',
      content: 'لاگ‌ها را بر اساس نوع عملیات، تاریخ یا کاربر فیلتر کنید.',
      position: 'top'
    }
  ]
};

// تور پنل صراف - پروفایل
export const sarafiProfileTour = {
  id: 'sarafi-profile',
  steps: [
    {
      target: '[data-tour="profile-info"]',
      title: 'اطلاعات صرافی',
      content: 'اطلاعات صرافی و مشخصات خود را مشاهده و ویرایش کنید.',
      position: 'bottom'
    },
    {
      target: '[data-tour="profile-settings"]',
      title: 'تنظیمات',
      content: 'تنظیمات امنیتی و اعلان‌ها را از این بخش مدیریت کنید.',
      position: 'top'
    }
  ]
};

// دریافت تور بر اساس مسیر صفحه
export const getTourByPath = (pathname, userRole) => {
  if (userRole === 'sarafi') {
    // پنل صراف
    if (pathname === '/sarafi' || pathname === '/sarafi/') {
      return sarafiDashboardTour;
    }
    if (pathname.includes('/instant-trade')) {
      return sarafiInstantTradeTour;
    }
    if (pathname.includes('/pro-trade')) {
      return sarafiProTradeTour;
    }
    if (pathname.includes('/rates')) {
      return sarafiRatesTour;
    }
    if (pathname.includes('/settlements')) {
      return sarafiSettlementsTour;
    }
    if (pathname.includes('/spreads')) {
      return sarafiSpreadsTour;
    }
    if (pathname.includes('/receipts')) {
      return sarafiReceiptsTour;
    }
    if (pathname.includes('/accountant')) {
      return sarafiAccountantTour;
    }
    if (pathname.includes('/customer-wallets')) {
      return sarafiCustomerWalletsTour;
    }
    if (pathname.includes('/customers')) {
      return sarafiCustomersTour;
    }
    if (pathname.includes('/groups')) {
      return sarafiGroupsTour;
    }
    if (pathname.includes('/staff')) {
      return sarafiStaffTour;
    }
    if (pathname.includes('/audit-logs')) {
      return sarafiAuditLogsTour;
    }
    if (pathname.includes('/profile')) {
      return sarafiProfileTour;
    }
  } else {
    // پنل کاربر
    if (pathname === '/dashboard' || pathname === '/dashboard/') {
      return userDashboardTour;
    }
    if (pathname.includes('/wallet')) {
      return userWalletTour;
    }
    if (pathname.includes('/instant-trade')) {
      return userInstantTradeTour;
    }
    if (pathname.includes('/pro-trade')) {
      return userProTradeTour;
    }
    if (pathname.includes('/market')) {
      return userMarketTour;
    }
    if (pathname.includes('/score')) {
      return userScoreTour;
    }
    if (pathname.includes('/profile')) {
      return userProfileTour;
    }
  }
  return null;
};
