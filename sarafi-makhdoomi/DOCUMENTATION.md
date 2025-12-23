# مستندات سیستم صرافی گلدن 2026

## فهرست مطالب
- [معرفی](#معرفی)
- [تکنولوژی‌ها](#تکنولوژی‌ها)
- [نصب و راه‌اندازی](#نصب-و-راه‌اندازی)
- [ساختار پروژه](#ساختار-پروژه)
- [مدل‌های دیتابیس](#مدل‌های-دیتابیس)
- [API Endpoints](#api-endpoints)
- [پنل‌ها و صفحات](#پنل‌ها-و-صفحات)
- [سیستم امتیازدهی](#سیستم-امتیازدهی)
- [سیستم کیف پول](#سیستم-کیف-پول)
- [سیستم معاملات](#سیستم-معاملات)
- [اطلاعات ورود تست](#اطلاعات-ورود-تست)

---

## معرفی

صرافی گلدن 2026 یک سیستم جامع مدیریت صرافی با قابلیت‌های زیر:

- **سه نقش کاربری**: ادمین، صراف، کاربر (مشتری)
- **سیستم دوگانه کیف پول**: نقدی و اعتباری
- **سیستم معاملات پیشرفته**: با فرآیند تصمیم‌گیری صراف
- **بازار**: پیشنهادات خرید/فروش با قیمت‌گذاری شرطی
- **سیستم امتیازدهی**: با رده‌بندی مشتریان (A/B/C)
- **موتور کارمزد پلکانی**: با تخفیف بر اساس رده

---

## تکنولوژی‌ها

### Backend
| تکنولوژی | نسخه | کاربرد |
|----------|------|--------|
| Node.js | 18+ | محیط اجرا |
| Express.js | 4.x | فریم‌ورک وب |
| MongoDB | 6+ | دیتابیس |
| Mongoose | 8.x | ODM |
| JWT | - | احراز هویت |
| Nodemailer | - | ارسال ایمیل |
| bcryptjs | - | رمزنگاری |

### Frontend
| تکنولوژی | نسخه | کاربرد |
|----------|------|--------|
| React | 18.x | فریم‌ورک UI |
| Vite | 5.x | باندلر |
| Tailwind CSS | 3.x | استایل |
| React Router | 6.x | مسیریابی |
| Zustand | 4.x | مدیریت state |
| Axios | 1.x | HTTP client |
| React Hot Toast | - | نوتیفیکیشن |
| Jalali Moment | - | تاریخ شمسی |
| React Icons | - | آیکون‌ها |

### DevOps
| تکنولوژی | کاربرد |
|----------|--------|
| PM2 | مدیریت پروسه |
| Nginx | وب سرور |

---

## نصب و راه‌اندازی

### پیش‌نیازها
```bash
node -v  # >= 18
npm -v   # >= 9
mongod --version  # >= 6
```

### نصب
```bash
# کلون پروژه
cd /root/sarafi-makhdoomi

# نصب وابستگی‌های بک‌اند
cd backend
npm install

# نصب وابستگی‌های فرانت‌اند
cd ../frontend
npm install

# بیلد فرانت‌اند
npm run build
```

### تنظیمات محیطی
فایل `backend/.env`:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/sarafi
JWT_SECRET=your-secret-key
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### سید دیتابیس
```bash
cd backend
node src/seeds/seedAll.js
```

### اجرا با PM2
```bash
# اجرای بک‌اند
pm2 start src/server.js --name sarafi-backend

# وضعیت
pm2 status

# لاگ‌ها
pm2 logs sarafi-backend
```

---

## ساختار پروژه

```
sarafi-makhdoomi/
├── backend/
│   ├── src/
│   │   ├── models/          # مدل‌های MongoDB
│   │   │   ├── User.js
│   │   │   ├── Currency.js
│   │   │   ├── Wallet.js
│   │   │   ├── WalletTransaction.js
│   │   │   ├── Trade.js
│   │   │   ├── MarketOffer.js
│   │   │   ├── Commission.js
│   │   │   ├── CustomerTier.js
│   │   │   ├── Request.js
│   │   │   ├── Notification.js
│   │   │   └── Settings.js
│   │   ├── routes/          # روت‌های API
│   │   │   ├── authRoutes.js
│   │   │   ├── userRoutes.js
│   │   │   ├── adminRoutes.js
│   │   │   ├── sarafiRoutes.js
│   │   │   ├── walletRoutes.js
│   │   │   ├── tradeRoutes.js
│   │   │   ├── marketRoutes.js
│   │   │   └── scoringRoutes.js
│   │   ├── services/        # سرویس‌های بیزینس
│   │   │   ├── walletService.js
│   │   │   ├── tradeService.js
│   │   │   ├── marketService.js
│   │   │   ├── commissionService.js
│   │   │   └── scoringService.js
│   │   ├── middlewares/     # میدل‌ورها
│   │   └── seeds/           # فایل‌های سید
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/      # کامپوننت‌ها
│   │   │   ├── layouts/
│   │   │   ├── wallet/
│   │   │   └── scoring/
│   │   ├── pages/           # صفحات
│   │   │   ├── user/
│   │   │   ├── sarafi/
│   │   │   └── admin/
│   │   ├── services/        # سرویس‌های API
│   │   ├── store/           # Zustand store
│   │   └── App.jsx
│   └── index.html
└── DOCUMENTATION.md
```

---

## مدل‌های دیتابیس

### User (کاربر)
```javascript
{
  firstName: String,
  lastName: String,
  email: String (unique),
  phone: String (unique),
  password: String (hashed),
  role: 'user' | 'sarafi' | 'admin',
  status: 'pending' | 'approved' | 'rejected' | 'suspended',
  score: Number,
  blackPoints: Number,
  tier: 'A' | 'B' | 'C' | 'new',
  sarafi: ObjectId (ref: User),
  sarafiApprovalStatus: 'pending' | 'approved' | 'rejected',
  financialInfo: {
    totalTradeVolume: Number,
    successfulTrades: Number,
    lastTradeDate: Date,
    averageTradeVolume: Number
  },
  sarafiStats: {
    score: Number,
    activeCustomers: Number,
    totalVolume: Number,
    successRate: Number,
    avgResponseTime: Number
  }
}
```

### Currency (ارز)
```javascript
{
  name: String,
  nameFa: String,
  symbol: String,
  code: String,
  buyRate: Number,
  sellRate: Number,
  isActive: Boolean,
  order: Number
}
```

### Wallet (کیف پول)
```javascript
{
  user: ObjectId,
  type: 'cash' | 'credit',
  balance: Number,
  creditLimit: Number,
  usedCredit: Number,
  isActive: Boolean
}
```

### Trade (معامله)
```javascript
{
  tradeNumber: String,
  customer: ObjectId,
  sarafi: ObjectId,
  currency: ObjectId,
  type: 'buy' | 'sell',
  amount: Number,
  rate: Number,
  totalAmount: Number,
  status: 'pending' | 'approved' | 'processing' |
          'awaiting_currency' | 'awaiting_rial' |
          'completed' | 'cancelled',
  sarafiDecision: {
    decision: 'instant' | 'callback' | 'reject',
    decidedAt: Date,
    decidedBy: ObjectId,
    notes: String
  },
  currencyCollection: {
    status: 'pending' | 'collected',
    collectedAt: Date,
    collectedBy: ObjectId
  },
  rialCollection: {
    status: 'pending' | 'collected',
    collectedAt: Date,
    collectedBy: ObjectId,
    bankInfo: Object
  },
  commission: {
    rate: Number,
    amount: Number
  },
  paymentMethod: 'cash' | 'credit' | 'mixed'
}
```

### MarketOffer (پیشنهاد بازار)
```javascript
{
  user: ObjectId,
  currency: ObjectId,
  type: 'buy' | 'sell',
  amount: Number,
  pricePerUnit: Number,
  totalPrice: Number,
  status: 'active' | 'completed' | 'cancelled' | 'expired',
  isConditional: Boolean,
  conditionType: 'price_above' | 'price_below',
  conditionValue: Number,
  acceptedBy: ObjectId,
  expiresAt: Date
}
```

### Commission (کارمزد)
```javascript
{
  name: String,
  type: 'percentage' | 'flat',
  currency: ObjectId,
  tradeType: 'buy' | 'sell' | 'both',
  tiers: [{
    minAmount: Number,
    maxAmount: Number,
    rate: Number
  }],
  flatRate: Number,
  minCommission: Number,
  maxCommission: Number,
  isActive: Boolean
}
```

### CustomerTier (رده مشتری)
```javascript
{
  name: String,
  code: 'A' | 'B' | 'C' | 'new',
  minScore: Number,
  maxScore: Number,
  benefits: {
    commissionDiscount: Number,
    prioritySupport: Boolean,
    dedicatedManager: Boolean,
    specialRates: Boolean
  },
  color: String,
  description: String
}
```

---

## API Endpoints

### احراز هویت (`/api/auth`)
| Method | Endpoint | توضیح |
|--------|----------|-------|
| POST | `/register` | ثبت‌نام |
| POST | `/login` | ورود |
| POST | `/send-otp` | ارسال کد تایید |
| POST | `/verify-otp` | تایید کد |
| POST | `/forgot-password` | فراموشی رمز |
| POST | `/reset-password` | بازنشانی رمز |
| GET | `/me` | اطلاعات کاربر |

### کیف پول (`/api/wallets`)
| Method | Endpoint | توضیح |
|--------|----------|-------|
| GET | `/my-wallets` | کیف پول‌های من |
| POST | `/deposit` | واریز |
| POST | `/withdraw` | برداشت |
| POST | `/credit/increase` | افزایش اعتبار |
| GET | `/transactions` | تراکنش‌ها |

### معاملات (`/api/trades`)
| Method | Endpoint | توضیح |
|--------|----------|-------|
| POST | `/` | ایجاد معامله |
| GET | `/my-trades` | معاملات من |
| GET | `/sarafi/trades` | معاملات صراف |
| PUT | `/sarafi/:id/decision` | تصمیم صراف |
| PUT | `/sarafi/:id/currency-collected` | وصول ارز |
| PUT | `/sarafi/:id/rial-collected` | وصول ریال |
| PUT | `/:id/cancel` | لغو معامله |

### بازار (`/api/market`)
| Method | Endpoint | توضیح |
|--------|----------|-------|
| GET | `/offers` | لیست پیشنهادات |
| POST | `/offers` | ایجاد پیشنهاد |
| PUT | `/offers/:id/accept` | پذیرش پیشنهاد |
| PUT | `/offers/:id/cancel` | لغو پیشنهاد |
| GET | `/best-prices` | بهترین قیمت‌ها |

### امتیازدهی (`/api/scoring`)
| Method | Endpoint | توضیح |
|--------|----------|-------|
| GET | `/my-score` | امتیاز من |
| GET | `/leaderboard` | جدول امتیازات |
| PUT | `/sarafi/suspend/:userId` | تعلیق مشتری |

### ادمین (`/api/admin`)
| Method | Endpoint | توضیح |
|--------|----------|-------|
| GET | `/dashboard` | داشبورد |
| GET | `/trades` | همه معاملات |
| GET | `/wallets` | همه کیف پول‌ها |
| GET | `/customer-tiers` | رده‌بندی‌ها |
| GET | `/commissions` | کارمزدها |
| CRUD | `/users` | مدیریت کاربران |
| CRUD | `/currencies` | مدیریت ارزها |

---

## پنل‌ها و صفحات

### پنل ادمین (`/admin`)
| مسیر | صفحه | توضیح |
|------|------|-------|
| `/admin` | داشبورد | آمار کلی سیستم |
| `/admin/trades` | معاملات | مانیتورینگ همه معاملات |
| `/admin/wallets` | کیف پول‌ها | مدیریت کیف پول‌ها |
| `/admin/customer-tiers` | رده‌بندی | مدیریت رده‌های مشتریان |
| `/admin/commissions` | کارمزد | مدیریت قوانین کارمزد |
| `/admin/users` | کاربران | مدیریت کاربران |
| `/admin/sarafis` | صراف‌ها | مدیریت صراف‌ها |
| `/admin/currencies` | ارزها | مدیریت ارزها |
| `/admin/settings` | تنظیمات | تنظیمات سیستم |

### پنل صراف (`/sarafi`)
| مسیر | صفحه | توضیح |
|------|------|-------|
| `/sarafi` | داشبورد | آمار معاملات و مشتریان |
| `/sarafi/trades` | معاملات | مدیریت معاملات |
| `/sarafi/accountant` | حسابداری | مدیریت کیف پول مشتریان |
| `/sarafi/currency-collection` | وصول ارز | تایید وصول ارز |
| `/sarafi/rial-collection` | وصول ریال | تایید وصول ریال |
| `/sarafi/customers` | مشتریان | مدیریت مشتریان |
| `/sarafi/requests` | درخواست‌ها | درخواست‌های قدیمی |

### پنل کاربر (`/dashboard`)
| مسیر | صفحه | توضیح |
|------|------|-------|
| `/dashboard` | داشبورد | خلاصه وضعیت |
| `/dashboard/wallet` | کیف پول | کیف پول و تراکنش‌ها |
| `/dashboard/trades` | معاملات | معاملات من |
| `/dashboard/market` | بازار | پیشنهادات بازار |
| `/dashboard/score` | امتیاز | امتیاز و رده‌بندی |
| `/dashboard/new-request` | درخواست جدید | ثبت درخواست |
| `/dashboard/profile` | پروفایل | ویرایش پروفایل |

---

## سیستم امتیازدهی

### کسب امتیاز
| فعالیت | امتیاز |
|--------|--------|
| معامله موفق (مشتری) | 1 امتیاز به ازای هر 100 میلیون ریال |
| معامله موفق (صراف) | 1 امتیاز به ازای هر 10 میلیارد ریال |

### جریمه لغو
| مورد | جریمه |
|------|-------|
| لغو معامله | -100 امتیاز |
| لغو معامله | +1 نقطه سیاه |
| 3 نقطه سیاه | تعلیق خودکار |

### رده‌بندی
| رده | حداقل امتیاز | تخفیف کارمزد |
|-----|-------------|--------------|
| A (طلایی) | 1000 | 30% |
| B (نقره‌ای) | 500 | 15% |
| C (برنزی) | 100 | 5% |
| جدید | 0 | 0% |

---

## سیستم کیف پول

### انواع کیف پول
1. **کیف پول نقدی**: موجودی واقعی
2. **کیف پول اعتباری**: سقف اعتبار با محدودیت

### تراکنش‌ها
- `deposit`: واریز نقدی
- `withdraw`: برداشت نقدی
- `credit_use`: استفاده از اعتبار
- `credit_payment`: پرداخت اعتبار
- `trade_buy`: خرید ارز
- `trade_sell`: فروش ارز
- `commission`: کارمزد
- `refund`: استرداد

---

## سیستم معاملات

### فرآیند معامله
```
1. مشتری درخواست → pending
2. صراف تصمیم می‌گیرد:
   - instant: تایید فوری → approved
   - callback: تماس و تایید → approved
   - reject: رد درخواست → cancelled
3. پردازش → processing
4. وصول ارز → awaiting_rial
5. وصول ریال → completed
```

### وضعیت‌ها
| وضعیت | توضیح |
|-------|-------|
| `pending` | در انتظار تصمیم صراف |
| `approved` | تایید شده |
| `processing` | در حال پردازش |
| `awaiting_currency` | انتظار وصول ارز |
| `awaiting_rial` | انتظار وصول ریال |
| `completed` | تکمیل شده |
| `cancelled` | لغو شده |

---

## اطلاعات ورود تست

**رمز عبور همه: `123456`**

| نقش | ایمیل | رده |
|-----|-------|-----|
| ادمین | admin@golden2026.com | - |
| صراف 1 | sarafi1@golden2026.com | - |
| صراف 2 | sarafi2@golden2026.com | - |
| کاربر 1 | user1@gmail.com | طلایی (A) |
| کاربر 2 | user2@gmail.com | نقره‌ای (B) |
| کاربر 3 | user3@gmail.com | برنزی (C) |
| کاربر 4 | user4@gmail.com | جدید |

---

## دستورات مفید

```bash
# ری‌استارت سرویس‌ها
pm2 restart all

# مشاهده لاگ‌ها
pm2 logs

# سید دیتابیس
cd backend && node src/seeds/seedAll.js

# بیلد فرانت‌اند
cd frontend && npm run build
```

---

**نسخه**: 2.0
**تاریخ بروزرسانی**: دی 1403
**توسعه‌دهنده**: تیم گلدن 2026
