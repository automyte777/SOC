const cron = require('node-cron');

const getTenantDB = (req, res) => {
  const db = req.tenantDB;
  if (!db) {
    res.status(400).json({ success: false, message: 'Tenant context not found.' });
    return null;
  }
  return db;
};

// ============================================
// SECRETARY CONTROLLERS
// ============================================

// 1. Get Maintenance Configuration
exports.getConfig = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;

    const [rows] = await db.query('SELECT * FROM maintenance_config ORDER BY id DESC LIMIT 1');
    res.json({ success: true, data: rows[0] || null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 2. Set/Update Maintenance Configuration
exports.setConfig = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const { amount, start_date } = req.body;

    if (!amount || !start_date) {
      return res.status(400).json({ success: false, message: 'Amount and Start Date are required.' });
    }

    await db.query('UPDATE maintenance_config SET is_active = 0 WHERE is_active = 1');
    await db.query(
      'INSERT INTO maintenance_config (amount, start_date, is_active) VALUES (?, ?, 1)',
      [amount, start_date]
    );

    // Initial generation logic: if start_date is in the past or today, we might want to generate for the current month.
    // The cron job handles the rest. Let's do a simple trigger for the start date's month if it's current.
    
    res.json({ success: true, message: 'Maintenance configuration saved successfully.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 3. Get Secretary Dashboard Dashboard Stats
exports.getDashboardStats = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    let month = req.query.month || currentMonth;

    // Total Flats
    const [flats] = await db.query('SELECT COUNT(*) as total FROM flats');
    const totalFlats = flats[0].total;

    // Maintenance stats for the month
    const [stats] = await db.query(`
      SELECT 
        COUNT(CASE WHEN status = 'Paid' THEN 1 END) as paidMembers,
        COUNT(CASE WHEN status != 'Paid' THEN 1 END) as unpaidMembers,
        SUM(CASE WHEN status = 'Paid' THEN amount ELSE 0 END) as totalCollected,
        SUM(CASE WHEN status != 'Paid' THEN amount ELSE 0 END) as totalPending
      FROM maintenance
      WHERE month = ?
    `, [month]);

    res.json({
      success: true,
      data: {
        totalFlats,
        paidMembers: stats[0].paidMembers || 0,
        unpaidMembers: stats[0].unpaidMembers || 0,
        totalCollected: stats[0].totalCollected || 0,
        totalPending: stats[0].totalPending || 0
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 4. Get Maintenance List for Table
exports.getMaintenanceList = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;

    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const status = req.query.status; // 'Paid', 'Pending', etc.

    let query = `
      SELECT m.*, f.flat_number, u.name as owner_name 
      FROM maintenance m
      JOIN flats f ON m.flat_id = f.id
      LEFT JOIN users u ON f.flat_number = u.flat_number AND u.role IN ('home_owner', 'tenant') AND u.is_approved = 1
      WHERE m.month = ?
    `;
    const params = [month];

    if (status) {
      query += ` AND m.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY f.flat_number ASC`;

    const [rows] = await db.query(query, params);
    
    // Deduplicate by flat_id (in case of multiple users like home_owner and tenant, though typically we want just one representative)
    const uniqueRows = [];
    const seenFlats = new Set();
    for (let row of rows) {
      if (!seenFlats.has(row.flat_id)) {
        seenFlats.add(row.flat_id);
        uniqueRows.push(row);
      }
    }

    res.json({ success: true, data: uniqueRows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 5. Add Extra Charge
exports.addExtraCharge = async (req, res) => {
  try {
    // Need a transaction ideally, but we can do sequential queries
    const db = getTenantDB(req, res);
    if (!db) return;
    const { title, amount, apply_to, flat_ids } = req.body; // apply_to: 'all' or 'selected'
    const { user_id } = req.user; // Secretary ID

    if (!title || !amount) {
      return res.status(400).json({ success: false, message: 'Title and Amount are required.' });
    }

    // Insert Extra Charge
    const [chargeResult] = await db.query(
      'INSERT INTO extra_charges (title, amount, created_by) VALUES (?, ?, ?)',
      [title, amount, user_id]
    );
    const chargeId = chargeResult.insertId;

    let targetFlatIds = [];
    if (apply_to === 'selected' && Array.isArray(flat_ids) && flat_ids.length > 0) {
      targetFlatIds = flat_ids;
    } else {
      const [allFlats] = await db.query('SELECT id FROM flats');
      targetFlatIds = allFlats.map(f => f.id);
    }

    // Insert Assignments
    if (targetFlatIds.length > 0) {
      const values = targetFlatIds.map(fid => [chargeId, fid, 'Pending']);
      await db.query(
        'INSERT INTO extra_charge_assignments (charge_id, flat_id, status) VALUES ?',
        [values]
      );
    }

    res.json({ success: true, message: 'Extra charge generated successfully.' });
  } catch (error) {
    console.error('[addExtraCharge]', error);
    res.status(500).json({ success: false, message: 'Server error adding extra charge.' });
  }
};

// 6. Get Secretary Extra Charges Overview
exports.getExtraChargesOverview = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;

    const [rows] = await db.query(`
      SELECT 
        ec.*,
        COUNT(eca.id) as total_assigned,
        SUM(CASE WHEN eca.status = 'Paid' THEN 1 ELSE 0 END) as paid_count,
        SUM(CASE WHEN eca.status != 'Paid' THEN 1 ELSE 0 END) as unpaid_count,
        SUM(CASE WHEN eca.status = 'Paid' THEN ec.amount ELSE 0 END) as total_collected
      FROM extra_charges ec
      LEFT JOIN extra_charge_assignments eca ON ec.id = eca.charge_id
      GROUP BY ec.id
      ORDER BY ec.created_at DESC
    `);

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};


// ============================================
// MEMBER CONTROLLERS
// ============================================

// 7. Get Member Maintenance (Current & History)
exports.getMemberMaintenance = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const { user_id } = req.user;

    // Get flat_id of the current user
    const [u] = await db.query('SELECT flat_number FROM users WHERE id = ?', [user_id]);
    if (!u.length || !u[0].flat_number) return res.json({ success: true, data: [], current: null });
    
    const [f] = await db.query('SELECT id FROM flats WHERE flat_number = ?', [u[0].flat_number]);
    if (!f.length) return res.json({ success: true, data: [], current: null });
    
    const flat_id = f[0].id;
    const currentMonth = new Date().toISOString().slice(0, 7);

    // Current Month Maintenance
    const [current] = await db.query(
      'SELECT * FROM maintenance WHERE flat_id = ? AND month = ? LIMIT 1',
      [flat_id, currentMonth]
    );

    // History
    const [history] = await db.query(
      'SELECT * FROM maintenance WHERE flat_id = ? ORDER BY month DESC',
      [flat_id]
    );

    res.json({
      success: true,
      current: current[0] || null,
      history
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 8. Get Member Extra Charges
exports.getMemberExtraCharges = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const { user_id } = req.user;

    const [u] = await db.query('SELECT flat_number FROM users WHERE id = ?', [user_id]);
    if (!u.length || !u[0].flat_number) return res.json({ success: true, data: [] });
    
    const [f] = await db.query('SELECT id FROM flats WHERE flat_number = ?', [u[0].flat_number]);
    if (!f.length) return res.json({ success: true, data: [] });
    
    const flat_id = f[0].id;

    const [rows] = await db.query(`
      SELECT eca.id as assignment_id, eca.status, ec.title, ec.amount, ec.created_at
      FROM extra_charge_assignments eca
      JOIN extra_charges ec ON eca.charge_id = ec.id
      WHERE eca.flat_id = ?
      ORDER BY ec.created_at DESC
    `, [flat_id]);

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 9. Pay Maintenance
exports.payMaintenance = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const { id } = req.params;

    // Simulate payment marking as 'Initiated'
    await db.query('UPDATE maintenance SET status = "Initiated" WHERE id = ?', [id]);
    res.json({ success: true, message: 'Payment Initiated.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// 10. Pay Extra Charge
exports.payExtraCharge = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const { assignment_id } = req.params;

    await db.query('UPDATE extra_charge_assignments SET status = "Initiated" WHERE id = ?', [assignment_id]);
    res.json({ success: true, message: 'Payment Initiated.' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
