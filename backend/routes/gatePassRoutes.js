const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const { requireRole, isMember } = require('../middleware/roleMiddleware');
const ctrl = require('../controllers/gatePassController');

// Public functionality (for img src tags to load directly without auth header)
router.get('/qr/:code', ctrl.serveQrCode);

// All endpoints require authentication
router.use(authenticateToken);

// Resident functionality
router.post('/create-pass', isMember, ctrl.createPass);
router.get('/my-passes', isMember, ctrl.getMyPasses);

// Security functionality
router.get('/verify-pass', requireRole('security_guard', 'Security', 'staff', 'society_secretary'), ctrl.verifyPass);
router.post('/allow-entry', requireRole('security_guard', 'Security', 'staff', 'society_secretary'), ctrl.allowEntry);

module.exports = router;
