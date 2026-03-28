const express = require('express');
const router = express.Router();
const pool = require('../database/db');
const { getTenantConnection } = require('../services/tenantManager');

// Fetch active flats for a specific society subdomain (Used in Member Signup)
router.get('/flats', async (req, res) => {
  const { subdomain } = req.query;
  if (!subdomain) return res.status(400).json({ success: false, message: 'Subdomain required' });

  try {
    const [societies] = await pool.query(
      `SELECT id, database_name FROM societies WHERE subdomain = ? AND status = 'approved'`,
      [subdomain]
    );

    if (societies.length === 0) {
      return res.status(404).json({ success: false, message: 'Society not found or not approved' });
    }

    const tenantDB = await getTenantConnection(societies[0].database_name);
    
    // Fetch all flats, order by building then flat_number
    const [flats] = await tenantDB.query('SELECT id, flat_number, building FROM flats ORDER BY building ASC, flat_number ASC');
    
    res.json({ success: true, data: flats });
  } catch (err) {
    console.error('[Public API] Error fetching flats:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
