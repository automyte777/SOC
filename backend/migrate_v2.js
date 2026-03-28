const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD
  });

  const [dbs] = await connection.query('SHOW DATABASES LIKE "society_%"');
  for (const dbRow of dbs) {
    const dbName = Object.values(dbRow)[0];
    console.log(`Migrating ${dbName}...`);
    try {
      await connection.query(`USE \`${dbName}\``);

      // 1. Update flats table
      await connection.query(`
        ALTER TABLE flats 
        ADD COLUMN block VARCHAR(50) NULL,
        ADD COLUMN flat_type VARCHAR(50) NULL,
        ADD COLUMN floor INT NULL,
        ADD COLUMN area INT NULL
      `).catch(e => {
        if (e.code !== 'ER_DUP_FIELDNAME') console.error('Flats alter error:', e.message);
      });

      // 2. Create vehicles table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS vehicles (
          id INT AUTO_INCREMENT PRIMARY KEY,
          flat_id INT NOT NULL,
          vehicle_number VARCHAR(50) NOT NULL,
          vehicle_type ENUM('2-wheeler', '4-wheeler') NOT NULL,
          owner_name VARCHAR(255),
          parking_slot VARCHAR(50),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE CASCADE
        )
      `);

      // 3. Update complaints table
      await connection.query(`
        ALTER TABLE complaints 
        ADD COLUMN category VARCHAR(100) NULL,
        ADD COLUMN created_by INT NULL,
        ADD FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      `).catch(e => {
        if (e.code !== 'ER_DUP_FIELDNAME') console.error('Complaints alter error:', e.message);
      });

      // 4. Update maintenance table
      await connection.query(`
        ALTER TABLE maintenance 
        ADD COLUMN billing_month VARCHAR(20) NULL,
        ADD COLUMN paid_amount DECIMAL(10,2) DEFAULT 0,
        ADD COLUMN paid_at TIMESTAMP NULL
      `).catch(e => {
        if (e.code !== 'ER_DUP_FIELDNAME') console.error('Maintenance alter error:', e.message);
      });

      console.log(`Success on ${dbName}`);
    } catch (e) {
      console.error(`Failed on ${dbName}`, e.message);
    }
  }
  process.exit();
}
migrate();
