const Notification = require('../models/Notification');
const emailService = require('./emailService');

class NotificationService {
  constructor() {
    this.telegramBot = null;
  }

  setTelegramBot(bot) {
    this.telegramBot = bot;
  }

  async create(data) {
    try {
      const notification = await Notification.create(data);

      // ارسال ایمیل
      if (data.channels?.email && data.user?.email) {
        await this.sendEmail(data.user, notification);
      }

      // ارسال تلگرام
      if (data.channels?.telegram && data.user?.telegramChatId && this.telegramBot) {
        await this.sendTelegram(data.user.telegramChatId, notification);
      }

      return notification;
    } catch (error) {
      console.error('خطا در ایجاد اعلان:', error);
      throw error;
    }
  }

  async sendEmail(user, notification) {
    try {
      const result = await emailService.sendEmail(
        user.email,
        notification.title,
        `<div dir="rtl" style="font-family: Tahoma; padding: 20px;">
          <h2>${notification.title}</h2>
          <p>${notification.message}</p>
        </div>`
      );

      notification.deliveryStatus = notification.deliveryStatus || {};
      notification.deliveryStatus.email = {
        sent: result.success,
        sentAt: new Date(),
        error: result.error
      };
      await notification.save();
    } catch (error) {
      console.error('خطا در ارسال ایمیل اعلان:', error);
    }
  }

  async sendTelegram(chatId, notification) {
    if (!this.telegramBot) return;

    try {
      await this.telegramBot.telegram.sendMessage(chatId,
        `🔔 *${notification.title}*\n\n${notification.message}`,
        { parse_mode: 'Markdown' }
      );

      notification.deliveryStatus = notification.deliveryStatus || {};
      notification.deliveryStatus.telegram = {
        sent: true,
        sentAt: new Date()
      };
      await notification.save();
    } catch (error) {
      console.error('خطا در ارسال تلگرام:', error);
      notification.deliveryStatus = notification.deliveryStatus || {};
      notification.deliveryStatus.telegram = {
        sent: false,
        sentAt: new Date(),
        error: error.message
      };
      await notification.save();
    }
  }

  async notifyNewRequest(request, user, sarafi) {
    // اعلان به صراف
    await this.create({
      user: sarafi._id,
      title: 'درخواست جدید',
      message: `${user.fullName} درخواست ${request.type === 'buy' ? 'خرید' : 'فروش'} ارز ثبت کرده است.`,
      type: 'request_new',
      request: request._id,
      channels: {
        inApp: true,
        email: true,
        telegram: sarafi.telegramNotifications
      }
    });
  }

  async notifyRequestPublic(request, user) {
    await this.create({
      user: user._id,
      title: 'درخواست عمومی شد',
      message: 'درخواست شما برای تمام صراف‌های سایت نمایش داده شد.',
      type: 'request_public',
      request: request._id,
      channels: {
        inApp: true,
        email: true,
        telegram: user.telegramNotifications
      }
    });
  }

  async notifyRequestPrivate(request, user, sarafi) {
    await this.create({
      user: user._id,
      title: 'درخواست در حال پیگیری',
      message: `صراف ${sarafi.fullName} در حال پیگیری درخواست شما است و به زودی با شما تماس می‌گیرد.`,
      type: 'request_private',
      request: request._id,
      channels: {
        inApp: true,
        email: true,
        telegram: user.telegramNotifications
      }
    });
  }

  async notifyRequestAccepted(request, user, sarafi) {
    await this.create({
      user: user._id,
      title: 'درخواست پذیرفته شد',
      message: `درخواست شما توسط صراف ${sarafi.fullName} پذیرفته شد.`,
      type: 'request_accepted',
      request: request._id,
      channels: {
        inApp: true,
        email: true,
        telegram: user.telegramNotifications
      }
    });
  }

  async notifyRequestCompleted(request, user) {
    await this.create({
      user: user._id,
      title: 'درخواست تکمیل شد',
      message: 'درخواست شما با موفقیت تکمیل شد. از اعتماد شما متشکریم.',
      type: 'request_completed',
      request: request._id,
      channels: {
        inApp: true,
        email: true,
        telegram: user.telegramNotifications
      }
    });
  }

  async notifyRequestRejected(request, user, reason) {
    await this.create({
      user: user._id,
      title: 'درخواست رد شد',
      message: `متاسفانه درخواست شما رد شد. علت: ${reason}`,
      type: 'request_rejected',
      request: request._id,
      channels: {
        inApp: true,
        email: true,
        telegram: user.telegramNotifications
      }
    });
  }

  async notifyUserApproved(user) {
    await this.create({
      user: user._id,
      title: 'حساب تایید شد',
      message: 'تبریک! حساب کاربری شما تایید شد و اکنون می‌توانید از خدمات صرافی استفاده کنید.',
      type: 'user_approved',
      channels: {
        inApp: true,
        email: true,
        telegram: user.telegramNotifications
      }
    });
  }

  async notifyUserRejected(user, reason) {
    await this.create({
      user: user._id,
      title: 'حساب رد شد',
      message: `متاسفانه درخواست شما رد شد. علت: ${reason}`,
      type: 'user_rejected',
      channels: {
        inApp: true,
        email: true,
        telegram: user.telegramNotifications
      }
    });
  }

  async getUnreadCount(userId) {
    return await Notification.countDocuments({ user: userId, isRead: false });
  }

  async getUserNotifications(userId, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    return await Notification.find({ user: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);
  }

  async markAsRead(notificationId, userId) {
    return await Notification.findOneAndUpdate(
      { _id: notificationId, user: userId },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
  }

  async markAllAsRead(userId) {
    return await Notification.updateMany(
      { user: userId, isRead: false },
      { isRead: true, readAt: new Date() }
    );
  }
}

module.exports = new NotificationService();
