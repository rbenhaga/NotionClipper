/**
 * Backend API Configuration
 * Initialize backend URL from environment variables
 * 
 * The desktop app uses NotionClipperWeb backend for:
 * - OAuth authentication (Google, Notion)
 * - Subscription management
 * - Usage tracking
 * - Unified user management
 */

// Get backend API URL (NotionClipperWeb backend)
// NOTE: URL should NOT include /api suffix - endpoints already include it
const getBackendApiUrl = (): string => {
  // Priority: env var > production URL > localhost
  // 🔧 FIX: Remove /api suffix - endpoints already include /api prefix
  return import.meta.env.VITE_BACKEND_API_URL 
    || import.meta.env.VITE_API_URL 
    || 'http://localhost:3001';
};

// Get website URL for auth redirects
// Note: showcase-site runs on port 5173 by default
const getWebsiteUrl = (): string => {
  return import.meta.env.VITE_WEBSITE_URL 
    || 'http://localhost:5173';
};

// Get Supabase URL for Edge Functions
const getSupabaseUrl = (): string => {
  return import.meta.env.VITE_SUPABASE_URL || '';
};

export const BACKEND_API_URL = getBackendApiUrl();
export const WEBSITE_URL = getWebsiteUrl();
export const SUPABASE_URL = getSupabaseUrl();
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Set global variables for services
if (typeof window !== 'undefined') {
  (window as any).__BACKEND_API_URL__ = BACKEND_API_URL;
  (window as any).__WEBSITE_URL__ = WEBSITE_URL;
  (window as any).__SUPABASE_URL__ = SUPABASE_URL;
  (window as any).__SUPABASE_ANON_KEY__ = SUPABASE_ANON_KEY;
}

console.log('[Backend Config] Backend API URL:', BACKEND_API_URL);
console.log('[Backend Config] Website URL:', WEBSITE_URL);
console.log('[Backend Config] Supabase URL:', SUPABASE_URL ? 'configured' : 'missing');
