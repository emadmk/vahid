const cron = require('node-cron');
const Settings = require('../models/Settings');

// سرویس‌های اسکرپر
const tgjuScraperService = require('../services/tgjuScraperService');
const telegramScraperService = require('../services/rateScraperServiceSimple');

let currentJob = null;

// انتخاب سرویس بر اساس تنظیمات
const getScraperService = async () => {
  const settings = await Settings.getSettings();
  const source = settings.rateScraperSettings?.source || 'tgju';

  if (source === 'tgju') {
    return tgjuScraperService;
  } else {
    return telegramScraperService;
  }
};

// شروع job اسکرپر نرخ
const startRateScraperJob = async () => {
  try {
    const settings = await Settings.getSettings();
    const interval = settings.rateScraperSettings?.intervalMinutes || 5;
    const source = settings.rateScraperSettings?.source || 'tgju';

    // اگه job قبلی وجود داره، متوقفش کن
    if (currentJob) {
      currentJob.stop();
    }

    // ایجاد cron expression برای اجرا هر N دقیقه
    const cronExpression = `*/${interval} * * * *`;

    currentJob = cron.schedule(cronExpression, async () => {
      console.log(`⏰ [${new Date().toLocaleTimeString('fa-IR')}] اجرای خودکار اسکرپر نرخ...`);
      const scraperService = await getScraperService();
      await scraperService.run();
    });

    console.log(`✅ Rate Scraper Job راه‌اندازی شد (هر ${interval} دقیقه از ${source === 'tgju' ? 'TGJU' : 'تلگرام'})`);

    // اجرای اولیه
    if (settings.rateScraperSettings?.enabled) {
      console.log('🔄 اجرای اولیه اسکرپر نرخ...');
      setTimeout(async () => {
        const scraperService = await getScraperService();
        await scraperService.run();
      }, 5000);
    }

  } catch (error) {
    console.error('❌ خطا در راه‌اندازی Rate Scraper Job:', error.message);
  }
};

// تغییر بازه زمانی
const updateInterval = async (minutes) => {
  await startRateScraperJob();
};

// متوقف کردن job
const stopJob = () => {
  if (currentJob) {
    currentJob.stop();
    currentJob = null;
    console.log('⏹️ Rate Scraper Job متوقف شد');
  }
};

// اجرای دستی
const runNow = async () => {
  const scraperService = await getScraperService();
  return await scraperService.run();
};

module.exports = {
  startRateScraperJob,
  updateInterval,
  stopJob,
  runNow,
  getScraperService
};
