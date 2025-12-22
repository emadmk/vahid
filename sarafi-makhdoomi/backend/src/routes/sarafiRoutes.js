const express = require('express');
const router = express.Router();
const {
  getProfile,
  updateProfile,
  getMyCustomers,
  approveCustomer,
  unknownCustomer,
  rejectCustomer,
  getDashboard,
  getStats
} = require('../controllers/sarafiController');
const { protect, authorize } = require('../middlewares/auth');

// همه روت‌ها نیاز به صراف دارند
router.use(protect, authorize('sarafi', 'admin'));

// پروفایل
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// داشبورد
router.get('/dashboard', getDashboard);
router.get('/stats', getStats);

// مدیریت مشتریان
router.get('/customers', getMyCustomers);
router.put('/customers/:id/approve', approveCustomer);
router.put('/customers/:id/unknown', unknownCustomer);
router.put('/customers/:id/reject', rejectCustomer);

module.exports = router;
