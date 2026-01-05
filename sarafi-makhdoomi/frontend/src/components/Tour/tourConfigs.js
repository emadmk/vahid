// تنظیمات تور برای صفحات مختلف

// تور پنل صراف - داشبورد
export const sarafiDashboardTour = {
  id: 'sarafi-dashboard',
  steps: [
    {
      target: '[data-tour="stats-cards"]',
      title: 'آمار کلی',
      content: 'در این بخش آمار کلی صرافی شما نمایش داده می‌شود: تعداد مشتریان، معاملات امروز، و موجودی کیف پول.',
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

// تور پنل مشتری - داشبورد
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
      target: '[data-tour="quick-actions"]',
      title: 'دسترسی سریع',
      content: 'از این دکمه‌ها می‌توانید به سرعت معامله جدید ثبت کنید یا لیست معاملات را ببینید.',
      position: 'bottom'
    },
    {
      target: '[data-tour="currency-rates"]',
      title: 'نرخ ارزها',
      content: 'نرخ لحظه‌ای ارزها در این بخش نمایش داده می‌شود. نرخ خرید و فروش را مشاهده کنید.',
      position: 'top'
    }
  ]
};

// تور پنل مشتری - معامله فوری
export const userInstantTradeTour = {
  id: 'user-instant-trade',
  steps: [
    {
      target: '[data-tour="currency-selector"]',
      title: 'انتخاب ارز',
      content: 'ارز مورد نظر برای خرید یا فروش را از این لیست انتخاب کنید.',
      position: 'bottom'
    },
    {
      target: '[data-tour="trade-type"]',
      title: 'نوع معامله',
      content: 'مشخص کنید می‌خواهید ارز بخرید یا بفروشید. نرخ معامله متناسب نمایش داده می‌شود.',
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

// تور پنل مشتری - کیف پول
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

// دریافت تور بر اساس مسیر صفحه
export const getTourByPath = (pathname, userRole) => {
  if (userRole === 'sarafi') {
    if (pathname.includes('/dashboard') || pathname === '/sarafi') {
      return sarafiDashboardTour;
    }
    if (pathname.includes('/instant-trade')) {
      return sarafiInstantTradeTour;
    }
    if (pathname.includes('/customers')) {
      return sarafiCustomersTour;
    }
  } else {
    if (pathname.includes('/dashboard') || pathname === '/') {
      return userDashboardTour;
    }
    if (pathname.includes('/instant-trade')) {
      return userInstantTradeTour;
    }
    if (pathname.includes('/wallet')) {
      return userWalletTour;
    }
  }
  return null;
};
