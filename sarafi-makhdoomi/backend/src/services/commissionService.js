const Commission = require('../models/Commission');
const User = require('../models/User');

class CommissionService {
  /**
   * یافتن قانون کارمزد مناسب
   */
  async findApplicableRule(tradeData, customer) {
    const { currency, type, amount, sarafiId } = tradeData;

    // یافتن قوانین فعال با اولویت نزولی
    const rules = await Commission.find({
      isActive: true,
      $or: [
        { sarafi: sarafiId },
        { sarafi: null } // قوانین عمومی
      ],
      $or: [
        { currency: currency },
        { currency: null } // قوانین عمومی ارز
      ],
      $or: [
        { tradeType: type },
        { tradeType: 'both' }
      ]
    }).sort({ priority: -1 });

    // یافتن اولین قانون قابل اعمال
    for (const rule of rules) {
      if (rule.isApplicable({ totalAmount: amount }, customer)) {
        return rule;
      }
    }

    return null;
  }

  /**
   * محاسبه کارمزد معامله
   */
  async calculateCommission(tradeData, customerId) {
    const customer = await User.findById(customerId);

    if (!customer) {
      throw new Error('مشتری یافت نشد');
    }

    const rule = await this.findApplicableRule(tradeData, customer);

    if (!rule) {
      // بدون کارمزد - استفاده از percentage با مقدار 0
      return {
        amount: 0,
        rate: 0,
        type: 'percentage',
        ruleId: null,
        ruleName: 'بدون کارمزد'
      };
    }

    const commissionAmount = rule.calculateCommission(tradeData.amount);

    // اعمال تخفیف بر اساس دسته مشتری
    let discount = 0;
    const CustomerTier = require('../models/CustomerTier');
    const tierData = await CustomerTier.findOne({ code: customer.tier });

    if (tierData?.benefits?.commissionDiscount) {
      discount = (commissionAmount * tierData.benefits.commissionDiscount) / 100;
    }

    const finalAmount = Math.round(commissionAmount - discount);

    return {
      amount: finalAmount,
      originalAmount: commissionAmount,
      discount,
      rate: rule.rate || 0,
      type: rule.commissionType,
      ruleId: rule._id,
      ruleName: rule.name,
      customerTier: customer.tier,
      tierDiscount: tierData?.benefits?.commissionDiscount || 0
    };
  }

  /**
   * ایجاد قانون کارمزد جدید
   */
  async createRule(ruleData) {
    const rule = await Commission.create(ruleData);
    return rule;
  }

  /**
   * به‌روزرسانی قانون کارمزد
   */
  async updateRule(ruleId, updates) {
    const rule = await Commission.findByIdAndUpdate(ruleId, updates, { new: true });
    return rule;
  }

  /**
   * غیرفعال کردن قانون
   */
  async deactivateRule(ruleId) {
    const rule = await Commission.findByIdAndUpdate(
      ruleId,
      { isActive: false },
      { new: true }
    );
    return rule;
  }

  /**
   * دریافت قوانین صراف
   */
  async getSarafiRules(sarafiId) {
    const rules = await Commission.find({
      $or: [
        { sarafi: sarafiId },
        { sarafi: null }
      ],
      isActive: true
    })
      .populate('currency', 'code nameFa')
      .sort({ priority: -1 });

    return rules;
  }

  /**
   * دریافت همه قوانین (برای ادمین)
   */
  async getAllRules(options = {}) {
    const { isActive, sarafiId, limit = 50, skip = 0 } = options;

    const query = {};
    if (isActive !== undefined) query.isActive = isActive;
    if (sarafiId) query.sarafi = sarafiId;

    const rules = await Commission.find(query)
      .populate('sarafi', 'firstName lastName sarafiInfo.businessName')
      .populate('currency', 'code nameFa')
      .sort({ priority: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Commission.countDocuments(query);

    return { rules, total };
  }

  /**
   * ایجاد قوانین پیش‌فرض
   */
  async initDefaultRules() {
    const existingRules = await Commission.countDocuments();

    if (existingRules > 0) {
      return; // قوانین قبلا ایجاد شده
    }

    const defaultRules = [
      {
        name: 'کارمزد استاندارد خرید',
        description: 'کارمزد پیش‌فرض برای خرید ارز',
        tradeType: 'buy',
        commissionType: 'percentage',
        rate: 0.5,
        minCommission: 50000, // 50 هزار ریال
        priority: 0,
        isActive: true
      },
      {
        name: 'کارمزد استاندارد فروش',
        description: 'کارمزد پیش‌فرض برای فروش ارز',
        tradeType: 'sell',
        commissionType: 'percentage',
        rate: 0.3,
        minCommission: 30000, // 30 هزار ریال
        priority: 0,
        isActive: true
      },
      {
        name: 'کارمزد معاملات بزرگ',
        description: 'کارمزد ویژه برای معاملات بالای 10 میلیارد ریال',
        tradeType: 'both',
        commissionType: 'tiered',
        tiers: [
          { minAmount: 0, maxAmount: 1000000000, rate: 0.5, fixedAmount: 0 },
          { minAmount: 1000000001, maxAmount: 10000000000, rate: 0.3, fixedAmount: 0 },
          { minAmount: 10000000001, maxAmount: null, rate: 0.1, fixedAmount: 0 }
        ],
        conditions: {
          minTradeAmount: 1000000000 // حداقل 1 میلیارد
        },
        priority: 10,
        isActive: true
      }
    ];

    await Commission.insertMany(defaultRules);
  }

  /**
   * پیش‌بینی کارمزد (قبل از انجام معامله)
   */
  async previewCommission(tradeData, customerId) {
    const preview = await this.calculateCommission(tradeData, customerId);

    return {
      ...preview,
      tradeAmount: tradeData.amount,
      netAmount: tradeData.amount - preview.amount,
      message: preview.amount > 0
        ? `کارمزد این معامله ${preview.amount.toLocaleString()} ریال خواهد بود`
        : 'این معامله بدون کارمزد است'
    };
  }
}

module.exports = new CommissionService();
