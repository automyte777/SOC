const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:     process.env.DB_HOST     || '127.0.0.1',
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASS     || process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME     || 'saas_master_db',
  port:     parseInt(process.env.DB_PORT || '3306', 10),
  waitForConnections: true,
  connectionLimit: 3,   // Serverless-safe: Vercel functions are short-lived
  maxIdle: 3,
  idleTimeout: 30000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
  connectTimeout: 10000,// Fail fast if DB unreachable
});

module.exports = pool;
