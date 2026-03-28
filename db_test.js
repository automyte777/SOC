const mysql = require('mysql2/promise');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'backend/.env') });

async function verify() {
  console.log('Connecting to', process.env.DB_HOST);
  try {
    const conn = await mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: 'saas_master_db'
    });
    
    console.log('Connected! Checking societies columns...');
    const [cols] = await conn.query('SHOW COLUMNS FROM societies');
    console.log('Columns in societies:', cols.map(c => c.Field));
    
    await conn.end();
  } catch (e) {
    console.error('FAILED:', e.message);
  }
}

verify();
