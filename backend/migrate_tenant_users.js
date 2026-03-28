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
      await connection.query(`ALTER TABLE users 
        ADD COLUMN is_approved BOOLEAN DEFAULT TRUE,
        ADD COLUMN status ENUM('pending', 'active', 'rejected') DEFAULT 'active',
        ADD COLUMN flat_number VARCHAR(100),
        ADD COLUMN block VARCHAR(100)
      `);
      console.log(`Success on ${dbName}`);
    } catch (e) {
      if (e.code === 'ER_DUP_FIELDNAME') {
        console.log(`Already migrated ${dbName}`);
      } else {
        console.error(`Failed on ${dbName}`, e.message);
      }
    }
  }
  process.exit();
}
migrate();
