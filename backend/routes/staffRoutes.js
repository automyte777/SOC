/**
 * staffRoutes.js — /api/staff
 * All security/staff operations including advanced VMS features.
 */
const express   = require('express');
const router    = express.Router();
const rateLimit = require('express-rate-limit');
const { authenticateStaff } = require('../middleware/staffMiddleware');
const ctrl = require('../controllers/staffController');

const loginLimiter = rateLimit({ windowMs: 15*60*1000, max: 10, message: { success: false, message: 'Too many login attempts.' } });

// ── PUBLIC ─────────────────────────────────────────────────────────────────
router.post('/login', loginLimiter, ctrl.login);

// ── PROTECTED ──────────────────────────────────────────────────────────────
router.use(authenticateStaff);

// Visitors (VMS)
router.get('/visitors/stats',          ctrl.getVisitorStats);
router.get('/visitors',                ctrl.getVisitors);
router.post('/visitors',               ctrl.addVisitor);
router.put('/visitors/:id/status',     ctrl.updateVisitorStatus);

// Deliveries
router.get('/deliveries',              ctrl.getDeliveries);
router.post('/deliveries',             ctrl.addDelivery);
router.put('/deliveries/:id/status',   ctrl.updateDeliveryStatus);

// Emergency Alerts
router.get('/emergency',               ctrl.getEmergencyAlerts);
router.post('/emergency',              ctrl.raiseEmergencyAlert);
router.put('/emergency/:id/resolve',   ctrl.resolveEmergencyAlert);

// Shift Management
router.post('/shift/clock-out',        ctrl.clockOut);
router.get('/shift/my-shifts',         ctrl.getMyShifts);

// Gate Passes (QR)
router.get('/gate-passes',             ctrl.getGatePasses);
router.post('/gate-passes',            ctrl.createGatePass);
router.post('/gate-passes/scan',       ctrl.scanGatePass);

// Daily Logs
router.get('/daily-logs',              ctrl.getDailyLogs);
router.post('/daily-logs',             ctrl.addDailyLog);

// Audit Logs (security can view their own)
router.get('/audit-logs',              ctrl.getAuditLogs);

// Flat directory
router.get('/flats',                   ctrl.getFlatsForStaff);

module.exports = router;
