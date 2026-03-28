const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: 'saas_master_db'
  });

  try {
    await c.query('ALTER TABLE plans ADD COLUMN max_users INT DEFAULT 100');
  } catch(e) {}
  try {
    await c.query('ALTER TABLE plans ADD COLUMN storage_limit_mb INT DEFAULT 1024');
  } catch(e) {}
  try {
    await c.query('ALTER TABLE plans ADD COLUMN modules_enabled JSON');
  } catch(e) {}

  await c.query(`CREATE TABLE IF NOT EXISTS global_announcements (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    target_societies JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`);

  await c.query(`CREATE TABLE IF NOT EXISTS support_tickets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    society_id INT NOT NULL,
    created_by_email VARCHAR(255),
    subject VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    status ENUM('Open','In Progress','Closed') DEFAULT 'Open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE
  )`);

  await c.query(`CREATE TABLE IF NOT EXISTS ticket_replies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    ticket_id INT NOT NULL,
    sender_type ENUM('admin','master') NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE
  )`);

  await c.query(`CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    society_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status ENUM('Paid','Pending','Overdue') DEFAULT 'Pending',
    transaction_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (society_id) REFERENCES societies(id) ON DELETE CASCADE
  )`);

  await c.query(`CREATE TABLE IF NOT EXISTS global_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT
  )`);

  console.log('DB Updated');
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
