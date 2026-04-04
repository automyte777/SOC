/**
 * ONE-TIME MIGRATION ROUTE
 * Use this to apply the missing gate_passes schema to all existing databases on production.
 * Delete after use.
 */
const express = require('express');
const mysql = require('mysql2/promise');
const router = express.Router();

router.get('/run-migration-777', async (req, res) => {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT
    });

    const [dbs] = await connection.query('SHOW DATABASES LIKE "society_%_db"');
    
    const gatePassSchema = `
      CREATE TABLE IF NOT EXISTS gate_passes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        society_id INT,
        flat_id INT NULL,
        guest_name VARCHAR(255) NOT NULL,
        mobile VARCHAR(50) NOT NULL,
        purpose VARCHAR(255) NOT NULL,
        pass_code VARCHAR(100) NOT NULL UNIQUE,
        qr_code_path VARCHAR(255),
        status ENUM('APPROVED', 'EXPIRED', 'USED', 'DENIED') DEFAULT 'APPROVED',
        valid_from DATETIME NOT NULL,
        valid_until DATETIME NOT NULL,
        created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (flat_id) REFERENCES flats(id) ON DELETE SET NULL,
        FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      );
    `;

    const entryLogsSchema = `
      CREATE TABLE IF NOT EXISTS entry_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        pass_id INT,
        entry_time DATETIME,
        exit_time DATETIME NULL,
        verified_by INT,
        status ENUM('IN', 'OUT') DEFAULT 'IN',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (pass_id) REFERENCES gate_passes(id) ON DELETE CASCADE,
        FOREIGN KEY (verified_by) REFERENCES users(id) ON DELETE SET NULL
      );
    `;

    let upgraded = [];
    for (const row of dbs) {
      const dbName = Object.values(row)[0];
      await connection.query(`USE \`${dbName}\``);
      await connection.query(gatePassSchema);
      await connection.query(entryLogsSchema);
      upgraded.push(dbName);
    }
    
    await connection.end();
    
    res.json({ success: true, message: 'Databases upgraded', upgraded });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
});

module.exports = router;
