/**
 * Admin CRUD Controller - Handles all society management modules.
 * All methods require req.tenantDB to be set by tenantResolver middleware.
 */

const getTenantDB = (req, res) => {
  const db = req.tenantDB;
  if (!db) {
    res.status(400).json({ success: false, message: 'Tenant context not found. Ensure you are accessing via a valid subdomain.' });
    return null;
  }
  return db;
};

// ══════════════════════════════════════════
// RESIDENTS
// ══════════════════════════════════════════
const getResidents = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    // Fetch from users table (approved residents)
    const [rows] = await db.query(
      `SELECT id, name, email, phone, role, created_at,
              flat_number, block as building
       FROM users
       WHERE role IN ('home_owner', 'home_member', 'tenant') AND is_approved = 1
       ORDER BY created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[Residents GET]', error);
    res.status(500).json({ success: false, message: 'Failed to fetch residents.' });
  }
};

const createResident = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const { name, email, phone, flat_id, role } = req.body;
    if (!name || !phone) return res.status(400).json({ success: false, message: 'Name and phone are required.' });
    const [result] = await db.query(
      'INSERT INTO residents (name, email, phone, flat_id, role) VALUES (?, ?, ?, ?, ?)',
      [name, email || null, phone, flat_id || null, role || 'owner']
    );
    res.status(201).json({ success: true, message: 'Resident added.', id: result.insertId });
  } catch (error) {
    console.error('[Residents POST]', error);
    res.status(500).json({ success: false, message: 'Failed to create resident.' });
  }
};

const updateResident = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const { id } = req.params;
    const { name, email, phone, flat_id, role } = req.body;
    await db.query(
      'UPDATE residents SET name=?, email=?, phone=?, flat_id=?, role=? WHERE id=?',
      [name, email || null, phone, flat_id || null, role || 'owner', id]
    );
    res.json({ success: true, message: 'Resident updated.' });
  } catch (error) {
    console.error('[Residents PUT]', error);
    res.status(500).json({ success: false, message: 'Failed to update resident.' });
  }
};

const deleteResident = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    await db.query('DELETE FROM residents WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Resident deleted.' });
  } catch (error) {
    console.error('[Residents DELETE]', error);
    res.status(500).json({ success: false, message: 'Failed to delete resident.' });
  }
};

// ══════════════════════════════════════════
// FLATS
// ══════════════════════════════════════════
const getFlats = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const { status } = req.query;
    
    // Join with users to find if there's an actual registered home_owner
    let query = `
      SELECT f.*, 
             IFNULL(f.owner_name, (SELECT u.name FROM users u WHERE u.flat_id = f.id AND u.role = 'home_owner' LIMIT 1)) as owner_name
      FROM flats f
    `;
    const params = [];

    if (status && status !== 'all') {
      query += ' WHERE f.status = ?';
      params.push(status);
    }

    query += ' ORDER BY f.flat_number ASC';
    const [rows] = await db.query(query, params);
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[Flats GET]', error);
    res.status(500).json({ success: false, message: 'Failed to fetch flats.' });
  }
};

const createFlat = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const { flat_number, building, owner_name, status } = req.body;
    if (!flat_number) return res.status(400).json({ success: false, message: 'Flat number is required.' });
    const [result] = await db.query(
      'INSERT INTO flats (flat_number, building, owner_name, status) VALUES (?, ?, ?, ?)',
      [flat_number, building || null, owner_name || null, status || 'vacant']
    );
    res.status(201).json({ success: true, message: 'Flat created.', id: result.insertId });
  } catch (error) {
    console.error('[Flats POST]', error);
    res.status(500).json({ success: false, message: 'Failed to create flat.' });
  }
};

const updateFlat = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const { id } = req.params;
    const { flat_number, building, owner_name, status } = req.body;
    await db.query(
      'UPDATE flats SET flat_number=?, building=?, owner_name=?, status=? WHERE id=?',
      [flat_number, building || null, owner_name || null, status || 'vacant', id]
    );
    res.json({ success: true, message: 'Flat updated.' });
  } catch (error) {
    console.error('[Flats PUT]', error);
    res.status(500).json({ success: false, message: 'Failed to update flat.' });
  }
};

const deleteFlat = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    await db.query('DELETE FROM flats WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Flat deleted.' });
  } catch (error) {
    console.error('[Flats DELETE]', error);
    res.status(500).json({ success: false, message: 'Failed to delete flat.' });
  }
};

// ══════════════════════════════════════════
// VISITORS
// ══════════════════════════════════════════
const getVisitors = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const [rows] = await db.query(
      `SELECT v.*, f.flat_number FROM visitors v
       LEFT JOIN flats f ON v.flat_id = f.id
       ORDER BY v.entry_time DESC LIMIT 200`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[Visitors GET]', error);
    res.status(500).json({ success: false, message: 'Failed to fetch visitors.' });
  }
};

const createVisitor = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const { visitor_name, phone, flat_id, purpose, status } = req.body;
    if (!visitor_name) return res.status(400).json({ success: false, message: 'Visitor name is required.' });
    const [result] = await db.query(
      'INSERT INTO visitors (visitor_name, phone, flat_id, purpose, status) VALUES (?, ?, ?, ?, ?)',
      [visitor_name, phone || null, flat_id || null, purpose || null, status || 'entered']
    );
    res.status(201).json({ success: true, message: 'Visitor logged.', id: result.insertId });
  } catch (error) {
    console.error('[Visitors POST]', error);
    res.status(500).json({ success: false, message: 'Failed to create visitor.' });
  }
};

const updateVisitor = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const { id } = req.params;
    const { visitor_name, phone, flat_id, purpose, status, exit_time } = req.body;
    await db.query(
      'UPDATE visitors SET visitor_name=?, phone=?, flat_id=?, purpose=?, status=?, exit_time=? WHERE id=?',
      [visitor_name, phone || null, flat_id || null, purpose || null, status || 'entered', exit_time || null, id]
    );
    res.json({ success: true, message: 'Visitor updated.' });
  } catch (error) {
    console.error('[Visitors PUT]', error);
    res.status(500).json({ success: false, message: 'Failed to update visitor.' });
  }
};

const deleteVisitor = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    await db.query('DELETE FROM visitors WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Visitor record deleted.' });
  } catch (error) {
    console.error('[Visitors DELETE]', error);
    res.status(500).json({ success: false, message: 'Failed to delete visitor.' });
  }
};

// ══════════════════════════════════════════
// MAINTENANCE
// ══════════════════════════════════════════
const getMaintenance = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const [rows] = await db.query(
      `SELECT m.*, f.flat_number, f.building FROM maintenance m
       LEFT JOIN flats f ON m.flat_id = f.id
       ORDER BY m.created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[Maintenance GET]', error);
    res.status(500).json({ success: false, message: 'Failed to fetch maintenance records.' });
  }
};

const createMaintenance = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const { flat_id, amount, due_date, status } = req.body;
    if (!amount) return res.status(400).json({ success: false, message: 'Amount is required.' });
    const [result] = await db.query(
      'INSERT INTO maintenance (flat_id, amount, due_date, status) VALUES (?, ?, ?, ?)',
      [flat_id || null, parseFloat(amount), due_date || null, status || 'pending']
    );
    res.status(201).json({ success: true, message: 'Maintenance bill created.', id: result.insertId });
  } catch (error) {
    console.error('[Maintenance POST]', error);
    res.status(500).json({ success: false, message: 'Failed to create maintenance bill.' });
  }
};

const updateMaintenance = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const { id } = req.params;
    const { flat_id, amount, due_date, status } = req.body;
    await db.query(
      'UPDATE maintenance SET flat_id=?, amount=?, due_date=?, status=? WHERE id=?',
      [flat_id || null, parseFloat(amount), due_date || null, status || 'pending', id]
    );
    res.json({ success: true, message: 'Maintenance bill updated.' });
  } catch (error) {
    console.error('[Maintenance PUT]', error);
    res.status(500).json({ success: false, message: 'Failed to update maintenance bill.' });
  }
};

const deleteMaintenance = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    await db.query('DELETE FROM maintenance WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Maintenance bill deleted.' });
  } catch (error) {
    console.error('[Maintenance DELETE]', error);
    res.status(500).json({ success: false, message: 'Failed to delete maintenance bill.' });
  }
};

// ══════════════════════════════════════════
// COMPLAINTS
// ══════════════════════════════════════════
const getComplaints = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const [rows] = await db.query(
      `SELECT c.*, f.flat_number FROM complaints c
       LEFT JOIN flats f ON c.flat_id = f.id
       ORDER BY c.created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[Complaints GET]', error);
    res.status(500).json({ success: false, message: 'Failed to fetch complaints.' });
  }
};

const createComplaint = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const { flat_id, title, description, status, priority } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required.' });
    const [result] = await db.query(
      'INSERT INTO complaints (flat_id, title, description, status, priority) VALUES (?, ?, ?, ?, ?)',
      [flat_id || null, title, description || null, status || 'open', priority || 'medium']
    );
    res.status(201).json({ success: true, message: 'Complaint filed.', id: result.insertId });
  } catch (error) {
    console.error('[Complaints POST]', error);
    res.status(500).json({ success: false, message: 'Failed to create complaint.' });
  }
};

const updateComplaint = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const { id } = req.params;
    const { flat_id, title, description, status, priority } = req.body;
    await db.query(
      'UPDATE complaints SET flat_id=?, title=?, description=?, status=?, priority=? WHERE id=?',
      [flat_id || null, title, description || null, status || 'open', priority || 'medium', id]
    );
    res.json({ success: true, message: 'Complaint updated.' });
  } catch (error) {
    console.error('[Complaints PUT]', error);
    res.status(500).json({ success: false, message: 'Failed to update complaint.' });
  }
};

const deleteComplaint = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    await db.query('DELETE FROM complaints WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Complaint deleted.' });
  } catch (error) {
    console.error('[Complaints DELETE]', error);
    res.status(500).json({ success: false, message: 'Failed to delete complaint.' });
  }
};

// ══════════════════════════════════════════
// NOTICES
// ══════════════════════════════════════════
const getNotices = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const [rows] = await db.query('SELECT * FROM notices ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[Notices GET]', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notices.' });
  }
};

const createNotice = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ success: false, message: 'Title is required.' });
    const created_by = req.user?.user_id || null;
    const [result] = await db.query(
      'INSERT INTO notices (title, description, created_by) VALUES (?, ?, ?)',
      [title, description || null, created_by]
    );
    res.status(201).json({ success: true, message: 'Notice published.', id: result.insertId });
  } catch (error) {
    console.error('[Notices POST]', error);
    res.status(500).json({ success: false, message: 'Failed to create notice.' });
  }
};

const updateNotice = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const { id } = req.params;
    const { title, description } = req.body;
    await db.query('UPDATE notices SET title=?, description=? WHERE id=?', [title, description || null, id]);
    res.json({ success: true, message: 'Notice updated.' });
  } catch (error) {
    console.error('[Notices PUT]', error);
    res.status(500).json({ success: false, message: 'Failed to update notice.' });
  }
};

const deleteNotice = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    await db.query('DELETE FROM notices WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Notice deleted.' });
  } catch (error) {
    console.error('[Notices DELETE]', error);
    res.status(500).json({ success: false, message: 'Failed to delete notice.' });
  }
};

// ══════════════════════════════════════════
// EVENTS
// ══════════════════════════════════════════
const getEvents = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const [rows] = await db.query('SELECT * FROM events ORDER BY event_date DESC');
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[Events GET]', error);
    res.status(500).json({ success: false, message: 'Failed to fetch events.' });
  }
};

const createEvent = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const { event_name, event_date, description, location } = req.body;
    if (!event_name || !event_date) return res.status(400).json({ success: false, message: 'Event name and date are required.' });
    const [result] = await db.query(
      'INSERT INTO events (event_name, event_date, description, location) VALUES (?, ?, ?, ?)',
      [event_name, event_date, description || null, location || null]
    );
    res.status(201).json({ success: true, message: 'Event created.', id: result.insertId });
  } catch (error) {
    console.error('[Events POST]', error);
    res.status(500).json({ success: false, message: 'Failed to create event.' });
  }
};

const updateEvent = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const { id } = req.params;
    const { event_name, event_date, description, location } = req.body;
    await db.query(
      'UPDATE events SET event_name=?, event_date=?, description=?, location=? WHERE id=?',
      [event_name, event_date, description || null, location || null, id]
    );
    res.json({ success: true, message: 'Event updated.' });
  } catch (error) {
    console.error('[Events PUT]', error);
    res.status(500).json({ success: false, message: 'Failed to update event.' });
  }
};

const deleteEvent = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    await db.query('DELETE FROM events WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Event deleted.' });
  } catch (error) {
    console.error('[Events DELETE]', error);
    res.status(500).json({ success: false, message: 'Failed to delete event.' });
  }
};

// ══════════════════════════════════════════
// STAFF
// ══════════════════════════════════════════
const getStaff = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const [rows] = await db.query('SELECT * FROM staff ORDER BY created_at DESC');
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[Staff GET]', error);
    res.status(500).json({ success: false, message: 'Failed to fetch staff.' });
  }
};

const createStaff = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const { name, phone, role, salary, shift } = req.body;
    if (!name || !role) return res.status(400).json({ success: false, message: 'Name and role are required.' });
    const [result] = await db.query(
      'INSERT INTO staff (name, phone, role, salary, shift) VALUES (?, ?, ?, ?, ?)',
      [name, phone || null, role, salary || null, shift || null]
    );
    res.status(201).json({ success: true, message: 'Staff member added.', id: result.insertId });
  } catch (error) {
    console.error('[Staff POST]', error);
    res.status(500).json({ success: false, message: 'Failed to add staff member.' });
  }
};

const updateStaff = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const { id } = req.params;
    const { name, phone, role, salary, shift } = req.body;
    await db.query(
      'UPDATE staff SET name=?, phone=?, role=?, salary=?, shift=? WHERE id=?',
      [name, phone || null, role, salary || null, shift || null, id]
    );
    res.json({ success: true, message: 'Staff member updated.' });
  } catch (error) {
    console.error('[Staff PUT]', error);
    res.status(500).json({ success: false, message: 'Failed to update staff member.' });
  }
};

const deleteStaff = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    await db.query('DELETE FROM staff WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Staff member removed.' });
  } catch (error) {
    console.error('[Staff DELETE]', error);
    res.status(500).json({ success: false, message: 'Failed to delete staff member.' });
  }
};

// ══════════════════════════════════════════
// MEMBERS (Signup Approvals & Management)
// ══════════════════════════════════════════
const getMembers = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const [rows] = await db.query(
      `SELECT id, name, email, phone, role, status, is_approved, flat_number, block, created_at, rental_start_date, rental_end_date 
       FROM users 
       WHERE role != 'society_secretary' 
       ORDER BY created_at DESC`
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('[Members GET]', error);
    res.status(500).json({ success: false, message: 'Failed to fetch members.' });
  }
};

const updateMemberStatus = async (req, res) => {
  try {
    const db = getTenantDB(req, res);
    if (!db) return;
    const { id } = req.params;
    const { status, is_approved } = req.body;
    
    // Update user status
    await db.query(
      'UPDATE users SET status = ?, is_approved = ? WHERE id = ?',
      [status, is_approved ? 1 : 0, id]
    );

    // If approved, sync with the flats table
    if (is_approved) {
      const [u] = await db.query('SELECT role, flat_id, name FROM users WHERE id = ?', [id]);
      if (u.length && u[0].flat_id) {
        // Mark flat as occupied if an owner or tenant is approved
        if (['home_owner', 'tenant'].includes(u[0].role)) {
          await db.query('UPDATE flats SET status = "occupied" WHERE id = ?', [u[0].flat_id]);
          
          // Optionally update owner_name if specifically home_owner
          if (u[0].role === 'home_owner') {
            await db.query('UPDATE flats SET owner_name = ? WHERE id = ?', [u[0].name, u[0].flat_id]);
          }
        }
      }
    }

    res.json({ success: true, message: 'Member status updated and synced.' });
  } catch (error) {
    console.error('[Members Status PUT]', error);
    res.status(500).json({ success: false, message: 'Failed to update member status.' });
  }
};

module.exports = {
  // Residents
  getResidents, createResident, updateResident, deleteResident,
  // Flats
  getFlats, createFlat, updateFlat, deleteFlat,
  // Visitors
  getVisitors, createVisitor, updateVisitor, deleteVisitor,
  // Maintenance
  getMaintenance, createMaintenance, updateMaintenance, deleteMaintenance,
  // Complaints
  getComplaints, createComplaint, updateComplaint, deleteComplaint,
  // Notices
  getNotices, createNotice, updateNotice, deleteNotice,
  // Events
  getEvents, createEvent, updateEvent, deleteEvent,
  // Staff
  getStaff, createStaff, updateStaff, deleteStaff,
  // Members
  getMembers, updateMemberStatus,
};
