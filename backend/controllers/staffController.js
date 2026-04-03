/**
 * staffController.js — Full VMS + Advanced Society Features
 * Covers: Visitors, Deliveries, Emergency Alerts, Shift Management,
 *         Attendance, Gate Passes (QR), Daily Logs, Audit Logs, Flat Directory
 */

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const pool   = require('../database/db');
const { getTenantConnection } = require('../services/tenantManager');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_high_entropy_2025';

const STAFF_ROLE_DASHBOARD = {
  Security: '/security/dashboard', Manager: '/manager/dashboard',
  Cleaner: '/staff/dashboard', Gardener: '/staff/dashboard',
  Plumber: '/staff/dashboard', Electrician: '/staff/dashboard',
};

function generateUsername(role = 'staff') {
  const prefix = role.toLowerCase().replace(/[^a-z]/g, '');
  return `${prefix}_${Math.floor(100 + Math.random() * 900)}`;
}
function generateTempPassword() {
  return `temp@${Math.floor(100 + Math.random() * 900)}`;
}

// ── Audit helper ──────────────────────────────────────────────────────────
async function audit(db, { actorType = 'staff', actorId, actorName, action, entityType, entityId, details }) {
  try {
    await db.query(
      `INSERT INTO audit_logs (actor_type, actor_id, actor_name, action, entity_type, entity_id, details)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [actorType, actorId || null, actorName || null, action, entityType || null, entityId || null, details || null]
    );
  } catch { /* non-blocking */ }
}

// ── Notify flat residents helper ──────────────────────────────────────────
async function notifyResidents(db, flatId, title, message, visitorId = null) {
  try {
    const [residents] = await db.query(
      `SELECT u.id, u.role, u.rental_end_date FROM users u
       WHERE u.flat_id = ? AND u.is_approved = 1
         AND u.role IN ('home_owner','home_member','tenant')`,
      [flatId]
    );
    for (const r of residents) {
      if (r.role === 'tenant' && r.rental_end_date && new Date(r.rental_end_date) < new Date()) continue;
      await db.query(
        `INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)`,
        [r.id, title, message]
      );
      if (visitorId) {
        await db.query(
          `INSERT IGNORE INTO visitor_notifications (visitor_id, user_id) VALUES (?, ?)`,
          [visitorId, r.id]
        ).catch(() => {});
      }
    }
  } catch (e) { console.warn('[notifyResidents]', e.message); }
}

// ═══════════════════════════════════════════════════════════════════════════
// AUTH — POST /api/staff/login
// ═══════════════════════════════════════════════════════════════════════════
const login = async (req, res) => {
  try {
    const { username, password, subdomain: bodySubdomain } = req.body;
    if (!username || !password)
      return res.status(400).json({ success: false, message: 'Username and password are required.' });

    let tenantDB = req.tenantDB, tenantInfo = req.tenant;

    if (!tenantDB && bodySubdomain) {
      const [socs] = await pool.query(
        `SELECT id, name, database_name FROM societies WHERE subdomain = ? AND status = 'approved'`,
        [bodySubdomain]
      );
      if (socs.length) {
        tenantDB   = await getTenantConnection(socs[0].database_name);
        tenantInfo = { id: socs[0].id, name: socs[0].name, dbName: socs[0].database_name, subdomain: bodySubdomain };
      }
    }
    if (!tenantDB) return res.status(400).json({ success: false, message: 'Society not identified.' });

    const [rows] = await tenantDB.query(`SELECT * FROM staff WHERE username = ? AND is_active = 1`, [username.trim()]);
    if (!rows.length) return res.status(401).json({ success: false, message: 'Username not found or inactive.' });

    const staff = rows[0];
    if (!staff.password_hash) return res.status(401).json({ success: false, message: 'No password set. Contact secretary.' });

    if (!await bcrypt.compare(password, staff.password_hash))
      return res.status(401).json({ success: false, message: 'Incorrect password.' });

    const effectiveRole = staff.staff_role || staff.role || 'Security';
    const token = jwt.sign(
      { staff_id: staff.id, society_id: tenantInfo.id, role: effectiveRole, is_staff: true, username: staff.username, name: staff.name },
      JWT_SECRET, { expiresIn: '12h' }
    );

    // Auto clock-in shift on login
    const today = new Date().toISOString().split('T')[0];
    await tenantDB.query(
      `INSERT IGNORE INTO staff_shifts (staff_id, shift_date, clock_in) VALUES (?, ?, NOW())`,
      [staff.id, today]
    ).catch(() => {});

    await audit(tenantDB, { actorType: 'staff', actorId: staff.id, actorName: staff.name, action: 'LOGIN', entityType: 'staff', entityId: staff.id });

    return res.json({
      success: true, token,
      dashboardPath: STAFF_ROLE_DASHBOARD[effectiveRole] || '/staff/dashboard',
      user: { id: staff.id, name: staff.name, username: staff.username, role: effectiveRole, shift: staff.shift, society_name: tenantInfo.name, society_id: tenantInfo.id, is_staff: true },
    });
  } catch (e) {
    console.error('[Staff:Login]', e);
    return res.status(500).json({ success: false, message: 'Login failed.', error: e.message });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// VISITORS
// ═══════════════════════════════════════════════════════════════════════════
const getVisitors = async (req, res) => {
  try {
    const db = req.tenantDB;
    if (!db) return res.status(400).json({ success: false, message: 'Tenant context missing.' });

    const { date, search, status, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conds = [], params = [];

    if (date)   { conds.push('DATE(v.entry_time) = ?'); params.push(date); }
    if (status) { conds.push('v.status = ?'); params.push(status); }
    if (search) {
      conds.push('(v.visitor_name LIKE ? OR v.phone LIKE ? OR f.flat_number LIKE ? OR v.vehicle_number LIKE ?)');
      const s = `%${search}%`; params.push(s, s, s, s);
    }

    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const [rows] = await db.query(
      `SELECT v.id, v.visitor_name, v.phone, v.vehicle_number, v.photo_url,
              v.purpose, v.status, v.entry_time, v.exit_time,
              v.logged_by_staff, v.approved_by_user,
              f.flat_number, f.building,
              u.name as resident_name, u.phone as resident_phone,
              s.name as logged_by_name
       FROM visitors v
       LEFT JOIN flats f ON v.flat_id = f.id
       LEFT JOIN users u ON u.flat_id = f.id AND u.role IN ('home_owner') AND u.is_approved = 1
       LEFT JOIN staff s ON s.id = v.logged_by_staff
       ${where}
       ORDER BY v.entry_time DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(DISTINCT v.id) as total FROM visitors v LEFT JOIN flats f ON v.flat_id = f.id ${where}`,
      params
    );

    res.json({ success: true, data: rows, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (e) {
    console.error('[Visitors GET]', e);
    res.status(500).json({ success: false, message: 'Failed to fetch visitors.' });
  }
};

const getVisitorStats = async (req, res) => {
  try {
    const db = req.tenantDB;
    if (!db) return res.status(400).json({ success: false, message: 'Tenant context missing.' });
    const today = new Date().toISOString().split('T')[0];
    const [[stats]] = await db.query(
      `SELECT COUNT(*) AS total_today,
              SUM(status='pending_approval') AS pending,
              SUM(status='approved') AS approved,
              SUM(status='entered') AS inside,
              SUM(status='exited') AS exited,
              SUM(status='rejected') AS rejected
       FROM visitors WHERE DATE(entry_time) = ?`, [today]
    );
    res.json({ success: true, data: stats });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to fetch stats.' });
  }
};

const addVisitor = async (req, res) => {
  try {
    const db = req.tenantDB;
    if (!db) return res.status(400).json({ success: false, message: 'Tenant context missing.' });

    const { visitor_name, phone, flat_id, purpose, vehicle_number, photo_url } = req.body;
    if (!visitor_name?.trim()) return res.status(400).json({ success: false, message: 'Visitor name is required.' });
    if (!flat_id) return res.status(400).json({ success: false, message: 'Flat selection is required.' });

    const purposeVal = ['Delivery','Guest','Service','Cab','Other'].includes(purpose) ? purpose : (purpose || 'Guest');
    const staffId = req.staff?.staff_id || null;
    const staffName = req.staff?.name || req.staff?.username || 'Security';

    const [result] = await db.query(
      `INSERT INTO visitors (visitor_name, phone, vehicle_number, photo_url, flat_id, purpose, status, entry_time, logged_by_staff)
       VALUES (?, ?, ?, ?, ?, ?, 'pending_approval', NOW(), ?)`,
      [visitor_name.trim(), phone || null, vehicle_number ? vehicle_number.trim().toUpperCase() : null, photo_url || null, flat_id, purposeVal, staffId]
    );

    const visitorId = result.insertId;
    await notifyResidents(db, flat_id, 'Visitor at Gate 🔔',
      `${visitor_name.trim()} is waiting. Purpose: ${purposeVal}. Please approve or reject in the app.`, visitorId);

    await db.query(
      `INSERT INTO daily_logs (staff_id, log_type, description, flat_id) VALUES (?, 'visitor_entry', ?, ?)`,
      [staffId, `Visitor '${visitor_name.trim()}' registered (${purposeVal})`, flat_id]
    ).catch(() => {});

    await audit(db, { actorType: 'staff', actorId: staffId, actorName: staffName, action: 'ADD_VISITOR', entityType: 'visitor', entityId: visitorId, details: `${visitor_name.trim()} → Flat ID ${flat_id}` });

    res.status(201).json({ success: true, message: 'Visitor logged. Resident notified.', id: visitorId });
  } catch (e) {
    console.error('[Visitors POST]', e);
    res.status(500).json({ success: false, message: 'Failed to log visitor.' });
  }
};

const updateVisitorStatus = async (req, res) => {
  try {
    const db = req.tenantDB;
    if (!db) return res.status(400).json({ success: false, message: 'Tenant context missing.' });

    const { id } = req.params;
    const { status } = req.body;
    const valid = ['pending_approval','approved','entered','exited','rejected'];
    if (!valid.includes(status)) return res.status(400).json({ success: false, message: `Invalid status: ${status}` });

    const updates = { status };
    if (status === 'exited') updates.exit_time = new Date();

    const [visitors] = await db.query('SELECT visitor_name, flat_id, logged_by_staff FROM visitors WHERE id = ?', [id]);
    await db.query('UPDATE visitors SET ? WHERE id = ?', [updates, id]);

    if (status === 'exited' && visitors.length) {
      await db.query(
        `INSERT INTO daily_logs (staff_id, log_type, description, flat_id) VALUES (?, 'visitor_exit', ?, ?)`,
        [req.staff?.staff_id || null, `Visitor '${visitors[0].visitor_name}' exited`, visitors[0].flat_id]
      ).catch(() => {});
    }

    const staffId = req.staff?.staff_id || null;
    const staffName = req.staff?.name || req.staff?.username || null;
    await audit(db, { actorType: 'staff', actorId: staffId, actorName: staffName, action: `VISITOR_${status.toUpperCase()}`, entityType: 'visitor', entityId: parseInt(id) });

    res.json({ success: true, message: 'Status updated.' });
  } catch (e) {
    console.error('[Visitors PUT]', e);
    res.status(500).json({ success: false, message: 'Failed to update visitor.' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// DELIVERIES
// ═══════════════════════════════════════════════════════════════════════════
const getDeliveries = async (req, res) => {
  try {
    const db = req.tenantDB;
    if (!db) return res.status(400).json({ success: false, message: 'Tenant context missing.' });
    const { status, date } = req.query;
    const conds = [], params = [];
    if (status) { conds.push('d.status = ?'); params.push(status); }
    if (date)   { conds.push('DATE(d.received_at) = ?'); params.push(date); }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const [rows] = await db.query(
      `SELECT d.*, f.flat_number, f.building, s.name as received_by_name
       FROM deliveries d
       LEFT JOIN flats f ON d.flat_id = f.id
       LEFT JOIN staff s ON s.id = d.received_by
       ${where}
       ORDER BY d.received_at DESC LIMIT 100`,
      params
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    console.error('[Deliveries GET]', e);
    res.status(500).json({ success: false, message: 'Failed to fetch deliveries.' });
  }
};

const addDelivery = async (req, res) => {
  try {
    const db = req.tenantDB;
    if (!db) return res.status(400).json({ success: false, message: 'Tenant context missing.' });
    const { courier_name, tracking_no, flat_id, notes, photo_url } = req.body;
    if (!courier_name?.trim()) return res.status(400).json({ success: false, message: 'Courier name is required.' });
    if (!flat_id) return res.status(400).json({ success: false, message: 'Flat is required.' });

    const staffId = req.staff?.staff_id || null;
    const [result] = await db.query(
      `INSERT INTO deliveries (courier_name, tracking_no, flat_id, received_by, photo_url, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, 'received')`,
      [courier_name.trim(), tracking_no || null, flat_id, staffId, photo_url || null, notes || null]
    );

    // Notify resident
    await notifyResidents(db, flat_id, 'Package Arrived 📦',
      `A package from ${courier_name.trim()} has arrived at the gate.${tracking_no ? ` Tracking: ${tracking_no}` : ''}`);

    await audit(db, { actorType: 'staff', actorId: staffId, actorName: req.staff?.name, action: 'ADD_DELIVERY', entityType: 'delivery', entityId: result.insertId, details: `${courier_name.trim()} for flat ${flat_id}` });

    res.status(201).json({ success: true, message: 'Delivery logged. Resident notified.', id: result.insertId });
  } catch (e) {
    console.error('[Deliveries POST]', e);
    res.status(500).json({ success: false, message: 'Failed to log delivery.' });
  }
};

const updateDeliveryStatus = async (req, res) => {
  try {
    const db = req.tenantDB;
    if (!db) return res.status(400).json({ success: false, message: 'Tenant context missing.' });
    const { id } = req.params;
    const { status } = req.body;
    const valid = ['received','notified','collected','returned'];
    if (!valid.includes(status)) return res.status(400).json({ success: false, message: 'Invalid status.' });
    const updates = { status };
    if (status === 'collected') updates.collected_at = new Date();
    await db.query('UPDATE deliveries SET ? WHERE id = ?', [updates, id]);
    await audit(db, { actorType: 'staff', actorId: req.staff?.staff_id, actorName: req.staff?.name, action: `DELIVERY_${status.toUpperCase()}`, entityType: 'delivery', entityId: parseInt(id) });
    res.json({ success: true, message: 'Delivery status updated.' });
  } catch (e) {
    console.error('[Deliveries PUT]', e);
    res.status(500).json({ success: false, message: 'Failed to update delivery.' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// EMERGENCY ALERTS
// ═══════════════════════════════════════════════════════════════════════════
const raiseEmergencyAlert = async (req, res) => {
  try {
    const db = req.tenantDB;
    if (!db) return res.status(400).json({ success: false, message: 'Tenant context missing.' });
    const { alert_type = 'panic', location, description } = req.body;
    const staffId = req.staff?.staff_id || null;

    const [result] = await db.query(
      `INSERT INTO emergency_alerts (raised_by, alert_type, location, description, status)
       VALUES (?, ?, ?, ?, 'active')`,
      [staffId, alert_type, location || null, description || null]
    );

    // Notify all secretaries/admins
    const [admins] = await db.query(
      `SELECT id FROM users WHERE role = 'society_secretary' AND is_approved = 1 LIMIT 20`
    );
    for (const a of admins) {
      await db.query(
        `INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)`,
        [a.id, `🚨 EMERGENCY ALERT — ${alert_type.toUpperCase()}`,
          `Security raised an alert at ${location || 'society gate'}. ${description || 'Immediate attention required!'}`]
      );
    }

    await audit(db, { actorType: 'staff', actorId: staffId, actorName: req.staff?.name, action: 'RAISE_EMERGENCY', entityType: 'emergency_alert', entityId: result.insertId, details: `${alert_type} at ${location}` });

    res.status(201).json({ success: true, message: 'Emergency alert raised. Admins notified.', id: result.insertId });
  } catch (e) {
    console.error('[Emergency POST]', e);
    res.status(500).json({ success: false, message: 'Failed to raise alert.' });
  }
};

const getEmergencyAlerts = async (req, res) => {
  try {
    const db = req.tenantDB;
    if (!db) return res.status(400).json({ success: false, message: 'Tenant context missing.' });
    const [rows] = await db.query(
      `SELECT ea.*, s.name as raised_by_name FROM emergency_alerts ea
       LEFT JOIN staff s ON s.id = ea.raised_by
       ORDER BY ea.created_at DESC LIMIT 50`
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to fetch alerts.' });
  }
};

const resolveEmergencyAlert = async (req, res) => {
  try {
    const db = req.tenantDB;
    if (!db) return res.status(400).json({ success: false, message: 'Tenant context missing.' });
    const { id } = req.params;
    await db.query(
      `UPDATE emergency_alerts SET status = 'resolved', resolved_at = NOW() WHERE id = ?`, [id]
    );
    res.json({ success: true, message: 'Alert resolved.' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to resolve alert.' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// SHIFT MANAGEMENT
// ═══════════════════════════════════════════════════════════════════════════
const clockOut = async (req, res) => {
  try {
    const db = req.tenantDB;
    if (!db) return res.status(400).json({ success: false, message: 'Tenant context missing.' });
    const staffId = req.staff?.staff_id;
    const today   = new Date().toISOString().split('T')[0];

    const [shifts] = await db.query(
      `SELECT id, clock_in FROM staff_shifts WHERE staff_id = ? AND shift_date = ? AND clock_out IS NULL ORDER BY id DESC LIMIT 1`,
      [staffId, today]
    );
    if (!shifts.length) return res.status(400).json({ success: false, message: 'No active shift to clock out from.' });

    const clockIn = new Date(shifts[0].clock_in);
    const durationMin = Math.round((new Date() - clockIn) / 60000);

    await db.query(
      `UPDATE staff_shifts SET clock_out = NOW(), duration_min = ? WHERE id = ?`,
      [durationMin, shifts[0].id]
    );

    await audit(db, { actorType: 'staff', actorId: staffId, actorName: req.staff?.name, action: 'CLOCK_OUT', entityType: 'shift', entityId: shifts[0].id, details: `Duration: ${durationMin} min` });

    res.json({ success: true, message: `Clocked out. Duration: ${Math.floor(durationMin/60)}h ${durationMin%60}m`, duration_min: durationMin });
  } catch (e) {
    console.error('[ClockOut]', e);
    res.status(500).json({ success: false, message: 'Failed to clock out.' });
  }
};

const getMyShifts = async (req, res) => {
  try {
    const db = req.tenantDB;
    if (!db) return res.status(400).json({ success: false, message: 'Tenant context missing.' });
    const staffId = req.staff?.staff_id;
    const [rows] = await db.query(
      `SELECT * FROM staff_shifts WHERE staff_id = ? ORDER BY shift_date DESC LIMIT 30`, [staffId]
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to fetch shifts.' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// GATE PASSES (QR scan)
// ═══════════════════════════════════════════════════════════════════════════
const getGatePasses = async (req, res) => {
  try {
    const db = req.tenantDB;
    if (!db) return res.status(400).json({ success: false, message: 'Tenant context missing.' });
    const [rows] = await db.query(
      `SELECT gp.*, f.flat_number, f.building FROM gate_passes gp
       LEFT JOIN flats f ON gp.flat_id = f.id
       ORDER BY gp.created_at DESC LIMIT 100`
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to fetch gate passes.' });
  }
};

const createGatePass = async (req, res) => {
  try {
    const db = req.tenantDB;
    if (!db) return res.status(400).json({ success: false, message: 'Tenant context missing.' });
    const { flat_id, resident_name, pass_type, valid_from, valid_until } = req.body;
    if (!flat_id || !resident_name) return res.status(400).json({ success: false, message: 'Flat and resident name are required.' });
    const qrCode  = `GP-${Date.now()}-${Math.random().toString(36).substring(2,8).toUpperCase()}`;
    const staffId = req.staff?.staff_id || null;
    const [result] = await db.query(
      `INSERT INTO gate_passes (flat_id, resident_name, pass_type, valid_from, valid_until, qr_code, issued_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [flat_id, resident_name, pass_type || 'guest', valid_from || null, valid_until || null, qrCode, staffId]
    );
    await audit(db, { actorType: 'staff', actorId: staffId, actorName: req.staff?.name, action: 'CREATE_GATE_PASS', entityType: 'gate_pass', entityId: result.insertId });
    res.status(201).json({ success: true, message: 'Gate pass created.', id: result.insertId, qr_code: qrCode });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to create gate pass.' });
  }
};

const scanGatePass = async (req, res) => {
  try {
    const db = req.tenantDB;
    if (!db) return res.status(400).json({ success: false, message: 'Tenant context missing.' });
    const { qr_code } = req.body;
    if (!qr_code) return res.status(400).json({ success: false, message: 'QR code is required.' });

    const [passes] = await db.query(
      `SELECT gp.*, f.flat_number, f.building FROM gate_passes gp
       LEFT JOIN flats f ON gp.flat_id = f.id
       WHERE gp.qr_code = ? LIMIT 1`,
      [qr_code]
    );
    if (!passes.length) return res.status(404).json({ success: false, message: 'Gate pass not found.' });

    const pass = passes[0];
    if (pass.status === 'revoked') return res.status(403).json({ success: false, message: 'Gate pass has been revoked.' });
    if (pass.valid_until && new Date(pass.valid_until) < new Date())
      return res.status(403).json({ success: false, message: 'Gate pass has expired.' });

    // Mark as used / scanned
    await db.query(
      `UPDATE gate_passes SET status = 'used', scanned_at = NOW(), scanned_by = ? WHERE qr_code = ?`,
      [req.staff?.staff_id || null, qr_code]
    );

    await audit(db, { actorType: 'staff', actorId: req.staff?.staff_id, actorName: req.staff?.name, action: 'SCAN_GATE_PASS', entityType: 'gate_pass', entityId: pass.id });

    res.json({ success: true, message: 'Gate pass verified. Entry allowed.', data: pass });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to scan gate pass.' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// DAILY LOGS
// ═══════════════════════════════════════════════════════════════════════════
const getDailyLogs = async (req, res) => {
  try {
    const db = req.tenantDB;
    if (!db) return res.status(400).json({ success: false, message: 'Tenant context missing.' });
    const { date } = req.query;
    let query = `SELECT dl.*, s.name as staff_name, f.flat_number FROM daily_logs dl
                 LEFT JOIN staff s ON dl.staff_id = s.id LEFT JOIN flats f ON dl.flat_id = f.id`;
    const params = [];
    if (date) { query += ' WHERE DATE(dl.created_at) = ?'; params.push(date); }
    query += ' ORDER BY dl.created_at DESC LIMIT 200';
    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to fetch daily logs.' });
  }
};

const addDailyLog = async (req, res) => {
  try {
    const db = req.tenantDB;
    if (!db) return res.status(400).json({ success: false, message: 'Tenant context missing.' });
    const { log_type, description, flat_id } = req.body;
    if (!description) return res.status(400).json({ success: false, message: 'Description is required.' });
    const staffId = req.staff?.staff_id || null;
    const [result] = await db.query(
      `INSERT INTO daily_logs (staff_id, log_type, description, flat_id) VALUES (?, ?, ?, ?)`,
      [staffId, log_type || 'note', description.trim(), flat_id || null]
    );
    res.status(201).json({ success: true, message: 'Log added.', id: result.insertId });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to add log.' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// AUDIT LOGS
// ═══════════════════════════════════════════════════════════════════════════
const getAuditLogs = async (req, res) => {
  try {
    const db = req.tenantDB;
    if (!db) return res.status(400).json({ success: false, message: 'Tenant context missing.' });
    const { date, action, limit = 100, page = 1 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const conds = [], params = [];
    if (date)   { conds.push('DATE(created_at) = ?'); params.push(date); }
    if (action) { conds.push('action LIKE ?'); params.push(`%${action}%`); }
    const where = conds.length ? 'WHERE ' + conds.join(' AND ') : '';
    const [rows] = await db.query(
      `SELECT * FROM audit_logs ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [...params, parseInt(limit), offset]
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to fetch audit logs.' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
// FLATS directory
// ═══════════════════════════════════════════════════════════════════════════
const getFlatsForStaff = async (req, res) => {
  try {
    const db = req.tenantDB;
    if (!db) return res.status(400).json({ success: false, message: 'Tenant context missing.' });
    const [rows] = await db.query(
      `SELECT f.id, f.flat_number, f.building, f.owner_name,
              u.name as resident_name, u.phone as resident_phone, u.role as resident_role
       FROM flats f
       LEFT JOIN users u ON u.flat_id = f.id AND u.role IN ('home_owner','home_member','tenant') AND u.is_approved = 1
       ORDER BY f.flat_number ASC`
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Failed to fetch flats.' });
  }
};

// ═══════════════════════════════════════════════════════════════════════════
module.exports = {
  login,
  // Visitors
  getVisitors, addVisitor, updateVisitorStatus, getVisitorStats,
  // Deliveries
  getDeliveries, addDelivery, updateDeliveryStatus,
  // Emergency
  raiseEmergencyAlert, getEmergencyAlerts, resolveEmergencyAlert,
  // Shifts
  clockOut, getMyShifts,
  // Gate Passes
  getGatePasses, createGatePass, scanGatePass,
  // Logs
  getDailyLogs, addDailyLog,
  // Audit
  getAuditLogs,
  // Flats
  getFlatsForStaff,
  // Credential helpers
  generateUsername, generateTempPassword,
};
