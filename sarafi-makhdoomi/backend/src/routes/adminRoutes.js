const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  approveUser,
  rejectUser,
  suspendUser,
  changeUserRole,
  updateUser,
  deleteUser,
  getCurrencies,
  createCurrency,
  updateCurrency,
  deleteCurrency,
  updateRates,
  getSettings,
  updateSettings,
  getDashboardStats,
  getSarafiList,
  getUnknownUsers
} = require('../controllers/adminController');
const { protect, authorize } = require('../middlewares/auth');

// همه روت‌ها نیاز به ادمین دارند
router.use(protect, authorize('admin'));

// داشبورد
router.get('/dashboard', getDashboardStats);

// مدیریت کاربران
router.get('/users', getUsers);
router.get('/users/unknown', getUnknownUsers);
router.get('/users/:id', getUser);
router.put('/users/:id', updateUser);
router.put('/users/:id/approve', approveUser);
router.put('/users/:id/reject', rejectUser);
router.put('/users/:id/suspend', suspendUser);
router.put('/users/:id/role', changeUserRole);
router.delete('/users/:id', deleteUser);

// مدیریت ارزها
router.get('/currencies', getCurrencies);
router.post('/currencies', createCurrency);
router.put('/currencies/:id', updateCurrency);
router.delete('/currencies/:id', deleteCurrency);
router.put('/currencies/rates/batch', updateRates);

// تنظیمات
router.get('/settings', getSettings);
router.put('/settings', updateSettings);

module.exports = router;

// روت عمومی برای لیست صراف‌ها
const publicRouter = express.Router();
publicRouter.get('/sarafis', getSarafiList);

module.exports.publicRouter = publicRouter;
