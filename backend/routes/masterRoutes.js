const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/masterAdminController');

/**
 * Master Admin Auth Middleware
 * Protects all /api/master/* routes with a shared secret.
 * Pass header:  X-Master-Secret: <MASTER_ADMIN_SECRET>
 */
const masterAdminAuth = (req, res, next) => {
  const secret = req.headers['x-master-secret'];
  const expected = process.env.MASTER_ADMIN_SECRET;

  if (!expected) {
    console.error('[MasterAdmin] MASTER_ADMIN_SECRET is not set in .env!');
    return res.status(500).json({ success: false, message: 'Server misconfiguration.' });
  }

  if (!secret || secret !== expected) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized. Invalid or missing master admin secret.'
    });
  }

  next();
};

// Apply auth to all routes in this router
router.use(masterAdminAuth);

// ── Dashboard ──────────────────────────────────────────────────
router.get('/dashboard/stats', ctrl.getDashboardStats.bind(ctrl));

// ── Society Management ──────────────────────────────────────────
router.get('/societies/pending', ctrl.getPendingSocieties.bind(ctrl));
router.get('/societies/all', ctrl.getAllSocieties.bind(ctrl));
router.post('/societies/create', ctrl.createDirectly.bind(ctrl));
router.post('/societies/:id/:action', ctrl.setSocietyStatus.bind(ctrl)); // action = approve, suspend, activate, reject
router.delete('/societies/:id', ctrl.deleteSociety.bind(ctrl));
router.post('/societies/impersonate', ctrl.impersonate.bind(ctrl));

// ── Global User Management ──────────────────────────────────────
router.get('/users/all', ctrl.getGlobalUsers.bind(ctrl));
router.post('/users/toggle', ctrl.toggleUserStatus.bind(ctrl));

// ── Audit Logs ──────────────────────────────────────────────────
router.get('/audit', ctrl.getAuditLogs.bind(ctrl));

// ── Plans & Subscriptions ───────────────────────────────────────
router.get('/plans', ctrl.getPlans.bind(ctrl));
router.put('/plans/:id', ctrl.updatePlan.bind(ctrl));

// ── Billing ─────────────────────────────────────────────────────
router.get('/billing', ctrl.getPayments.bind(ctrl));
router.post('/billing', ctrl.addManualPayment.bind(ctrl));

// ── Tickets ─────────────────────────────────────────────────────
router.get('/tickets', ctrl.getTickets.bind(ctrl));
router.put('/tickets/:id/status', ctrl.updateTicketStatus.bind(ctrl));

// ── Database & System ───────────────────────────────────────────
router.get('/system/databases', ctrl.getDatabases.bind(ctrl));
router.post('/system/backup', ctrl.triggerBackup.bind(ctrl));

// ── Global Settings ─────────────────────────────────────────────
router.get('/settings', ctrl.getSettings.bind(ctrl));
router.post('/settings', ctrl.updateSetting.bind(ctrl));

// ── Announcements ───────────────────────────────────────────────
router.post('/announcements', ctrl.createAnnouncement.bind(ctrl));

module.exports = router;
