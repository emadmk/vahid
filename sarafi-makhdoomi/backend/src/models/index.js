const User = require('./User');
const Currency = require('./Currency');
const Request = require('./Request');
const Settings = require('./Settings');
const Notification = require('./Notification');
// مدل‌های جدید سیستم معاملات
const Wallet = require('./Wallet');
const WalletTransaction = require('./WalletTransaction');
const Trade = require('./Trade');
const MarketOffer = require('./MarketOffer');
const Commission = require('./Commission');
const CustomerTier = require('./CustomerTier');
const SarafiStaff = require('./SarafiStaff');

module.exports = {
  User,
  Currency,
  Request,
  Settings,
  Notification,
  // مدل‌های جدید
  Wallet,
  WalletTransaction,
  Trade,
  MarketOffer,
  Commission,
  CustomerTier,
  SarafiStaff
};
