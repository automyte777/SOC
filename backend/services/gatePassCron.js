const cron = require('node-cron');
const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const startCron = () => {
  // Run every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    try {
      const [dbs] = await pool.query('SHOW DATABASES LIKE "society_%"');
      for (const dbRow of dbs) {
        const dbName = Object.values(dbRow)[0];
        try {
          const conn = await pool.getConnection();
          await conn.query(`USE \`${dbName}\``);
          
          await conn.query(`
            UPDATE gate_passes 
            SET status = 'EXPIRED' 
            WHERE valid_until < NOW() AND status != 'USED' AND status != 'EXPIRED'
          `);
          
          conn.release();
        } catch (dbErr) {
          console.error(`Error expiring passes in ${dbName}:`, dbErr.message);
        }
      }
    } catch (err) {
      console.error('Error fetching databases for cron:', err.message);
    }
  });
};

module.exports = startCron;
