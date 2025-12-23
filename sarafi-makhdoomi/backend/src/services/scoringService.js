const User = require('../models/User');
const CustomerTier = require('../models/CustomerTier');
const mongoose = require('mongoose');

class ScoringService {
  /**
   * محاسبه و اعمال امتیاز معامله
   */
  async applyTradeScore(userId, tradeAmount, isSarafi = false) {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error('کاربر یافت نشد');
    }

    let pointsEarned = 0;

    if (isSarafi) {
      // صراف: 1 امتیاز به ازای هر 10 میلیارد ریال
      pointsEarned = Math.floor(tradeAmount / 10000000000);
      if (pointsEarned > 0) {
        user.sarafiStats.score = (user.sarafiStats.score || 0) + pointsEarned;
        user.sarafiStats.totalVolume = (user.sarafiStats.totalVolume || 0) + tradeAmount;
        await user.save();
      }
    } else {
      // مشتری: 1 امتیاز به ازای هر 100 میلیون ریال
      pointsEarned = Math.floor(tradeAmount / 100000000);
      if (pointsEarned > 0) {
        await user.addScore(pointsEarned);
      }

      // به‌روزرسانی آمار مالی
      await user.updateFinancialStats(tradeAmount);
    }

    return {
      userId: user._id,
      pointsEarned,
      totalScore: isSarafi ? user.sarafiStats.score : user.score,
      tier: user.tier
    };
  }

  /**
   * اعمال جریمه لغو
   */
  async applyCancellationPenalty(userId) {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error('کاربر یافت نشد');
    }

    const result = await user.applyCancellationPenalty();

    // بررسی تعلیق خودکار در صورت بلک‌پوینت زیاد
    if (result.blackPoints >= 5) {
      await this.suggestSuspension(userId, 'تعداد بلک‌پوینت بیش از حد مجاز');
    }

    return {
      userId: user._id,
      pointsDeducted: 100,
      blackPointsAdded: 1,
      newScore: result.newScore,
      totalBlackPoints: result.blackPoints,
      newTier: result.tier
    };
  }

  /**
   * پیشنهاد تعلیق (ارسال هشدار به صراف)
   */
  async suggestSuspension(userId, reason) {
    const user = await User.findById(userId).populate('selectedSarafi');

    // اینجا می‌توان اعلان به صراف ارسال کرد
    // فعلا فقط لاگ می‌کنیم
    console.log(`پیشنهاد تعلیق کاربر ${user.fullName}: ${reason}`);

    return {
      userId,
      reason,
      suggestedAt: new Date()
    };
  }

  /**
   * تعلیق کاربر
   */
  async suspendUser(userId, reason, duration = null, suspendedBy) {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error('کاربر یافت نشد');
    }

    await user.suspend(reason, duration, suspendedBy);

    return {
      userId,
      reason,
      duration,
      suspendedAt: user.suspension.suspendedAt,
      suspendedUntil: user.suspension.suspendedUntil
    };
  }

  /**
   * رفع تعلیق کاربر
   */
  async unsuspendUser(userId) {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error('کاربر یافت نشد');
    }

    await user.unsuspend();

    return {
      userId,
      unsuspendedAt: new Date()
    };
  }

  /**
   * دریافت وضعیت امتیاز کاربر
   */
  async getUserScoreStatus(userId) {
    const user = await User.findById(userId);

    if (!user) {
      throw new Error('کاربر یافت نشد');
    }

    const tierData = await CustomerTier.findOne({ code: user.tier });

    // محاسبه امتیاز مورد نیاز برای ارتقا
    let nextTier = null;
    let pointsToNextTier = 0;

    if (user.tier === 'new' && user.score < 100) {
      nextTier = 'C';
      pointsToNextTier = 100 - user.score;
    } else if (user.tier === 'C' && user.score < 500) {
      nextTier = 'B';
      pointsToNextTier = 500 - user.score;
    } else if (user.tier === 'B' && user.score < 1000) {
      nextTier = 'A';
      pointsToNextTier = 1000 - user.score;
    }

    return {
      score: user.score,
      tier: user.tier,
      tierName: tierData?.name || 'نامشخص',
      tierColor: tierData?.color || '#6B7280',
      blackPoints: user.blackPoints,
      cancellationCount: user.cancellationCount,
      nextTier,
      pointsToNextTier,
      benefits: tierData?.benefits || {},
      isSuspended: user.isCurrentlySuspended,
      suspensionInfo: user.suspension
    };
  }

  /**
   * گزارش امتیازات (برای صراف)
   */
  async getCustomerScoreReport(sarafiId, options = {}) {
    const { sortBy = 'score', order = 'desc', limit = 50, skip = 0 } = options;

    const sortOptions = {};
    sortOptions[sortBy] = order === 'desc' ? -1 : 1;

    const customers = await User.find({
      role: 'user',
      selectedSarafi: sarafiId
    })
      .select('firstName lastName email phone score tier blackPoints cancellationCount financialInfo')
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments({
      role: 'user',
      selectedSarafi: sarafiId
    });

    // آمار کلی
    const stats = await User.aggregate([
      {
        $match: {
          role: 'user',
          selectedSarafi: new mongoose.Types.ObjectId(sarafiId)
        }
      },
      {
        $group: {
          _id: '$tier',
          count: { $sum: 1 },
          avgScore: { $avg: '$score' },
          totalBlackPoints: { $sum: '$blackPoints' }
        }
      }
    ]);

    return { customers, total, stats };
  }

  /**
   * لیدربورد امتیازات
   */
  async getLeaderboard(type = 'customer', limit = 10) {
    let query, sortField;

    if (type === 'customer') {
      query = { role: 'user' };
      sortField = 'score';
    } else {
      query = { role: 'sarafi' };
      sortField = 'sarafiStats.score';
    }

    const leaderboard = await User.find(query)
      .select('firstName lastName score tier sarafiStats.score sarafiInfo.businessName')
      .sort({ [sortField]: -1 })
      .limit(limit);

    return leaderboard.map((user, index) => ({
      rank: index + 1,
      userId: user._id,
      name: type === 'sarafi'
        ? user.sarafiInfo?.businessName || user.fullName
        : user.fullName,
      score: type === 'sarafi' ? user.sarafiStats?.score || 0 : user.score,
      tier: user.tier
    }));
  }

  /**
   * محاسبه اولویت در صف بر اساس امتیاز
   */
  calculateQueuePriority(userScore, createdAt) {
    // ترکیب زمان و امتیاز برای محاسبه اولویت
    // زمان: هر دقیقه انتظار = 1 امتیاز اولویت
    const waitingMinutes = (Date.now() - new Date(createdAt).getTime()) / 60000;
    const waitingPriority = Math.floor(waitingMinutes);

    // امتیاز کاربر: هر 100 امتیاز = 1 امتیاز اولویت
    const scorePriority = Math.floor(userScore / 100);

    return waitingPriority + scorePriority;
  }

  /**
   * مقایسه اولویت دو کاربر
   */
  compareUserPriority(user1, user2) {
    const priority1 = this.calculateQueuePriority(user1.score, user1.createdAt);
    const priority2 = this.calculateQueuePriority(user2.score, user2.createdAt);

    return priority2 - priority1; // نزولی
  }
}

module.exports = new ScoringService();
