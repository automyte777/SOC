const getTenantDB = (req, res) => {
  const db = req.tenantDB;
  if (!db) {
    res.status(400).json({ success: false, message: 'Tenant context not found.' });
    return null;
  }
  return db;
};

// Helper for tenant expiry check
const isTenantExpired = (rental_end_date) => {
  if (!rental_end_date) return false;
  return new Date(rental_end_date) < new Date();
};

// Security Guard Operations
exports.addVisitor = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const { visitor_name, phone, flat_id, purpose, photo } = req.body;
    
    // Add to visitors with 'pending_approval' status
    const [result] = await db.query(
      `INSERT INTO visitors (visitor_name, phone, flat_id, purpose, status) 
       VALUES (?, ?, ?, ?, 'pending_approval')`,
      [visitor_name, phone || null, flat_id || null, purpose || null]
    );

    // Notify the resident (home_owner or tenant of that flat)
    const [residents] = await db.query(
      'SELECT id, role, rental_end_date FROM users WHERE (flat_number = (SELECT flat_number FROM flats WHERE id = ?) OR flat_id = ?) AND is_approved = 1',
      [flat_id, flat_id]
    );
    
    if (residents.length > 0) {
      for (let r of residents) {
        // Don't notify expired tenants
        if (r.role === 'tenant' && isTenantExpired(r.rental_end_date)) continue;

        await db.query(`INSERT INTO notifications (user_id, title, message) VALUES (?, ?, ?)`, [
          r.id, 'Visitor Approval Request', `${visitor_name} is waiting at the gate. Purpose: ${purpose || 'Visiting'}`
        ]);
      }
    }

    res.json({ success: true, message: 'Visitor added pending approval.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error adding visitor' });
  }
};

exports.getSecurityVisitors = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const [rows] = await db.query(
      `SELECT v.*, f.flat_number FROM visitors v
       LEFT JOIN flats f ON v.flat_id = f.id
       ORDER BY v.entry_time DESC LIMIT 100`
    );
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.updateVisitorStatus = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const { id } = req.params;
    const { status } = req.body;

    const valid = ['pending_approval', 'approved', 'rejected', 'entered', 'exited'];
    if (!valid.includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    const updates = { status };
    if (status === 'exited') updates.exit_time = new Date();

    await db.query('UPDATE visitors SET ? WHERE id = ?', [updates, id]);

    // Notify security via daily_log on approval/rejection
    if (status === 'approved' || status === 'rejected') {
      const [v] = await db.query('SELECT visitor_name, flat_id FROM visitors WHERE id = ?', [id]);
      if (v.length > 0) {
        await db.query(
          `INSERT INTO daily_logs (staff_id, log_type, description, flat_id) VALUES (?, 'note', ?, ?)`,
          [null, `Resident ${status} visitor '${v[0].visitor_name}'`, v[0].flat_id]
        ).catch(() => {});
      }
    }

    res.json({ success: true, message: `Visitor ${status}.` });
  } catch (error) {
    console.error('[updateVisitorStatus]', error);
    res.status(500).json({ success: false, message: 'Server error updating visitor' });
  }
};

// Resident operations
exports.getMyProperty = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const { user_id, role } = req.user;

    // Fetch user details including expiry
    const [u] = await db.query('SELECT role, rental_end_date, flat_number, block FROM users WHERE id = ?', [user_id]);
    if (!u.length) return res.status(404).json({ success: false, message: 'User not found' });

    if (u[0].role === 'tenant' && isTenantExpired(u[0].rental_end_date)) {
      return res.status(403).json({ success: false, expired: true, message: 'Your rental period has expired. Please contact the society office.' });
    }

    const [flats] = await db.query(
      'SELECT * FROM flats WHERE flat_number = ? AND (block = ? OR building = ? OR ? IS NULL)',
      [u[0].flat_number, u[0].block, u[0].block, u[0].block]
    );

    res.json({ 
      success: true, 
      data: flats[0] || { flat_number: u[0].flat_number, building: u[0].block },
      role: u[0].role,
      rental_end_date: u[0].rental_end_date
    });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getFamilyMembers = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const { user_id } = req.user;

    const [u] = await db.query('SELECT flat_number, block FROM users WHERE id = ?', [user_id]);
    if (!u.length) return res.json({ success: true, data: [] });

    // Link by same flat_number and block for auto-grouping
    const [rows] = await db.query(
      'SELECT id, name, role, status, is_approved FROM users WHERE flat_number = ? AND (block = ? OR ? IS NULL) AND id != ?',
      [u[0].flat_number, u[0].block, u[0].block, user_id]
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getMyVisitors = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const { user_id } = req.user;
    const page = parseInt(req.query.page) || 1;
    const limit = 10;
    const offset = (page - 1) * limit;
    
    const [u] = await db.query('SELECT flat_number, block FROM users WHERE id = ?', [user_id]);
    if (!u.length || !u[0].flat_number) return res.json({ success: true, data: [], total: 0 });
    
    const [rows] = await db.query(
      `SELECT v.*, f.flat_number FROM visitors v
       LEFT JOIN flats f ON v.flat_id = f.id
       WHERE f.flat_number = ? OR v.flat_id = (SELECT id FROM flats WHERE flat_number = ? LIMIT 1)
       ORDER BY v.entry_time DESC LIMIT ? OFFSET ?`,
      [u[0].flat_number, u[0].flat_number, limit, offset]
    );

    const [count] = await db.query(
      `SELECT COUNT(*) as total FROM visitors v
       LEFT JOIN flats f ON v.flat_id = f.id
       WHERE f.flat_number = ? OR v.flat_id = (SELECT id FROM flats WHERE flat_number = ? LIMIT 1)`,
      [u[0].flat_number, u[0].flat_number]
    );

    res.json({ success: true, data: rows, total: count[0].total });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.preApproveVisitor = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const { visitor_name, phone, expected_time, purpose } = req.body;
    const { user_id } = req.user;

    const [u] = await db.query('SELECT flat_number FROM users WHERE id = ?', [user_id]);
    const [f] = await db.query('SELECT id FROM flats WHERE flat_number = ?', [u[0].flat_number]);
    const flat_id = f[0]?.id || null;

    await db.query(
      `INSERT INTO visitors (visitor_name, phone, flat_id, purpose, status, entry_time) 
       VALUES (?, ?, ?, ?, 'approved', ?)`,
      [visitor_name, phone, flat_id, purpose || 'Pre-approved', expected_time || new Date()]
    );

    res.json({ success: true, message: 'Visitor pre-approved.' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getMyMaintenance = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const { user_id, role } = req.user;

    // Optional: Restricted role check
    // if (role === 'home_member') return res.status(403).json({ success: false, message: 'Access denied' });

    const [u] = await db.query('SELECT flat_number FROM users WHERE id = ?', [user_id]);
    if (!u.length || !u[0].flat_number) return res.json({ success: true, data: [] });

    const [rows] = await db.query(
      `SELECT m.*, f.flat_number, f.building FROM maintenance m
       LEFT JOIN flats f ON m.flat_id = f.id
       WHERE f.flat_number = ?
       ORDER BY m.due_date DESC LIMIT 50`,
      [u[0].flat_number]
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getMyComplaints = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const { user_id } = req.user;

    const [rows] = await db.query(
      `SELECT c.*, f.flat_number FROM complaints c
       LEFT JOIN flats f ON c.flat_id = f.id
       WHERE f.flat_number = (SELECT flat_number FROM users WHERE id = ? LIMIT 1)
       OR c.created_by = ?
       ORDER BY c.created_at DESC`,
      [user_id, user_id]
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.createMyComplaint = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const { title, description, category } = req.body;
    const { user_id } = req.user;

    const [u] = await db.query('SELECT flat_number FROM users WHERE id = ?', [user_id]);
    const [f] = await db.query('SELECT id FROM flats WHERE flat_number = ?', [u[0]?.flat_number]);
    const flat_id = f[0]?.id || null;

    await db.query(
      'INSERT INTO complaints (flat_id, title, description, status, priority) VALUES (?, ?, ?, "open", "medium")',
      [flat_id, title, description]
    );
    res.json({ success: true, message: 'Complaint filed.' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getMyVehicles = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const { user_id } = req.user;

    const [u] = await db.query('SELECT flat_number FROM users WHERE id = ?', [user_id]);
    const [rows] = await db.query(
      'SELECT id, vehicle_number, vehicle_type, owner_name as vehicle_name FROM vehicles WHERE flat_id = (SELECT id FROM flats WHERE flat_number = ? LIMIT 1)',
      [u[0]?.flat_number]
    );
    res.json({ success: true, data: rows });
  } catch (e) {
    // If vehicles table not found, return empty
    console.error('[getMyVehicles error]', e);
    res.json({ success: true, data: [] });
  }
};

exports.createMyVehicle = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const { vehicle_name, vehicle_number, vehicle_type } = req.body;
    const { user_id } = req.user;
    
    if (!vehicle_number) return res.status(400).json({ success: false, message: 'Vehicle number is required.' });

    const [u] = await db.query('SELECT flat_number FROM users WHERE id = ?', [user_id]);
    const [f] = await db.query('SELECT id FROM flats WHERE flat_number = ?', [u[0]?.flat_number]);
    const flat_id = f[0]?.id || null;

    if (!flat_id) return res.status(400).json({ success: false, message: 'Your flat is not fully registered yet.' });

    const [result] = await db.query(
      'INSERT INTO vehicles (flat_id, vehicle_number, vehicle_type, owner_name) VALUES (?, ?, ?, ?)',
      [flat_id, vehicle_number, vehicle_type || 'car', vehicle_name || null]
    );
    res.status(201).json({ success: true, message: 'Vehicle added.' });
  } catch (e) {
    console.error('[createMyVehicle]', e);
    res.status(500).json({ success: false, message: 'Server error adding vehicle' });
  }
};

exports.updateMyVehicle = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const { vehicle_name, vehicle_number, vehicle_type } = req.body;
    await db.query(
      'UPDATE vehicles SET vehicle_number=?, vehicle_type=?, owner_name=? WHERE id=?',
      [vehicle_number, vehicle_type || 'car', vehicle_name || null, req.params.id]
    );
    res.json({ success: true, message: 'Vehicle updated.' });
  } catch (e) {
    console.error('[updateMyVehicle]', e);
    res.status(500).json({ success: false, message: 'Server error updating vehicle' });
  }
};

exports.deleteMyVehicle = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    await db.query('DELETE FROM vehicles WHERE id=?', [req.params.id]);
    res.json({ success: true, message: 'Vehicle removed.' });
  } catch (e) {
    console.error('[deleteMyVehicle]', e);
    res.status(500).json({ success: false, message: 'Server error removing vehicle' });
  }
};

exports.getMyNotifications = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const { user_id } = req.user;

    const [rows] = await db.query(
      'SELECT * FROM notifications WHERE user_id = ? OR role_target = "all" ORDER BY created_at DESC LIMIT 50',
      [user_id]
    );

    const [unread] = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE (user_id = ? OR role_target = "all") AND is_read = FALSE',
      [user_id]
    );

    res.json({ success: true, data: rows, unread: unread[0].count });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error fetching notifications' });
  }
};

exports.markNotificationRead = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    await db.query('UPDATE notifications SET is_read = TRUE WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false });
  }
};

exports.addFamilyMember = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const { name, email, phone, role } = req.body;
    const { user_id } = req.user;

    const [u] = await db.query('SELECT flat_number, block FROM users WHERE id = ?', [user_id]);
    const [f] = await db.query('SELECT id FROM flats WHERE flat_number = ?', [u[0].flat_number]);
    const flat_id = f[0]?.id || null;
    
    // Add as a user with same flat info
    await db.query(
      'INSERT INTO users (name, email, phone, role, flat_number, block, flat_id, is_approved, status) VALUES (?, ?, ?, ?, ?, ?, ?, 1, "active")',
      [name, email, phone, role || 'home_member', u[0].flat_number, u[0].block, flat_id]
    );

    res.json({ success: true, message: 'Family member added.' });
  } catch (e) {
    res.status(500).json({ success: false, message: 'Server error adding member' });
  }
};
