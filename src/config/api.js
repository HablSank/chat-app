/**
 * Centralized API & Socket.IO configuration helper.
 *
 * Supports:
 * - VITE_API_URL / VITE_SOCKET_URL from environment variables (e.g. for Cloudflare Tunnel)
 * - Same-origin production fallback (when Express serves frontend static build)
 * - Development fallback to http://localhost:3001
 */

const isProd = import.meta.env.PROD
const envApiUrl = import.meta.env.VITE_API_URL
const envSocketUrl = import.meta.env.VITE_SOCKET_URL

// Calculate base API URL
export const API_BASE_URL = envApiUrl
  ? envApiUrl.replace(/\/+$/, '')
  : isProd
  ? '' // Same-origin relative path in production
  : '' // Vite dev proxy forwards /api to backend automatically

// Calculate Socket.IO connection URL
export const SOCKET_URL = envSocketUrl
  ? envSocketUrl.replace(/\/+$/, '')
  : envApiUrl
  ? envApiUrl.replace(/\/+$/, '')
  : isProd && typeof window !== 'undefined'
  ? window.location.origin
  : typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://localhost:3001'

/**
 * Helper to build full API endpoint URL
 * @param {string} path e.g. '/api/auth/login'
 * @returns {string}
 */
export function getApiUrl(path) {
  const cleanPath = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE_URL}${cleanPath}`
}
