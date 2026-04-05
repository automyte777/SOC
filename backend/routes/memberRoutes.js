const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');
const { requireRole, isMember } = require('../middleware/roleMiddleware');
const ctrl = require('../controllers/adminController'); // Reusing GET methods
const memCtrl = require('../controllers/memberController');

// All member routes must be authenticated
router.use(authenticateToken);

// ── FLATS ────────────────────────────────────────────────
// visible to: home_owner, home_member (and admins)
router.get('/flats', requireRole('society_secretary', 'home_owner', 'home_member'), ctrl.getFlats);

// ── VISITORS ─────────────────────────────────────────────
// visible to: tenant, home_owner, home_member (all residents)
router.get('/visitors', isMember, ctrl.getVisitors);

// ── MAINTENANCE ───────────────────────────────────────────
// visible to: home_owner (financials)
router.get('/maintenance', requireRole('society_secretary', 'home_owner'), memCtrl.getMyMaintenance);

// ── COMPLAINTS ────────────────────────────────────────────
// visible to: tenant, home_owner, home_member (anyone can view own complaints usually, but for now we just restrict by role)
router.get('/complaints', isMember, ctrl.getComplaints);
router.post('/complaints', isMember, ctrl.createComplaint); // Tenants/members can create complaints

// ── NOTICES ───────────────────────────────────────────────
// visible to: everyone
router.get('/notices', isMember, ctrl.getNotices);

// ── STAFF ─────────────────────────────────────────────────
// visible to: everyone
router.get('/events', isMember, ctrl.getEvents);

// Advanced Resident Dashboard Actions
router.get('/my-property', isMember, memCtrl.getMyProperty);
router.get('/my-family', isMember, memCtrl.getFamilyMembers);
router.post('/my-family', requireRole('home_owner'), memCtrl.addFamilyMember);
router.get('/my-visitors', isMember, memCtrl.getMyVisitors);
router.post('/my-visitors/pre-approve', isMember, memCtrl.preApproveVisitor);
router.get('/my-maintenance', isMember, memCtrl.getMyMaintenance);
router.get('/my-complaints', isMember, memCtrl.getMyComplaints);
router.post('/my-complaints', isMember, memCtrl.createMyComplaint);
router.get('/my-vehicles', isMember, memCtrl.getMyVehicles);
router.post('/my-vehicles', isMember, memCtrl.createMyVehicle);
router.put('/my-vehicles/:id', isMember, memCtrl.updateMyVehicle);
router.delete('/my-vehicles/:id', isMember, memCtrl.deleteMyVehicle);

// Notifications
router.get('/notifications', isMember, memCtrl.getMyNotifications);
router.put('/notifications/:id/read', isMember, memCtrl.markNotificationRead);

// Security Guard Actions
router.get('/security/visitors', requireRole('security_guard', 'society_secretary'), memCtrl.getSecurityVisitors);
router.post('/security/visitors', requireRole('security_guard', 'society_secretary'), memCtrl.addVisitor);
router.put('/security/visitors/:id/status', requireRole('security_guard', 'society_secretary', 'home_owner', 'tenant', 'home_member'), memCtrl.updateVisitorStatus);

// --- Profile & Settings ---
router.get('/profile', isMember, memCtrl.getProfile);
router.put('/profile', isMember, memCtrl.updateProfile);
router.put('/change-password', isMember, memCtrl.changePassword);
router.put('/settings', isMember, memCtrl.updateSettings);

module.exports = router;
