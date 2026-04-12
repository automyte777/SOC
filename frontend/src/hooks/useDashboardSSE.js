/**
 * useDashboardSSE — React hook for SSE-based real-time dashboard updates.
 *
 * On mount, opens an EventSource to /api/stream/dashboard?token=<jwt>.
 * Each SSE event type ('stats', 'maintenance', 'ads', 'analytics') triggers
 * only the matching refresh callback — no full-page reload.
 *
 * Features:
 *  • Auto-reconnect with exponential back-off (max 30 s)
 *  • Cleans up on unmount
 *  • Returns { connected } status for UI indicator
 */
import { useEffect, useRef, useState, useCallback } from 'react';

const BASE_BACKOFF = 1_000;
const MAX_BACKOFF  = 30_000;

/**
 * @param {object} handlers  { onStats, onMaintenance, onAds, onAnalytics }
 *                           Each is an optional async () => void callback
 *                           that fetches the relevant slice of data.
 */
export default function useDashboardSSE(handlers = {}) {
  const [connected, setConnected] = useState(false);
  const esRef      = useRef(null);
  const backoffRef = useRef(BASE_BACKOFF);
  const timerRef   = useRef(null);
  const mountedRef = useRef(true);

  const { onStats, onMaintenance, onAds, onAnalytics } = handlers;

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    const token = localStorage.getItem('token');
    if (!token) return; // Not authenticated, skip

    // Build the stream URL — works in both dev (proxy) and prod
    const url = `/api/stream/dashboard?token=${encodeURIComponent(token)}`;
    const es  = new EventSource(url);
    esRef.current = es;

    es.onopen = () => {
      if (!mountedRef.current) return;
      setConnected(true);
      backoffRef.current = BASE_BACKOFF; // reset on success
    };

    // Connected handshake
    es.addEventListener('connected', () => {
      if (!mountedRef.current) return;
      setConnected(true);
    });

    // Stats changed (new resident, flat, visitor, maintenance payment)
    es.addEventListener('stats', () => {
      if (mountedRef.current && onStats) onStats();
    });

    // Maintenance section changed
    es.addEventListener('maintenance', () => {
      if (mountedRef.current && onMaintenance) onMaintenance();
    });

    // Ads section changed
    es.addEventListener('ads', () => {
      if (mountedRef.current && onAds) onAds();
    });

    // Analytics counters changed
    es.addEventListener('analytics', () => {
      if (mountedRef.current && onAnalytics) onAnalytics();
    });

    es.onerror = () => {
      if (!mountedRef.current) return;
      es.close();
      setConnected(false);
      // Exponential back-off before reconnect
      backoffRef.current = Math.min(backoffRef.current * 2, MAX_BACKOFF);
      timerRef.current = setTimeout(connect, backoffRef.current);
    };
  }, [onStats, onMaintenance, onAds, onAnalytics]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      clearTimeout(timerRef.current);
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
    };
  }, [connect]);

  return { connected };
}
