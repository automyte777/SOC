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

      // 1. Update users table with flat_id
      await connection.query(`
        ALTER TABLE users 
        ADD COLUMN flat_id INT NULL,
        ADD FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE SET NULL
      `).catch(e => {
        if (e.code !== 'ER_DUP_FIELDNAME' && e.code !== 'ER_FK_DUP_NAME') console.error('Users alter error:', e.message);
      });

      // 2. Data consistency: backfill flat_id based on flat_number
      await connection.query(`
        UPDATE users u
        JOIN flats f ON LOWER(u.flat_number) = LOWER(f.flat_number)
        SET u.flat_id = f.id
        WHERE u.flat_id IS NULL
      `);

      console.log(`Success on ${dbName}`);
    } catch (e) {
      console.error(`Failed on ${dbName}`, e.message);
    }
  }
  process.exit();
}
migrate();
