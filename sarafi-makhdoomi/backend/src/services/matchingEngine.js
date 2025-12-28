/**
 * Matching Engine - موتور تطبیق سفارشات
 * الهام از بازارهای مالی حرفه‌ای
 * الگوریتم: Price-Time Priority (FIFO)
 */

const Order = require('../models/Order');
const Trade = require('../models/Trade');
const User = require('../models/User');
const Wallet = require('../models/Wallet');
const Currency = require('../models/Currency');
const alertService = require('./alertService');
const AuditLog = require('../models/AuditLog');

class MatchingEngine {
  constructor() {
    this.isRunning = false;
    this.matchInterval = null;
  }

  /**
   * شروع موتور تطبیق
   */
  start(intervalMs = 1000) {
    if (this.isRunning) return;
    this.isRunning = true;

    console.log('[MATCHING ENGINE] Started');

    this.matchInterval = setInterval(async () => {
      try {
        await this.processMatchingCycle();
      } catch (error) {
        console.error('[MATCHING ENGINE] Error:', error);
      }
    }, intervalMs);
  }

  /**
   * توقف موتور
   */
  stop() {
    if (this.matchInterval) {
      clearInterval(this.matchInterval);
      this.matchInterval = null;
    }
    this.isRunning = false;
    console.log('[MATCHING ENGINE] Stopped');
  }

  /**
   * یک سیکل تطبیق
   */
  async processMatchingCycle() {
    // دریافت همه ارزهای فعال
    const currencies = await Currency.find({ isActive: true });

    for (const currency of currencies) {
      await this.matchOrdersForCurrency(currency._id);
    }
  }

  /**
   * تطبیق سفارشات یک ارز
   */
  async matchOrdersForCurrency(currencyId) {
    // دریافت بهترین سفارش خرید (بالاترین قیمت)
    const bestBuy = await Order.findOne({
      currency: currencyId,
      side: 'buy',
      status: { $in: ['open', 'partially_filled'] },
      orderType: { $in: ['limit', 'market'] }
    })
      .sort({ price: -1, priority: -1, createdAt: 1 })
      .populate('customer sarafi');

    // دریافت بهترین سفارش فروش (پایین‌ترین قیمت)
    const bestSell = await Order.findOne({
      currency: currencyId,
      side: 'sell',
      status: { $in: ['open', 'partially_filled'] },
      orderType: { $in: ['limit', 'market'] }
    })
      .sort({ price: 1, priority: -1, createdAt: 1 })
      .populate('customer sarafi');

    // بررسی امکان Match
    if (!bestBuy || !bestSell) return null;

    // شرط Match: قیمت خرید >= قیمت فروش
    const canMatch =
      bestBuy.orderType === 'market' ||
      bestSell.orderType === 'market' ||
      bestBuy.price >= bestSell.price;

    if (!canMatch) return null;

    // اجرای Match
    return await this.executeMatch(bestBuy, bestSell);
  }

  /**
   * اجرای Match بین دو سفارش
   */
  async executeMatch(buyOrder, sellOrder) {
    try {
      // تعیین قیمت اجرا (میانگین یا قیمت سفارش قدیمی‌تر)
      const executionPrice = this.determineExecutionPrice(buyOrder, sellOrder);

      // تعیین مقدار اجرا
      const executionAmount = Math.min(
        buyOrder.remainingAmount,
        sellOrder.remainingAmount
      );

      // ایجاد معامله
      const trade = await this.createTrade({
        buyOrder,
        sellOrder,
        amount: executionAmount,
        price: executionPrice
      });

      // به‌روزرسانی سفارشات
      await buyOrder.partialFill(executionAmount, executionPrice, sellOrder._id, trade._id);
      await sellOrder.partialFill(executionAmount, executionPrice, buyOrder._id, trade._id);

      // انتقال از کیف پول
      await this.settleWallets(buyOrder, sellOrder, executionAmount, executionPrice);

      // ارسال هشدار
      await this.sendMatchNotifications(buyOrder, sellOrder, trade);

      // ثبت لاگ
      await AuditLog.log({
        action: 'order.match',
        category: 'trade',
        user: null, // سیستمی
        userRole: 'system',
        targetType: 'Trade',
        targetId: trade._id,
        description: `Match سفارش ${buyOrder.orderNumber} با ${sellOrder.orderNumber} - ${executionAmount} واحد @ ${executionPrice}`,
        newValues: {
          buyOrderId: buyOrder._id,
          sellOrderId: sellOrder._id,
          amount: executionAmount,
          price: executionPrice
        }
      });

      console.log(`[MATCH] ${buyOrder.orderNumber} <-> ${sellOrder.orderNumber}: ${executionAmount} @ ${executionPrice}`);

      return trade;
    } catch (error) {
      console.error('[MATCHING ENGINE] Execute Match Error:', error);
      throw error;
    }
  }

  /**
   * تعیین قیمت اجرا
   */
  determineExecutionPrice(buyOrder, sellOrder) {
    // اگر هر دو Market Order باشند، از آخرین قیمت بازار استفاده می‌شود
    if (buyOrder.orderType === 'market' && sellOrder.orderType === 'market') {
      return buyOrder.marketPriceAtCreation || sellOrder.marketPriceAtCreation;
    }

    // اگر یکی Market Order باشد، قیمت Limit Order اجرا می‌شود
    if (buyOrder.orderType === 'market') return sellOrder.price;
    if (sellOrder.orderType === 'market') return buyOrder.price;

    // اگر هر دو Limit Order باشند، قیمت سفارش قدیمی‌تر اجرا می‌شود
    return buyOrder.createdAt < sellOrder.createdAt ? buyOrder.price : sellOrder.price;
  }

  /**
   * ایجاد معامله جدید
   */
  async createTrade({ buyOrder, sellOrder, amount, price }) {
    const currency = await Currency.findById(buyOrder.currency);
    const totalAmount = amount * price;

    const trade = new Trade({
      tradeNumber: Trade.generateTradeNumber(),
      currency: buyOrder.currency,
      buyOrder: buyOrder._id,
      sellOrder: sellOrder._id,
      buyer: buyOrder.customer || buyOrder.createdBy,
      seller: sellOrder.customer || sellOrder.createdBy,
      buyerSarafi: buyOrder.sarafi,
      sellerSarafi: sellOrder.sarafi,
      amount,
      rate: price,
      totalAmount,
      type: buyOrder.side, // buy from buyer's perspective
      status: 'completed',
      executedAt: new Date()
    });

    await trade.save();
    return trade;
  }

  /**
   * تسویه کیف پول‌ها
   */
  async settleWallets(buyOrder, sellOrder, amount, price) {
    const totalValue = amount * price;

    try {
      // خریدار: کسر ریال، اضافه ارز
      if (buyOrder.customer) {
        // کسر از کیف پول نقدی/اعتباری خریدار
        if (buyOrder.paymentSource === 'cash') {
          await Wallet.updateOne(
            { user: buyOrder.customer, type: 'cash' },
            { $inc: { balance: -totalValue } }
          );
        } else {
          await Wallet.updateOne(
            { user: buyOrder.customer, type: 'credit' },
            { $inc: { usedCredit: totalValue } }
          );
        }

        // اضافه به کیف پول ارزی خریدار
        await Wallet.updateOne(
          { user: buyOrder.customer, currency: buyOrder.currency },
          { $inc: { balance: amount } },
          { upsert: true }
        );
      }

      // فروشنده: کسر ارز، اضافه ریال
      if (sellOrder.customer) {
        // کسر از کیف پول ارزی فروشنده
        await Wallet.updateOne(
          { user: sellOrder.customer, currency: sellOrder.currency },
          { $inc: { balance: -amount } }
        );

        // اضافه به کیف پول نقدی فروشنده
        await Wallet.updateOne(
          { user: sellOrder.customer, type: 'cash' },
          { $inc: { balance: totalValue } }
        );
      }

      // آزادسازی تعهدات
      await this.releaseCommitments(buyOrder, sellOrder, amount, price);

    } catch (error) {
      console.error('[MATCHING ENGINE] Wallet Settlement Error:', error);
      // در صورت خطا، باید rollback انجام شود
    }
  }

  /**
   * آزادسازی تعهدات Shadow Balance
   */
  async releaseCommitments(buyOrder, sellOrder, amount, price) {
    // اگر سفارش خرید تعهد داشته باشد
    if (buyOrder.customer) {
      const buyerWallet = await Wallet.findOne({
        user: buyOrder.customer,
        type: buyOrder.paymentSource === 'credit' ? 'credit' : 'cash'
      });
      if (buyerWallet) {
        await buyerWallet.executeCommitment(buyOrder._id, amount * price);
      }
    }

    // اگر سفارش فروش تعهد داشته باشد (برای ارز)
    if (sellOrder.customer) {
      const sellerWallet = await Wallet.findOne({
        user: sellOrder.customer,
        currency: sellOrder.currency
      });
      if (sellerWallet) {
        await sellerWallet.executeCommitment(sellOrder._id, amount);
      }
    }
  }

  /**
   * ارسال اعلان‌های Match
   */
  async sendMatchNotifications(buyOrder, sellOrder, trade) {
    const currency = await Currency.findById(trade.currency);
    const currencyCode = currency?.code || 'ارز';

    // اعلان به خریدار
    if (buyOrder.customer) {
      await alertService.alertOrderMatched(buyOrder.customer, {
        orderId: buyOrder._id,
        orderNumber: buyOrder.orderNumber,
        amount: trade.amount,
        price: trade.rate,
        currencyCode,
        side: 'buy'
      });
    }

    // اعلان به فروشنده
    if (sellOrder.customer) {
      await alertService.alertOrderMatched(sellOrder.customer, {
        orderId: sellOrder._id,
        orderNumber: sellOrder.orderNumber,
        amount: trade.amount,
        price: trade.rate,
        currencyCode,
        side: 'sell'
      });
    }

    // اعلان به صرافی‌ها
    if (buyOrder.sarafi) {
      await alertService.createAlert({
        userId: buyOrder.sarafi,
        type: 'order_matched',
        title: 'Match سفارش',
        message: `سفارش ${buyOrder.orderNumber} Match شد`,
        severity: 'info',
        data: { tradeId: trade._id }
      });
    }
  }

  /**
   * بررسی سفارشات شرطی (Stop Orders)
   */
  async checkConditionalOrders() {
    const conditionalOrders = await Order.find({
      orderType: { $in: ['conditional', 'stop_limit'] },
      status: 'open',
      'condition.triggered': false
    }).populate('currency');

    for (const order of conditionalOrders) {
      const currentPrice = order.side === 'buy'
        ? order.currency.sellRate
        : order.currency.buyRate;

      let shouldTrigger = false;

      if (order.condition.type === 'gte' && currentPrice >= order.stopPrice) {
        shouldTrigger = true;
      } else if (order.condition.type === 'lte' && currentPrice <= order.stopPrice) {
        shouldTrigger = true;
      }

      if (shouldTrigger) {
        order.condition.triggered = true;
        order.condition.triggeredAt = new Date();

        // تبدیل به Market Order یا Limit Order
        if (order.orderType === 'conditional') {
          order.orderType = 'market';
        } else {
          order.orderType = 'limit';
        }

        await order.save();
        console.log(`[CONDITIONAL] Order ${order.orderNumber} triggered at ${currentPrice}`);
      }
    }
  }

  /**
   * بررسی سفارشات منقضی
   */
  async checkExpiredOrders() {
    const now = new Date();

    const expiredOrders = await Order.find({
      status: { $in: ['open', 'partially_filled', 'pending'] },
      expiresAt: { $lte: now }
    });

    for (const order of expiredOrders) {
      order.status = 'expired';
      order.completedAt = now;
      await order.save();

      // آزادسازی تعهدات
      if (order.customer) {
        const wallet = await Wallet.findOne({
          user: order.customer,
          type: order.paymentSource === 'credit' ? 'credit' : 'cash'
        });
        if (wallet) {
          await wallet.releaseCommitment(order._id);
        }
      }

      // ارسال اعلان
      if (order.customer) {
        await alertService.alertOrderExpired(order.customer, {
          orderId: order._id,
          orderNumber: order.orderNumber,
          amount: order.remainingAmount,
          currencyCode: (await Currency.findById(order.currency))?.code
        });
      }

      console.log(`[EXPIRED] Order ${order.orderNumber}`);
    }

    return expiredOrders.length;
  }

  /**
   * دریافت آمار Order Book
   */
  async getOrderBookStats(currencyId) {
    const [buyOrders, sellOrders] = await Promise.all([
      Order.find({
        currency: currencyId,
        side: 'buy',
        status: { $in: ['open', 'partially_filled'] }
      }).select('price remainingAmount priority'),

      Order.find({
        currency: currencyId,
        side: 'sell',
        status: { $in: ['open', 'partially_filled'] }
      }).select('price remainingAmount priority')
    ]);

    // محاسبه عمق بازار
    const buyDepth = buyOrders.reduce((sum, o) => sum + o.remainingAmount, 0);
    const sellDepth = sellOrders.reduce((sum, o) => sum + o.remainingAmount, 0);

    // محاسبه VWAP
    const buyVWAP = buyOrders.length > 0
      ? buyOrders.reduce((sum, o) => sum + (o.price * o.remainingAmount), 0) / buyDepth
      : 0;
    const sellVWAP = sellOrders.length > 0
      ? sellOrders.reduce((sum, o) => sum + (o.price * o.remainingAmount), 0) / sellDepth
      : 0;

    // بهترین قیمت‌ها
    const bestBid = buyOrders.length > 0
      ? Math.max(...buyOrders.map(o => o.price))
      : 0;
    const bestAsk = sellOrders.length > 0
      ? Math.min(...sellOrders.map(o => o.price))
      : 0;

    return {
      buyOrders: buyOrders.length,
      sellOrders: sellOrders.length,
      buyDepth,
      sellDepth,
      buyVWAP,
      sellVWAP,
      bestBid,
      bestAsk,
      spread: bestAsk > 0 && bestBid > 0 ? bestAsk - bestBid : null,
      spreadPercent: bestAsk > 0 && bestBid > 0
        ? ((bestAsk - bestBid) / bestBid * 100).toFixed(2)
        : null
    };
  }

  /**
   * دریافت Order Book با تجمیع قیمت‌ها
   */
  async getAggregatedOrderBook(currencyId, levels = 10) {
    const [buyOrders, sellOrders] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            currency: currencyId,
            side: 'buy',
            status: { $in: ['open', 'partially_filled'] }
          }
        },
        {
          $group: {
            _id: '$price',
            totalAmount: { $sum: '$remainingAmount' },
            orderCount: { $sum: 1 }
          }
        },
        { $sort: { _id: -1 } },
        { $limit: levels }
      ]),

      Order.aggregate([
        {
          $match: {
            currency: currencyId,
            side: 'sell',
            status: { $in: ['open', 'partially_filled'] }
          }
        },
        {
          $group: {
            _id: '$price',
            totalAmount: { $sum: '$remainingAmount' },
            orderCount: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } },
        { $limit: levels }
      ])
    ]);

    // محاسبه تجمعی (Cumulative)
    let buyCumulative = 0;
    let sellCumulative = 0;

    return {
      bids: buyOrders.map(o => {
        buyCumulative += o.totalAmount;
        return {
          price: o._id,
          amount: o.totalAmount,
          cumulative: buyCumulative,
          orders: o.orderCount
        };
      }),
      asks: sellOrders.map(o => {
        sellCumulative += o.totalAmount;
        return {
          price: o._id,
          amount: o.totalAmount,
          cumulative: sellCumulative,
          orders: o.orderCount
        };
      }),
      spread: sellOrders[0] && buyOrders[0]
        ? sellOrders[0]._id - buyOrders[0]._id
        : null
    };
  }
}

// Singleton
const matchingEngine = new MatchingEngine();

module.exports = matchingEngine;
