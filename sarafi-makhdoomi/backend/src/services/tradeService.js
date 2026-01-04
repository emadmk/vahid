const Trade = require('../models/Trade');
const MarketOffer = require('../models/MarketOffer');
const User = require('../models/User');
const Currency = require('../models/Currency');
const walletService = require('./walletService');
const commissionService = require('./commissionService');
const scoringService = require('./scoringService');
const notificationService = require('./notificationService');
const mongoose = require('mongoose');

class TradeService {
  /**
   * ایجاد معامله فوری (Instant Trade)
   */
  async createInstantTrade(tradeData) {
    const {
      currencyId,
      side,
      amount,
      rate,
      validUntil,
      notes,
      paymentMethod,
      walletStatus,
      customerId,
      sarafiId,
      createdBy
    } = tradeData;

    const totalAmount = amount * rate;

    // دریافت ارز
    const currency = await Currency.findById(currencyId);
    if (!currency) {
      throw new Error('ارز یافت نشد');
    }

    // محاسبه کارمزد
    const commission = await commissionService.calculateCommission(
      { currency: currencyId, type: side, amount: totalAmount, sarafiId },
      customerId
    );

    const netAmount = side === 'buy'
      ? totalAmount + commission.amount
      : totalAmount - commission.amount;

    const trade = await Trade.create({
      tradeNumber: Trade.generateTradeNumber(),
      type: side,
      tradeType: 'instant',
      currency: currencyId,
      amount,
      rate,
      totalAmount,
      commission: {
        amount: commission.amount,
        rate: commission.rate,
        type: commission.type
      },
      netAmount,
      customer: customerId,
      sarafi: sarafiId,
      validUntil: validUntil ? new Date(validUntil) : null,
      walletStatus,
      paymentMethod: paymentMethod || 'cash_wallet',
      status: 'pending',
      notes: notes ? [{ content: notes, addedBy: createdBy, addedAt: new Date() }] : []
    });

    // ارسال نوتیفیکیشن به صراف
    await notificationService.create({
      recipient: sarafiId,
      type: 'trade_new',
      title: 'معامله فوری جدید',
      message: `یک درخواست ${side === 'buy' ? 'خرید' : 'فروش'} ${amount} ${currency.code} ثبت شد`,
      relatedModel: 'Trade',
      relatedId: trade._id,
      severity: 'info',
      actionUrl: '/sarafi/instant-trade'
    });

    return trade.populate(['currency', 'customer']);
  }

  /**
   * دریافت معاملات فوری
   */
  async getInstantTrades(options = {}) {
    const { customerId, sarafiId, status, limit = 20, skip = 0 } = options;

    const query = { tradeType: 'instant' };
    if (customerId) query.customer = customerId;
    if (sarafiId) query.sarafi = sarafiId;
    if (status) query.status = status;

    const trades = await Trade.find(query)
      .populate('currency', 'code nameFa symbol')
      .populate('customer', 'firstName lastName phone')
      .populate('sarafi', 'firstName lastName sarafiInfo.businessName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Trade.countDocuments(query);

    return { trades, total };
  }

  /**
   * تایید معامله فوری توسط صراف
   */
  async approveInstantTrade(tradeId, sarafiId) {
    const trade = await Trade.findById(tradeId).populate('currency');

    if (!trade) {
      throw new Error('معامله یافت نشد');
    }

    if (trade.sarafi.toString() !== sarafiId.toString()) {
      throw new Error('شما مجاز به تایید این معامله نیستید');
    }

    if (trade.status !== 'pending') {
      throw new Error('این معامله قبلا پردازش شده است');
    }

    trade.status = 'approved';
    trade.approvedAt = new Date();

    // اگر فروش ارز است، به پنل وصول برود
    if (trade.type === 'sell') {
      trade.status = 'pending_collection';
    }

    await trade.save();

    // ارسال نوتیفیکیشن به کاربر
    await notificationService.create({
      recipient: trade.customer,
      type: 'trade_approved',
      title: 'معامله تایید شد',
      message: `معامله ${trade.tradeNumber} توسط صراف تایید شد`,
      relatedModel: 'Trade',
      relatedId: trade._id,
      severity: 'info',
      actionUrl: '/dashboard/instant-trade'
    });

    return trade;
  }

  /**
   * رد معامله فوری توسط صراف
   */
  async rejectInstantTrade(tradeId, sarafiId, reason) {
    const trade = await Trade.findById(tradeId).populate('currency');

    if (!trade) {
      throw new Error('معامله یافت نشد');
    }

    if (trade.sarafi.toString() !== sarafiId.toString()) {
      throw new Error('شما مجاز به رد این معامله نیستید');
    }

    if (trade.status !== 'pending') {
      throw new Error('این معامله قبلا پردازش شده است');
    }

    trade.status = 'rejected';
    trade.rejectionReason = reason;
    trade.rejectedBy = sarafiId;
    trade.rejectedAt = new Date();

    await trade.save();

    // ارسال نوتیفیکیشن به کاربر
    await notificationService.create({
      recipient: trade.customer,
      type: 'trade_rejected',
      title: 'معامله رد شد',
      message: `معامله ${trade.tradeNumber} رد شد. دلیل: ${reason}`,
      relatedModel: 'Trade',
      relatedId: trade._id,
      severity: 'warning',
      actionUrl: '/dashboard/instant-trade'
    });

    return trade;
  }

  /**
   * لغو معامله فوری توسط کاربر
   */
  async cancelInstantTrade(tradeId, userId) {
    const trade = await Trade.findById(tradeId);

    if (!trade) {
      throw new Error('معامله یافت نشد');
    }

    if (trade.customer.toString() !== userId.toString()) {
      throw new Error('شما مجاز به لغو این معامله نیستید');
    }

    if (trade.status !== 'pending') {
      throw new Error('فقط معاملات در انتظار قابل لغو هستند');
    }

    trade.status = 'cancelled';
    trade.cancelledAt = new Date();
    trade.cancellation = {
      reason: 'لغو توسط کاربر',
      cancelledBy: userId,
      penaltyApplied: false
    };

    await trade.save();

    return trade;
  }

  /**
   * ایجاد معامله جدید (از درخواست مشتری)
   */
  async createTrade(tradeData) {
    const {
      type,
      currency,
      amount,
      rate,
      customerId,
      sarafiId,
      requestId,
      marketOfferId
    } = tradeData;

    const totalAmount = amount * rate;

    // محاسبه کارمزد
    const commission = await commissionService.calculateCommission(
      { currency, type, amount: totalAmount, sarafiId },
      customerId
    );

    const netAmount = type === 'buy'
      ? totalAmount + commission.amount
      : totalAmount - commission.amount;

    // بررسی موجودی برای خرید
    if (type === 'buy') {
      const availability = await walletService.checkPurchaseAvailability(customerId, netAmount);

      if (!availability.canPurchase) {
        throw new Error(availability.reason);
      }
    }

    const trade = await Trade.create({
      tradeNumber: Trade.generateTradeNumber(),
      type,
      currency,
      amount,
      rate,
      totalAmount,
      commission: {
        amount: commission.amount,
        rate: commission.rate,
        type: commission.type
      },
      netAmount,
      customer: customerId,
      sarafi: sarafiId,
      request: requestId,
      marketOffer: marketOfferId,
      status: 'pending'
    });

    return trade;
  }

  /**
   * تصمیم صراف (تایید فوری یا تماس تلفنی)
   */
  async sarafiDecision(tradeId, decision, reason = '') {
    const trade = await Trade.findById(tradeId);

    if (!trade) {
      throw new Error('معامله یافت نشد');
    }

    if (trade.status !== 'pending') {
      throw new Error('این معامله قابل تغییر نیست');
    }

    trade.sarafiDecision = {
      decision,
      decidedAt: new Date(),
      reason
    };

    if (decision === 'instant') {
      trade.status = 'approved';
      trade.approvedAt = new Date();

      // اگر خرید است، پرداخت را انجام بده
      if (trade.type === 'buy') {
        await this.processPayment(tradeId);
      }
    } else if (decision === 'callback') {
      // در انتظار تماس تلفنی
      trade.status = 'processing';
    } else if (decision === 'rejected') {
      trade.status = 'cancelled';
      trade.cancelledAt = new Date();
      trade.cancellation = {
        reason,
        cancelledBy: trade.sarafi,
        penaltyApplied: false
      };
    }

    await trade.save();

    return trade;
  }

  /**
   * پردازش پرداخت
   */
  async processPayment(tradeId) {
    const trade = await Trade.findById(tradeId);

    if (!trade) {
      throw new Error('معامله یافت نشد');
    }

    const paymentResult = await walletService.processPurchasePayment(
      trade.customer,
      trade.netAmount,
      trade._id,
      `پرداخت معامله ${trade.tradeNumber}`
    );

    trade.paymentMethod = paymentResult.method;
    trade.paymentDetails = {
      cashAmount: paymentResult.cashAmount,
      creditAmount: paymentResult.creditAmount
    };

    await trade.save();

    return { trade, payment: paymentResult };
  }

  /**
   * تایید وصول ارز
   */
  async confirmCurrencyCollection(tradeId, collectedBy, notes = '') {
    const trade = await Trade.findById(tradeId);

    if (!trade) {
      throw new Error('معامله یافت نشد');
    }

    trade.currencyCollection = {
      status: 'collected',
      collectedBy,
      collectedAt: new Date(),
      notes
    };

    // بررسی تکمیل معامله
    await this.checkTradeCompletion(trade);

    await trade.save();

    return trade;
  }

  /**
   * تایید وصول ریال
   */
  async confirmRialCollection(tradeId, collectedBy, bankDetails = {}, notes = '') {
    const trade = await Trade.findById(tradeId);

    if (!trade) {
      throw new Error('معامله یافت نشد');
    }

    trade.rialCollection = {
      status: 'collected',
      collectedBy,
      collectedAt: new Date(),
      bankDetails,
      notes
    };

    // بررسی تکمیل معامله
    await this.checkTradeCompletion(trade);

    await trade.save();

    return trade;
  }

  /**
   * بررسی تکمیل معامله
   */
  async checkTradeCompletion(trade) {
    const isCurrencyDone = trade.currencyCollection?.status === 'collected';
    const isRialDone = trade.rialCollection?.status === 'collected';

    if (isCurrencyDone && isRialDone) {
      trade.status = 'completed';
      trade.completedAt = new Date();

      // اعمال امتیاز
      await this.applyScores(trade);
    }
  }

  /**
   * اعمال امتیازات
   */
  async applyScores(trade) {
    // امتیاز مشتری
    const customerScore = await scoringService.applyTradeScore(
      trade.customer,
      trade.totalAmount,
      false
    );

    // امتیاز صراف
    const sarafiScore = await scoringService.applyTradeScore(
      trade.sarafi,
      trade.totalAmount,
      true
    );

    trade.scoring = {
      customerScoreAwarded: customerScore.pointsEarned,
      sarafiScoreAwarded: sarafiScore.pointsEarned,
      scoredAt: new Date()
    };

    await trade.save();
  }

  /**
   * لغو معامله
   */
  async cancelTrade(tradeId, reason, cancelledBy, applyPenalty = true) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const trade = await Trade.findById(tradeId).session(session);

      if (!trade) {
        throw new Error('معامله یافت نشد');
      }

      if (['completed', 'cancelled'].includes(trade.status)) {
        throw new Error('این معامله قابل لغو نیست');
      }

      // استرداد در صورت پرداخت قبلی
      if (trade.paymentDetails?.cashAmount > 0) {
        await walletService.deposit(
          trade.customer,
          trade.paymentDetails.cashAmount,
          `استرداد معامله لغو شده ${trade.tradeNumber}`
        );
      }

      if (trade.paymentDetails?.creditAmount > 0) {
        await walletService.repayCredit(
          trade.customer,
          trade.paymentDetails.creditAmount,
          `استرداد اعتبار معامله لغو شده ${trade.tradeNumber}`
        );
      }

      // اعمال جریمه
      let penaltyResult = null;
      if (applyPenalty) {
        penaltyResult = await scoringService.applyCancellationPenalty(cancelledBy);
      }

      trade.status = 'cancelled';
      trade.cancelledAt = new Date();
      trade.cancellation = {
        reason,
        cancelledBy,
        penaltyApplied: applyPenalty,
        penaltyAmount: applyPenalty ? 100 : 0
      };

      await trade.save({ session });
      await session.commitTransaction();

      return { trade, penaltyResult };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * دریافت معاملات مشتری
   */
  async getCustomerTrades(customerId, options = {}) {
    const { status, limit = 20, skip = 0 } = options;

    const query = { customer: customerId };
    if (status) query.status = status;

    const trades = await Trade.find(query)
      .populate('currency', 'code nameFa symbol')
      .populate('sarafi', 'firstName lastName sarafiInfo.businessName')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Trade.countDocuments(query);

    return { trades, total };
  }

  /**
   * دریافت معاملات صراف
   */
  async getSarafiTrades(sarafiId, options = {}) {
    const {
      status,
      type,
      collectionType,
      limit = 20,
      skip = 0
    } = options;

    const query = { sarafi: sarafiId };
    if (status) query.status = status;
    if (type) query.type = type;

    // فیلتر بر اساس نوع وصول
    if (collectionType === 'currency') {
      query['currencyCollection.status'] = { $ne: 'collected' };
    } else if (collectionType === 'rial') {
      query['rialCollection.status'] = { $ne: 'collected' };
    }

    const trades = await Trade.find(query)
      .populate('currency', 'code nameFa symbol')
      .populate('customer', 'firstName lastName phone email')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Trade.countDocuments(query);

    return { trades, total };
  }

  /**
   * آمار معاملات
   */
  async getTradeStats(sarafiId, period = '30d') {
    const dateFilter = this.getDateFilter(period);

    const stats = await Trade.aggregate([
      {
        $match: {
          sarafi: new mongoose.Types.ObjectId(sarafiId),
          createdAt: { $gte: dateFilter },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalTrades: { $sum: 1 },
          totalVolume: { $sum: '$totalAmount' },
          totalCommission: { $sum: '$commission.amount' },
          avgTradeAmount: { $avg: '$totalAmount' },
          buyCount: {
            $sum: { $cond: [{ $eq: ['$type', 'buy'] }, 1, 0] }
          },
          sellCount: {
            $sum: { $cond: [{ $eq: ['$type', 'sell'] }, 1, 0] }
          }
        }
      }
    ]);

    const pendingCount = await Trade.countDocuments({
      sarafi: sarafiId,
      status: 'pending'
    });

    const awaitingCurrency = await Trade.countDocuments({
      sarafi: sarafiId,
      'currencyCollection.status': 'pending',
      status: { $nin: ['cancelled', 'completed'] }
    });

    const awaitingRial = await Trade.countDocuments({
      sarafi: sarafiId,
      'rialCollection.status': 'pending',
      status: { $nin: ['cancelled', 'completed'] }
    });

    return {
      ...stats[0],
      pendingCount,
      awaitingCurrency,
      awaitingRial
    };
  }

  getDateFilter(period) {
    const now = new Date();
    switch (period) {
      case '7d':
        return new Date(now - 7 * 24 * 60 * 60 * 1000);
      case '30d':
        return new Date(now - 30 * 24 * 60 * 60 * 1000);
      case '90d':
        return new Date(now - 90 * 24 * 60 * 60 * 1000);
      case '1y':
        return new Date(now - 365 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now - 30 * 24 * 60 * 60 * 1000);
    }
  }
}

module.exports = new TradeService();
