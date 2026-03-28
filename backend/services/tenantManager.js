const mysql = require('mysql2/promise');
require('dotenv').config();

// Cache for tenant connection pools
const tenantPools = {};

/**
 * Creates or retrieves a connection pool for a specific tenant database.
 */
const getTenantConnection = async (dbName) => {
  if (tenantPools[dbName]) {
    return tenantPools[dbName];
  }

  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: process.env.DB_PORT || 3306,
    database: dbName,
    waitForConnections: true,
    connectionLimit: 2, // Vercel is stateless; each function call only needs 1.
    maxIdle: 2,
    idleTimeout: 30000,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0
  });

  tenantPools[dbName] = pool;
  return pool;
};

module.exports = { getTenantConnection };
