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

      // 1. Update users table with new columns
      await connection.query(`
        ALTER TABLE users 
        ADD COLUMN rental_start_date DATE NULL,
        ADD COLUMN rental_end_date DATE NULL,
        ADD COLUMN is_primary_owner BOOLEAN DEFAULT FALSE,
        MODIFY COLUMN role ENUM('society_secretary','home_owner','home_member','tenant','security_guard') DEFAULT 'home_owner'
      `).catch(e => {
        if (e.code !== 'ER_DUP_FIELDNAME') console.error('Users alter error:', e.message);
      });

      // 2. Update visitors table status ENUM
      await connection.query(`
        ALTER TABLE visitors 
        MODIFY COLUMN status ENUM('pending_approval', 'approved', 'rejected', 'entered', 'exited') DEFAULT 'pending_approval'
      `).catch(e => console.error('Visitors alter error:', e.message));

      // 3. Create notifications table
      await connection.query(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NULL,
          role_target ENUM('society_secretary', 'security_guard', 'all') NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT,
          is_read BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      console.log(`Success on ${dbName}`);
    } catch (e) {
      console.error(`Failed on ${dbName}`, e.message);
    }
  }
  process.exit();
}
migrate();
