/**
 * migrate_vms.js
 * Visitor Management System - DB enhancements
 * Adds: vehicle_number, photo_url to visitors
 *       Creates: visitor_notifications table
 *
 * Run: node backend/migrate_vms.js
 */

const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

async function migrate() {
  const connection = await mysql.createConnection({
    host:               process.env.DB_HOST,
    user:               process.env.DB_USER,
    password:           process.env.DB_PASSWORD,
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

      // 1. Add vehicle_number to visitors
      await connection.query(
        `ALTER TABLE visitors ADD COLUMN vehicle_number VARCHAR(30) NULL AFTER phone`
      ).catch(e => {
        if (e.code !== 'ER_DUP_FIELDNAME') console.warn('  ⚠  vehicle_number:', e.message);
      });

      // 2. Add photo_url to visitors (stores base64 or cloud URL)
      await connection.query(
        `ALTER TABLE visitors ADD COLUMN photo_url MEDIUMTEXT NULL AFTER vehicle_number`
      ).catch(e => {
        if (e.code !== 'ER_DUP_FIELDNAME') console.warn('  ⚠  photo_url:', e.message);
      });

      // 3. Add exit_time to visitors if not exists
      await connection.query(
        `ALTER TABLE visitors ADD COLUMN exit_time DATETIME NULL AFTER entry_time`
      ).catch(e => {
        if (e.code !== 'ER_DUP_FIELDNAME') console.warn('  ⚠  exit_time:', e.message);
      });

      // 4. Ensure entry_time has a default
      await connection.query(
        `ALTER TABLE visitors MODIFY COLUMN entry_time DATETIME DEFAULT CURRENT_TIMESTAMP`
      ).catch(() => {});

      // 5. Update visitors status ENUM (ensure all needed values)
      await connection.query(
        `ALTER TABLE visitors MODIFY COLUMN status 
         ENUM('pending_approval','approved','rejected','entered','exited') 
         DEFAULT 'pending_approval'`
      ).catch(e => console.warn('  ⚠  status enum:', e.message));

      // 6. Purpose ENUM standardisation (keep varchar flexible)
      await connection.query(
        `ALTER TABLE visitors MODIFY COLUMN purpose VARCHAR(100) NULL`
      ).catch(() => {});

      // 7. Create visitor_notifications table (tracks push/in-app per visitor)
      await connection.query(`
        CREATE TABLE IF NOT EXISTS visitor_notifications (
          id          INT AUTO_INCREMENT PRIMARY KEY,
          visitor_id  INT NOT NULL,
          user_id     INT NOT NULL,
          sent_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          is_read     TINYINT(1) DEFAULT 0,
          FOREIGN KEY (visitor_id) REFERENCES visitors(id) ON DELETE CASCADE,
          FOREIGN KEY (user_id)    REFERENCES users(id)    ON DELETE CASCADE
        )
      `);

      console.log(`  ✅  Done: ${dbName}`);
    } catch (e) {
      console.error(`  ❌  Failed: ${dbName} — ${e.message}`);
    }
  }

  await connection.end();
  console.log('\n✅  VMS Migration complete.');
  process.exit(0);
}

migrate().catch(e => {
  console.error(e);
  process.exit(1);
});
