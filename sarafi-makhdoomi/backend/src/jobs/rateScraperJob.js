const cron = require('node-cron');
const Settings = require('../models/Settings');
const rateScraperService = require('../services/rateScraperService');

let currentJob = null;

// شروع job اسکرپر نرخ
const startRateScraperJob = async () => {
  try {
    const settings = await Settings.getSettings();
    const interval = settings.rateScraperSettings?.intervalMinutes || 5;

    // اگه job قبلی وجود داره، متوقفش کن
    if (currentJob) {
      currentJob.stop();
    }

    // ایجاد cron expression برای اجرا هر N دقیقه
    const cronExpression = `*/${interval} * * * *`;

    currentJob = cron.schedule(cronExpression, async () => {
      console.log(`⏰ [${new Date().toLocaleTimeString('fa-IR')}] اجرای خودکار اسکرپر نرخ...`);
      await rateScraperService.run();
    });

    console.log(`✅ Rate Scraper Job راه‌اندازی شد (هر ${interval} دقیقه)`);

    // اجرای اولیه
    if (settings.rateScraperSettings?.enabled) {
      console.log('🔄 اجرای اولیه اسکرپر نرخ...');
      setTimeout(() => rateScraperService.run(), 5000);
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

module.exports = {
  startRateScraperJob,
  updateInterval,
  stopJob
};
