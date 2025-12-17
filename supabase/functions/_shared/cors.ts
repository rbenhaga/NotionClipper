/**
 * CORS Configuration for Edge Functions
 *
 * Provides restrictive CORS headers based on allowed origins
 * Replaces the permissive '*' wildcard with explicit origin checking
 *
 * Usage in Edge Functions:
 * ```typescript
 * import { getCorsHeaders, isAllowedOrigin } from '../_shared/cors.ts';
 *
 * serve(async (req) => {
 *   const corsHeaders = getCorsHeaders(req);
 *
 *   if (req.method === 'OPTIONS') {
 *     return new Response('ok', { headers: corsHeaders });
 *   }
 *
 *   // ... your function logic
 *
 *   return new Response(JSON.stringify(data), {
 *     headers: { ...corsHeaders, 'Content-Type': 'application/json' }
 *   });
 * });
 * ```
 */

// Production allowed origins
const ALLOWED_ORIGINS = [
  // Production domain
  'https://clipperpro.app',
  'https://www.clipperpro.app',

  // Local development
  'http://localhost:5173',      // Vite dev server
  'http://localhost:3000',      // Alternative dev port
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',

  // Electron app (custom protocol)
  'notion-clipper://localhost',

  // Mobile (Capacitor)
  'capacitor://localhost',
  'http://localhost',           // Capacitor Android
  'ionic://localhost',          // Ionic
];

// Development mode - add extra origins if needed
const isDev = Deno.env.get('ENVIRONMENT') === 'development';
if (isDev) {
  ALLOWED_ORIGINS.push(
    'http://localhost:8080',
    'http://localhost:4173',    // Vite preview
  );
}

/**
 * Check if origin is allowed
 */
export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Get CORS headers based on request origin
 *
 * @param req - The incoming request
 * @returns CORS headers object
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');

  // Check if origin is allowed
  const allowedOrigin = origin && isAllowedOrigin(origin)
    ? origin
    : ALLOWED_ORIGINS[0]; // Default to first allowed origin (production)

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400', // 24 hours
  };
}

/**
 * Get simple CORS headers (for backward compatibility)
 * Uses permissive '*' for non-credentialed requests
 *
 * @deprecated Use getCorsHeaders(req) for better security
 */
export function getPermissiveCorsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };
}

/**
 * Create OPTIONS handler for CORS preflight
 *
 * @param req - The incoming request
 * @returns Response for OPTIONS request
 */
export function handleCorsPrefligh(req: Request): Response {
  return new Response('ok', {
    headers: getCorsHeaders(req),
    status: 204,
  });
}
