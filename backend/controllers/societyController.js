const bcrypt = require('bcrypt');
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
      res.status(500).json({ available: false, message: 'Server error during check.' });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // POST /api/society/register
  // NEW FLOW: saves pending record only — no DB creation yet
  // ─────────────────────────────────────────────────────────────
  async register(req, res) {
    const connection = await pool.getConnection();
    try {
      console.log('--- New Society Registration Attempt ---');

      const {
        society_name,
        subdomain: rawSubdomain,    // treated as requested_subdomain
        city,
        society_type,
        total_units,
        admin_name,
        admin_email,
        mobile,
        password,
        plan
      } = req.body;

      // 1. Field validation
      const errors = [];
      if (!society_name)  errors.push('society_name is required');
      if (!rawSubdomain)  errors.push('subdomain is required');
      if (!city)          errors.push('city is required');
      if (!society_type)  errors.push('society_type is required');
      if (!total_units)   errors.push('total_units is required');
      if (!admin_name)    errors.push('admin_name is required');
      if (!admin_email)   errors.push('admin_email is required');
      if (!mobile)        errors.push('mobile is required');
      if (!password)      errors.push('password is required');
      if (!plan)          errors.push('plan is required');

      if (errors.length > 0) {
        return res.status(400).json({ success: false, message: 'Signup failed', errors });
      }

      if (password.length < 8) {
        return res.status(400).json({
          success: false,
          message: 'Signup failed',
          error: 'Password must be at least 8 characters'
        });
      }

      // 2. Normalise subdomain
      const requested_subdomain = rawSubdomain.trim().toLowerCase();

      // 3. Format check
      if (!isValidSubdomainFormat(requested_subdomain)) {
        return res.status(400).json({
          success: false,
          message: 'Signup failed',
          error: 'Subdomain may only contain lowercase letters, numbers, and hyphens (3–50 chars).',
          suggestions: generateSuggestions(requested_subdomain)
        });
      }

      // 4. Reserved word check
      if (RESERVED_WORDS.includes(requested_subdomain)) {
        return res.status(400).json({
          success: false,
          message: 'Signup failed',
          error: `"${requested_subdomain}" is a reserved word. Please choose another.`,
          suggestions: generateSuggestions(requested_subdomain)
        });
      }

      await connection.beginTransaction();

      // 5. Uniqueness check (race-condition safe — acquires exclusive lock)
      const [subdomainCheck] = await connection.query(
        'SELECT id FROM societies WHERE subdomain = ? OR requested_subdomain = ? FOR UPDATE',
        [requested_subdomain, requested_subdomain]
      );
      if (subdomainCheck.length > 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'Signup failed',
          error: 'This domain is already taken.',
          suggestions: generateSuggestions(requested_subdomain)
        });
      }

      // 6. Email uniqueness check
      const [emailCheck] = await connection.query(
        'SELECT id FROM users WHERE email = ?',
        [admin_email]
      );
      if (emailCheck.length > 0) {
        await connection.rollback();
        return res.status(400).json({
          success: false,
          message: 'Signup failed',
          error: 'An account with this email already exists.'
        });
      }

      // 7. Hash password
      const password_hash = await bcrypt.hash(password, 10);

      // 8. Map plan → plan_id
      let plan_id = 1;
      if (plan === 'Professional Plan') plan_id = 2;
      if (plan === 'Enterprise Plan')   plan_id = 3;

      // 9. Insert society as PENDING (no tenant DB created yet)
      const [societyResult] = await connection.query(
        `INSERT INTO societies
           (name, requested_subdomain, city, society_type, total_units, plan_id, status)
         VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
        [society_name, requested_subdomain, city, society_type, parseInt(total_units), plan_id]
      );
      const societyId = societyResult.insertId;

      // 10. Store admin credentials in master users table (linked to pending society)
      await connection.query(
        `INSERT INTO users (society_id, name, email, phone, password_hash, role)
         VALUES (?, ?, ?, ?, ?, 'society_admin')`,
        [societyId, admin_name, admin_email, mobile, password_hash]
      );

      await connection.commit();
      console.log(`✅ Society registration pending. ID: ${societyId}, Subdomain: ${requested_subdomain}`);

      // 11. Return — no JWT yet; user must wait for approval
      res.status(201).json({
        success: true,
        status: 'pending',
        message: 'Your society registration has been submitted for approval. You will be notified once it is activated.',
        society: {
          id: societyId,
          name: society_name,
          requested_subdomain,
          requested_url: `${requested_subdomain}.${process.env.MAIN_DOMAIN || 'automytee.in'}`
        }
      });

    } catch (error) {
      if (connection) await connection.rollback();
      console.error('❌ Society Registration Error:', error.message);
      res.status(500).json({
        success: false,
        message: 'Signup failed',
        error: error.message || 'Internal server error during registration'
      });
    } finally {
      if (connection) connection.release();
    }
  }
}

module.exports = new SocietyController();
