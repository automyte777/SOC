/**
 * SSE Manager — manages Server-Sent Event connections per tenant.
 * Emits targeted events so only affected dashboard sections re-render.
 */

// Map<tenantDbName, Set<res>>
const clients = new Map();

/**
 * Register an SSE client response object.
 * @param {string} tenantKey  e.g. society database_name
 * @param {object} res        Express response object
 */
function addClient(tenantKey, res) {
  if (!clients.has(tenantKey)) {
    clients.set(tenantKey, new Set());
  }
  clients.get(tenantKey).add(res);
}

/**
 * Remove a client (on disconnect).
 */
function removeClient(tenantKey, res) {
  const set = clients.get(tenantKey);
  if (set) {
    set.delete(res);
    if (set.size === 0) clients.delete(tenantKey);
  }
}

/**
 * Emit an SSE event to all connected clients for a tenant.
 * @param {string} tenantKey
 * @param {string} eventType  e.g. 'stats', 'maintenance', 'ads'
 * @param {object} payload
 */
function emit(tenantKey, eventType, payload) {
  const set = clients.get(tenantKey);
  if (!set || set.size === 0) return;

  const data = `event: ${eventType}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const res of set) {
    try {
      res.write(data);
    } catch (e) {
      // Client likely disconnected; clean up on next heartbeat
      set.delete(res);
    }
  }
}

/**
 * Broadcast a heartbeat to keep connections alive (called externally).
 */
function heartbeat() {
  for (const [tenantKey, set] of clients.entries()) {
    for (const res of set) {
      try {
        res.write(': ping\n\n');
      } catch {
        set.delete(res);
      }
    }
    if (set.size === 0) clients.delete(tenantKey);
  }
}

// Keep-alive every 25 seconds (before most 30-sec proxy timeouts)
setInterval(heartbeat, 25000);

module.exports = { addClient, removeClient, emit, clients };
