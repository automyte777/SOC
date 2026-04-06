/**
 * Ads Controller
 * Handles full CRUD for the global `ads` table (master DB).
 * Cloudinary integration with auto-compression via sharp (≤ 3 MB threshold).
 */

const pool = require('../database/db');
const cloudinary = require('cloudinary').v2;
const sharp = require('sharp');

/* ── Cloudinary Config ─────────────────────────────────────────────────── */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MB = 1024 * 1024;
const MAX_SIZE_BEFORE_COMPRESS = 3 * MB; // 3 MB

/* ── Helper: Upload base64 image to Cloudinary (with optional compression) */
async function uploadToCloudinary(base64Data, mimeType = 'image/jpeg') {
  // base64Data is like: "data:image/png;base64,xxxx"  OR pure base64 string
  let rawBase64 = base64Data;
  let detectedMime = mimeType;

  if (base64Data.startsWith('data:')) {
    const parts = base64Data.split(',');
    detectedMime = parts[0].replace('data:', '').replace(';base64', '');
    rawBase64 = parts[1];
  }

  const buffer = Buffer.from(rawBase64, 'base64');
  const sizeBytes = buffer.length;

  let finalBuffer = buffer;

  // Compress if > 3 MB
  if (sizeBytes > MAX_SIZE_BEFORE_COMPRESS) {
    console.log(`[Ads] Image size ${(sizeBytes / MB).toFixed(2)} MB — compressing with sharp...`);
    finalBuffer = await sharp(buffer)
      .resize({ width: 1920, withoutEnlargement: true })
      .jpeg({ quality: 80, progressive: true })
      .toBuffer();
    console.log(`[Ads] Compressed to ${(finalBuffer.length / MB).toFixed(2)} MB`);
    detectedMime = 'image/jpeg';
  }

  // Upload to Cloudinary as a stream
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'smartsoc/ads',
        resource_type: 'image',
        format: 'webp',        // serve as webp for best delivery
        quality: 'auto:good',
        fetch_format: 'auto',
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );
    uploadStream.end(finalBuffer);
  });
}

/* ── Helper: audit log ─────────────────────────────────────────────────── */
const logAudit = async (action, details) => {
  try {
    await pool.query(
      'INSERT INTO audit_logs (action, details) VALUES (?, ?)',
      [action, typeof details === 'object' ? JSON.stringify(details) : details]
    );
  } catch (_) {}
};

/* ═══════════════════════════════════════════════════════════════════════════
   CONTROLLER METHODS
═══════════════════════════════════════════════════════════════════════════ */

/**
 * POST /api/master/ads
 * Create a new ad. Body may include `image_base64` for upload.
 */
exports.createAd = async (req, res) => {
  const {
    title, description, image_base64, image_url,
    cta_link, phone_number,
    society_ids,
    start_date, end_date, is_active = true,
    // Monetization fields
    client_name, client_contact, price = 0,
    payment_status = 'pending', payment_method = 'manual',
  } = req.body;

  try {
    if (!title || !description || !start_date || !end_date) {
      return res.status(400).json({ success: false, message: 'title, description, start_date, end_date are required.' });
    }

    let finalImageUrl = image_url || null;
    if (image_base64) {
      finalImageUrl = await uploadToCloudinary(image_base64);
    }

    const societyIdsJson = JSON.stringify(
      Array.isArray(society_ids) ? society_ids : (society_ids ? [society_ids] : [])
    );

    const [result] = await pool.query(
      `INSERT INTO ads
         (title, description, image_url, cta_link, phone_number, society_ids,
          start_date, end_date, is_active, created_by,
          client_name, client_contact, price, payment_status, payment_method)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title, description, finalImageUrl,
        cta_link || null, phone_number || null, societyIdsJson,
        start_date, end_date, is_active ? 1 : 0, 'master_admin',
        client_name || null, client_contact || null,
        parseFloat(price) || 0, payment_status, payment_method || 'manual',
      ]
    );

    await logAudit('Ad Created', `Ad "${title}" created with id=${result.insertId}`);
    res.status(201).json({ success: true, message: 'Ad created successfully.', adId: result.insertId });
  } catch (err) {
    console.error('[Ads] createAd error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to create ad.' });
  }
};

/**
 * PUT /api/master/ads/:id
 * Update an existing ad.
 */
exports.updateAd = async (req, res) => {
  const { id } = req.params;
  const {
    title, description, image_base64, image_url,
    cta_link, phone_number, society_ids,
    start_date, end_date, is_active,
    // Monetization
    client_name, client_contact, price, payment_status, payment_method,
  } = req.body;

  try {
    const [existing] = await pool.query('SELECT * FROM ads WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Ad not found.' });
    }
    const ex = existing[0];

    let finalImageUrl = image_url !== undefined ? image_url : ex.image_url;
    if (image_base64) {
      finalImageUrl = await uploadToCloudinary(image_base64);
    }

    const societyIdsJson = society_ids !== undefined
      ? JSON.stringify(Array.isArray(society_ids) ? society_ids : [society_ids])
      : ex.society_ids;

    await pool.query(
      `UPDATE ads SET
         title=?, description=?, image_url=?, cta_link=?, phone_number=?,
         society_ids=?, start_date=?, end_date=?, is_active=?,
         client_name=?, client_contact=?, price=?, payment_status=?, payment_method=?
       WHERE id=?`,
      [
        title        ?? ex.title,
        description  ?? ex.description,
        finalImageUrl,
        cta_link     !== undefined ? cta_link     : ex.cta_link,
        phone_number !== undefined ? phone_number : ex.phone_number,
        societyIdsJson,
        start_date   ?? ex.start_date,
        end_date     ?? ex.end_date,
        is_active    !== undefined ? (is_active ? 1 : 0) : ex.is_active,
        client_name  !== undefined ? client_name  : ex.client_name,
        client_contact !== undefined ? client_contact : ex.client_contact,
        price        !== undefined ? parseFloat(price) : ex.price,
        payment_status !== undefined ? payment_status : ex.payment_status,
        payment_method !== undefined ? payment_method : ex.payment_method,
        id,
      ]
    );

    await logAudit('Ad Updated', `Ad id=${id} updated.`);
    res.json({ success: true, message: 'Ad updated successfully.' });
  } catch (err) {
    console.error('[Ads] updateAd error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to update ad.' });
  }
};

/**
 * DELETE /api/master/ads/:id
 */
exports.deleteAd = async (req, res) => {
  const { id } = req.params;
  try {
    const [existing] = await pool.query('SELECT title FROM ads WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Ad not found.' });
    }
    await pool.query('DELETE FROM ads WHERE id = ?', [id]);
    await logAudit('Ad Deleted', `Ad "${existing[0].title}" (id=${id}) deleted.`);
    res.json({ success: true, message: 'Ad deleted.' });
  } catch (err) {
    console.error('[Ads] deleteAd error:', err);
    res.status(500).json({ success: false, message: err.message || 'Failed to delete ad.' });
  }
};

/**
 * GET /api/master/ads
 * Get ALL ads (admin view — no filter).
 */
exports.getAllAds = async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM ads ORDER BY created_at DESC');
    res.json({ success: true, count: rows.length, ads: rows });
  } catch (err) {
    console.error('[Ads] getAllAds error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch ads.' });
  }
};

/**
 * PATCH /api/master/ads/:id/toggle
 * Toggle is_active for a single ad.
 */
exports.toggleAdStatus = async (req, res) => {
  const { id } = req.params;
  try {
    const [existing] = await pool.query('SELECT is_active, title FROM ads WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Ad not found.' });
    const newStatus = existing[0].is_active ? 0 : 1;
    await pool.query('UPDATE ads SET is_active = ? WHERE id = ?', [newStatus, id]);
    await logAudit('Ad Toggled', `Ad "${existing[0].title}" (id=${id}) set to is_active=${newStatus}`);
    res.json({ success: true, is_active: newStatus, message: `Ad ${newStatus ? 'activated' : 'deactivated'}.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/public/ads/active?society_id=<id>
 * Public endpoint — returns active ads filtered by society and date range.
 * Used by resident dashboards.
 */
exports.getActiveAds = async (req, res) => {
  const { society_id } = req.query;

  try {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

    const [rows] = await pool.query(
      `SELECT id, title, description, image_url, cta_link, phone_number, society_ids, start_date, end_date
       FROM ads
       WHERE is_active = 1
         AND start_date <= ?
         AND end_date   >= ?
       ORDER BY created_at DESC`,
      [today, today]
    );

    // Filter by society_id client-side (JSON array check)
    let filtered = rows;
    if (society_id) {
      const sid = String(society_id);
      filtered = rows.filter(ad => {
        try {
          const ids = typeof ad.society_ids === 'string'
            ? JSON.parse(ad.society_ids)
            : ad.society_ids;
          // 'all' means visible to everyone
          return ids.includes('all') || ids.includes(sid) || ids.includes(Number(sid));
        } catch {
          return false;
        }
      });
    }

    res.json({ success: true, count: filtered.length, ads: filtered });
  } catch (err) {
    console.error('[Ads] getActiveAds error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch active ads.' });
  }
};

/* ══════════════════════════════════════════════════════════════════════════
   ANALYTICS
══════════════════════════════════════════════════════════════════════════ */

// In-memory lightweight dedup map: `${ip}-${ad_id}-${event_type}` → timestamp
// Prevents burst spam within the same Node process instance.
// Works well for single-instance servers; for multi-instance use Redis.
const _recentEvents = new Map();
const DEDUP_WINDOW_MS = 10_000; // 10 seconds per IP per ad per event

function _isDuplicate(ip, adId, eventType) {
  const key = `${ip}|${adId}|${eventType}`;
  const last = _recentEvents.get(key);
  const now  = Date.now();
  if (last && now - last < DEDUP_WINDOW_MS) return true;
  _recentEvents.set(key, now);
  // Periodic cleanup — avoid unbounded growth
  if (_recentEvents.size > 5000) {
    for (const [k, v] of _recentEvents) {
      if (now - v > DEDUP_WINDOW_MS * 6) _recentEvents.delete(k);
    }
  }
  return false;
}

/**
 * POST /api/ads/track
 * Body: { ad_id, event_type, society_id, device_type, user_id? }
 * Fire-and-forget safe — always returns 200/202 to keep frontend non-blocking.
 */
exports.trackAdEvent = async (req, res) => {
  // Immediately acknowledge so frontend is never blocked
  res.status(202).json({ success: true });

  try {
    const { ad_id, event_type, society_id, device_type = 'desktop', user_id = null } = req.body;

    // ── Input validation ──────────────────────────────────────────────────
    if (!ad_id || !event_type || !society_id) return;
    if (!['impression', 'click'].includes(event_type))  return;
    if (!['mobile', 'desktop'].includes(device_type))   return;

    const adIdInt      = parseInt(ad_id, 10);
    const societyIdInt = parseInt(society_id, 10);
    if (isNaN(adIdInt) || isNaN(societyIdInt)) return;

    // ── Server-side IP-based dedup (10s window per ip+ad+event) ──────────
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    if (_isDuplicate(ip, adIdInt, event_type)) return;

    // ── Verify ad exists (prevents orphan rows) ───────────────────────────
    const [adRows] = await pool.query('SELECT id FROM ads WHERE id = ?', [adIdInt]);
    if (adRows.length === 0) return;

    // ── Insert analytics event ────────────────────────────────────────────
    await pool.query(
      `INSERT INTO ad_analytics (ad_id, society_id, user_id, event_type, device_type)
       VALUES (?, ?, ?, ?, ?)`,
      [adIdInt, societyIdInt, user_id || null, event_type, device_type]
    );
  } catch (err) {
    // Completely silent — analytics failure must NEVER affect UX
    console.error('[Ads] trackAdEvent error (non-fatal):', err.message);
  }
};

/**
 * GET /api/master/ads/analytics?ad_id=&society_id=&from=&to=
 * Admin endpoint — returns aggregated analytics for ads.
 */
exports.getAdAnalytics = async (req, res) => {
  const { ad_id, society_id, from, to } = req.query;

  try {
    // Build WHERE clauses dynamically
    const conditions = [];
    const params     = [];

    if (ad_id) {
      conditions.push('aa.ad_id = ?');
      params.push(parseInt(ad_id, 10));
    }
    if (society_id) {
      conditions.push('aa.society_id = ?');
      params.push(parseInt(society_id, 10));
    }
    if (from) {
      conditions.push('DATE(aa.created_at) >= ?');
      params.push(from);
    }
    if (to) {
      conditions.push('DATE(aa.created_at) <= ?');
      params.push(to);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    // Aggregated per-ad summary
    const [summary] = await pool.query(
      `SELECT
         aa.ad_id,
         a.title                                                      AS ad_title,
         COUNT(CASE WHEN aa.event_type = 'impression' THEN 1 END)    AS impressions,
         COUNT(CASE WHEN aa.event_type = 'click'      THEN 1 END)    AS clicks,
         COUNT(CASE WHEN aa.device_type = 'mobile'    THEN 1 END)    AS mobile_events,
         COUNT(CASE WHEN aa.device_type = 'desktop'   THEN 1 END)    AS desktop_events,
         ROUND(
           COUNT(CASE WHEN aa.event_type = 'click' THEN 1 END) * 100.0 /
           NULLIF(COUNT(CASE WHEN aa.event_type = 'impression' THEN 1 END), 0),
           2
         )                                                            AS ctr_percent,
         MIN(aa.created_at)                                           AS first_event,
         MAX(aa.created_at)                                           AS last_event
       FROM ad_analytics aa
       LEFT JOIN ads a ON a.id = aa.ad_id
       ${where}
       GROUP BY aa.ad_id, a.title
       ORDER BY impressions DESC`,
      params
    );

    // Daily breakdown
    const [daily] = await pool.query(
      `SELECT
         DATE(aa.created_at)                                          AS date,
         aa.ad_id,
         COUNT(CASE WHEN aa.event_type = 'impression' THEN 1 END)    AS impressions,
         COUNT(CASE WHEN aa.event_type = 'click'      THEN 1 END)    AS clicks
       FROM ad_analytics aa
       ${where}
       GROUP BY DATE(aa.created_at), aa.ad_id
       ORDER BY date DESC`,
      params
    );

    res.json({ success: true, summary, daily });
  } catch (err) {
    console.error('[Ads] getAdAnalytics error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics.' });
  }
};

/* ──────────────────────────────────────────────────────────────────────────
   ADMIN ANALYTICS  (Master-admin protected — called via /api/master/ads/...)
────────────────────────────────────────────────────────────────────────── */

/**
 * GET /api/master/ads/analytics/overview
 * Top-level KPIs: total ads, total impressions, total clicks, avg CTR,
 * plus a 30-day daily time-series for the trend charts.
 * Query params: from, to, society_id, ad_id (all optional)
 */
exports.getAnalyticsOverview = async (req, res) => {
  const { from, to, society_id, ad_id } = req.query;
  try {
    const conds  = [];
    const params = [];

    if (from)      { conds.push('DATE(aa.created_at) >= ?'); params.push(from); }
    if (to)        { conds.push('DATE(aa.created_at) <= ?'); params.push(to);   }
    if (society_id){ conds.push('aa.society_id = ?');        params.push(parseInt(society_id, 10)); }
    if (ad_id)     { conds.push('aa.ad_id = ?');             params.push(parseInt(ad_id, 10)); }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    // ── KPI totals ──────────────────────────────────────────────────────────
    const [[kpi]] = await pool.query(
      `SELECT
         COUNT(DISTINCT aa.ad_id)                                          AS total_ads_tracked,
         COUNT(CASE WHEN aa.event_type = 'impression' THEN 1 END)         AS total_impressions,
         COUNT(CASE WHEN aa.event_type = 'click'      THEN 1 END)        AS total_clicks,
         ROUND(
           COUNT(CASE WHEN aa.event_type = 'click' THEN 1 END) * 100.0 /
           NULLIF(COUNT(CASE WHEN aa.event_type = 'impression' THEN 1 END), 0), 2
         )                                                                 AS avg_ctr,
         COUNT(CASE WHEN aa.device_type = 'mobile'  THEN 1 END)          AS mobile_events,
         COUNT(CASE WHEN aa.device_type = 'desktop' THEN 1 END)          AS desktop_events
       FROM ad_analytics aa
       ${where}`,
      params
    );

    // Total active ads (unfiltered)
    const [[{ total_ads }]] = await pool.query(
      `SELECT COUNT(*) AS total_ads FROM ads WHERE is_active = 1`
    );

    // ── 30-day daily time-series ────────────────────────────────────────────
    const dailyConds  = [...conds];
    const dailyParams = [...params];
    // Default to last 30 days if no date filter
    if (!from && !to) {
      dailyConds.push('aa.created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)');
    }
    const dailyWhere = dailyConds.length ? `WHERE ${dailyConds.join(' AND ')}` : '';

    const [daily] = await pool.query(
      `SELECT
         DATE(aa.created_at)                                               AS date,
         COUNT(CASE WHEN aa.event_type = 'impression' THEN 1 END)         AS impressions,
         COUNT(CASE WHEN aa.event_type = 'click'      THEN 1 END)         AS clicks
       FROM ad_analytics aa
       ${dailyWhere}
       GROUP BY DATE(aa.created_at)
       ORDER BY date ASC`,
      dailyParams
    );

    res.json({
      success: true,
      kpi: { ...kpi, total_ads },
      daily,
    });
  } catch (err) {
    console.error('[Ads] getAnalyticsOverview error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch overview.' });
  }
};

/**
 * GET /api/master/ads/analytics/per-ad
 * Per-ad breakdown: impressions, clicks, CTR, device split, active status.
 * Query params: from, to, society_id (all optional)
 */
exports.getPerAdAnalytics = async (req, res) => {
  const { from, to, society_id } = req.query;
  try {
    const conds  = [];
    const params = [];

    if (from)       { conds.push('DATE(aa.created_at) >= ?'); params.push(from); }
    if (to)         { conds.push('DATE(aa.created_at) <= ?'); params.push(to);   }
    if (society_id) { conds.push('aa.society_id = ?');        params.push(parseInt(society_id, 10)); }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT
         a.id                                                               AS ad_id,
         a.title,
         a.is_active,
         a.start_date,
         a.end_date,
         COUNT(CASE WHEN aa.event_type = 'impression' THEN 1 END)          AS impressions,
         COUNT(CASE WHEN aa.event_type = 'click'      THEN 1 END)          AS clicks,
         COUNT(CASE WHEN aa.device_type = 'mobile'    THEN 1 END)          AS mobile_events,
         COUNT(CASE WHEN aa.device_type = 'desktop'   THEN 1 END)          AS desktop_events,
         ROUND(
           COUNT(CASE WHEN aa.event_type = 'click' THEN 1 END) * 100.0 /
           NULLIF(COUNT(CASE WHEN aa.event_type = 'impression' THEN 1 END), 0), 2
         )                                                                   AS ctr
       FROM ads a
       LEFT JOIN ad_analytics aa ON aa.ad_id = a.id ${conds.length ? 'AND ' + conds.join(' AND ') : ''}
       GROUP BY a.id, a.title, a.is_active, a.start_date, a.end_date
       ORDER BY impressions DESC`,
      params
    );

    res.json({ success: true, ads: rows });
  } catch (err) {
    console.error('[Ads] getPerAdAnalytics error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch per-ad analytics.' });
  }
};

/**
 * GET /api/master/ads/analytics/society
 * Society-wise breakdown: which society sees/clicks the most ads.
 * Query params: from, to, ad_id (all optional)
 */
exports.getSocietyAnalytics = async (req, res) => {
  const { from, to, ad_id } = req.query;
  try {
    const conds  = [];
    const params = [];

    if (from)  { conds.push('DATE(aa.created_at) >= ?'); params.push(from); }
    if (to)    { conds.push('DATE(aa.created_at) <= ?'); params.push(to);   }
    if (ad_id) { conds.push('aa.ad_id = ?');             params.push(parseInt(ad_id, 10)); }

    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const [rows] = await pool.query(
      `SELECT
         aa.society_id,
         s.name                                                             AS society_name,
         COUNT(CASE WHEN aa.event_type = 'impression' THEN 1 END)         AS impressions,
         COUNT(CASE WHEN aa.event_type = 'click'      THEN 1 END)         AS clicks,
         COUNT(CASE WHEN aa.device_type = 'mobile'    THEN 1 END)         AS mobile_events,
         ROUND(
           COUNT(CASE WHEN aa.event_type = 'click' THEN 1 END) * 100.0 /
           NULLIF(COUNT(CASE WHEN aa.event_type = 'impression' THEN 1 END), 0), 2
         )                                                                  AS ctr
       FROM ad_analytics aa
       LEFT JOIN societies s ON s.id = aa.society_id
       ${where}
       GROUP BY aa.society_id, s.name
       ORDER BY impressions DESC
       LIMIT 50`,
      params
    );

    res.json({ success: true, societies: rows });
  } catch (err) {
    console.error('[Ads] getSocietyAnalytics error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch society analytics.' });
  }
};

/* ══════════════════════════════════════════════════════════════════════════
   MONETIZATION  (Master-admin protected)
══════════════════════════════════════════════════════════════════════════ */

/**
 * PATCH /api/master/ads/:id/payment
 * Body: { payment_status: 'paid'|'pending', payment_method?: string }
 * Marks an ad as paid or pending. Optionally enforces paid-only live rule.
 */
exports.updatePaymentStatus = async (req, res) => {
  const { id } = req.params;
  const { payment_status, payment_method } = req.body;

  if (!['paid', 'pending'].includes(payment_status)) {
    return res.status(400).json({ success: false, message: 'payment_status must be "paid" or "pending".' });
  }

  try {
    const [existing] = await pool.query('SELECT id, title, is_active FROM ads WHERE id = ?', [id]);
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Ad not found.' });

    const updates = { payment_status };
    if (payment_method) updates.payment_method = payment_method;

    await pool.query(
      `UPDATE ads SET payment_status = ?, payment_method = COALESCE(?, payment_method) WHERE id = ?`,
      [payment_status, payment_method || null, id]
    );

    await logAudit(
      'Ad Payment Updated',
      `Ad "${existing[0].title}" (id=${id}) marked as ${payment_status} via ${payment_method || 'manual'}`
    );

    res.json({ success: true, message: `Ad marked as ${payment_status}.`, id: Number(id), payment_status });
  } catch (err) {
    console.error('[Ads] updatePaymentStatus error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * GET /api/master/ads/revenue/overview
 * KPIs: total revenue, paid count, pending count, pending value,
 *        total ads with monetization data, revenue this month.
 * Query params: from, to (optional)
 */
exports.getRevenueOverview = async (req, res) => {
  const { from, to } = req.query;
  try {
    const conds  = [];
    const params = [];
    if (from) { conds.push('DATE(created_at) >= ?'); params.push(from); }
    if (to)   { conds.push('DATE(created_at) <= ?'); params.push(to); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';

    const [[kpi]] = await pool.query(
      `SELECT
         COUNT(*)                                             AS total_ads,
         SUM(CASE WHEN payment_status = 'paid'    THEN 1 ELSE 0 END) AS paid_count,
         SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) AS pending_count,
         COALESCE(SUM(CASE WHEN payment_status = 'paid'    THEN price ELSE 0 END), 0) AS total_revenue,
         COALESCE(SUM(CASE WHEN payment_status = 'pending' THEN price ELSE 0 END), 0) AS pending_revenue,
         COALESCE(SUM(CASE WHEN payment_status = 'paid'
           AND DATE_FORMAT(created_at,'%Y-%m') = DATE_FORMAT(NOW(),'%Y-%m')
           THEN price ELSE 0 END), 0)                        AS revenue_this_month
       FROM ads
       ${where}`,
      params
    );

    // Recent paid ads (last 10)
    const [recent] = await pool.query(
      `SELECT id, title, client_name, client_contact, price, payment_status, payment_method, created_at
       FROM ads
       WHERE payment_status = 'paid'
       ORDER BY created_at DESC
       LIMIT 10`
    );

    res.json({ success: true, kpi, recent });
  } catch (err) {
    console.error('[Ads] getRevenueOverview error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch revenue overview.' });
  }
};

/**
 * GET /api/master/ads/revenue/monthly
 * Monthly revenue breakdown for the past 12 months.
 */
exports.getRevenueByMonth = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT
         DATE_FORMAT(created_at, '%Y-%m')                    AS month,
         COUNT(*)                                             AS total_ads,
         SUM(CASE WHEN payment_status='paid' THEN 1 ELSE 0 END)  AS paid_ads,
         COALESCE(SUM(CASE WHEN payment_status='paid' THEN price ELSE 0 END), 0) AS revenue
       FROM ads
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 12 MONTH)
       GROUP BY DATE_FORMAT(created_at, '%Y-%m')
       ORDER BY month ASC`
    );
    res.json({ success: true, monthly: rows });
  } catch (err) {
    console.error('[Ads] getRevenueByMonth error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch monthly revenue.' });
  }
};

/**
 * GET /api/master/ads/revenue/society
 * Revenue breakdown per society (using society_ids JSON field).
 * Note: For ads with society_ids = ['all'], we credit them to 'All Societies'.
 */
exports.getRevenueBySociety = async (req, res) => {
  try {
    // Fetch all monetized ads with their society_ids
    const [ads] = await pool.query(
      `SELECT id, title, price, payment_status, payment_method, client_name, society_ids, created_at
       FROM ads
       WHERE price > 0
       ORDER BY created_at DESC`
    );

    // Fetch society names map
    const [societies] = await pool.query('SELECT id, name FROM societies');
    const socMap = {};
    societies.forEach(s => { socMap[String(s.id)] = s.name; });

    // Group revenue by society
    const revenueMap = {};
    for (const ad of ads) {
      let ids = [];
      try {
        ids = typeof ad.society_ids === 'string' ? JSON.parse(ad.society_ids) : (ad.society_ids || []);
      } catch (_) {}

      const label = ids.includes('all') ? 'All Societies'
        : ids.map(id => socMap[String(id)] || `Society #${id}`).join(', ') || 'Unassigned';

      if (!revenueMap[label]) {
        revenueMap[label] = { society: label, total_ads: 0, paid_ads: 0, pending_ads: 0, revenue: 0, pending_revenue: 0 };
      }
      revenueMap[label].total_ads++;
      if (ad.payment_status === 'paid') {
        revenueMap[label].paid_ads++;
        revenueMap[label].revenue += parseFloat(ad.price) || 0;
      } else {
        revenueMap[label].pending_ads++;
        revenueMap[label].pending_revenue += parseFloat(ad.price) || 0;
      }
    }

    const result = Object.values(revenueMap).sort((a, b) => b.revenue - a.revenue);
    res.json({ success: true, societies: result, all_ads: ads });
  } catch (err) {
    console.error('[Ads] getRevenueBySociety error:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch society revenue.' });
  }
};
