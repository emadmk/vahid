const express = require('express');
const router = express.Router();
const {
  createRequest,
  getMyRequests,
  getRequest,
  cancelRequest,
  getPublicRequests,
  getSarafiRequests,
  setRequestVisibility,
  acceptPublicRequest,
  setInProgress,
  completeRequest,
  rejectRequest,
  getAllRequests,
  getRequestStats
} = require('../controllers/requestController');
const { protect, authorize, requireApproved } = require('../middlewares/auth');

// روت‌های عمومی (برای کاربران تایید شده)
router.get('/public', protect, requireApproved, getPublicRequests);

// روت‌های کاربر
router.post('/', protect, requireApproved, createRequest);
router.get('/my', protect, getMyRequests);
router.get('/:id', protect, getRequest);
router.put('/:id/cancel', protect, cancelRequest);

// روت‌های صراف
router.get('/sarafi/list', protect, authorize('sarafi', 'admin'), getSarafiRequests);
router.put('/:id/visibility', protect, authorize('sarafi', 'admin'), setRequestVisibility);
router.put('/:id/accept', protect, authorize('sarafi', 'admin'), acceptPublicRequest);
router.put('/:id/in-progress', protect, authorize('sarafi', 'admin'), setInProgress);
router.put('/:id/complete', protect, authorize('sarafi', 'admin'), completeRequest);

// روت‌های ادمین
router.get('/admin/all', protect, authorize('admin'), getAllRequests);
router.get('/admin/stats', protect, authorize('admin'), getRequestStats);
router.put('/:id/reject', protect, authorize('admin'), rejectRequest);

module.exports = router;
