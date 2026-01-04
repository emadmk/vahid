const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const Currency = require('../models/Currency');
const mongoose = require('mongoose');

class WalletService {
  /**
   * ایجاد کیف پول‌های کاربر (نقدی و اعتباری)
   */
  async createWalletsForUser(userId, sarafiId = null) {
    // بررسی وجود کیف پول قبلی
    const existingWallets = await Wallet.find({ user: userId });

    let cashWallet = existingWallets.find(w => w.type === 'cash');
    let creditWallet = existingWallets.find(w => w.type === 'credit');

    // ایجاد کیف پول نقدی اگر وجود نداشت
    if (!cashWallet) {
      cashWallet = await Wallet.create({
        user: userId,
        type: 'cash',
        balance: 0,
        managedBy: sarafiId
      });
    }

    // ایجاد کیف پول اعتباری اگر وجود نداشت
    if (!creditWallet) {
      creditWallet = await Wallet.create({
        user: userId,
        type: 'credit',
        balance: 0,
        creditLimit: 0,
        usedCredit: 0,
        managedBy: sarafiId
      });
    }

    return { cashWallet, creditWallet };
  }

  /**
   * دریافت کیف پول‌های کاربر
   */
  async getUserWallets(userId) {
    const wallets = await Wallet.find({ user: userId });

    return {
      cash: wallets.find(w => w.type === 'cash'),
      credit: wallets.find(w => w.type === 'credit')
    };
  }

  /**
   * واریز به کیف پول نقدی
   */
  async deposit(userId, amount, description = '', processedBy = null) {
    let wallet = await Wallet.findOne({ user: userId, type: 'cash' });

    // اگر کیف پول وجود نداشت، ایجاد کن
    if (!wallet) {
      const wallets = await this.createWalletsForUser(userId, processedBy);
      wallet = wallets.cashWallet;
    }

    if (!wallet.isActive) {
      throw new Error('کیف پول غیرفعال است');
    }

    const balanceBefore = wallet.balance;
    wallet.balance += amount;
    wallet.lastTransaction = new Date();
    await wallet.save();

    // ثبت تراکنش
    const transaction = await WalletTransaction.create({
      wallet: wallet._id,
      user: userId,
      type: 'deposit',
      amount,
      balanceBefore,
      balanceAfter: wallet.balance,
      description,
      referenceNumber: WalletTransaction.generateReferenceNumber(),
      processedBy
    });

    return { wallet, transaction };
  }

  /**
   * برداشت از کیف پول نقدی
   */
  async withdraw(userId, amount, description = '', processedBy = null) {
    const wallet = await Wallet.findOne({ user: userId, type: 'cash' });

    if (!wallet) {
      throw new Error('کیف پول یافت نشد');
    }

    if (!wallet.isActive) {
      throw new Error('کیف پول غیرفعال است');
    }

    if (wallet.balance < amount) {
      throw new Error('موجودی کافی نیست');
    }

    const balanceBefore = wallet.balance;
    wallet.balance -= amount;
    wallet.lastTransaction = new Date();
    await wallet.save();

    const transaction = await WalletTransaction.create({
      wallet: wallet._id,
      user: userId,
      type: 'withdraw',
      amount: -amount,
      balanceBefore,
      balanceAfter: wallet.balance,
      description,
      referenceNumber: WalletTransaction.generateReferenceNumber(),
      processedBy
    });

    return { wallet, transaction };
  }

  /**
   * افزایش سقف اعتبار
   */
  async increaseCreditLimit(userId, amount, processedBy) {
    let wallet = await Wallet.findOne({ user: userId, type: 'credit' });

    // اگر کیف پول وجود نداشت، ایجاد کن
    if (!wallet) {
      const wallets = await this.createWalletsForUser(userId, processedBy);
      wallet = wallets.creditWallet;
    }

    const previousLimit = wallet.creditLimit;
    wallet.creditLimit += amount;
    wallet.lastTransaction = new Date();
    await wallet.save();

    const transaction = await WalletTransaction.create({
      wallet: wallet._id,
      user: userId,
      type: 'credit_increase',
      amount,
      balanceBefore: previousLimit,
      balanceAfter: wallet.creditLimit,
      description: `افزایش سقف اعتبار از ${previousLimit.toLocaleString()} به ${wallet.creditLimit.toLocaleString()} ریال`,
      referenceNumber: WalletTransaction.generateReferenceNumber(),
      processedBy
    });

    return { wallet, transaction };
  }

  /**
   * کاهش سقف اعتبار
   */
  async decreaseCreditLimit(userId, amount, processedBy) {
    const wallet = await Wallet.findOne({ user: userId, type: 'credit' });

    if (!wallet) {
      throw new Error('کیف پول اعتباری یافت نشد');
    }

    if (wallet.creditLimit - amount < wallet.usedCredit) {
      throw new Error('سقف اعتبار نمی‌تواند کمتر از اعتبار مصرف‌شده باشد');
    }

    const previousLimit = wallet.creditLimit;
    wallet.creditLimit -= amount;
    wallet.lastTransaction = new Date();
    await wallet.save();

    const transaction = await WalletTransaction.create({
      wallet: wallet._id,
      user: userId,
      type: 'credit_decrease',
      amount: -amount,
      balanceBefore: previousLimit,
      balanceAfter: wallet.creditLimit,
      description: `کاهش سقف اعتبار از ${previousLimit.toLocaleString()} به ${wallet.creditLimit.toLocaleString()} ریال`,
      referenceNumber: WalletTransaction.generateReferenceNumber(),
      processedBy
    });

    return { wallet, transaction };
  }

  /**
   * استفاده از اعتبار
   */
  async useCredit(userId, amount, tradeId = null, description = '') {
    const wallet = await Wallet.findOne({ user: userId, type: 'credit' });

    if (!wallet) {
      throw new Error('کیف پول اعتباری یافت نشد');
    }

    if (!wallet.isActive) {
      throw new Error('کیف پول غیرفعال است');
    }

    const availableCredit = wallet.creditLimit - wallet.usedCredit;
    if (availableCredit < amount) {
      throw new Error('اعتبار کافی نیست');
    }

    const usedBefore = wallet.usedCredit;
    wallet.usedCredit += amount;
    wallet.lastTransaction = new Date();
    await wallet.save();

    const transaction = await WalletTransaction.create({
      wallet: wallet._id,
      user: userId,
      type: 'credit_use',
      amount: -amount,
      balanceBefore: availableCredit,
      balanceAfter: wallet.creditLimit - wallet.usedCredit,
      description,
      referenceNumber: WalletTransaction.generateReferenceNumber(),
      trade: tradeId
    });

    return { wallet, transaction };
  }

  /**
   * بازپرداخت اعتبار
   */
  async repayCredit(userId, amount, description = '', processedBy = null) {
    const wallet = await Wallet.findOne({ user: userId, type: 'credit' });

    if (!wallet) {
      throw new Error('کیف پول اعتباری یافت نشد');
    }

    if (amount > wallet.usedCredit) {
      throw new Error('مبلغ بازپرداخت بیشتر از اعتبار مصرف‌شده است');
    }

    const usedBefore = wallet.usedCredit;
    wallet.usedCredit -= amount;
    wallet.lastTransaction = new Date();
    await wallet.save();

    const transaction = await WalletTransaction.create({
      wallet: wallet._id,
      user: userId,
      type: 'credit_repay',
      amount,
      balanceBefore: wallet.creditLimit - usedBefore,
      balanceAfter: wallet.creditLimit - wallet.usedCredit,
      description,
      referenceNumber: WalletTransaction.generateReferenceNumber(),
      processedBy
    });

    return { wallet, transaction };
  }

  /**
   * بررسی موجودی کافی برای خرید
   * @returns {Object} { canPurchase, method, cashAmount, creditAmount }
   */
  async checkPurchaseAvailability(userId, amount) {
    const wallets = await this.getUserWallets(userId);

    if (!wallets.cash || !wallets.credit) {
      return { canPurchase: false, reason: 'کیف پول یافت نشد' };
    }

    const cashBalance = wallets.cash.balance;
    const availableCredit = wallets.credit.creditLimit - wallets.credit.usedCredit;
    const totalAvailable = cashBalance + availableCredit;

    if (totalAvailable < amount) {
      return {
        canPurchase: false,
        reason: 'موجودی کافی نیست',
        required: amount,
        available: totalAvailable
      };
    }

    // ترجیح: اول نقدی، بعد اعتباری
    let cashAmount = 0;
    let creditAmount = 0;
    let method = 'cash_wallet';

    if (cashBalance >= amount) {
      // کل مبلغ از نقدی
      cashAmount = amount;
      method = 'cash_wallet';
    } else if (availableCredit >= amount) {
      // کل مبلغ از اعتباری
      creditAmount = amount;
      method = 'credit_wallet';
    } else {
      // ترکیبی
      cashAmount = cashBalance;
      creditAmount = amount - cashBalance;
      method = 'mixed';
    }

    return {
      canPurchase: true,
      method,
      cashAmount,
      creditAmount,
      cashBalance,
      availableCredit
    };
  }

  /**
   * پرداخت برای خرید (ترکیبی)
   */
  async processPurchasePayment(userId, amount, tradeId, description = '') {
    const availability = await this.checkPurchaseAvailability(userId, amount);

    if (!availability.canPurchase) {
      throw new Error(availability.reason);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const transactions = [];

      // برداشت از نقدی
      if (availability.cashAmount > 0) {
        const cashWallet = await Wallet.findOne({ user: userId, type: 'cash' }).session(session);
        const balanceBefore = cashWallet.balance;
        cashWallet.balance -= availability.cashAmount;
        cashWallet.lastTransaction = new Date();
        await cashWallet.save({ session });

        const cashTx = await WalletTransaction.create([{
          wallet: cashWallet._id,
          user: userId,
          type: 'trade_buy',
          amount: -availability.cashAmount,
          balanceBefore,
          balanceAfter: cashWallet.balance,
          description: description || 'پرداخت از کیف پول نقدی',
          referenceNumber: WalletTransaction.generateReferenceNumber(),
          trade: tradeId
        }], { session });

        transactions.push(cashTx[0]);
      }

      // استفاده از اعتبار
      if (availability.creditAmount > 0) {
        const creditWallet = await Wallet.findOne({ user: userId, type: 'credit' }).session(session);
        const availableBefore = creditWallet.creditLimit - creditWallet.usedCredit;
        creditWallet.usedCredit += availability.creditAmount;
        creditWallet.lastTransaction = new Date();
        await creditWallet.save({ session });

        const creditTx = await WalletTransaction.create([{
          wallet: creditWallet._id,
          user: userId,
          type: 'credit_use',
          amount: -availability.creditAmount,
          balanceBefore: availableBefore,
          balanceAfter: creditWallet.creditLimit - creditWallet.usedCredit,
          description: description || 'استفاده از اعتبار',
          referenceNumber: WalletTransaction.generateReferenceNumber(),
          trade: tradeId
        }], { session });

        transactions.push(creditTx[0]);
      }

      await session.commitTransaction();

      return {
        method: availability.method,
        cashAmount: availability.cashAmount,
        creditAmount: availability.creditAmount,
        transactions
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }

  /**
   * دریافت تاریخچه تراکنش‌ها
   */
  async getTransactionHistory(userId, options = {}) {
    const { type, startDate, endDate, limit = 50, skip = 0 } = options;

    const query = { user: userId };

    if (type) {
      query.type = type;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const transactions = await WalletTransaction.find(query)
      .populate('wallet', 'type')
      .populate('trade', 'tradeNumber')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await WalletTransaction.countDocuments(query);

    return { transactions, total };
  }

  /**
   * گزارش مالی کاربر
   */
  async getFinancialReport(userId) {
    const wallets = await this.getUserWallets(userId);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const recentTransactions = await WalletTransaction.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(userId),
          createdAt: { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: '$type',
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]);

    // محاسبه ارزش ریالی کل
    let totalRialValue = 0;
    if (wallets.cash) {
      totalRialValue = await wallets.cash.calculateTotalRialValue();
    }

    return {
      wallets: {
        cash: {
          balance: wallets.cash?.balance || 0,
          currencyBalances: wallets.cash?.currencyBalances || [],
          totalRialValue: totalRialValue,
          isActive: wallets.cash?.isActive || false
        },
        credit: {
          limit: wallets.credit?.creditLimit || 0,
          used: wallets.credit?.usedCredit || 0,
          available: (wallets.credit?.creditLimit || 0) - (wallets.credit?.usedCredit || 0),
          isActive: wallets.credit?.isActive || false
        }
      },
      last30Days: recentTransactions
    };
  }

  // ========== متدهای مدیریت ارزها ==========

  /**
   * واریز ارز به کیف پول
   */
  async depositCurrency(userId, currencyId, amount, description = '', processedBy = null) {
    // دریافت اطلاعات ارز
    const currency = await Currency.findById(currencyId);
    if (!currency) {
      throw new Error('ارز یافت نشد');
    }

    let wallet = await Wallet.findOne({ user: userId, type: 'cash' });

    // اگر کیف پول وجود نداشت، ایجاد کن
    if (!wallet) {
      const wallets = await this.createWalletsForUser(userId, processedBy);
      wallet = wallets.cashWallet;
    }

    if (!wallet.isActive) {
      throw new Error('کیف پول غیرفعال است');
    }

    // دریافت موجودی قبلی ارز
    const balanceBefore = wallet.getCurrencyBalance(currencyId);

    // واریز ارز
    await wallet.depositCurrency(currencyId, currency.code, currency.nameFa, amount);

    // موجودی جدید
    const balanceAfter = wallet.getCurrencyBalance(currencyId);

    // ثبت تراکنش
    const transaction = await WalletTransaction.create({
      wallet: wallet._id,
      user: userId,
      type: 'deposit',
      amount,
      balanceBefore,
      balanceAfter,
      currency: currencyId,
      description: description || `واریز ${amount} ${currency.nameFa}`,
      referenceNumber: WalletTransaction.generateReferenceNumber(),
      processedBy,
      metadata: {
        currencyCode: currency.code,
        currencyName: currency.nameFa
      }
    });

    return { wallet, transaction, currency };
  }

  /**
   * برداشت ارز از کیف پول
   */
  async withdrawCurrency(userId, currencyId, amount, description = '', processedBy = null) {
    const currency = await Currency.findById(currencyId);
    if (!currency) {
      throw new Error('ارز یافت نشد');
    }

    const wallet = await Wallet.findOne({ user: userId, type: 'cash' });

    if (!wallet) {
      throw new Error('کیف پول یافت نشد');
    }

    if (!wallet.isActive) {
      throw new Error('کیف پول غیرفعال است');
    }

    // دریافت موجودی قبلی
    const balanceBefore = wallet.getCurrencyBalance(currencyId);

    if (balanceBefore < amount) {
      throw new Error(`موجودی ${currency.nameFa} کافی نیست`);
    }

    // برداشت ارز
    await wallet.withdrawCurrency(currencyId, amount);

    const balanceAfter = wallet.getCurrencyBalance(currencyId);

    // ثبت تراکنش
    const transaction = await WalletTransaction.create({
      wallet: wallet._id,
      user: userId,
      type: 'withdraw',
      amount: -amount,
      balanceBefore,
      balanceAfter,
      currency: currencyId,
      description: description || `برداشت ${amount} ${currency.nameFa}`,
      referenceNumber: WalletTransaction.generateReferenceNumber(),
      processedBy,
      metadata: {
        currencyCode: currency.code,
        currencyName: currency.nameFa
      }
    });

    return { wallet, transaction, currency };
  }

  /**
   * دریافت موجودی ارزها با ارزش ریالی
   */
  async getCurrencyBalances(userId) {
    const wallet = await Wallet.findOne({ user: userId, type: 'cash' });

    if (!wallet) {
      return {
        rialBalance: 0,
        currencyBalances: [],
        totalRialValue: 0
      };
    }

    // دریافت همه ارزها برای محاسبه ارزش ریالی
    const currencies = await Currency.find({ isActive: true });
    const currencyRates = {};
    currencies.forEach(c => {
      currencyRates[c._id.toString()] = {
        sellRate: c.sellRate,
        buyRate: c.buyRate,
        code: c.code,
        nameFa: c.nameFa
      };
    });

    // محاسبه ارزش ریالی هر ارز
    const currencyBalancesWithValue = wallet.currencyBalances.map(cb => {
      const rate = currencyRates[cb.currency.toString()];
      const rialValue = rate ? cb.amount * rate.sellRate : 0;
      return {
        currency: cb.currency,
        currencyCode: cb.currencyCode || (rate ? rate.code : ''),
        currencyName: cb.currencyName || (rate ? rate.nameFa : ''),
        amount: cb.amount,
        sellRate: rate ? rate.sellRate : 0,
        buyRate: rate ? rate.buyRate : 0,
        rialValue: rialValue,
        lastUpdated: cb.lastUpdated
      };
    });

    // محاسبه ارزش ریالی کل
    const totalCurrencyRialValue = currencyBalancesWithValue.reduce(
      (sum, cb) => sum + cb.rialValue, 0
    );
    const totalRialValue = (wallet.balance || 0) + totalCurrencyRialValue;

    return {
      rialBalance: wallet.balance || 0,
      currencyBalances: currencyBalancesWithValue,
      totalRialValue: totalRialValue
    };
  }

  /**
   * انتقال ارز بین کاربران
   */
  async transferCurrency(fromUserId, toUserId, currencyId, amount, description = '', processedBy = null) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      const currency = await Currency.findById(currencyId);
      if (!currency) {
        throw new Error('ارز یافت نشد');
      }

      // کیف پول مبدا
      const fromWallet = await Wallet.findOne({ user: fromUserId, type: 'cash' }).session(session);
      if (!fromWallet) {
        throw new Error('کیف پول مبدا یافت نشد');
      }

      const fromBalanceBefore = fromWallet.getCurrencyBalance(currencyId);
      if (fromBalanceBefore < amount) {
        throw new Error(`موجودی ${currency.nameFa} کافی نیست`);
      }

      // کیف پول مقصد
      let toWallet = await Wallet.findOne({ user: toUserId, type: 'cash' }).session(session);
      if (!toWallet) {
        toWallet = await Wallet.create([{
          user: toUserId,
          type: 'cash',
          balance: 0,
          managedBy: processedBy
        }], { session });
        toWallet = toWallet[0];
      }

      const toBalanceBefore = toWallet.getCurrencyBalance(currencyId);

      // برداشت از مبدا
      await fromWallet.withdrawCurrency(currencyId, amount);
      // واریز به مقصد
      await toWallet.depositCurrency(currencyId, currency.code, currency.nameFa, amount);

      // ثبت تراکنش‌ها
      const refNumber = WalletTransaction.generateReferenceNumber();

      await WalletTransaction.create([{
        wallet: fromWallet._id,
        user: fromUserId,
        type: 'transfer_out',
        amount: -amount,
        balanceBefore: fromBalanceBefore,
        balanceAfter: fromWallet.getCurrencyBalance(currencyId),
        currency: currencyId,
        description: description || `انتقال ${amount} ${currency.nameFa}`,
        referenceNumber: refNumber + '-OUT',
        processedBy,
        metadata: { toUserId, currencyCode: currency.code }
      }], { session });

      await WalletTransaction.create([{
        wallet: toWallet._id,
        user: toUserId,
        type: 'transfer_in',
        amount: amount,
        balanceBefore: toBalanceBefore,
        balanceAfter: toWallet.getCurrencyBalance(currencyId),
        currency: currencyId,
        description: description || `دریافت ${amount} ${currency.nameFa}`,
        referenceNumber: refNumber + '-IN',
        processedBy,
        metadata: { fromUserId, currencyCode: currency.code }
      }], { session });

      await session.commitTransaction();

      return { fromWallet, toWallet, currency, amount };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}

module.exports = new WalletService();
