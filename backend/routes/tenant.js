const express = require('express');
const router = express.Router();
const authenticateToken = require('../middleware/auth');

// This route uses the tenantDB attached by tenantResolver
router.get('/flats', authenticateToken, async (req, res) => {
  try {
    // If no tenantDB is attached, it's not a tenant sub-domain
    if (!req.tenantDB) {
      return res.status(400).json({ success: false, message: 'Tenant context required.' });
    }

    // Query the tenant-specific database
    const [flats] = await req.tenantDB.query('SELECT * FROM flats');
    
    res.json({
      success: true,
      society: req.tenant.name,
      flats: flats
    });
  } catch (error) {
    console.error('Tenant API Error:', error);
    res.status(500).json({ success: false, message: 'Error fetching tenant data.' });
  }
});

// Another example: notice board
router.get('/notices', authenticateToken, async (req, res) => {
  try {
    const [notices] = await req.tenantDB.query('SELECT * FROM notices ORDER BY created_at DESC');
    res.json({ success: true, notices });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error fetching notices.' });
  }
});

module.exports = router;
