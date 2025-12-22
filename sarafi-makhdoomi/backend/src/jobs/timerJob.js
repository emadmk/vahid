const cron = require('node-cron');
const Request = require('../models/Request');
const User = require('../models/User');
const notificationService = require('../services/notificationService');

// چک کردن درخواست‌های منقضی شده هر دقیقه
const startTimerJob = () => {
  cron.schedule('* * * * *', async () => {
    try {
      const now = new Date();

      // پیدا کردن درخواست‌هایی که تایمرشون تموم شده ولی هنوز pending هستن
      const expiredRequests = await Request.find({
        status: 'pending',
        timerExpiry: { $lte: now },
        timerExpired: false
      }).populate('user originalSarafi');

      for (const request of expiredRequests) {
        // تغییر به عمومی
        request.status = 'public';
        request.visibility = 'public';
        request.timerExpired = true;
        request.statusHistory.push({
          status: 'public',
          reason: 'انقضای تایمر - انتقال خودکار به بخش عمومی',
          date: new Date()
        });

        await request.save();

        // اعلان به کاربر
        if (request.user) {
          await notificationService.notifyRequestPublic(request, request.user);
        }

        console.log(`درخواست ${request._id} به بخش عمومی منتقل شد (انقضای تایمر)`);
      }

      // هشدار به صراف‌ها برای درخواست‌هایی که 15 دقیقه تا انقضا مانده
      const warningTime = new Date(now.getTime() + 15 * 60 * 1000);
      const warningRequests = await Request.find({
        status: 'pending',
        timerExpiry: { $lte: warningTime, $gt: now },
        timerExpired: false,
        'notificationsSent.timerWarning': { $ne: true }
      }).populate('originalSarafi');

      for (const request of warningRequests) {
        if (request.originalSarafi?.telegramChatId) {
          await notificationService.create({
            user: request.originalSarafi._id,
            title: 'هشدار: تایمر درخواست',
            message: `کمتر از 15 دقیقه تا انقضای تایمر درخواست #${request._id.toString().slice(-6)} باقی مانده. لطفا تصمیم خود را اعلام کنید.`,
            type: 'timer_warning',
            request: request._id,
            channels: {
              inApp: true,
              telegram: true
            }
          });
        }

        request.notificationsSent = request.notificationsSent || {};
        request.notificationsSent.timerWarning = true;
        await request.save();
      }

    } catch (error) {
      console.error('خطا در job تایمر:', error);
    }
  });

  console.log('✅ Timer Job راه‌اندازی شد');
};

module.exports = startTimerJob;
