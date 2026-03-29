const express = require('express');
const router  = express.Router();
const authenticateToken = require('../middleware/auth');
const { isAdmin } = require('../middleware/roleMiddleware');
const ctrl = require('../controllers/adminController');

router.use(authenticateToken);
router.use(isAdmin);

// ── RESIDENTS ────────────────────────────────────────────
router.get('/residents',              ctrl.getResidents);
router.post('/residents',             ctrl.createResident);
router.put('/residents/:id',          ctrl.updateResident);
router.delete('/residents/:id',       ctrl.deleteResident);

// ── FLATS ────────────────────────────────────────────────
router.get('/flats',                  ctrl.getFlats);
router.post('/flats',                 ctrl.createFlat);
router.put('/flats/:id',              ctrl.updateFlat);
router.delete('/flats/:id',           ctrl.deleteFlat);

// ── VISITORS ─────────────────────────────────────────────
router.get('/visitors',               ctrl.getVisitors);
router.post('/visitors',              ctrl.createVisitor);
router.put('/visitors/:id',           ctrl.updateVisitor);
router.delete('/visitors/:id',        ctrl.deleteVisitor);

// ── MAINTENANCE ───────────────────────────────────────────
router.get('/maintenance',            ctrl.getMaintenance);
router.post('/maintenance',           ctrl.createMaintenance);
router.put('/maintenance/:id',        ctrl.updateMaintenance);
router.delete('/maintenance/:id',     ctrl.deleteMaintenance);

// ── COMPLAINTS ────────────────────────────────────────────
router.get('/complaints',             ctrl.getComplaints);
router.post('/complaints',            ctrl.createComplaint);
router.put('/complaints/:id',         ctrl.updateComplaint);
router.delete('/complaints/:id',      ctrl.deleteComplaint);

// ── NOTICES (broadcast on create) ─────────────────────────
router.get('/notices',                ctrl.getNotices);
router.post('/notices',               ctrl.createNotice);      // auto-broadcasts to all residents
router.put('/notices/:id',            ctrl.updateNotice);
router.delete('/notices/:id',         ctrl.deleteNotice);

// ── EVENTS ────────────────────────────────────────────────
router.get('/events',                 ctrl.getEvents);
router.post('/events',                ctrl.createEvent);
router.put('/events/:id',             ctrl.updateEvent);
router.delete('/events/:id',          ctrl.deleteEvent);

// ── STAFF ─────────────────────────────────────────────────
router.get('/staff',                  ctrl.getStaff);
router.post('/staff',                 ctrl.createStaff);
router.put('/staff/:id',              ctrl.updateStaff);
router.delete('/staff/:id',           ctrl.deleteStaff);

// ── MEMBER MANAGEMENT ──────────────────────────────────────
router.get('/members',                ctrl.getMembers);
router.put('/members/:id/status',     ctrl.updateMemberStatus);

// ── PARKING ────────────────────────────────────────────────
router.get('/parking',                ctrl.getParking);

// ── AUDIT LOGS ─────────────────────────────────────────────
router.get('/audit-logs',             ctrl.getAuditLogs);

// ── EMERGENCY ALERTS ───────────────────────────────────────
router.get('/emergency',              ctrl.getEmergencyAlerts);
router.put('/emergency/:id/acknowledge', ctrl.acknowledgeEmergency);
router.put('/emergency/:id/resolve',     ctrl.resolveEmergency);

// ── ATTENDANCE ─────────────────────────────────────────────
router.get('/attendance',             ctrl.getAttendance);
router.post('/attendance',            ctrl.markAttendance);

// ── SHIFTS ─────────────────────────────────────────────────
router.get('/shifts',                 ctrl.getStaffShifts);

// ── DELIVERIES (secretary view) ────────────────────────────
router.get('/deliveries',             ctrl.getDeliveries);

module.exports = router;
