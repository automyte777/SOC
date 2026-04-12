const express  = require('express');
const router   = express.Router();
const ctrl     = require('../controllers/dashboardController');
const auth     = require('../middleware/auth');

// ── SSE Stream — no auth middleware; token verified inside controller ─────────
// EventSource API cannot set custom headers, so token is passed as query param.
router.get('/stream', ctrl.streamDashboard);

// ── All other dashboard routes require a valid JWT ────────────────────────────
router.use(auth);

// Core stats (cached 30 s)
router.get('/stats',       ctrl.getStats);

// Activity feed (always fresh — no cache)
router.get('/activity',    ctrl.getActivity);

// Chart data (cached 60 s)
router.get('/charts',      ctrl.getChartData);

// ── New separated partial-update endpoints ────────────────────────────────────
// Ads lightweight list (cached 30 s)
router.get('/ads',         ctrl.getAds);

// Analytics counters (cached 30 s)
router.get('/analytics',   ctrl.getAnalytics);

// Maintenance summary for a given month (cached 30 s per month/status combo)
router.get('/maintenance', ctrl.getMaintenanceSummary);

module.exports = router;
