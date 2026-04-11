const crypto = require('crypto');
const QRCode = require('qrcode');

const getTenantDB = (req, res) => {
  const db = req.tenantDB;
  if (!db) {
    res.status(400).json({ success: false, message: 'Tenant context not found.' });
    return null;
  }
  return db;
};

// POST /api/gatepass/create-pass
exports.createPass = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;

    const { guest_name, mobile, purpose, visit_date, valid_from, valid_until } = req.body;
    const { user_id } = req.user;

    if (!guest_name || !mobile || !purpose || !valid_from || !valid_until) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }

    // Get flat_id for the user
    const [u] = await db.query('SELECT flat_number FROM users WHERE id = ?', [user_id || null]);
    const flatNumber = u[0]?.flat_number || null;
    const [f] = await db.query('SELECT id FROM flats WHERE flat_number = ?', [flatNumber]);
    const flat_id = f[0]?.id || null;

    // Generate unique passcode
    const passcode = `GP-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // On Serverless (Vercel), we cannot write to the file system.
    // Instead, we just assign a dynamic public route that will generate the QR code on the fly.
    const relativeQrPath = `/api/gatepass/qr/${passcode}`;

    const formattedValidFrom = new Date(valid_from).toISOString().slice(0, 19).replace('T', ' ');
    const formattedValidUntil = new Date(valid_until).toISOString().slice(0, 19).replace('T', ' ');

    await db.query(`
      INSERT INTO gate_passes 
      (society_id, flat_id, guest_name, mobile, purpose, pass_code, qr_code_path, status, valid_from, valid_until, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'APPROVED', ?, ?, ?)
    `, [req.tenantId || 1, flat_id, guest_name, mobile, purpose, passcode, relativeQrPath, formattedValidFrom, formattedValidUntil, user_id]);

    res.status(201).json({ 
      success: true, 
      message: 'Gate Pass created successfully.',
      data: {
        passcode,
        qr_code_path: relativeQrPath
      }
    });

  } catch (error) {
    console.error('[createPass]', error);
    res.status(500).json({ success: false, message: 'Server error creating gate pass: ' + error.message, error: error.toString() });
  }
};

// GET /api/gatepass/my-passes
exports.getMyPasses = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;

    const { user_id } = req.user;

    const [rows] = await db.query(`
      SELECT * FROM gate_passes 
      WHERE created_by = ? 
      ORDER BY created_at DESC
    `, [user_id]);

    res.json({ success: true, data: rows });

  } catch (error) {
    console.error('[getMyPasses]', error);
    res.status(500).json({ success: false, message: 'Server error fetching passes.' });
  }
};

// GET /api/gatepass/verify-pass?code=
exports.verifyPass = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;

    const { code } = req.query;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Pass code is required.' });
    }

    const [passes] = await db.query(`
      SELECT gp.*, f.flat_number, u.name as member_name 
      FROM gate_passes gp
      LEFT JOIN flats f ON gp.flat_id = f.id
      LEFT JOIN users u ON gp.created_by = u.id
      WHERE gp.pass_code = ?
    `, [code]);

    if (passes.length === 0) {
      return res.status(404).json({ success: false, message: 'Invalid Pass Code.' });
    }

    const pass = passes[0];
    const now = new Date();
    
    // Check if expired based on time
    if (new Date(pass.valid_until) < now) {
      // Auto-update to EXPIRED if not already USED
      if (pass.status !== 'USED' && pass.status !== 'EXPIRED') {
         await db.query('UPDATE gate_passes SET status = "EXPIRED" WHERE id = ?', [pass.id]);
         pass.status = 'EXPIRED';
      }
    }

    res.json({ success: true, data: pass });

  } catch (error) {
    console.error('[verifyPass]', error);
    res.status(500).json({ success: false, message: 'Server error verifying pass.' });
  }
};

// POST /api/gatepass/allow-entry
exports.allowEntry = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;

    const { pass_id } = req.body;
    const { user_id } = req.user; // security guard ID

    if (!pass_id) {
      return res.status(400).json({ success: false, message: 'Pass ID is required.' });
    }

    const [passes] = await db.query('SELECT * FROM gate_passes WHERE id = ?', [pass_id]);
    if (passes.length === 0) {
      return res.status(404).json({ success: false, message: 'Gate pass not found.' });
    }

    const pass = passes[0];

    if (pass.status === 'USED') {
      return res.status(400).json({ success: false, message: 'Pass already used.' });
    }
    if (pass.status === 'EXPIRED') {
      return res.status(400).json({ success: false, message: 'Pass is expired.' });
    }

    const now = new Date();
    if (now < new Date(pass.valid_from)) {
      return res.status(400).json({ success: false, message: 'Pass is not yet valid.' });
    }
    if (now > new Date(pass.valid_until)) {
      await db.query('UPDATE gate_passes SET status = "EXPIRED" WHERE id = ?', [pass.id]);
      return res.status(400).json({ success: false, message: 'Pass is expired.' });
    }

    // Mark as USED
    await db.query('UPDATE gate_passes SET status = "USED" WHERE id = ?', [pass.id]);

    // Add entry log
    await db.query(`
      INSERT INTO entry_logs (pass_id, entry_time, verified_by, status)
      VALUES (?, NOW(), ?, 'IN')
    `, [pass.id, user_id]);

    // Send Notification to Member
    await db.query(`
      INSERT INTO notifications (user_id, title, message)
      VALUES (?, ?, ?)
    `, [pass.created_by, 'Guest Arrived', `Your guest ${pass.guest_name} has arrived at the gate and entered.`]);

    res.json({ success: true, message: 'Entry allowed successfully.' });

  } catch (error) {
    console.error('[allowEntry]', error);
    res.status(500).json({ success: false, message: 'Server error allowing entry.' });
  }
};

// GET /api/gatepass/qr/:code
// Public route to dynamically generate and serve the QR code image
exports.serveQrCode = async (req, res) => {
  try {
    const { code } = req.params;
    if (!code) {
      return res.status(400).send('No code provided');
    }
    const buffer = await QRCode.toBuffer(code, { width: 300, margin: 2 });
    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    res.send(buffer);
  } catch (error) {
    console.error('[serveQrCode]', error);
    res.status(500).send('Error generating QR code');
  }
};
