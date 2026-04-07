const mysql = require('mysql2/promise');
require('dotenv').config();

async function addAnnouncements() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
  });

  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS global_announcements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        target_societies JSON DEFAULT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("global_announcements table created successfully.");
  } catch (err) {
    console.error(err);
  } finally {
    await connection.end();
  }
}

addAnnouncements();
