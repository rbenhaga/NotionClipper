/**
 * Backend API Configuration
 * Initialize backend URL from environment variables
 */

// Get backend URL from environment
const getBackendUrl = (): string => {
  // This app uses Supabase directly, no separate backend needed
  // Return dev server URL for development
  return import.meta.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';
};

export const BACKEND_API_URL = getBackendUrl();

// Set global variable for backend API service
if (typeof window !== 'undefined') {
  (window as any).__BACKEND_API_URL__ = BACKEND_API_URL;
}

console.log('[Backend Config] Backend API URL:', BACKEND_API_URL);
