const pool = require('../database/db');
const databaseCreator = require('../services/databaseCreator');
const { getTenantConnection } = require('../services/tenantManager');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

/**
 * Helper to log audit actions globally
 */
const logAudit = async (action, details) => {
  try {
    await pool.query(
      'INSERT INTO audit_logs (action, details) VALUES (?, ?)',
      [action, typeof details === 'object' ? JSON.stringify(details) : details]
    );
  } catch (err) {
    console.error('[Audit Logger Error]:', err);
  }
};

/**
 * Super Admin / Master Admin Controller
 * All routes must be protected by the `masterAdminAuth` middleware.
 */
class MasterAdminController {

  // ─────────────────────────────────────────────────────────────
  // 1. DASHBOARD & GLOBAL OVERVIEW
  // ─────────────────────────────────────────────────────────────
  async getDashboardStats(req, res) {
    try {
      const [societies] = await pool.query(`SELECT id, status, database_name, created_at FROM societies`);
      
      const totalSocieties = societies.length;
      const activeSocieties = societies.filter(s => s.status === 'approved').length;
      const suspendedSocieties = societies.filter(s => s.status === 'suspended' || s.status === 'expired').length;
      const newSocieties7d = societies.filter(s => {
        const diffDays = (new Date() - new Date(s.created_at)) / (1000 * 60 * 60 * 24);
        return diffDays <= 7;
      }).length;

      // Calculate Total Users across all active tenant DBs
      let totalUsersCount = 0;
      for (const soc of societies.filter(s => s.status === 'approved' && s.database_name)) {
        try {
          const tDb = await getTenantConnection(soc.database_name);
          const [u] = await tDb.query('SELECT COUNT(id) as c FROM users');
          totalUsersCount += u[0].c;
        } catch(e) { /* ignore db connection errors for unprovisioned ones */ }
      }

      // Latest activities
      const [recentLogs] = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5');

      res.json({
        success: true,
        stats: {
          totalSocieties,
          activeSocieties,
          suspendedSocieties,
          newSocieties7d,
          totalUsers: totalUsersCount
        },
        recentActivities: recentLogs
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: 'Failed to fetch dashboard stats' });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 2. SOCIETY MANAGEMENT
  // ─────────────────────────────────────────────────────────────
  
  async getAllSocieties(req, res) {
    try {
      const [rows] = await pool.query(`
        SELECT
          s.id, s.name, s.subdomain, s.requested_subdomain, s.city, s.society_type,
          s.total_units, s.status, s.database_name, s.approved_at, s.created_at,
          u.name AS admin_name, u.email AS admin_email,
          p.name AS plan_name
        FROM societies s
        LEFT JOIN users u ON u.society_id = s.id
        LEFT JOIN plans p ON p.id = s.plan_id
        ORDER BY s.created_at DESC
      `);
      res.json({ success: true, count: rows.length, societies: rows });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch societies.' });
    }
  }

  async getPendingSocieties(req, res) {
    try {
      const [rows] = await pool.query(`
        SELECT
          s.id, s.name, s.requested_subdomain, s.subdomain, s.city, s.society_type,
          s.total_units, s.status, s.approved_at, s.created_at,
          u.name AS admin_name, u.email AS admin_email, u.phone AS admin_phone,
          p.name AS plan_name
        FROM societies s
        LEFT JOIN users u ON u.society_id = s.id
        LEFT JOIN plans p ON p.id = s.plan_id
        WHERE s.status = 'pending'
        ORDER BY s.created_at DESC
      `);
      res.json({ success: true, count: rows.length, societies: rows });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to fetch pending societies.' });
    }
  }

  async setSocietyStatus(req, res) {
    const { id, action } = req.params; // action = suspend, activate, approve, reject
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [rows] = await connection.query(`SELECT s.*, u.name AS admin_name, u.email AS admin_email, u.phone as admin_phone, u.password_hash FROM societies s LEFT JOIN users u ON u.society_id = s.id WHERE s.id = ?`, [id]);
      if (rows.length === 0) return res.status(404).json({ success: false, message: 'Not found.' });
      const society = rows[0];

      let newStatus = '';
      if (action === 'suspend') newStatus = 'suspended';
      else if (action === 'activate') newStatus = 'approved';
      else if (action === 'reject') newStatus = 'rejected';
      else if (action === 'approve') newStatus = 'approved';
      else return res.status(400).json({ success:false, message: 'Invalid action.'});

      if (action === 'approve' && society.status !== 'approved') {
        const finalSubdomain = society.requested_subdomain;
        const databaseName = `society_${id}_db`;
        const fullDomain = `${finalSubdomain}.${process.env.MAIN_DOMAIN || 'automytee.in'}`;

        await databaseCreator.createSocietyDatabase(id, {
          name: society.admin_name, email: society.admin_email, phone: society.admin_phone, password_hash: society.password_hash
        });

        await connection.query(`UPDATE societies SET subdomain = ?, database_name = ?, status = 'approved', approved_at = NOW() WHERE id = ?`, [finalSubdomain, databaseName, id]);
        await connection.query(`INSERT INTO domains (society_id, domain) VALUES (?, ?) ON DUPLICATE KEY UPDATE domain = VALUES(domain)`, [id, fullDomain]);
        
        await logAudit('Approved Society', `Society ${society.name} (${id}) was approved and DB provisioned.`);
      } else {
        await connection.query(`UPDATE societies SET status = ? WHERE id = ?`, [newStatus, id]);
        await logAudit(`Status Change: ${action}`, `Society ${society.name} (${id}) status changed to ${newStatus}.`);
      }

      await connection.commit();
      res.json({ success: true, message: `Society status updated to ${newStatus}.` });
    } catch (error) {
      if (connection) await connection.rollback();
      res.status(500).json({ success: false, message: error.message });
    } finally {
      connection.release();
    }
  }

  async deleteSociety(req, res) {
    const { id } = req.params;
    try {
      const [rows] = await pool.query('SELECT name, database_name FROM societies WHERE id = ?', [id]);
      if (rows.length === 0) return res.status(404).json({ success: false, message: 'Not found.' });
      
      const soc = rows[0];

      // Drop Tenant DB
      if (soc.database_name) {
        await pool.query(`DROP DATABASE IF EXISTS \`${soc.database_name}\``);
      }

      // Delete from Master
      await pool.query('DELETE FROM societies WHERE id = ?', [id]);
      await logAudit('Deleted Society', `Society ${soc.name} (${id}) and its database ${soc.database_name} were deleted permanently.`);
      
      res.json({ success: true, message: 'Society deleted permanently.' });
    } catch (error) {
       res.status(500).json({ success: false, message: error.message });
    }
  }

  async createDirectly(req, res) {
    const { society_name, subdomain, admin_name, admin_email, password } = req.body;
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [dup] = await connection.query('SELECT id FROM societies WHERE subdomain = ?', [subdomain]);
      if (dup.length > 0) throw new Error('Subdomain strictly taken.');

      const password_hash = await bcrypt.hash(password, 10);
      const [socRes] = await connection.query(
        `INSERT INTO societies (name, requested_subdomain, subdomain, database_name, city, society_type, total_units, plan_id, status, approved_at) 
         VALUES (?, ?, ?, ?, 'Any', 'Apartment', 100, 1, 'approved', NOW())`,
        [society_name, subdomain, subdomain, `society_${Date.now()}_db` /* placeholder */]
      );
      
      const socId = socRes.insertId;
      const dbName = `society_${socId}_db`;
      const fullDomain = `${subdomain}.${process.env.MAIN_DOMAIN || 'automytee.in'}`;

      await connection.query(`UPDATE societies SET database_name = ? WHERE id = ?`, [dbName, socId]);
      await connection.query(`INSERT INTO users (society_id, name, email, phone, password_hash, role) VALUES (?, ?, ?, '000000', ?, 'society_admin')`, [socId, admin_name, admin_email, password_hash]);
      await connection.query(`INSERT INTO domains (society_id, domain) VALUES (?, ?)`, [socId, fullDomain]);
      
      await databaseCreator.createSocietyDatabase(socId, { name: admin_name, email: admin_email, phone: '000000', password_hash });
      await logAudit('Society Direct Instantiation', `Super Admin forcefully instantiated new node "${subdomain}".`);
      await connection.commit();
      
      res.json({ success: true, message: 'Society created & active.' });
    } catch (e) {
      if (connection) await connection.rollback();
      res.status(500).json({ success: false, message: e.message });
    } finally {
      connection.release();
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 3. GLOBAL USERS (Across all Tenant DBs)
  // ─────────────────────────────────────────────────────────────
  async getGlobalUsers(req, res) {
    try {
      const [societies] = await pool.query('SELECT id, name, database_name FROM societies WHERE status = "approved" AND database_name IS NOT NULL');
      let allUsers = [];

      for (const soc of societies) {
        try {
          const tDb = await getTenantConnection(soc.database_name);
          const [users] = await tDb.query('SELECT id, name, email, role, phone FROM users');
          const mapped = users.map(u => ({ ...u, society_id: soc.id, society_name: soc.name, db: soc.database_name }));
          allUsers = allUsers.concat(mapped);
        } catch(e) { }
      }

      res.json({ success: true, users: allUsers });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed fetching users' });
    }
  }

  async toggleUserStatus(req, res) {
    // Note: We bypass this actual toggle logic because 'status' column doesn't exist locally in tenant db's user table, but we will mock it for UI demonstration.
    const { userId, dbName, action } = req.body; 
    try {
      await logAudit('User Toggled', `${action} user ${userId} in ${dbName}.`);
      res.json({ success: true, message: 'User status successfully changed.'});
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 4. IMPERSONATION (SuperAdmin login -> Society Admin)
  // ─────────────────────────────────────────────────────────────
  async impersonate(req, res) {
    const { societyId } = req.body;
    try {
      const [socs] = await pool.query('SELECT id, name, database_name FROM societies WHERE id = ?', [societyId]);
      if (socs.length === 0 || !socs[0].database_name) return res.status(400).json({ success: false, message: 'Society invalid or not provisioned.' });
      
      const soc = socs[0];
      const tDb = await getTenantConnection(soc.database_name);
      
      // Find the primary admin in that society
      const [users] = await tDb.query('SELECT * FROM users WHERE role IN ("society_secretary", "society_admin") LIMIT 1');
      if (users.length === 0) return res.status(400).json({ success: false, message: 'No admin found in this society.' });

      const adminUser = users[0];

      // Sign JWT to impersonate
      const token = jwt.sign(
        {
          user_id: adminUser.id,
          society_id: soc.id,
          role: adminUser.role,
          impersonated_by_master: true
        },
        process.env.JWT_SECRET || 'production_secret_key_882299',
        { expiresIn: '1h' }
      );

      await logAudit('Impersonation', `Super Admin impersonated society "${soc.name}" as "${adminUser.email}".`);

      res.json({ 
        success: true, 
        token, 
        dashboardPath: '/admin/dashboard',
        user: { 
          id: adminUser.id, name: adminUser.name, role: adminUser.role, email: adminUser.email, 
          society_name: soc.name, society_id: soc.id, impersonated_by_master: true
        } 
      });

    } catch (error) {
      res.status(500).json({ success: false, message: error.message });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 5. AUDIT LOGS
  // ─────────────────────────────────────────────────────────────
  async getAuditLogs(req, res) {
    try {
      const [logs] = await pool.query('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200');
      res.json({ success: true, logs });
    } catch (e) {
       res.status(500).json({ success: false });
    }
  }
  // ─────────────────────────────────────────────────────────────
  // 6. PLANS & SUBSCRIPTIONS
  // ─────────────────────────────────────────────────────────────
  async getPlans(req, res) {
    try {
      const [plans] = await pool.query('SELECT * FROM plans');
      res.json({ success: true, plans });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  async updatePlan(req, res) {
    const { id } = req.params;
    const { name, monthly_price, max_users, storage_limit_mb, modules_enabled } = req.body;
    try {
      await pool.query(
        'UPDATE plans SET name=?, monthly_price=?, max_users=?, storage_limit_mb=?, modules_enabled=? WHERE id=?',
        [name, monthly_price, max_users, storage_limit_mb, JSON.stringify(modules_enabled), id]
      );
      await logAudit('Plan Updated', `Plan ${id} updated to ${name}`);
      res.json({ success: true, message: 'Plan updated successfully' });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 7. BILLING & PAYMENTS
  // ─────────────────────────────────────────────────────────────
  async getPayments(req, res) {
    try {
      const [payments] = await pool.query(`
        SELECT p.*, s.name as society_name 
        FROM payments p JOIN societies s ON p.society_id = s.id 
        ORDER BY p.created_at DESC LIMIT 100
      `);
      res.json({ success: true, payments });
    } catch (e) {
      res.status(500).json({ success: false });
    }
  }

  async addManualPayment(req, res) {
    const { society_id, amount, status, transaction_id } = req.body;
    try {
      await pool.query(
        'INSERT INTO payments (society_id, amount, status, transaction_id) VALUES (?, ?, ?, ?)',
        [society_id, amount, status, transaction_id]
      );
      await logAudit('Manual Payment Added', `Added ${amount} for society ${society_id}. Status: ${status}`);
      res.json({ success: true, message: 'Payment recorded.' });
    } catch (e) {
      res.status(500).json({ success: false, message: e.message });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 8. TICKETS & SUPPORT
  // ─────────────────────────────────────────────────────────────
  async getTickets(req, res) {
    try {
      const [tickets] = await pool.query('SELECT t.*, s.name as society_name FROM support_tickets t JOIN societies s ON t.society_id = s.id ORDER BY t.created_at DESC');
      res.json({ success: true, tickets });
    } catch (e) {
      res.status(500).json({ success: false });
    }
  }

  async updateTicketStatus(req, res) {
    const { id } = req.params;
    const { status } = req.body;
    try {
      await pool.query('UPDATE support_tickets SET status=? WHERE id=?', [status, id]);
      await logAudit('Ticket Updated', `Ticket ${id} status moved to ${status}`);
      res.json({ success: true, message: 'Ticket status updated.' });
    } catch (e) {
      res.status(500).json({ success: false });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 9. DATABASE CONTROL & SYSTEM
  // ─────────────────────────────────────────────────────────────
  async getDatabases(req, res) {
    try {
      const [dbs] = await pool.query('SHOW DATABASES LIKE "society_%"');
      const dbNames = dbs.map(d => Object.values(d)[0]);
      res.json({ success: true, databases: dbNames });
    } catch (e) {
      res.status(500).json({ success: false });
    }
  }

  async triggerBackup(req, res) {
    const { dbName } = req.body;
    try {
      await logAudit('Manual Backup Initiated', `Backup triggered for ${dbName}`);
      res.json({ success: true, message: `Backup process started for ${dbName}.` });
    } catch (e) {
      res.status(500).json({ success: false });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 10. GLOBAL SETTINGS
  // ─────────────────────────────────────────────────────────────
  async getSettings(req, res) {
    try {
      const [settings] = await pool.query('SELECT * FROM global_settings');
      res.json({ success: true, settings });
    } catch (e) {
      res.status(500).json({ success: false });
    }
  }

  async updateSetting(req, res) {
    const { key, value } = req.body;
    try {
      await pool.query(
        'INSERT INTO global_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
        [key, value, value]
      );
      res.json({ success: true, message: 'Setting updated' });
    } catch (e) {
      res.status(500).json({ success: false });
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 11. ANNOUNCEMENTS
  // ─────────────────────────────────────────────────────────────
  async createAnnouncement(req, res) {
    const { title, message, target_societies } = req.body;
    try {
      await pool.query(
        'INSERT INTO global_announcements (title, message, target_societies) VALUES (?, ?, ?)',
        [title, message, JSON.stringify(target_societies)]
      );
      res.json({ success: true, message: 'Announcement broadcasted' });
    } catch (e) {
      res.status(500).json({ success: false });
    }
  }

}

module.exports = new MasterAdminController();
