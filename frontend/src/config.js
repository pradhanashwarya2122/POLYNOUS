// frontend/src/config.js
// Central API client for all frontend requests

import { toast } from 'sonner';

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

// ── Token-refresh coordination ──────────────────────────────────────────
// Prevents a wall of /auth/refresh 401s: concurrent 401s reuse one in-flight
// refresh, and after a failure we back off for a short window.
let _refreshInFlight = null;
let _refreshFailedUntil = 0;
function _refreshBlockedUntil() {
  return Date.now() < _refreshFailedUntil;
}
async function _sharedRefresh() {
  if (_refreshInFlight) return _refreshInFlight;
  // Send the stored refresh token as a Bearer header too — the backend accepts
  // it there as a fallback for when the cross-site refresh COOKIE is blocked
  // (Safari/iOS/third-party-cookie blocking) or lost on a hard page reload.
  // This is the key fix for "signed out too often".
  const stored = localStorage.getItem('polynous_refresh_token') || window.__POLYNOUS_REFRESH_TOKEN__ || '';
  _refreshInFlight = fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(stored ? { Authorization: `Bearer ${stored}` } : {}) },
  })
    .then((res) => {
      if (!res.ok) _refreshFailedUntil = Date.now() + 30000; // back off 30s
      return res;
    })
    .catch(() => null)
    .finally(() => { _refreshInFlight = null; });
  return _refreshInFlight;
}

/**
 * Wrapper around fetch that:
 * - uses the correct API base URL
 * - attaches the JWT access token automatically
 * - sends cookies (refresh_token) cross‑site
 * - silently refreshes the access token on 401
 * - handles 500 errors gracefully
 */
export async function apiFetch(url, options = {}) {
  const token = localStorage.getItem('polynous_token');

  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    // First attempt
    let response = await fetch(`${API_BASE_URL}${url}`, {
      ...options,
      headers,
      credentials: 'include', // required for cross‑site cookie
    });

    // Guests can't make authed calls — never try to refresh/logout them.
    const isGuest = (token || '').startsWith('guest_');

    // If 401 and we had a real token, try refreshing it. Concurrent 401s share a
    // single in-flight refresh, and a recent failure is cached briefly, so we
    // never spam /auth/refresh (which produced a wall of console 401s).
    if (response.status === 401 && token && !isGuest && !_refreshBlockedUntil()) {
      const refreshResponse = await _sharedRefresh();

      if (refreshResponse && refreshResponse.ok) {
        const data = await refreshResponse.json();
        const newToken = data.access_token;
        if (data.refresh_token) {
          localStorage.setItem('polynous_refresh_token', data.refresh_token);
          window.__POLYNOUS_REFRESH_TOKEN__ = data.refresh_token;
        }

        if (newToken) {
          localStorage.setItem('polynous_token', newToken);
          window.__POLYNOUS_ACCESS_TOKEN__ = newToken;

          // Retry original request with new token
          headers['Authorization'] = `Bearer ${newToken}`;
          response = await fetch(`${API_BASE_URL}${url}`, {
            ...options,
            headers,
            credentials: 'include',
          });
        }
      } else {
        // Refresh genuinely failed → the session has expired. Tell the user
        // clearly (instead of a silent redirect), then send them to sign in.
        try {
          toast.error('Session expired', {
            id: 'session-expired',
            description: 'Please sign in again to continue.',
          });
        } catch (_) { /* toast host may not be mounted yet */ }
        localStorage.clear();
        delete window.__POLYNOUS_ACCESS_TOKEN__;
        delete window.__POLYNOUS_REFRESH_TOKEN__;
        setTimeout(() => { if (!window.location.pathname.startsWith('/auth')) window.location.href = '/auth'; }, 1100);
        throw new Error('Session expired');
      }
    }

    // Handle 500 errors
    if (response.status === 500) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.message || errorData.detail || 'Internal server error';
      throw new Error(errorMessage);
    }

    return response;
    
  } catch (error) {
    // Network errors (offline, DNS failure, etc.)
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      console.error('Network error - backend may be offline');
      try { toast.error('Connection problem', { id: 'net-offline', description: 'Cannot reach the server. Check your connection and try again.' }); } catch (_) {}
      throw new Error('Unable to connect to server. Please check your connection.');
    }
    throw error;
  }
}

/**
 * Helper: Get current auth token
 */
export function getAuthToken() {
  return window.__POLYNOUS_ACCESS_TOKEN__ || localStorage.getItem('polynous_token') || '';
}

/**
 * Helper: Check if user is authenticated
 */
export function isAuthenticated() {
  return !!getAuthToken();
}

/**
 * Helper: Clear all auth data and redirect to login
 */
export function logout() {
  localStorage.clear();
  delete window.__POLYNOUS_ACCESS_TOKEN__;
  delete window.__POLYNOUS_REFRESH_TOKEN__;
  window.location.href = '/auth';
}