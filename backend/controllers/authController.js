const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Role → dashboard path mapping (used by frontend after login)
const ROLE_DASHBOARD = {
  society_secretary: '/admin/dashboard',
  society_admin:     '/admin/dashboard',  // legacy alias
  home_owner:        '/owner/dashboard',
  home_member:       '/member/dashboard',
  tenant:            '/tenant/dashboard',
  resident:          '/member/dashboard', // legacy alias
  staff:             '/tenant/dashboard', // legacy alias
};

/**
 * Controller for Authentication
 */
class AuthController {
  /**
   * POST /api/auth/login
   * Authenticates a user within their society's tenant database.
   */
  async login(req, res) {
    try {
      const { email, password, subdomain: bodySubdomain } = req.body;
      
      console.log(`[Auth:Login] Attempt for ${email} on ${bodySubdomain || 'current domain'}`);

      // 1. Validation
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Missing Credentials',
          error: 'Email and password are required.'
        });
      }

      // 2. Resolve Tenant (Manual fallback for Vercel/Testing)
      let tenantDB   = req.tenantDB;
      let tenantInfo = req.tenant;

      if (!tenantDB && bodySubdomain) {
        console.log(`[Auth:Login] Resolving tenant manually via body: ${bodySubdomain}`);
        const pool = require('../database/db');
        const { getTenantConnection } = require('../services/tenantManager');

        const [societies] = await pool.query(
          `SELECT id, name, database_name FROM societies WHERE subdomain = ? AND status = 'approved'`,
          [bodySubdomain]
        );

        if (societies.length > 0) {
          const society = societies[0];
          tenantDB = await getTenantConnection(society.database_name);
          tenantInfo = { id: society.id, name: society.name, dbName: society.database_name, subdomain: bodySubdomain };
        }
      }

      if (!tenantDB) {
        return res.status(400).json({
          success: false,
          message: 'Society Not Identified',
          error: 'Please ensure you are accessing your society-specific URL or providing the correct subdomain.'
        });
      }

      // 3. User Authentication
      const [users] = await tenantDB.query('SELECT * FROM users WHERE email = ?', [email]);
      if (users.length === 0) {
        return res.status(401).json({ success: false, message: 'Invalid Credentials', error: 'User does not exist in this society.' });
      }

      const user = users[0];
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({ success: false, message: 'Invalid Credentials', error: 'Incorrect password.' });
      }

      // 4. Status Checks
      if (!user.is_approved) {
        return res.status(403).json({ success: false, message: 'Account Not Approved', error: 'Your registration is pending secretary approval.' });
      }

      // 5. Token Generation
      const token = jwt.sign(
        { user_id: user.id, society_id: tenantInfo.id, role: user.role },
        process.env.JWT_SECRET || 'fallback_secret_high_entropy_2025',
        { expiresIn: '24h' }
      );

      console.log(`[Auth:Login] SUCCESS: ${user.email} logged in as ${user.role}`);

      res.json({
        success: true,
        message: 'Login successful',
        token,
        dashboardPath: ROLE_DASHBOARD[user.role] || '/admin/dashboard',
        user: {
          id: user.id,
          name: user.name,
          role: user.role,
          email: user.email,
          society_name: tenantInfo.name,
          society_id: tenantInfo.id
        }
      });

    } catch (error) {
      console.error('[Auth:Login Exception]:', error);
      res.status(400).json({
        success: false,
        message: 'Login Failed',
        error: error.message || 'An unexpected error occurred during login.'
      });
    }
  }

  async memberSignup(req, res) {
    try {
      const { name, email, phone, password, role, flat_number, block, subdomain } = req.body;
      
      console.log(`[Auth:Signup] New request for ${email} on ${subdomain}`);

      // 1. Core Validation
      if (!name || !email || !password || !role || !flat_number || !subdomain) {
        return res.status(400).json({
          success: false,
          message: 'Missing Required Fields',
          error: 'Name, email, password, role, flat number, and society subdomain are mandatory.'
        });
      }

      const pool = require('../database/db');
      const { getTenantConnection } = require('../services/tenantManager');
      
      // 2. Resolve Society
      const [societies] = await pool.query(
        `SELECT id, name, database_name FROM societies WHERE subdomain = ? AND status = 'approved'`,
        [subdomain]
      );
      
      if (societies.length === 0) {
        return res.status(404).json({ 
          success: false, 
          message: 'Society Not Found', 
          error: `The society "${subdomain}" is either invalid or not yet approved.` 
        });
      }

      const society = societies[0];
      const tenantDB = await getTenantConnection(society.database_name);

      // 3. User Uniqueness
      const [existingUsers] = await tenantDB.query('SELECT id FROM users WHERE email = ?', [email]);
      if (existingUsers.length > 0) {
        return res.status(400).json({ success: false, message: 'Email taken', error: 'This email is already registered in this society.' });
      }

      // 4. Flat Resolution
      const normalizedFlat = flat_number.trim().toLowerCase().replace(/[\s-]/g, '');
      const normalizedBlock = block ? block.trim().toUpperCase() : null;

      const [flats] = await tenantDB.query(
        'SELECT id FROM flats WHERE LOWER(REPLACE(REPLACE(flat_number, " ", ""), "-", "")) = ? AND (building = ? OR building IS NULL)', 
        [normalizedFlat, normalizedBlock]
      );
      
      let targetFlatId = null;
      if (flats.length === 0) {
        const [result] = await tenantDB.query(
          'INSERT INTO flats (flat_number, building, status, created_by) VALUES (?, ?, "pending_verification", "user_signup")',
          [flat_number.trim(), normalizedBlock]
        );
        targetFlatId = result.insertId;
      } else {
        targetFlatId = flats[0].id;
      }

      // 5. Role Constraints
      if (role === 'home_owner') {
        const [existingOwners] = await tenantDB.query(
          "SELECT id FROM users WHERE flat_id = ? AND role = 'home_owner'", 
          [targetFlatId]
        );
        if (existingOwners.length > 0) {
          return res.status(400).json({ 
            success: false, 
            message: 'Owner Exists', 
            error: 'An owner is already registered for this flat. Please join as a Family Member.' 
          });
        }
      }

      // 6. Finalize User
      const password_hash = await bcrypt.hash(password, 10);
      const { rental_start_date, rental_end_date } = req.body;
      
      await tenantDB.query(
        `INSERT INTO users (name, email, phone, password_hash, role, is_approved, status, flat_number, block, flat_id, is_primary_owner, rental_start_date, rental_end_date) 
         VALUES (?, ?, ?, ?, ?, false, 'pending', ?, ?, ?, ?, ?, ?)`,
        [name, email, phone, password_hash, role, flat_number, block, targetFlatId, (role === 'home_owner'), rental_start_date || null, rental_end_date || null]
      );

      console.log(`[Auth:Signup] SUCCESS: ${email} pending approval for ${society.name}`);

      res.status(201).json({ 
        success: true, 
        message: 'Request Submitted',
        data: 'Your registration has been sent to the society secretary. You can login once approved.' 
      });

    } catch (e) {
      console.error('[Auth:Signup Exception]:', e);
      res.status(400).json({ 
        success: false, 
        message: 'Registration Failed', 
        error: e.message || 'A system error occurred during registration.' 
      });
    }
  }
}

module.exports = new AuthController();
