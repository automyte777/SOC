/**
 * In-memory cache with per-key TTL and manual invalidation.
 * Falls back gracefully when Redis is not configured (no external dependency).
 *
 * Usage:
 *   const cache = require('./cacheService');
 *   cache.set('key', data, 45);       // TTL 45 seconds
 *   const v = cache.get('key');       // null if expired/missing
 *   cache.invalidate('key');
 *   cache.invalidatePrefix('tenant_abc123_'); // clear all keys for a tenant
 */

const store = new Map(); // Map<key, { value, expiresAt }>

/**
 * Store a value with a TTL in seconds.
 */
function set(key, value, ttlSeconds = 60) {
  store.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

/**
 * Retrieve a cached value. Returns null if missing or expired.
 */
function get(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.value;
}

/**
 * Delete a single key.
 */
function invalidate(key) {
  store.delete(key);
}

/**
 * Delete all keys that start with prefix (e.g., all keys for a tenant).
 */
function invalidatePrefix(prefix) {
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

/**
 * Wrap an async data-fetching function with caching.
 * If the value is cached it is returned immediately; otherwise fn() is called,
 * the result cached, and then returned.
 */
async function wrap(key, fn, ttlSeconds = 60) {
  const cached = get(key);
  if (cached !== null) return cached;
  const value = await fn();
  set(key, value, ttlSeconds);
  return value;
}

// Periodically purge expired entries to avoid memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now > entry.expiresAt) store.delete(key);
  }
}, 60_000);

module.exports = { set, get, invalidate, invalidatePrefix, wrap };
