const mysql = require('mysql2/promise');
require('dotenv').config();

// Cache for tenant connection pools (in-memory, per serverless invocation)
const tenantPools = {};

/**
 * Creates or retrieves a connection pool for a specific tenant database.
 * Serverless-safe: connectionLimit=2, connectTimeout=10s.
 */
const getTenantConnection = async (dbName) => {
  if (tenantPools[dbName]) {
    return tenantPools[dbName];
  }

  const pool = mysql.createPool({
    host:     process.env.DB_HOST     || '127.0.0.1',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASS     || process.env.DB_PASSWORD || '',
    port:     parseInt(process.env.DB_PORT || '3306', 10),
    database: dbName,
    waitForConnections: true,
    connectionLimit: 2,    // Serverless: each fn only needs 1-2 connections
    maxIdle: 2,
    idleTimeout: 30000,
    queueLimit: 0,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    connectTimeout: 10000, // Fail fast if DB is unreachable
  });

  tenantPools[dbName] = pool;
  return pool;
};

module.exports = { getTenantConnection };

