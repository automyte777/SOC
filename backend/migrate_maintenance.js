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

      // 1. maintenance_config
      await conn.query(`
        CREATE TABLE IF NOT EXISTS maintenance_config (
          id INT AUTO_INCREMENT PRIMARY KEY,
          amount DECIMAL(10,2) NOT NULL,
          start_date DATE NOT NULL,
          is_active TINYINT(1) DEFAULT 1,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 2. maintenance
      await conn.query(`
        CREATE TABLE IF NOT EXISTS maintenance (
          id INT AUTO_INCREMENT PRIMARY KEY,
          flat_id INT NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          month VARCHAR(10) NOT NULL COMMENT 'YYYY-MM',
          due_date DATE NOT NULL,
          status ENUM('Pending', 'Initiated', 'Paid') DEFAULT 'Pending',
          payment_id VARCHAR(100) NULL,
          transaction_id VARCHAR(100) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE CASCADE,
          UNIQUE KEY uq_maintenance_flat_month (flat_id, month)
        )
      `);

      // 3. extra_charges
      await conn.query(`
        CREATE TABLE IF NOT EXISTS extra_charges (
          id INT AUTO_INCREMENT PRIMARY KEY,
          title VARCHAR(150) NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          created_by INT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // 4. extra_charge_assignments
      await conn.query(`
        CREATE TABLE IF NOT EXISTS extra_charge_assignments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          charge_id INT NOT NULL,
          flat_id INT NOT NULL,
          status ENUM('Pending', 'Initiated', 'Paid') DEFAULT 'Pending',
          payment_id VARCHAR(100) NULL,
          transaction_id VARCHAR(100) NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (charge_id) REFERENCES extra_charges(id) ON DELETE CASCADE,
          FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE CASCADE,
          UNIQUE KEY uq_assignment_charge_flat (charge_id, flat_id)
        )
      `);

      console.log(`  ✅  Maintenance Tables Created`);
    } catch (e) {
      console.error(`  ❌  Failed in ${dbName}: ${e.message}`);
    }
  }

  await conn.end();
  console.log('\n✅  Maintenance Migration complete.');
  process.exit(0);
}

migrate().catch(e => { console.error(e); process.exit(1); });
