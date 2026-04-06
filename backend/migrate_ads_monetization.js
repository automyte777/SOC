/**
 * Ads Monetization Migration
 * Adds price, payment_status, payment_method, client_name, client_contact
 * to the existing `ads` table in saas_master_db.
 * Run: node backend/migrate_ads_monetization.js
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const pool = require('./database/db');

async function migrate() {
  let conn;
  try {
    conn = await pool.getConnection();
    console.log('--- Running Ads Monetization Migration ---');

    const alterations = [
      `ALTER TABLE ads ADD COLUMN IF NOT EXISTS client_name     VARCHAR(255)  DEFAULT NULL`,
      `ALTER TABLE ads ADD COLUMN IF NOT EXISTS client_contact  VARCHAR(50)   DEFAULT NULL`,
      `ALTER TABLE ads ADD COLUMN IF NOT EXISTS price           DECIMAL(10,2) DEFAULT 0.00`,
      `ALTER TABLE ads ADD COLUMN IF NOT EXISTS payment_status  ENUM('pending','paid') DEFAULT 'pending'`,
      `ALTER TABLE ads ADD COLUMN IF NOT EXISTS payment_method  VARCHAR(50)   DEFAULT 'manual'`,
    ];

    for (const sql of alterations) {
      try {
        await conn.query(sql);
        console.log(`✅ ${sql.split('ADD COLUMN IF NOT EXISTS')[1]?.trim().split(' ')[0] ?? sql.slice(0, 60)}`);
      } catch (e) {
        if (e.message.includes('Duplicate') || e.message.includes('already exists')) {
          console.log(`   (already exists — skipped)`);
        } else {
          throw e;
        }
      }
    }

    // Add index on payment_status for revenue queries
    try {
      await conn.query(`ALTER TABLE ads ADD INDEX idx_payment_status (payment_status)`);
      console.log('✅ Index idx_payment_status added.');
    } catch (_) { console.log('   (index already exists — skipped)'); }

    console.log('--- Ads Monetization Migration Complete ---');
  } catch (err) {
    console.error('❌ Migration Failed:', err.message);
  } finally {
    if (conn) conn.release();
    process.exit(0);
  }
}

migrate();
