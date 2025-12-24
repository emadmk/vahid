const { Telegraf, Markup, Scenes, session } = require('telegraf');
const User = require('../models/User');
const Request = require('../models/Request');
const Currency = require('../models/Currency');
const Settings = require('../models/Settings');
const notificationService = require('../services/notificationService');

class TelegramBot {
  constructor() {
    this.bot = null;
  }

  async init() {
    if (!process.env.TELEGRAM_BOT_TOKEN) {
      console.log('⚠️ توکن تلگرام تنظیم نشده');
      return null;
    }

    this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);

    // استفاده از session
    this.bot.use(session());

    // تنظیم سرویس اعلان
    notificationService.setTelegramBot(this.bot);

    // دستورات
    this.setupCommands();
    this.setupActions();
    this.setupScenes();

    // شروع
    this.bot.launch();
    console.log('✅ ربات تلگرام راه‌اندازی شد');

    // خاموش شدن درست
    process.once('SIGINT', () => this.bot.stop('SIGINT'));
    process.once('SIGTERM', () => this.bot.stop('SIGTERM'));

    return this.bot;
  }

  setupCommands() {
    // شروع
    this.bot.start(async (ctx) => {
      const keyboard = Markup.keyboard([
        ['💰 نرخ ارز', '📝 ثبت درخواست'],
        ['📋 درخواست‌های من', '👤 حساب کاربری'],
        ['📞 تماس با ما', 'ℹ️ راهنما']
      ]).resize();

      await ctx.reply(
        `🏦 *به ربات صرافی گلدن 2026 خوش آمدید*\n\n` +
        `برای استفاده از خدمات، ابتدا حساب کاربری خود را متصل کنید.\n\n` +
        `از منوی زیر گزینه مورد نظر را انتخاب کنید:`,
        { parse_mode: 'Markdown', ...keyboard }
      );
    });

    // نرخ ارز
    this.bot.hears('💰 نرخ ارز', async (ctx) => {
      try {
        const currencies = await Currency.find({ isActive: true }).sort({ order: 1 });

        if (currencies.length === 0) {
          return ctx.reply('نرخی ثبت نشده است.');
        }

        let message = '📊 *نرخ لحظه‌ای ارز*\n\n';
        for (const c of currencies) {
          message += `${c.symbol} *${c.nameFa}*\n`;
          message += `   خرید: ${c.buyRate.toLocaleString()} ریال\n`;
          message += `   فروش: ${c.sellRate.toLocaleString()} ریال\n\n`;
        }

        await ctx.reply(message, { parse_mode: 'Markdown' });
      } catch (error) {
        console.error(error);
        ctx.reply('خطا در دریافت نرخ‌ها');
      }
    });

    // حساب کاربری
    this.bot.hears('👤 حساب کاربری', async (ctx) => {
      const user = await this.getUser(ctx.from.id);

      if (!user) {
        const keyboard = Markup.inlineKeyboard([
          [Markup.button.callback('🔗 اتصال حساب', 'connect_account')]
        ]);

        return ctx.reply(
          '⚠️ حساب کاربری شما متصل نیست.\n\n' +
          'برای استفاده از امکانات ربات، ابتدا حساب خود را متصل کنید.',
          keyboard
        );
      }

      const statusText = {
        'pending': '⏳ در انتظار تایید',
        'approved': '✅ تایید شده',
        'rejected': '❌ رد شده',
        'suspended': '🚫 تعلیق شده'
      };

      await ctx.reply(
        `👤 *اطلاعات حساب*\n\n` +
        `نام: ${user.firstName} ${user.lastName}\n` +
        `ایمیل: ${user.email}\n` +
        `نقش: ${user.role === 'sarafi' ? 'صراف' : 'کاربر'}\n` +
        `وضعیت: ${statusText[user.status]}\n\n` +
        `📊 آمار:\n` +
        `درخواست‌ها: ${user.totalRequests}\n` +
        `تکمیل شده: ${user.completedRequests}`,
        { parse_mode: 'Markdown' }
      );
    });

    // درخواست‌های من
    this.bot.hears('📋 درخواست‌های من', async (ctx) => {
      const user = await this.getUser(ctx.from.id);

      if (!user) {
        return ctx.reply('⚠️ ابتدا حساب خود را متصل کنید.');
      }

      const requests = await Request.find({ user: user._id })
        .populate('currency', 'nameFa symbol')
        .sort({ createdAt: -1 })
        .limit(5);

      if (requests.length === 0) {
        return ctx.reply('شما درخواستی ثبت نکرده‌اید.');
      }

      const statusText = {
        'pending': '⏳ در انتظار',
        'public': '🌐 عمومی',
        'private': '🔒 خصوصی',
        'accepted': '✅ پذیرفته',
        'in_progress': '🔄 در حال انجام',
        'completed': '✅ تکمیل شده',
        'cancelled': '❌ لغو شده',
        'rejected': '❌ رد شده'
      };

      let message = '📋 *آخرین درخواست‌های شما:*\n\n';

      for (const req of requests) {
        message += `${req.type === 'buy' ? '🛒' : '💵'} `;
        message += `${req.type === 'buy' ? 'خرید' : 'فروش'} `;
        message += `${req.amount} ${req.currency.nameFa}\n`;
        message += `   مبلغ: ${req.finalPrice.toLocaleString()} ریال\n`;
        message += `   وضعیت: ${statusText[req.status]}\n\n`;
      }

      await ctx.reply(message, { parse_mode: 'Markdown' });
    });

    // ثبت درخواست
    this.bot.hears('📝 ثبت درخواست', async (ctx) => {
      const user = await this.getUser(ctx.from.id);

      if (!user) {
        return ctx.reply('⚠️ ابتدا حساب خود را متصل کنید.');
      }

      if (user.status !== 'approved') {
        return ctx.reply('⚠️ حساب شما هنوز تایید نشده است.');
      }

      const keyboard = Markup.inlineKeyboard([
        [
          Markup.button.callback('🛒 خرید ارز', 'new_request_buy'),
          Markup.button.callback('💵 فروش ارز', 'new_request_sell')
        ]
      ]);

      await ctx.reply('نوع درخواست را انتخاب کنید:', keyboard);
    });

    // تماس با ما
    this.bot.hears('📞 تماس با ما', async (ctx) => {
      const settings = await Settings.getSettings();

      await ctx.reply(
        `📞 *راه‌های ارتباطی*\n\n` +
        `تلفن: ${settings.contactPhone || 'ثبت نشده'}\n` +
        `ایمیل: ${settings.contactEmail || 'ثبت نشده'}\n` +
        `آدرس: ${settings.contactAddress || 'ثبت نشده'}\n` +
        `ساعت کاری: ${settings.workingHours || 'ثبت نشده'}`,
        { parse_mode: 'Markdown' }
      );
    });

    // راهنما
    this.bot.hears('ℹ️ راهنما', async (ctx) => {
      await ctx.reply(
        `ℹ️ *راهنمای استفاده از ربات*\n\n` +
        `1️⃣ ابتدا در سایت ثبت‌نام کنید\n` +
        `2️⃣ حساب خود را با ربات متصل کنید\n` +
        `3️⃣ پس از تایید، می‌توانید درخواست ثبت کنید\n\n` +
        `*دستورات:*\n` +
        `/start - شروع مجدد\n` +
        `/rates - نرخ ارز\n` +
        `/requests - درخواست‌های من\n` +
        `/help - راهنما`,
        { parse_mode: 'Markdown' }
      );
    });

    // دستورات خط فرمان
    this.bot.command('rates', async (ctx) => {
      ctx.scene && ctx.scene.leave();
      const currencies = await Currency.find({ isActive: true }).sort({ order: 1 });

      if (currencies.length === 0) {
        return ctx.reply('نرخی ثبت نشده است.');
      }

      let message = '📊 *نرخ لحظه‌ای ارز*\n\n';
      for (const c of currencies) {
        message += `${c.symbol} *${c.nameFa}*: خرید ${c.buyRate.toLocaleString()} | فروش ${c.sellRate.toLocaleString()}\n`;
      }

      await ctx.reply(message, { parse_mode: 'Markdown' });
    });

    this.bot.command('help', (ctx) => {
      ctx.reply(
        `ℹ️ *راهنما*\n\n` +
        `/start - شروع\n` +
        `/rates - نرخ ارز\n` +
        `/requests - درخواست‌های من\n` +
        `/connect - اتصال حساب`,
        { parse_mode: 'Markdown' }
      );
    });
  }

  setupActions() {
    // اتصال حساب
    this.bot.action('connect_account', async (ctx) => {
      await ctx.answerCbQuery();
      ctx.session = ctx.session || {};
      ctx.session.step = 'waiting_email';

      await ctx.reply(
        '📧 لطفا ایمیل حساب کاربری خود را وارد کنید:'
      );
    });

    // انتخاب نوع درخواست
    this.bot.action(/new_request_(buy|sell)/, async (ctx) => {
      await ctx.answerCbQuery();
      const type = ctx.match[1];

      ctx.session = ctx.session || {};
      ctx.session.newRequest = { type };
      ctx.session.step = 'select_currency';

      const currencies = await Currency.find({ isActive: true }).sort({ order: 1 });

      const buttons = currencies.map(c =>
        [Markup.button.callback(`${c.symbol} ${c.nameFa}`, `currency_${c._id}`)]
      );

      await ctx.reply('ارز مورد نظر را انتخاب کنید:', Markup.inlineKeyboard(buttons));
    });

    // انتخاب ارز
    this.bot.action(/currency_(.+)/, async (ctx) => {
      await ctx.answerCbQuery();
      const currencyId = ctx.match[1];

      ctx.session.newRequest.currency = currencyId;
      ctx.session.step = 'enter_amount';

      const currency = await Currency.findById(currencyId);

      await ctx.reply(
        `💰 مقدار ${currency.nameFa} مورد نظر را وارد کنید:\n` +
        `(مثال: 100)`
      );
    });

    // تایید درخواست
    this.bot.action('confirm_request', async (ctx) => {
      await ctx.answerCbQuery();

      const user = await this.getUser(ctx.from.id);
      if (!user || user.status !== 'approved') {
        return ctx.reply('⚠️ خطا در ثبت درخواست');
      }

      const { type, currency: currencyId, amount } = ctx.session.newRequest;
      const currency = await Currency.findById(currencyId);
      const settings = await Settings.getSettings();

      const rate = type === 'buy' ? currency.sellRate : currency.buyRate;
      const totalPrice = amount * rate;

      let fee = 0;
      if (settings.feeSettings.type === 'percentage') {
        fee = (totalPrice * settings.feeSettings.value) / 100;
      } else {
        fee = settings.feeSettings.value;
      }

      const finalPrice = totalPrice + fee;
      const timerDuration = settings.requestSettings.timerDuration || 60;
      const timerExpiry = new Date(Date.now() + timerDuration * 60 * 1000);

      const request = await Request.create({
        user: user._id,
        originalSarafi: user.selectedSarafi,
        type,
        currency: currencyId,
        amount,
        rate,
        totalPrice,
        fee,
        finalPrice,
        status: 'pending',
        visibility: 'pending',
        timerExpiry,
        contactInfo: {
          phone: user.phone,
          email: user.email
        },
        statusHistory: [{
          status: 'pending',
          changedBy: user._id,
          date: new Date()
        }]
      });

      user.totalRequests += 1;
      await user.save();

      // اعلان به صراف
      if (user.selectedSarafi) {
        const sarafi = await User.findById(user.selectedSarafi);
        if (sarafi) {
          await notificationService.notifyNewRequest(request, user, sarafi);
        }
      }

      ctx.session.newRequest = null;
      ctx.session.step = null;

      await ctx.reply(
        `✅ درخواست شما با موفقیت ثبت شد!\n\n` +
        `شماره پیگیری: ${request._id.toString().slice(-8)}\n\n` +
        `صراف شما تا ${timerDuration} دقیقه فرصت بررسی دارد.`
      );
    });

    // لغو درخواست
    this.bot.action('cancel_request', async (ctx) => {
      await ctx.answerCbQuery();
      ctx.session.newRequest = null;
      ctx.session.step = null;
      await ctx.reply('❌ ثبت درخواست لغو شد.');
    });
  }

  setupScenes() {
    // پردازش پیام‌های متنی
    this.bot.on('text', async (ctx) => {
      ctx.session = ctx.session || {};

      // اتصال حساب - ایمیل
      if (ctx.session.step === 'waiting_email') {
        const email = ctx.message.text.toLowerCase().trim();

        const user = await User.findOne({ email });
        if (!user) {
          return ctx.reply('❌ کاربری با این ایمیل یافت نشد.\nلطفا ابتدا در سایت ثبت‌نام کنید.');
        }

        if (user.telegramChatId && user.telegramChatId !== ctx.from.id.toString()) {
          return ctx.reply('❌ این حساب قبلا به تلگرام دیگری متصل شده است.');
        }

        // ذخیره chatId
        user.telegramChatId = ctx.from.id.toString();
        user.telegramUsername = ctx.from.username;
        user.telegramNotifications = true;
        await user.save();

        ctx.session.step = null;

        await ctx.reply(
          `✅ حساب شما با موفقیت متصل شد!\n\n` +
          `نام: ${user.firstName} ${user.lastName}\n` +
          `از این پس اعلان‌ها برای شما ارسال می‌شود.`
        );
        return;
      }

      // ثبت درخواست - مقدار
      if (ctx.session.step === 'enter_amount') {
        const amount = parseFloat(ctx.message.text);

        if (isNaN(amount) || amount <= 0) {
          return ctx.reply('❌ لطفا یک عدد معتبر وارد کنید.');
        }

        ctx.session.newRequest.amount = amount;
        ctx.session.step = 'confirm_request';

        const { type, currency: currencyId } = ctx.session.newRequest;
        const currency = await Currency.findById(currencyId);
        const rate = type === 'buy' ? currency.sellRate : currency.buyRate;
        const totalPrice = amount * rate;

        const keyboard = Markup.inlineKeyboard([
          [
            Markup.button.callback('✅ تایید و ثبت', 'confirm_request'),
            Markup.button.callback('❌ لغو', 'cancel_request')
          ]
        ]);

        await ctx.reply(
          `📋 *خلاصه درخواست*\n\n` +
          `نوع: ${type === 'buy' ? '🛒 خرید' : '💵 فروش'}\n` +
          `ارز: ${currency.nameFa}\n` +
          `مقدار: ${amount}\n` +
          `نرخ: ${rate.toLocaleString()} ریال\n` +
          `مبلغ کل: ${totalPrice.toLocaleString()} ریال\n\n` +
          `آیا تایید می‌کنید؟`,
          { parse_mode: 'Markdown', ...keyboard }
        );
        return;
      }
    });
  }

  async getUser(telegramId) {
    return await User.findOne({ telegramChatId: telegramId.toString() });
  }

  // ارسال پیام به کاربر
  async sendMessage(chatId, message, options = {}) {
    if (!this.bot) return;
    try {
      await this.bot.telegram.sendMessage(chatId, message, {
        parse_mode: 'Markdown',
        ...options
      });
    } catch (error) {
      console.error('خطا در ارسال پیام تلگرام:', error);
    }
  }
}

module.exports = new TelegramBot();
