const Trade = require('../models/Trade');
const MarketOffer = require('../models/MarketOffer');
const User = require('../models/User');
const walletService = require('./walletService');
const commissionService = require('./commissionService');
const scoringService = require('./scoringService');
const mongoose = require('mongoose');

class TradeService {
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
