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

      // Drop old legacy tables and rewrite schema
      await connection.query('SET FOREIGN_KEY_CHECKS = 0');
      await connection.query('DROP TABLE IF EXISTS entry_logs');
      await connection.query('DROP TABLE IF EXISTS gate_passes');
      await connection.query('SET FOREIGN_KEY_CHECKS = 1');

      // Create gate_passes table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS gate_passes (
          id INT AUTO_INCREMENT PRIMARY KEY,
          society_id INT NULL,
          flat_id INT NULL,
          guest_name VARCHAR(100) NOT NULL,
          mobile VARCHAR(20) NOT NULL,
          purpose VARCHAR(100) NOT NULL,
          pass_code VARCHAR(100) UNIQUE NOT NULL,
          qr_code_path VARCHAR(255) NULL,
          status ENUM('PENDING', 'APPROVED', 'USED', 'EXPIRED') DEFAULT 'APPROVED',
          valid_from DATETIME NOT NULL,
          valid_until DATETIME NOT NULL,
          created_by INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
        )
      `);
      console.log('  ✅  gate_passes table created or verified.');

      // Create entry_logs table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS entry_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          pass_id INT NULL,
          entry_time DATETIME NULL,
          exit_time DATETIME NULL,
          verified_by INT NULL,
          status ENUM('IN', 'OUT') DEFAULT 'IN',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (pass_id) REFERENCES gate_passes(id) ON DELETE CASCADE,
          FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
        )
      `);
      console.log('  ✅  entry_logs table created or verified.');

      console.log(`  ✅  Done: ${dbName}`);
    } catch (e) {
      console.error(`  ❌  Failed: ${dbName} — ${e.message}`);
    }
  }

  await connection.end();
  console.log('\n✅  Gate Pass Migration complete.');
  process.exit(0);
}

migrate().catch(e => {
  console.error(e);
  process.exit(1);
});
