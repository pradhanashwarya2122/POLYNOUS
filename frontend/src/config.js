// frontend/src/config.js
// Central API client for all frontend requests

export const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

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

    // If 401 and we had a token, try refreshing it
    if (response.status === 401 && token) {
      const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });

      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        const newToken = data.access_token;
        
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
        // Refresh failed → force logout
        localStorage.clear();
        window.location.href = '/auth';
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
      console.error('Network error — backend may be offline');
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