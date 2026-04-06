const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const pool = require('./db');

/**
 * Initializes the master database schema if tables don't exist.
 * Also applies any safe migrations (ALTER TABLE ADD COLUMN IF NOT EXISTS).
 */
const initMasterDB = async () => {
  try {
    console.log('--- Initializing Master Database ---');

    // 0. Ensure saas_master_db exists
    const rootConnection = await mysql.createConnection({
      host:     process.env.DB_HOST || '127.0.0.1',
      user:     process.env.DB_USER || 'root',
      password: process.env.DB_PASS || process.env.DB_PASSWORD || '',
      port:     parseInt(process.env.DB_PORT || '3306', 10),
      connectTimeout: 10000,
    });

    await rootConnection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME || 'saas_master_db'}\``);
    await rootConnection.end();
    console.log('✅ Base database ensured.');

    // 1. Check connection with pool
    const connection = await pool.getConnection();
    console.log('✅ Pool Connection successful.');

    try {
      // ── societies ────────────────────────────────────────────────────
      // Create with full schema (new installations)
      await connection.query(`
        CREATE TABLE IF NOT EXISTS societies (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          subdomain VARCHAR(100) UNIQUE DEFAULT NULL,
          requested_subdomain VARCHAR(100) UNIQUE NOT NULL,
          city VARCHAR(255) NOT NULL,
          society_type VARCHAR(50) NOT NULL,
          total_units INT NOT NULL,
          database_name VARCHAR(255) UNIQUE DEFAULT NULL,
          plan_id INT,
          status ENUM('pending','approved','rejected') DEFAULT 'pending',
          approved_at DATETIME NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Table "societies" checked/created.');

      // Safe migrations for existing installations that have the old schema
      const migrations = [
        `ALTER TABLE societies ADD COLUMN IF NOT EXISTS requested_subdomain VARCHAR(100) UNIQUE`,
        `ALTER TABLE societies ADD COLUMN IF NOT EXISTS status ENUM('pending','approved','rejected') DEFAULT 'pending'`,
        `ALTER TABLE societies ADD COLUMN IF NOT EXISTS approved_at DATETIME NULL`,
        // Make subdomain nullable (was NOT NULL before) - safe if already nullable
        `ALTER TABLE societies MODIFY COLUMN subdomain VARCHAR(100) UNIQUE DEFAULT NULL`,
        `ALTER TABLE societies MODIFY COLUMN database_name VARCHAR(255) UNIQUE DEFAULT NULL`,
      ];

      for (const sql of migrations) {
        try {
          await connection.query(sql);
        } catch (e) {
          // Ignore: column already exists or type already correct
          if (!e.message.includes('Duplicate column') && !e.message.includes('already exists')) {
            console.warn(`  Migration warning: ${e.message}`);
          }
        }
      }
      console.log('✅ societies table migrations applied.');

      // ── users ────────────────────────────────────────────────────────
      await connection.query(`
        CREATE TABLE IF NOT EXISTS users (
          id INT AUTO_INCREMENT PRIMARY KEY,
          society_id INT,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) NOT NULL UNIQUE,
          phone VARCHAR(50),
          password_hash VARCHAR(255) NOT NULL,
          role VARCHAR(50) DEFAULT 'society_secretary',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Table "users" checked/created.');

      // ── domains ──────────────────────────────────────────────────────
      await connection.query(`
        CREATE TABLE IF NOT EXISTS domains (
          id INT AUTO_INCREMENT PRIMARY KEY,
          society_id INT NOT NULL,
          domain VARCHAR(255) NOT NULL UNIQUE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Table "domains" checked/created.');

      await connection.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          action VARCHAR(255) NOT NULL,
          details TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Table "audit_logs" checked/created.');

      // ── plans ────────────────────────────────────────────────────────
      await connection.query(`
        CREATE TABLE IF NOT EXISTS plans (
          id INT AUTO_INCREMENT PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          monthly_price DECIMAL(10, 2) NOT NULL,
          features TEXT NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Table "plans" checked/created.');

      // Seed plans if empty
      const [plansCount] = await connection.query('SELECT COUNT(*) as count FROM plans');
      if (plansCount[0].count === 0) {
        await connection.query(`
          INSERT INTO plans (name, monthly_price, features) VALUES
          ('Starter Plan', 9.99, '["Up to 50 Units", "Gate Visitor Management", "Notice Board"]'),
          ('Professional Plan', 29.99, '["Up to 200 Units", "Maintenance Collection", "Society Voting", "Event Management"]'),
          ('Enterprise Plan', 99.99, '["Unlimited Units", "Photo Gallery", "Plot Booking", "Premium Support"]')
        `);
        console.log('✅ Default plans seeded.');
      }

      // ── ads ──────────────────────────────────────────────────────────────
      await connection.query(`
        CREATE TABLE IF NOT EXISTS ads (
          id           INT AUTO_INCREMENT PRIMARY KEY,
          title        VARCHAR(255)  NOT NULL,
          description  TEXT          NOT NULL,
          image_url    VARCHAR(500)  DEFAULT NULL,
          cta_link     VARCHAR(500)  DEFAULT NULL,
          phone_number VARCHAR(30)   DEFAULT NULL,
          society_ids  JSON          NOT NULL DEFAULT (JSON_ARRAY()),
          start_date   DATE          NOT NULL,
          end_date     DATE          NOT NULL,
          is_active    TINYINT(1)    NOT NULL DEFAULT 1,
          created_by   VARCHAR(100)  DEFAULT 'master_admin',
          created_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
          updated_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_ads_active     (is_active),
          INDEX idx_ads_start_date (start_date),
          INDEX idx_ads_end_date   (end_date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Table "ads" checked/created.');

      // ── ad_analytics ──────────────────────────────────────────────────────
      await connection.query(`
        CREATE TABLE IF NOT EXISTS ad_analytics (
          id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
          ad_id       INT            NOT NULL,
          society_id  INT            NOT NULL,
          user_id     INT            DEFAULT NULL,
          event_type  ENUM('impression','click') NOT NULL,
          device_type ENUM('mobile','desktop')   NOT NULL DEFAULT 'desktop',
          created_at  TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,

          INDEX idx_aa_ad_id   (ad_id),
          INDEX idx_aa_society (society_id),
          INDEX idx_aa_event   (event_type),
          INDEX idx_aa_created (created_at),

          CONSTRAINT fk_aa_ad FOREIGN KEY (ad_id) REFERENCES ads(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log('✅ Table "ad_analytics" checked/created.');

    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('❌ Database Initialization Failed:', error.message);
    // Do NOT call process.exit(1) in serverless environments — it kills the function
    // The API will still serve requests; individual route errors will be caught per-request
  }
};

module.exports = { initMasterDB };
