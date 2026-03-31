const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const { requireRole, isMember } = require('../middleware/roleMiddleware');
const ctrl = require('../controllers/gatePassController');

// All endpoints require authentication
router.use(authenticateToken);

// Resident functionality
router.post('/create-pass', isMember, ctrl.createPass);
router.get('/my-passes', isMember, ctrl.getMyPasses);

// Security functionality
router.get('/verify-pass', requireRole('security_guard', 'society_secretary'), ctrl.verifyPass);
router.post('/allow-entry', requireRole('security_guard', 'society_secretary'), ctrl.allowEntry);

module.exports = router;
