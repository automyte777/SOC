const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../database/db');
const databaseCreator = require('../services/databaseCreator');

// ─────────────────────────────────────────────────────────────
// Reserved words that cannot be used as subdomains
// ─────────────────────────────────────────────────────────────
const RESERVED_WORDS = [
  'admin', 'api', 'www', 'root', 'mail', 'smtp', 'ftp',
  'app', 'dashboard', 'login', 'signup', 'auth', 'static',
  'assets', 'cdn', 'media', 'support', 'help', 'status',
  'platform', 'master', 'superadmin', 'billing', 'dev', 'staging'
];

/**
 * Validates subdomain format:
 * - lowercase letters, numbers, hyphens only
 * - 3–50 characters
 * - no leading/trailing hyphens
 */
function isValidSubdomainFormat(sub) {
  return /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/.test(sub) || /^[a-z0-9]{3,50}$/.test(sub);
}

/**
 * Generates DNS-safe subdomain suggestions when a name is taken.
 * Returns up to 3 alternatives.
 */
function generateSuggestions(base) {
  const clean = base.toLowerCase().replace(/[^a-z0-9-]/g, '');
  const rand3 = Math.floor(100 + Math.random() * 900);
  return [
    `${clean}1`,
    `${clean}${rand3}`,
    `${clean}-hq`,
  ].filter(s => isValidSubdomainFormat(s));
}

/**
 * Controller for Society Registration and Management
 */
class SocietyController {

  // ─────────────────────────────────────────────────────────────
  // GET /api/society/check-subdomain?name=greenpark
  // Real-time availability check (used during typing in Signup)
  // ─────────────────────────────────────────────────────────────
  async checkSubdomain(req, res) {
    try {
      const raw = (req.query.name || '').trim().toLowerCase();

      if (!raw) {
        return res.json({ available: false, message: 'Subdomain is required.' });
      }

      // Format check
      if (!isValidSubdomainFormat(raw)) {
        return res.json({
          available: false,
          message: 'Only lowercase letters, numbers, and hyphens allowed (3–50 chars).',
          suggestions: generateSuggestions(raw)
        });
      }

      // Reserved word check
      if (RESERVED_WORDS.includes(raw)) {
        return res.json({
          available: false,
          message: `"${raw}" is a reserved word and cannot be used.`,
          suggestions: generateSuggestions(raw)
        });
      }

      // DB uniqueness check (both active subdomain AND requested_subdomain)
      const [rows] = await pool.query(
        'SELECT id FROM societies WHERE subdomain = ? OR requested_subdomain = ?',
        [raw, raw]
      );

      if (rows.length > 0) {
        return res.json({
          available: false,
          message: 'This subdomain is already taken.',
          suggestions: generateSuggestions(raw)
        });
      }

      return res.json({ available: true, subdomain: raw });

    } catch (error) {
      console.error('[checkSubdomain] Error:', error);
      res.status(500).json({ success: false, message: 'Server error during check.', error: error.message });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // POST /api/society/register
  // NEW FLOW: saves pending record only — no DB creation yet
  // ─────────────────────────────────────────────────────────────
  async register(req, res) {
    let connection;
    try {
      connection = await pool.getConnection();
      console.log(`[Society:Register] New attempt for ${req.body.society_name} (Requested: ${req.body.subdomain})`);

      const {
        society_name, subdomain: rawSubdomain, city, society_type,
        total_units, admin_name, admin_email, mobile, password, plan
      } = req.body;

      // 1. Validation Sweep
      const missing = [];
      if (!society_name) missing.push('Society Name');
      if (!rawSubdomain) missing.push('Subdomain');
      if (!admin_email)  missing.push('Admin Email');
      if (!password)     missing.push('Password');
      
      if (missing.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Missing Fields',
          error: `The following fields are required: ${missing.join(', ')}`
        });
      }

      // 2. Normalisation
      const requested_subdomain = rawSubdomain.trim().toLowerCase();

      // 3. DNS/Format Validation
      if (!isValidSubdomainFormat(requested_subdomain) || RESERVED_WORDS.includes(requested_subdomain)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid Subdomain',
          error: 'Subdomain format is invalid or uses a reserved word.',
          suggestions: generateSuggestions(requested_subdomain)
        });
      }

      await connection.beginTransaction();

      // 4. Persistence Uniqueness (FOR UPDATE prevents deadlocks)
      const [subRows] = await connection.query(
        'SELECT id FROM societies WHERE subdomain = ? OR requested_subdomain = ? FOR UPDATE',
        [requested_subdomain, requested_subdomain]
      );
      if (subRows.length > 0) {
        throw new Error('This domain is already registered or pending.');
      }

      const [emailRows] = await connection.query('SELECT id FROM users WHERE email = ?', [admin_email]);
      if (emailRows.length > 0) {
        throw new Error('Email is already registered on this platform.');
      }

      // 5. Finalize Insertion
      const password_hash = await bcrypt.hash(password, 10);
      const plan_id = plan === 'Enterprise Plan' ? 3 : (plan === 'Professional Plan' ? 2 : 1);

      const [socRes] = await connection.query(
        `INSERT INTO societies (name, requested_subdomain, city, society_type, total_units, plan_id, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
        [society_name, requested_subdomain, city, society_type, parseInt(total_units || 0), plan_id]
      );

      await connection.query(
        `INSERT INTO users (society_id, name, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?, 'society_admin')`,
        [socRes.insertId, admin_name, admin_email, mobile, password_hash]
      );

      await connection.commit();
      console.log(`[Society:Register] SUCCESS: Pending Society ID ${socRes.insertId}`);

      res.status(201).json({
        success: true,
        message: 'Registration Submitted',
        society: {
          id: socRes.insertId,
          name: society_name,
          requested_subdomain,
          requested_url: `${requested_subdomain}.${process.env.BASE_DOMAIN || process.env.MAIN_DOMAIN || 'automytee.in'}`
        }
      });

    } catch (error) {
      if (connection) await connection.rollback();
      console.error('[Society:Register Exception]:', error);
      res.status(400).json({
        success: false,
        message: 'Registration Failed',
        error: error.message || 'A system error occurred during registration.'
      });
    } finally {
      if (connection) connection.release();
    }
  }
}

module.exports = new SocietyController();
