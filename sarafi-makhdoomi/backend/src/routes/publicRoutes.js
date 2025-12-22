const express = require('express');
const router = express.Router();
const Currency = require('../models/Currency');
const Settings = require('../models/Settings');
const User = require('../models/User');

// دریافت نرخ ارزها (عمومی)
router.get('/rates', async (req, res, next) => {
  try {
    const currencies = await Currency.find({ isActive: true })
      .select('name nameFa symbol code buyRate sellRate type unit lastRateUpdate')
      .sort({ order: 1 });

    res.status(200).json({
      success: true,
      data: currencies
    });
  } catch (error) {
    next(error);
  }
});

// دریافت تنظیمات عمومی
router.get('/settings', async (req, res, next) => {
  try {
    const settings = await Settings.getSettings();

    // فقط اطلاعات عمومی
    res.status(200).json({
      success: true,
      data: {
        siteName: settings.siteName,
        siteDescription: settings.siteDescription,
        siteLogo: settings.siteLogo,
        contactPhone: settings.contactPhone,
        contactEmail: settings.contactEmail,
        contactAddress: settings.contactAddress,
        workingHours: settings.workingHours,
        socialMedia: settings.socialMedia,
        customTexts: {
          welcomeMessage: settings.customTexts?.welcomeMessage,
          aboutUs: settings.customTexts?.aboutUs
        },
        maintenanceMode: settings.maintenanceMode
      }
    });
  } catch (error) {
    next(error);
  }
};

// لیست صراف‌ها برای ثبت‌نام
router.get('/sarafis', async (req, res, next) => {
  try {
    const sarafis = await User.find({ role: 'sarafi', status: 'approved' })
      .select('firstName lastName sarafiInfo.businessName sarafiInfo.description');

    res.status(200).json({
      success: true,
      data: sarafis
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
