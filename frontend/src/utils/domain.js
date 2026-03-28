/**
 * domain.js — Single source of truth for all domain/subdomain handling.
 *
 * Reads VITE_MAIN_DOMAIN from the environment.
 * Falls back to 'automytee.in' if the env var is missing.
 *
 * NEVER hardcode 'automytee.in' anywhere in the frontend — import from here.
 */

export const MAIN_DOMAIN = import.meta.env.VITE_MAIN_DOMAIN || 'automytee.in';

/**
 * Returns the full subdomain URL for a given society subdomain slug.
 * e.g. buildSubdomainUrl('somnath') => 'https://somnath.automytee.in'
 */
export function buildSubdomainUrl(subdomain, path = '') {
  const protocol = window.location.protocol;
  return `${protocol}//${subdomain}.${MAIN_DOMAIN}${path}`;
}

/**
 * Extracts the society subdomain from the current browser hostname.
 * Returns null on the root domain, localhost, or Vercel preview URLs.
 */
export function getSubdomainFromHost() {
  const hostname = window.location.hostname;
  const parts = hostname.split('.');

  // Root domain, localhost, or Vercel/Netlify preview — no tenant subdomain
  if (
    hostname === 'localhost' ||
    hostname === MAIN_DOMAIN ||
    hostname.includes('vercel.app') ||
    hostname.includes('netlify.app')
  ) {
    return null;
  }

  // Subdomain on localhost (e.g. somnath.localhost:5173)
  if (hostname.includes('localhost') && parts.length >= 2) {
    return parts[0];
  }

  // Production: somnath.automytee.in → ['somnath', 'automytee', 'in']
  if (parts.length > 2) return parts[0];

  return null;
}

/**
 * Returns true if the current hostname is the root/marketing domain
 * (not a tenant subdomain).
 */
export function isRootDomain() {
  return getSubdomainFromHost() === null;
}
