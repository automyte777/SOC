const express = require('express');
const router = express.Router();
const maintenanceController = require('../controllers/maintenanceController');
const authenticateToken = require('../middleware/auth');
const tenantResolver = require('../middleware/tenantResolver');

// Apply auth and tenant resolution to all routes
router.use(authenticateToken);
router.use(tenantResolver);

// ─────────────────────────────────────────────
// ROLE: SECRETARY (Admin)
// ─────────────────────────────────────────────
router.get('/admin/config', maintenanceController.getConfig);
router.post('/admin/config', maintenanceController.setConfig);
router.get('/admin/dashboard-stats', maintenanceController.getDashboardStats);
router.get('/admin/list', maintenanceController.getMaintenanceList);

router.post('/admin/extra-charges', maintenanceController.addExtraCharge);
router.get('/admin/extra-charges', maintenanceController.getExtraChargesOverview);


// ─────────────────────────────────────────────
// ROLE: MEMBER (Home Owner / Tenant)
// ─────────────────────────────────────────────
router.get('/member/my-maintenance', maintenanceController.getMemberMaintenance);
router.get('/member/my-extra-charges', maintenanceController.getMemberExtraCharges);

// Payment Simulations (Initiate)
router.post('/member/pay-maintenance/:id', maintenanceController.payMaintenance);
router.post('/member/pay-extra-charge/:assignment_id', maintenanceController.payExtraCharge);

module.exports = router;
