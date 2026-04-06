/**
 * Ads System Migration
 * Creates the `ads` table in saas_master_db with all required fields.
 * Run: node backend/migrate_ads.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const pool = require('./database/db');

async function migrateAds() {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('--- Running Ads Migration ---');

    // Create ads table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS ads (
        id           INT AUTO_INCREMENT PRIMARY KEY,
        title        VARCHAR(255)  NOT NULL,
        description  TEXT          NOT NULL,
        image_url    VARCHAR(500)  DEFAULT NULL,
        cta_link     VARCHAR(500)  DEFAULT NULL,
        phone_number VARCHAR(30)   DEFAULT NULL,
        society_ids  JSON          NOT NULL DEFAULT ('[]'),
        start_date   DATE          NOT NULL,
        end_date     DATE          NOT NULL,
        is_active    TINYINT(1)    NOT NULL DEFAULT 1,
        created_by   VARCHAR(100)  DEFAULT 'master_admin',
        created_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
        updated_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_is_active  (is_active),
        INDEX idx_start_date (start_date),
        INDEX idx_end_date   (end_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table "ads" checked/created.');

    console.log('--- Ads Migration Complete ---');
  } catch (err) {
    console.error('❌ Ads Migration Failed:', err.message);
  } finally {
    if (connection) connection.release();
    process.exit(0);
  }
}

migrateAds();
