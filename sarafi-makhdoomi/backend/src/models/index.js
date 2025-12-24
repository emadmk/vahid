const User = require('./User');
const Currency = require('./Currency');
const Request = require('./Request');
const Settings = require('./Settings');
const Notification = require('./Notification');
// مدل‌های سیستم معاملات
const Wallet = require('./Wallet');
const WalletTransaction = require('./WalletTransaction');
const Trade = require('./Trade');
const MarketOffer = require('./MarketOffer');
const Commission = require('./Commission');
const CustomerTier = require('./CustomerTier');
const SarafiStaff = require('./SarafiStaff');
// مدل‌های جدید - Order Book, Receipt, Spread, AuditLog
const Order = require('./Order');
const Receipt = require('./Receipt');
const Spread = require('./Spread');
const AuditLog = require('./AuditLog');

module.exports = {
  User,
  Currency,
  Request,
  Settings,
  Notification,
  // سیستم معاملات
  Wallet,
  WalletTransaction,
  Trade,
  MarketOffer,
  Commission,
  CustomerTier,
  SarafiStaff,
  // Order Book و وصول
  Order,
  Receipt,
  Spread,
  AuditLog
};
