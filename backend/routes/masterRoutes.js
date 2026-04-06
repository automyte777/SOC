const express = require('express');
const router = express.Router();
const ctrl    = require('../controllers/masterAdminController');
const adsRoutes = require('./adsRoutes');

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

// ── Advertisements ──────────────────────────────────────────────
router.use('/', adsRoutes);

// ── One-time DB Migration (trigger from browser, safe to re-run) ─
router.post('/system/migrate-ads-monetization', async (req, res) => {
  const pool = require('../database/db');
  const results = [];
  let conn;
  try {
    conn = await pool.getConnection();
    const alterations = [
      `ALTER TABLE ads ADD COLUMN IF NOT EXISTS client_name     VARCHAR(255)  DEFAULT NULL`,
      `ALTER TABLE ads ADD COLUMN IF NOT EXISTS client_contact  VARCHAR(50)   DEFAULT NULL`,
      `ALTER TABLE ads ADD COLUMN IF NOT EXISTS price           DECIMAL(10,2) DEFAULT 0.00`,
      `ALTER TABLE ads ADD COLUMN IF NOT EXISTS payment_status  ENUM('pending','paid') DEFAULT 'pending'`,
      `ALTER TABLE ads ADD COLUMN IF NOT EXISTS payment_method  VARCHAR(50)   DEFAULT 'manual'`,
    ];
    for (const sql of alterations) {
      try {
        await conn.query(sql);
        const col = sql.split('ADD COLUMN IF NOT EXISTS')[1]?.trim().split(' ')[0] ?? '?';
        results.push({ col, status: 'added' });
      } catch (e) {
        if (e.message.includes('Duplicate') || e.message.includes('already exists')) {
          const col = sql.split('ADD COLUMN IF NOT EXISTS')[1]?.trim().split(' ')[0] ?? '?';
          results.push({ col, status: 'already_exists' });
        } else throw e;
      }
    }
    // Index
    try {
      await conn.query(`ALTER TABLE ads ADD INDEX idx_payment_status (payment_status)`);
      results.push({ col: 'idx_payment_status', status: 'index_added' });
    } catch (_) {
      results.push({ col: 'idx_payment_status', status: 'index_already_exists' });
    }
    res.json({ success: true, message: 'Ads monetization migration complete.', results });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  } finally {
    if (conn) conn.release();
  }
});

module.exports = router;
