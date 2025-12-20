/**
 * Backend URL Utilities
 * 
 * Centralized helpers for backend URL normalization.
 * This ensures consistent URL handling across the entire codebase.
 * 
 * 🔧 FIX P1 #4: Single source of truth for URL normalization
 * 
 * IMPORTANT: BACKEND_API_URL should be configured WITHOUT /api suffix
 * Example: http://localhost:3001 (NOT http://localhost:3001/api)
 * 
 * The /api prefix is added by endpoints, not by the base URL.
 */

/**
 * Normalize a backend base URL by removing trailing /api suffix
 * This ensures consistent behavior regardless of how the URL is configured
 * 
 * @param url - The URL to normalize (may or may not have /api suffix)
 * @returns The normalized URL without /api suffix
 * 
 * @example
 * normalizeBackendBaseUrl('http://localhost:3001') // 'http://localhost:3001'
 * normalizeBackendBaseUrl('http://localhost:3001/api') // 'http://localhost:3001'
 * normalizeBackendBaseUrl('http://localhost:3001/api/') // 'http://localhost:3001'
 */
export function normalizeBackendBaseUrl(url: string): string {
  return url.replace(/\/api\/?$/, '');
}

/**
 * Get the full API URL with /api prefix
 * 
 * @param baseUrl - The base URL (will be normalized first)
 * @returns The full API URL with /api prefix
 * 
 * @example
 * getApiUrl('http://localhost:3001') // 'http://localhost:3001/api'
 * getApiUrl('http://localhost:3001/api') // 'http://localhost:3001/api'
 */
export function getApiUrl(baseUrl: string): string {
  return `${normalizeBackendBaseUrl(baseUrl)}/api`;
}

/**
 * Get the default backend base URL from environment variables
 * 
 * Priority:
 * 1. VITE_BACKEND_API_URL (for Vite/React apps)
 * 2. BACKEND_API_URL (for Node.js/Electron)
 * 3. Fallback to localhost:3001
 * 
 * @returns The normalized backend base URL
 */
export function getDefaultBackendBaseUrl(): string {
  const url = 
    (typeof process !== 'undefined' && process.env?.VITE_BACKEND_API_URL) ||
    (typeof process !== 'undefined' && process.env?.BACKEND_API_URL) ||
    'http://localhost:3001';
  
  return normalizeBackendBaseUrl(url);
}

/**
 * Get the default API URL (base + /api)
 * 
 * @returns The full API URL with /api prefix
 */
export function getDefaultApiUrl(): string {
  return getApiUrl(getDefaultBackendBaseUrl());
}
