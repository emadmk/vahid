const Wallet = require('../models/Wallet');
const WalletTransaction = require('../models/WalletTransaction');
const mongoose = require('mongoose');

class WalletService {
  /**
   * ایجاد کیف پول‌های کاربر (نقدی و اعتباری)
   */
  async createWalletsForUser(userId, sarafiId = null) {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      // ایجاد کیف پول نقدی
      const cashWallet = await Wallet.create([{
        user: userId,
        type: 'cash',
        balance: 0,
        managedBy: sarafiId
      }], { session });

      // ایجاد کیف پول اعتباری
      const creditWallet = await Wallet.create([{
        user: userId,
        type: 'credit',
        balance: 0,
        creditLimit: 0,
        usedCredit: 0,
        managedBy: sarafiId
      }], { session });

      await session.commitTransaction();

      return {
        cashWallet: cashWallet[0],
        creditWallet: creditWallet[0]
      };
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
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
    const wallet = await Wallet.findOne({ user: userId, type: 'cash' });

    if (!wallet) {
      throw new Error('کیف پول یافت نشد');
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
    const wallet = await Wallet.findOne({ user: userId, type: 'credit' });

    if (!wallet) {
      throw new Error('کیف پول اعتباری یافت نشد');
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

    return {
      wallets: {
        cash: {
          balance: wallets.cash?.balance || 0,
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
}

module.exports = new WalletService();
