const MarketOffer = require('../models/MarketOffer');
const User = require('../models/User');
const Trade = require('../models/Trade');
const Currency = require('../models/Currency');
const tradeService = require('./tradeService');
const mongoose = require('mongoose');

class MarketService {
  /**
   * ایجاد پیشنهاد جدید
   */
  async createOffer(offerData) {
    const {
      type,
      currency,
      amount,
      price,
      priceType,
      priceCondition,
      offeredBy,
      offeredByType,
      sarafiId,
      isPublic,
      expiresAt,
      notes
    } = offerData;

    // دریافت امتیاز ارائه‌دهنده
    const user = await User.findById(offeredBy);
    const offererScore = offeredByType === 'sarafi'
      ? user.sarafiStats?.score || 0
      : user.score || 0;

    const offer = await MarketOffer.create({
      type,
      currency,
      amount,
      remainingAmount: amount,
      price,
      priceType: priceType || 'fixed',
      priceCondition,
      offeredBy,
      offeredByType,
      sarafi: sarafiId,
      status: priceType === 'conditional' ? 'pending' : 'active',
      priority: 0,
      offererScore,
      isPublic: isPublic !== false,
      expiresAt,
      notes,
      activatedAt: priceType !== 'conditional' ? new Date() : null
    });

    return offer;
  }

  /**
   * دریافت پیشنهادات بازار
   */
  async getMarketOffers(options = {}) {
    const {
      type,
      currencyId,
      sarafiId,
      status = 'active',
      sortBy = 'price',
      order = 'asc',
      limit = 50,
      skip = 0
    } = options;

    const query = {
      status,
      isPublic: true
    };

    if (type) query.type = type;
    if (currencyId) query.currency = currencyId;
    if (sarafiId) query.sarafi = sarafiId;

    // مرتب‌سازی
    const sortOptions = {};
    if (sortBy === 'price') {
      sortOptions.price = order === 'asc' ? 1 : -1;
    } else if (sortBy === 'priority') {
      sortOptions.priority = -1;
      sortOptions.createdAt = 1;
    } else if (sortBy === 'score') {
      sortOptions.offererScore = -1;
    } else {
      sortOptions.createdAt = -1;
    }

    const offers = await MarketOffer.find(query)
      .populate('currency', 'code nameFa symbol')
      .populate('offeredBy', 'firstName lastName sarafiInfo.businessName score')
      .populate('sarafi', 'firstName lastName sarafiInfo.businessName')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    const total = await MarketOffer.countDocuments(query);

    return { offers, total };
  }

  /**
   * دریافت بهترین قیمت‌ها
   */
  async getBestPrices(currencyId) {
    // بهترین قیمت خرید (بالاترین)
    const bestBuy = await MarketOffer.findOne({
      currency: currencyId,
      type: 'buy',
      status: 'active',
      remainingAmount: { $gt: 0 }
    })
      .sort({ price: -1 })
      .populate('offeredBy', 'firstName lastName sarafiInfo.businessName');

    // بهترین قیمت فروش (پایین‌ترین)
    const bestSell = await MarketOffer.findOne({
      currency: currencyId,
      type: 'sell',
      status: 'active',
      remainingAmount: { $gt: 0 }
    })
      .sort({ price: 1 })
      .populate('offeredBy', 'firstName lastName sarafiInfo.businessName');

    return {
      currency: currencyId,
      bestBuyPrice: bestBuy?.price || null,
      bestBuyOffer: bestBuy,
      bestSellPrice: bestSell?.price || null,
      bestSellOffer: bestSell,
      spread: bestSell && bestBuy ? bestSell.price - bestBuy.price : null
    };
  }

  /**
   * پذیرش پیشنهاد (ایجاد معامله)
   */
  async acceptOffer(offerId, acceptedBy, acceptAmount = null) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const offer = await MarketOffer.findById(offerId)
        .populate('currency')
        .session(session);

      if (!offer) {
        throw new Error('پیشنهاد یافت نشد');
      }

      if (offer.status !== 'active') {
        throw new Error('این پیشنهاد دیگر فعال نیست');
      }

      // بررسی اینکه کاربر خودش پیشنهاد خودش رو قبول نکنه
      if (offer.offeredBy.toString() === acceptedBy.toString()) {
        throw new Error('شما نمی‌توانید پیشنهاد خودتان را بپذیرید');
      }

      const amount = acceptAmount || offer.remainingAmount;

      if (amount > offer.remainingAmount) {
        throw new Error('مقدار درخواستی بیشتر از موجودی است');
      }

      // تعیین خریدار و فروشنده
      let customerId, sarafiId;
      if (offer.offeredByType === 'sarafi') {
        sarafiId = offer.offeredBy;
        customerId = acceptedBy;
      } else {
        customerId = offer.offeredBy;
        sarafiId = offer.sarafi || acceptedBy;
      }

      // محاسبه مبلغ کل
      const totalAmount = amount * offer.price;

      // ایجاد رکورد ساده معامله بدون وابستگی به wallet
      const Trade = require('../models/Trade');
      const trade = await Trade.create([{
        tradeNumber: Trade.generateTradeNumber ? Trade.generateTradeNumber() : `TRD-${Date.now()}`,
        type: offer.type === 'buy' ? 'sell' : 'buy',
        currency: offer.currency._id || offer.currency,
        amount,
        rate: offer.price,
        totalAmount,
        commission: { amount: 0, rate: 0, type: 'none' },
        netAmount: totalAmount,
        customer: customerId,
        sarafi: sarafiId,
        marketOffer: offer._id,
        status: 'pending'
      }], { session });

      // به‌روزرسانی پیشنهاد
      offer.remainingAmount -= amount;

      if (offer.remainingAmount === 0) {
        offer.status = 'filled';
      } else {
        offer.status = 'partially_filled';
      }

      await offer.save({ session });
      await session.commitTransaction();

      return { offer, trade: trade[0] };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * لغو پیشنهاد
   */
  async cancelOffer(offerId, cancelledBy, reason = '') {
    const offer = await MarketOffer.findById(offerId);

    if (!offer) {
      throw new Error('پیشنهاد یافت نشد');
    }

    if (offer.offeredBy.toString() !== cancelledBy.toString()) {
      throw new Error('شما مجاز به لغو این پیشنهاد نیستید');
    }

    if (['cancelled', 'filled', 'expired'].includes(offer.status)) {
      throw new Error('این پیشنهاد قابل لغو نیست');
    }

    offer.status = 'cancelled';
    offer.cancelledAt = new Date();
    offer.cancellationReason = reason;

    await offer.save();

    return offer;
  }

  /**
   * بررسی سفارش‌های شرطی
   */
  async checkConditionalOrders(currencyId, currentPrice) {
    const conditionalOffers = await MarketOffer.find({
      currency: currencyId,
      priceType: 'conditional',
      status: 'pending',
      'priceCondition.triggered': false
    });

    const triggeredOffers = [];

    for (const offer of conditionalOffers) {
      if (offer.checkPriceCondition(currentPrice)) {
        offer.priceCondition.triggered = true;
        offer.priceCondition.triggeredAt = new Date();
        offer.status = 'active';
        offer.activatedAt = new Date();
        await offer.save();

        triggeredOffers.push(offer);

        // اینجا می‌توان اعلان ارسال کرد
        console.log(`سفارش شرطی ${offer._id} فعال شد`);
      }
    }

    return triggeredOffers;
  }

  /**
   * بررسی پیشنهادات منقضی شده
   */
  async checkExpiredOffers() {
    const expiredOffers = await MarketOffer.updateMany(
      {
        status: { $in: ['active', 'pending'] },
        expiresAt: { $lt: new Date() }
      },
      {
        $set: { status: 'expired' }
      }
    );

    return expiredOffers.modifiedCount;
  }

  /**
   * دریافت پیشنهادات کاربر
   */
  async getUserOffers(userId, options = {}) {
    const { status, type, limit = 20, skip = 0 } = options;

    const query = { offeredBy: userId };
    if (status) query.status = status;
    if (type) query.type = type;

    const offers = await MarketOffer.find(query)
      .populate('currency', 'code nameFa symbol')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await MarketOffer.countDocuments(query);

    return { offers, total };
  }

  /**
   * آمار بازار
   */
  async getMarketStats(currencyId = null) {
    const matchStage = {
      status: 'active'
    };

    if (currencyId) {
      matchStage.currency = new mongoose.Types.ObjectId(currencyId);
    }

    const stats = await MarketOffer.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { currency: '$currency', type: '$type' },
          count: { $sum: 1 },
          totalAmount: { $sum: '$remainingAmount' },
          avgPrice: { $avg: '$price' },
          minPrice: { $min: '$price' },
          maxPrice: { $max: '$price' }
        }
      },
      {
        $lookup: {
          from: 'currencies',
          localField: '_id.currency',
          foreignField: '_id',
          as: 'currency'
        }
      },
      { $unwind: '$currency' }
    ]);

    return stats;
  }

  /**
   * محاسبه قیمت پویا بر اساس عرضه و تقاضا
   */
  async calculateDynamicPrice(currencyId) {
    const [buyOffers, sellOffers] = await Promise.all([
      MarketOffer.aggregate([
        {
          $match: {
            currency: new mongoose.Types.ObjectId(currencyId),
            type: 'buy',
            status: 'active'
          }
        },
        {
          $group: {
            _id: null,
            totalDemand: { $sum: '$remainingAmount' },
            weightedAvgPrice: {
              $avg: { $multiply: ['$price', '$remainingAmount'] }
            }
          }
        }
      ]),
      MarketOffer.aggregate([
        {
          $match: {
            currency: new mongoose.Types.ObjectId(currencyId),
            type: 'sell',
            status: 'active'
          }
        },
        {
          $group: {
            _id: null,
            totalSupply: { $sum: '$remainingAmount' },
            weightedAvgPrice: {
              $avg: { $multiply: ['$price', '$remainingAmount'] }
            }
          }
        }
      ])
    ]);

    const demand = buyOffers[0]?.totalDemand || 0;
    const supply = sellOffers[0]?.totalSupply || 0;
    const buyAvgPrice = buyOffers[0]?.weightedAvgPrice || 0;
    const sellAvgPrice = sellOffers[0]?.weightedAvgPrice || 0;

    // محاسبه نسبت عرضه به تقاضا
    const supplyDemandRatio = supply > 0 ? demand / supply : null;

    // قیمت پیشنهادی بر اساس میانگین وزنی
    const suggestedPrice = (buyAvgPrice + sellAvgPrice) / 2;

    return {
      currency: currencyId,
      totalDemand: demand,
      totalSupply: supply,
      supplyDemandRatio,
      buyAvgPrice,
      sellAvgPrice,
      suggestedPrice,
      marketPressure: supplyDemandRatio > 1 ? 'bullish' : supplyDemandRatio < 1 ? 'bearish' : 'neutral'
    };
  }
}

module.exports = new MarketService();
