/**
 * Optimised Dashboard Controller
 *
 * Provides:
 *  GET /api/dashboard/stats        – cached summary stats (30 s TTL)
 *  GET /api/dashboard/activity     – recent activity feed
 *  GET /api/dashboard/charts       – chart data (60 s TTL)
 *  GET /api/dashboard/ads          – active ads lightweight list
 *  GET /api/dashboard/analytics    – ad analytics counters (30 s TTL)
 *  GET /api/dashboard/maintenance  – maintenance summary (30 s TTL)
 *  GET /api/stream/dashboard       – SSE real-time stream
 *
 * All heavy queries use indexed fields and return ONLY required columns.
 * Cache is invalidated by the SSE emitter on data mutations.
 */

const cache  = require('../services/cacheService');
const sse    = require('../services/sseManager');
const jwt    = require('jsonwebtoken');

// ─── helpers ─────────────────────────────────────────────────────────────────

function tenantKey(req) {
  return req.tenant?.dbName || req.tenantDB?.pool?.config?.connectionConfig?.database || 'default';
}

function cacheKey(req, suffix) {
  return `${tenantKey(req)}_${suffix}`;
}

// ─── Summary Stats ────────────────────────────────────────────────────────────

async function getStats(req, res) {
  try {
    const db = req.tenantDB;
    if (!db) return res.status(400).json({ success: false, message: 'Tenant context required.' });

    const key = cacheKey(req, 'stats');
    const stats = await cache.wrap(key, async () => {
      const [[flats], [residents], [visitorsToday], [maintenanceDue], [monthlyCollection]] =
        await Promise.all([
          db.query('SELECT COUNT(*) AS count FROM flats'),
          db.query('SELECT COUNT(*) AS count FROM residents'),
          db.query('SELECT COUNT(*) AS count FROM visitors WHERE DATE(entry_time) = CURDATE()'),
          db.query("SELECT COUNT(*) AS count FROM maintenance WHERE status = 'pending'"),
          db.query(
            "SELECT COALESCE(SUM(amount), 0) AS total FROM maintenance WHERE status = 'paid' AND MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())"
          ),
        ]);
      return {
        total_flats:        flats[0].count,
        total_residents:    residents[0].count,
        visitors_today:     visitorsToday[0].count,
        maintenance_due:    maintenanceDue[0].count,
        monthly_collection: parseFloat(monthlyCollection[0].total) || 0,
      };
    }, 30);

    res.json({ success: true, stats, cached: true });
  } catch (err) {
    console.error('[Dashboard] getStats error:', err.message);
    res.status(500).json({ success: false, message: 'Error fetching statistics.' });
  }
}

// ─── Activity Feed ────────────────────────────────────────────────────────────

async function getActivity(req, res) {
  try {
    const db = req.tenantDB;
    if (!db) return res.status(400).json({ success: false, message: 'Tenant context required.' });

    const [visitorLogs]     = await db.query("SELECT entry_time AS time, CONCAT('Visitor Entry: ', visitor_name) AS event, 'System' AS user FROM visitors ORDER BY entry_time DESC LIMIT 5");
    const [complaintLogs]   = await db.query("SELECT created_at AS time, CONCAT('New Complaint: ', title) AS event, 'Resident' AS user FROM complaints ORDER BY created_at DESC LIMIT 5");
    const [maintenanceLogs] = await db.query("SELECT created_at AS time, 'Maintenance Bill Generated' AS event, 'Admin' AS user FROM maintenance ORDER BY created_at DESC LIMIT 5");

    const activity = [...visitorLogs, ...complaintLogs, ...maintenanceLogs]
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 10);

    res.json({ success: true, activity });
  } catch (err) {
    console.error('[Dashboard] getActivity error:', err.message);
    res.status(500).json({ success: false, message: 'Error fetching activity.' });
  }
}

// ─── Chart Data ───────────────────────────────────────────────────────────────

async function getChartData(req, res) {
  try {
    const db = req.tenantDB;
    if (!db) return res.status(400).json({ success: false, message: 'Tenant context required.' });

    const key = cacheKey(req, 'charts');
    const charts = await cache.wrap(key, async () => {
      const [[visitorTrend], [maintenanceTrend]] = await Promise.all([
        db.query("SELECT DATE(entry_time) AS date, COUNT(*) AS count FROM visitors WHERE entry_time >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) GROUP BY DATE(entry_time) ORDER BY date ASC"),
        db.query("SELECT DATE_FORMAT(created_at, '%b %Y') AS month, SUM(amount) AS total FROM maintenance WHERE status = 'paid' GROUP BY month ORDER BY MIN(created_at) ASC LIMIT 6"),
      ]);
      return { visitorTrend, maintenanceTrend };
    }, 60);

    res.json({ success: true, charts });
  } catch (err) {
    console.error('[Dashboard] getChartData error:', err.message);
    res.status(500).json({ success: false, message: 'Error fetching chart data.' });
  }
}

// ─── Ads (lightweight) ────────────────────────────────────────────────────────

async function getAds(req, res) {
  try {
    const db = req.tenantDB;
    if (!db) return res.status(400).json({ success: false, message: 'Tenant context required.' });

    const key = cacheKey(req, 'ads');
    const ads = await cache.wrap(key, async () => {
      const [rows] = await db.query(
        "SELECT id, title, image_url, link_url, status, impressions, clicks FROM ads WHERE status = 'active' ORDER BY created_at DESC LIMIT 10"
      ).catch(() => [[]]);
      return rows;
    }, 30);

    res.json({ success: true, ads });
  } catch (err) {
    console.error('[Dashboard] getAds error:', err.message);
    res.status(500).json({ success: false, ads: [] });
  }
}

// ─── Analytics counters ───────────────────────────────────────────────────────

async function getAnalytics(req, res) {
  try {
    const db = req.tenantDB;
    if (!db) return res.status(400).json({ success: false, message: 'Tenant context required.' });

    const key = cacheKey(req, 'analytics');
    const analytics = await cache.wrap(key, async () => {
      const [[counters]] = await db.query(
        "SELECT COALESCE(SUM(impressions), 0) AS total_views, COALESCE(SUM(clicks), 0) AS total_clicks FROM ads"
      ).catch(() => [[{ total_views: 0, total_clicks: 0 }]]);
      return {
        total_views:  Number(counters[0].total_views),
        total_clicks: Number(counters[0].total_clicks),
      };
    }, 30);

    res.json({ success: true, analytics });
  } catch (err) {
    console.error('[Dashboard] getAnalytics error:', err.message);
    res.status(500).json({ success: false, analytics: { total_views: 0, total_clicks: 0 } });
  }
}

// ─── Maintenance summary (separate endpoint for partial update) ───────────────

async function getMaintenanceSummary(req, res) {
  try {
    const db = req.tenantDB;
    if (!db) return res.status(400).json({ success: false, message: 'Tenant context required.' });

    const { month = new Date().toISOString().slice(0, 7), status = '' } = req.query;
    const key = cacheKey(req, `maint_${month}_${status}`);

    const data = await cache.wrap(key, async () => {
      const [[statsRow]] = await db.query(
        `SELECT
          COUNT(*) AS totalFlats,
          SUM(status = 'Paid') AS paidMembers,
          SUM(status != 'Paid') AS unpaidMembers,
          COALESCE(SUM(CASE WHEN status = 'Paid' THEN amount ELSE 0 END), 0) AS totalCollected,
          COALESCE(SUM(CASE WHEN status != 'Paid' THEN amount ELSE 0 END), 0) AS totalPending
        FROM maintenance
        WHERE DATE_FORMAT(created_at, '%Y-%m') = ?`,
        [month]
      );
      return {
        totalFlats:      Number(statsRow[0].totalFlats),
        paidMembers:     Number(statsRow[0].paidMembers),
        unpaidMembers:   Number(statsRow[0].unpaidMembers),
        totalCollected:  parseFloat(statsRow[0].totalCollected) || 0,
        totalPending:    parseFloat(statsRow[0].totalPending)   || 0,
      };
    }, 30);

    res.json({ success: true, data });
  } catch (err) {
    console.error('[Dashboard] getMaintenanceSummary error:', err.message);
    res.status(500).json({ success: false, message: 'Error fetching maintenance summary.' });
  }
}

// ─── SSE Stream ───────────────────────────────────────────────────────────────

async function streamDashboard(req, res) {
  // Authenticate via query param token (EventSource can't set headers)
  let decoded;
  try {
    const token = req.query.token;
    if (!token) throw new Error('No token');
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ success: false, message: 'Unauthorised.' });
  }

  // SSE headers — disable all buffering
  res.set({
    'Content-Type':  'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection':    'keep-alive',
    'X-Accel-Buffering': 'no',   // Nginx
  });
  res.flushHeaders();

  const tk = req.tenant?.dbName || decoded.society_id || 'default';
  sse.addClient(tk, res);

  // Send an initial "connected" event immediately
  res.write(`event: connected\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);

  // Clean up on disconnect
  req.on('close', () => {
    sse.removeClient(tk, res);
  });
}

module.exports = {
  getStats,
  getActivity,
  getChartData,
  getAds,
  getAnalytics,
  getMaintenanceSummary,
  streamDashboard,
};
