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
      console.log(`[AuthController] Login attempt:`, { email, bodySubdomain, host: req.hostname });

      // 1. Validate presence of email and password
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required.'
        });
      }

      // 2. Resolve tenant database
      let tenantDB   = req.tenantDB;
      let tenantInfo = req.tenant;

      if (!tenantDB && bodySubdomain) {
        console.log(`[AuthController] Attempting resolution for subdomain: ${bodySubdomain}`);
        const pool = require('../database/db');
        const { getTenantConnection } = require('../services/tenantManager');

        const [societies] = await pool.query(
          `SELECT id, name, database_name
           FROM societies
           WHERE subdomain = ? AND status = 'approved'`,
          [bodySubdomain]
        );

        if (societies.length > 0) {
          const society = societies[0];
          console.log(`[AuthController] Found society: ${society.name} (DB: ${society.database_name})`);
          tenantDB = await getTenantConnection(society.database_name);
          tenantInfo = {
            id: society.id,
            name: society.name,
            dbName: society.database_name,
            subdomain: bodySubdomain
          };
        } else {
          console.warn(`[AuthController] No approved society found for subdomain: ${bodySubdomain}`);
        }
      }

      if (!tenantDB) {
        return res.status(400).json({
          success: false,
          message: 'Unable to identify society. Please check your URL or specify your society subdomain.'
        });
      }

      // 3. Find user in the tenant's users table
      const [users] = await tenantDB.query(
        'SELECT * FROM users WHERE email = ?',
        [email]
      );

      if (users.length === 0) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      const user = users[0];

      // 4. Compare passwords
      const passwordMatch = await bcrypt.compare(password, user.password_hash);
      if (!passwordMatch) {
        return res.status(401).json({ success: false, message: 'Invalid email or password.' });
      }

      // Check Approval Status
      if (user.is_approved === 0 || user.is_approved === false) {
        return res.status(403).json({ success: false, message: 'Your account is not approved yet. Please contact society admin.' });
      }

      // Check Tenant Expiry
      if (user.role === 'tenant' && user.rental_end_date) {
        const currentDate = new Date();
        const endDate = new Date(user.rental_end_date);
        if (currentDate > endDate) {
          return res.status(403).json({ success: false, message: 'Your rental period has expired. Please contact admin.' });
        }
      }

      // 5. Generate JWT  ─ includes society_id for tenant resolution on subsequent requests
      const token = jwt.sign(
        {
          user_id:   user.id,
          society_id: tenantInfo.id,
          role:       user.role
        },
        process.env.JWT_SECRET || 'production_secret_key_882299',
        { expiresIn: '7d' }
      );

      // 6. Determine dashboard path based on role
      const dashboardPath = ROLE_DASHBOARD[user.role] || '/admin/dashboard';

      // 7. Return success response
      res.json({
        success: true,
        token,
        dashboardPath,
        user: {
          id:           user.id,
          name:         user.name,
          role:         user.role,
          email:        user.email,
          society_name: tenantInfo.name,
          society_id:   tenantInfo.id
        }
      });

    } catch (error) {
      console.error('[AuthController] Login error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error during login.'
      });
    }
  }

  async memberSignup(req, res) {
    try {
      const { name, email, phone, password, role, flat_number, block, subdomain } = req.body;
      
      const pool = require('../database/db');
      const { getTenantConnection } = require('../services/tenantManager');
      
      const [societies] = await pool.query(
        `SELECT id, name, database_name FROM societies WHERE subdomain = ? AND status = 'approved'`,
        [subdomain]
      );
      
      if (societies.length === 0) {
        return res.status(404).json({ success: false, message: 'Invalid society subdomain or society is not approved.' });
      }

      const tenantDB = await getTenantConnection(societies[0].database_name);

      const [existingUsers] = await tenantDB.query('SELECT id FROM users WHERE email = ?', [email]);
      if (existingUsers.length > 0) {
        return res.status(400).json({ success: false, message: 'Email is already registered in this society.' });
      }

      // 1. Smart Flat Validation: Find or Auto-Create Flat
      const normalizedFlat = flat_number.trim().toLowerCase().replace(/[\s-]/g, '');
      const normalizedBlock = block ? block.trim().toUpperCase() : null;

      const [flats] = await tenantDB.query(
        'SELECT id FROM flats WHERE LOWER(REPLACE(REPLACE(flat_number, " ", ""), "-", "")) = ? AND (building = ? OR building IS NULL)', 
        [normalizedFlat, normalizedBlock]
      );
      
      let targetFlatId = null;
      if (flats.length === 0) {
        // Flat does not exist -> Auto-create as pending
        const [result] = await tenantDB.query(
          'INSERT INTO flats (flat_number, building, status, created_by) VALUES (?, ?, "pending_verification", "user_signup")',
          [flat_number.trim(), normalizedBlock]
        );
        targetFlatId = result.insertId;
      } else {
        // Flat exists -> Link to it
        targetFlatId = flats[0].id;
      }

      // 2. Family linking & Owner Validation
      const { rental_start_date, rental_end_date } = req.body;
      let is_primary_owner = false;

      if (role === 'home_owner') {
        const [existingOwners] = await tenantDB.query(
          "SELECT id FROM users WHERE LOWER(REPLACE(REPLACE(flat_number, ' ', ''), '-', '')) = ? AND (UPPER(block) = ? OR block IS NULL) AND role = 'home_owner' AND id != 0", 
          [normalizedFlat, normalizedBlock]
        );
        if (existingOwners.length > 0) {
          return res.status(400).json({ success: false, message: 'Owner already exists for this flat. Try joining as a Family Member.' });
        }
        is_primary_owner = true;
      }

      const password_hash = await bcrypt.hash(password, 10);
      
      await tenantDB.query(
        `INSERT INTO users (name, email, phone, password_hash, role, is_approved, status, flat_number, block, flat_id, is_primary_owner, rental_start_date, rental_end_date) 
         VALUES (?, ?, ?, ?, ?, false, 'pending', ?, ?, ?, ?, ?, ?)`,
        [name, email, phone, password_hash, role, flat_number, block, targetFlatId, is_primary_owner, rental_start_date || null, rental_end_date || null]
      );

      res.json({ success: true, message: 'Your request has been sent to the society secretary. You will be able to login only after approval.' });
    } catch (e) {
      console.error(e);
      res.status(500).json({ success: false, message: 'Internal server error during member registration.' });
    }
  }
}

module.exports = new AuthController();
