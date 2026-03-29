/**
 * migrate_staff_auth.js
 * Adds username/password_hash/staff_role to the `staff` table in every
 * tenant (society_*) database, and creates gate_passes & daily_logs tables.
 *
 * Run: node backend/migrate_staff_auth.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const connection = await mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: true,
  });

  const [dbs] = await connection.query('SHOW DATABASES LIKE "society_%"');
  if (dbs.length === 0) {
    console.log('No society databases found. Exiting.');
    process.exit(0);
  }

  for (const dbRow of dbs) {
    const dbName = Object.values(dbRow)[0];
    console.log(`\n🔧  Migrating: ${dbName}`);

    try {
      await connection.query(`USE \`${dbName}\``);

      // 1. Add auth columns to staff table (ignore if already exist)
      const staffAlters = [
        `ALTER TABLE staff ADD COLUMN username VARCHAR(100) UNIQUE AFTER name`,
        `ALTER TABLE staff ADD COLUMN password_hash VARCHAR(255) AFTER username`,
        `ALTER TABLE staff ADD COLUMN staff_role ENUM('Security','Cleaner','Manager','Gardener','Plumber','Electrician') AFTER password_hash`,
        `ALTER TABLE staff ADD COLUMN is_active TINYINT(1) DEFAULT 1 AFTER staff_role`,
      ];
      for (const sql of staffAlters) {
        await connection.query(sql).catch(e => {
          if (!['ER_DUP_FIELDNAME', 'ER_DUP_KEYNAME', 'ER_TABLE_EXISTS_ERROR'].includes(e.code)) {
            console.warn(`  ⚠  staff alter skipped: ${e.message}`);
          }
        });
      }

      // 2. Create gate_passes table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS gate_passes (
          id            INT AUTO_INCREMENT PRIMARY KEY,
          flat_id       INT,
          resident_name VARCHAR(200),
          pass_type     ENUM('delivery','guest','service','vehicle','other') DEFAULT 'guest',
          valid_from    DATETIME,
          valid_until   DATETIME,
          qr_code       VARCHAR(500),
          issued_by     INT COMMENT 'staff.id',
          status        ENUM('active','expired','used','revoked') DEFAULT 'active',
          created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE SET NULL
        )
      `);

      // 3. Create daily_logs table (shift event log)
      await connection.query(`
        CREATE TABLE IF NOT EXISTS daily_logs (
          id          INT AUTO_INCREMENT PRIMARY KEY,
          staff_id    INT,
          log_type    ENUM('shift_start','shift_end','incident','note','visitor_entry','visitor_exit') DEFAULT 'note',
          description TEXT NOT NULL,
          flat_id     INT,
          created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE SET NULL,
          FOREIGN KEY (flat_id)  REFERENCES flats(id)  ON DELETE SET NULL
        )
      `);

      console.log(`  ✅  Done: ${dbName}`);
    } catch (e) {
      console.error(`  ❌  Failed: ${dbName} — ${e.message}`);
    }
  }

  await connection.end();
  console.log('\n✅  Migration complete.');
  process.exit(0);
}

migrate().catch(e => { console.error(e); process.exit(1); });
