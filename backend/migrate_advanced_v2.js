/**
 * migrate_advanced_v2.js
 * Advanced Society SaaS features migration:
 *   - deliveries table
 *   - emergency_alerts table
 *   - audit_logs table
 *   - staff_shifts table
 *   - staff_attendance table
 *   - notices enhancements (priority, broadcast flag)
 *   - gate_passes QR scan tracking
 *
 * Run: node backend/migrate_advanced_v2.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

async function migrate() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  });

  const [dbs] = await conn.query('SHOW DATABASES LIKE "society_%"');
  if (!dbs.length) { console.log('No society DBs found.'); process.exit(0); }

  for (const dbRow of dbs) {
    const dbName = Object.values(dbRow)[0];
    console.log(`\n🔧  ${dbName}`);
    try {
      await conn.query(`USE \`${dbName}\``);

      // ── 1. deliveries ──────────────────────────────────────────────
      await conn.query(`
        CREATE TABLE IF NOT EXISTS deliveries (
          id            INT AUTO_INCREMENT PRIMARY KEY,
          courier_name  VARCHAR(200) NOT NULL,
          tracking_no   VARCHAR(200) NULL,
          flat_id       INT NULL,
          received_by   INT NULL COMMENT 'staff.id',
          status        ENUM('received','notified','collected','returned') DEFAULT 'received',
          photo_url     MEDIUMTEXT NULL,
          notes         TEXT NULL,
          received_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          collected_at  DATETIME NULL,
          FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE SET NULL
        )
      `);

      // ── 2. emergency_alerts ────────────────────────────────────────
      await conn.query(`
        CREATE TABLE IF NOT EXISTS emergency_alerts (
          id          INT AUTO_INCREMENT PRIMARY KEY,
          raised_by   INT NULL COMMENT 'staff.id',
          alert_type  ENUM('panic','fire','medical','theft','other') DEFAULT 'panic',
          location    VARCHAR(300) NULL,
          description TEXT NULL,
          status      ENUM('active','acknowledged','resolved') DEFAULT 'active',
          resolved_by INT NULL COMMENT 'user.id',
          resolved_at DATETIME NULL,
          created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // ── 3. audit_logs ──────────────────────────────────────────────
      await conn.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id          INT AUTO_INCREMENT PRIMARY KEY,
          actor_type  ENUM('staff','user','system') DEFAULT 'staff',
          actor_id    INT NULL,
          actor_name  VARCHAR(200) NULL,
          action      VARCHAR(100) NOT NULL,
          entity_type VARCHAR(100) NULL,
          entity_id   INT NULL,
          details     TEXT NULL,
          ip_address  VARCHAR(50) NULL,
          created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // ── 4. staff_shifts ────────────────────────────────────────────
      await conn.query(`
        CREATE TABLE IF NOT EXISTS staff_shifts (
          id          INT AUTO_INCREMENT PRIMARY KEY,
          staff_id    INT NOT NULL,
          shift_date  DATE NOT NULL,
          clock_in    DATETIME NULL,
          clock_out   DATETIME NULL,
          duration_min INT NULL COMMENT 'calculated on clock-out',
          notes       TEXT NULL,
          created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
        )
      `);

      // ── 5. staff_attendance ────────────────────────────────────────
      await conn.query(`
        CREATE TABLE IF NOT EXISTS staff_attendance (
          id          INT AUTO_INCREMENT PRIMARY KEY,
          staff_id    INT NOT NULL,
          att_date    DATE NOT NULL,
          status      ENUM('present','absent','half_day','leave') DEFAULT 'present',
          marked_by   INT NULL COMMENT 'user.id (secretary)',
          notes       TEXT NULL,
          created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          UNIQUE KEY uq_staff_date (staff_id, att_date),
          FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
        )
      `);

      // ── 6. notices enhancements ────────────────────────────────────
      await conn.query(`ALTER TABLE notices ADD COLUMN priority ENUM('normal','urgent','critical') DEFAULT 'normal' AFTER description`)
        .catch(e => { if (e.code !== 'ER_DUP_FIELDNAME') console.warn('  notices.priority:', e.message); });
      await conn.query(`ALTER TABLE notices ADD COLUMN is_broadcast TINYINT(1) DEFAULT 1 AFTER priority`)
        .catch(e => { if (e.code !== 'ER_DUP_FIELDNAME') console.warn('  notices.is_broadcast:', e.message); });

      // ── 7. gate_passes — scan tracking ────────────────────────────
      await conn.query(`ALTER TABLE gate_passes ADD COLUMN scanned_at DATETIME NULL AFTER status`)
        .catch(e => { if (e.code !== 'ER_DUP_FIELDNAME') console.warn('  gate_passes.scanned_at:', e.message); });
      await conn.query(`ALTER TABLE gate_passes ADD COLUMN scanned_by INT NULL AFTER scanned_at`)
        .catch(e => { if (e.code !== 'ER_DUP_FIELDNAME') console.warn('  gate_passes.scanned_by:', e.message); });

      // ── 8. visitors — track who logged entry (audit) ────────────
      await conn.query(`ALTER TABLE visitors ADD COLUMN logged_by_staff INT NULL AFTER exit_time`)
        .catch(e => { if (e.code !== 'ER_DUP_FIELDNAME') console.warn('  visitors.logged_by_staff:', e.message); });
      await conn.query(`ALTER TABLE visitors ADD COLUMN approved_by_user INT NULL AFTER logged_by_staff`)
        .catch(e => { if (e.code !== 'ER_DUP_FIELDNAME') console.warn('  visitors.approved_by_user:', e.message); });

      console.log(`  ✅  Done`);
    } catch (e) {
      console.error(`  ❌  Failed: ${e.message}`);
    }
  }

  await conn.end();
  console.log('\n✅  Advanced V2 Migration complete.');
  process.exit(0);
}

migrate().catch(e => { console.error(e); process.exit(1); });
