/**
 * Ad Analytics Migration
 * Creates `ad_analytics` table in saas_master_db.
 * Run: node backend/migrate_ad_analytics.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const pool = require('./database/db');

async function migrateAdAnalytics() {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('--- Running Ad Analytics Migration ---');

    await connection.query(`
      CREATE TABLE IF NOT EXISTS ad_analytics (
        id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        ad_id       INT            NOT NULL,
        society_id  INT            NOT NULL,
        user_id     INT            DEFAULT NULL,
        event_type  ENUM('impression','click') NOT NULL,
        device_type ENUM('mobile','desktop')   NOT NULL DEFAULT 'desktop',
        created_at  TIMESTAMP      DEFAULT CURRENT_TIMESTAMP,

        INDEX idx_aa_ad_id     (ad_id),
        INDEX idx_aa_society   (society_id),
        INDEX idx_aa_event     (event_type),
        INDEX idx_aa_created   (created_at),

        CONSTRAINT fk_aa_ad FOREIGN KEY (ad_id) REFERENCES ads(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Table "ad_analytics" checked/created.');

    console.log('--- Ad Analytics Migration Complete ---');
  } catch (err) {
    console.error('❌ Ad Analytics Migration Failed:', err.message);
  } finally {
    if (connection) connection.release();
    process.exit(0);
  }
}

migrateAdAnalytics();
