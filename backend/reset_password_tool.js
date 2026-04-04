/**
 * ONE-TIME PASSWORD RESET TOOL
 * 
 * This adds a temporary /api/auth/reset-dev endpoint to reset a user password.
 * REMOVE THIS FILE AND THE ROUTE AFTER USE.
 * 
 * Usage: POST https://divali.automytee.in/api/auth/reset-dev
 * Body: { "secret": "reset_SmartSOC_2777", "email": "divali@gmail.com", "newPassword": "Patel@7777" }
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const router = express.Router();

const RESET_SECRET = 'reset_SmartSOC_2777'; // One-time secret

router.post('/reset-dev', async (req, res) => {
  try {
    const { secret, email, newPassword } = req.body;

    // Guard: if not running this properly, bail
    if (!secret || secret !== RESET_SECRET) {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    if (!email || !newPassword) {
      return res.status(400).json({ success: false, message: 'email and newPassword required' });
    }

    const pool = require('./database/db');
    const { getTenantConnection } = require('./services/tenantManager');

    // Find society by subdomain from hostname
    const hostname = req.headers['x-forwarded-host'] || req.hostname;
    const parts = hostname.split('.');
    const subdomain = parts[0];

    const [societies] = await pool.query(
      `SELECT id, name, database_name FROM societies WHERE subdomain = ? AND status = 'approved'`,
      [subdomain]
    );

    if (societies.length === 0) {
      return res.status(404).json({ success: false, message: `Society '${subdomain}' not found` });
    }

    const society = societies[0];
    const tenantDB = await getTenantConnection(society.database_name);

    // Check user exists
    const [users] = await tenantDB.query('SELECT id, email, role FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(404).json({ success: false, message: `User '${email}' not found in ${society.name}` });
    }

    // Hash new password with bcrypt v2
    const password_hash = bcrypt.hashSync(newPassword, 10);

    // Update
    await tenantDB.query(
      'UPDATE users SET password_hash = ?, is_approved = 1, status = ? WHERE email = ?',
      [password_hash, 'active', email]
    );

    return res.json({
      success: true,
      message: `Password reset for ${email} in ${society.name} (${society.database_name})`,
      user: users[0]
    });

  } catch (err) {
    console.error('[ResetDev]', err);
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
