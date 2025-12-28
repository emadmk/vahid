const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

let io = null;
const connectedUsers = new Map(); // userId -> Set of socket ids

class SocketService {
  // راه‌اندازی Socket.IO
  init(server) {
    io = socketIO(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:5173',
        methods: ['GET', 'POST'],
        credentials: true
      },
      pingTimeout: 60000,
      pingInterval: 25000
    });

    // Middleware برای احراز هویت
    io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');

        if (!token) {
          return next(new Error('احراز هویت الزامی است'));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id).select('_id firstName lastName role selectedSarafi');

        if (!user) {
          return next(new Error('کاربر یافت نشد'));
        }

        socket.user = user;
        next();
      } catch (error) {
        next(new Error('توکن نامعتبر است'));
      }
    });

    io.on('connection', (socket) => {
      const userId = socket.user._id.toString();
      console.log(`🔌 کاربر متصل شد: ${socket.user.firstName} ${socket.user.lastName} (${socket.user.role})`);

      // ذخیره کاربر متصل
      if (!connectedUsers.has(userId)) {
        connectedUsers.set(userId, new Set());
      }
      connectedUsers.get(userId).add(socket.id);

      // عضویت در اتاق‌های مربوطه
      socket.join(`user:${userId}`);
      socket.join(`role:${socket.user.role}`);

      if (socket.user.role === 'sarafi') {
        socket.join(`sarafi:${userId}`);
      }

      if (socket.user.selectedSarafi) {
        socket.join(`sarafi:${socket.user.selectedSarafi.toString()}`);
      }

      // رویداد اتصال موفق
      socket.emit('connected', {
        userId,
        role: socket.user.role,
        message: 'اتصال برقرار شد'
      });

      // درخواست به‌روزرسانی لحظه‌ای نرخ‌ها
      socket.on('subscribe:rates', () => {
        socket.join('rates');
        console.log(`📊 ${socket.user.firstName} عضو نرخ‌های لحظه‌ای شد`);
      });

      socket.on('unsubscribe:rates', () => {
        socket.leave('rates');
      });

      // درخواست به‌روزرسانی درخواست‌ها
      socket.on('subscribe:requests', () => {
        socket.join('requests');
      });

      socket.on('unsubscribe:requests', () => {
        socket.leave('requests');
      });

      // پینگ برای حفظ اتصال
      socket.on('ping', () => {
        socket.emit('pong', { timestamp: Date.now() });
      });

      // قطع اتصال
      socket.on('disconnect', (reason) => {
        console.log(`🔌 کاربر قطع شد: ${socket.user.firstName} ${socket.user.lastName} - ${reason}`);

        const userSockets = connectedUsers.get(userId);
        if (userSockets) {
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            connectedUsers.delete(userId);
          }
        }
      });
    });

    console.log('🔌 WebSocket آماده به کار است');
    return io;
  }

  // بررسی آنلاین بودن کاربر
  isUserOnline(userId) {
    return connectedUsers.has(userId.toString());
  }

  // تعداد کاربران آنلاین
  getOnlineCount() {
    return connectedUsers.size;
  }

  // دریافت لیست کاربران آنلاین
  getOnlineUsers() {
    return Array.from(connectedUsers.keys());
  }

  // ==================== رویدادهای سیستم ====================

  // ارسال به کاربر خاص
  emitToUser(userId, event, data) {
    if (io) {
      io.to(`user:${userId.toString()}`).emit(event, {
        ...data,
        timestamp: Date.now()
      });
    }
  }

  // ارسال به صراف و مشتریانش
  emitToSarafi(sarafiId, event, data) {
    if (io) {
      io.to(`sarafi:${sarafiId.toString()}`).emit(event, {
        ...data,
        timestamp: Date.now()
      });
    }
  }

  // ارسال به همه کاربران با نقش خاص
  emitToRole(role, event, data) {
    if (io) {
      io.to(`role:${role}`).emit(event, {
        ...data,
        timestamp: Date.now()
      });
    }
  }

  // ارسال به همه
  emitToAll(event, data) {
    if (io) {
      io.emit(event, {
        ...data,
        timestamp: Date.now()
      });
    }
  }

  // ==================== رویدادهای درخواست ====================

  // درخواست جدید
  emitNewRequest(request, sarafiId) {
    this.emitToSarafi(sarafiId, 'request:new', {
      type: 'new_request',
      request: {
        id: request._id,
        type: request.type,
        currency: request.currency,
        amount: request.amount,
        rate: request.rate,
        totalPrice: request.totalPrice,
        status: request.status,
        timerExpiry: request.timerExpiry
      }
    });
  }

  // تغییر وضعیت درخواست
  emitRequestStatusChange(request, userId, status) {
    // اطلاع به کاربر
    this.emitToUser(userId, 'request:status', {
      type: 'status_change',
      requestId: request._id,
      status,
      message: this.getStatusMessage(status)
    });
  }

  getStatusMessage(status) {
    const messages = {
      pending: 'درخواست شما در انتظار بررسی است',
      public: 'درخواست شما منتشر شد',
      private: 'صراف در حال بررسی درخواست شماست',
      accepted: 'درخواست شما پذیرفته شد',
      completed: 'درخواست شما تکمیل شد',
      rejected: 'درخواست شما رد شد',
      cancelled: 'درخواست لغو شد',
      expired: 'درخواست منقضی شد'
    };
    return messages[status] || 'وضعیت درخواست تغییر کرد';
  }

  // تایمر نزدیک به انقضا
  emitTimerWarning(request, sarafiId, remainingSeconds) {
    this.emitToSarafi(sarafiId, 'request:timer_warning', {
      type: 'timer_warning',
      requestId: request._id,
      remainingSeconds,
      message: `${remainingSeconds} ثانیه تا عمومی شدن درخواست`
    });
  }

  // درخواست عمومی شد
  emitRequestPublic(request) {
    this.emitToRole('sarafi', 'request:public', {
      type: 'public_request',
      request: {
        id: request._id,
        type: request.type,
        currency: request.currency,
        amount: request.amount,
        rate: request.rate,
        totalPrice: request.totalPrice
      }
    });
  }

  // ==================== رویدادهای نرخ ====================

  // به‌روزرسانی نرخ ارز
  emitRateUpdate(currency, rates) {
    if (io) {
      io.to('rates').emit('rate:update', {
        type: 'rate_update',
        currency: {
          id: currency._id,
          code: currency.code,
          nameFa: currency.nameFa
        },
        buyRate: rates.buyRate,
        sellRate: rates.sellRate,
        change: rates.change || 0,
        timestamp: Date.now()
      });
    }
  }

  // به‌روزرسانی نرخ صراف
  emitSarafiRateUpdate(sarafiId, currency, rates) {
    this.emitToSarafi(sarafiId, 'sarafi_rate:update', {
      type: 'sarafi_rate_update',
      currency,
      buyRate: rates.buyRate,
      sellRate: rates.sellRate
    });
  }

  // ==================== رویدادهای اعلان ====================

  // اعلان جدید
  emitNotification(userId, notification) {
    this.emitToUser(userId, 'notification:new', {
      type: 'new_notification',
      notification: {
        id: notification._id,
        title: notification.title,
        message: notification.message,
        notificationType: notification.type,
        priority: notification.priority,
        createdAt: notification.createdAt
      }
    });
  }

  // ==================== رویدادهای معامله ====================

  // معامله جدید
  emitNewTrade(trade, parties) {
    parties.forEach(userId => {
      this.emitToUser(userId, 'trade:new', {
        type: 'new_trade',
        trade: {
          id: trade._id,
          type: trade.type,
          currency: trade.currency,
          amount: trade.amount,
          rate: trade.rate,
          total: trade.total,
          status: trade.status
        }
      });
    });
  }

  // تغییر وضعیت معامله
  emitTradeStatusChange(trade, parties, status) {
    parties.forEach(userId => {
      this.emitToUser(userId, 'trade:status', {
        type: 'trade_status_change',
        tradeId: trade._id,
        status
      });
    });
  }

  // ==================== رویدادهای کیف پول ====================

  // تغییر موجودی کیف پول
  emitWalletUpdate(userId, wallet) {
    this.emitToUser(userId, 'wallet:update', {
      type: 'wallet_update',
      wallet: {
        id: wallet._id,
        currency: wallet.currency,
        balance: wallet.balance,
        availableBalance: wallet.availableBalance,
        frozenBalance: wallet.frozenBalance
      }
    });
  }

  // ==================== رویدادهای چت/پیام ====================

  // پیام جدید
  emitNewMessage(message, receiverId) {
    this.emitToUser(receiverId, 'message:new', {
      type: 'new_message',
      message: {
        id: message._id,
        sender: message.sender,
        content: message.content,
        type: message.type,
        createdAt: message.createdAt
      }
    });
  }

  // ==================== رویدادهای سیستم ====================

  // اعلان سیستمی
  emitSystemAlert(alert, targetRoles = ['admin', 'sarafi', 'user']) {
    targetRoles.forEach(role => {
      this.emitToRole(role, 'system:alert', {
        type: 'system_alert',
        alert
      });
    });
  }

  // وضعیت بازار
  emitMarketStatus(isOpen, message) {
    this.emitToAll('market:status', {
      type: 'market_status',
      isOpen,
      message
    });
  }
}

module.exports = new SocketService();
