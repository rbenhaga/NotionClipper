/**
 * Shared Configuration for Edge Functions
 * 
 * Handles the transition from legacy JWT keys to new sb_* format keys.
 * 
 * MIGRATION (Jan 2026):
 * - Old: SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (JWT format)
 * - New: SB_PUBLISHABLE_KEY, SB_SECRET_KEY (sb_* format)
 * 
 * This config provides fallback logic:
 * 1. Try new key names first (SB_SECRET_KEY)
 * 2. Fall back to legacy names (SUPABASE_SERVICE_ROLE_KEY) for backward compatibility
 * 
 * Usage:
 * ```typescript
 * import { getSupabaseConfig } from '../_shared/config.ts';
 * 
 * const { url, secretKey, publishableKey } = getSupabaseConfig();
 * const supabase = createClient(url, secretKey);
 * ```
 */

export interface SupabaseConfig {
  url: string;
  secretKey: string;
  publishableKey: string;
}

/**
 * Get Supabase configuration with fallback for legacy key names
 */
export function getSupabaseConfig(): SupabaseConfig {
  const url = Deno.env.get('SUPABASE_URL');
  
  // Try new key names first, fall back to legacy
  const secretKey = Deno.env.get('SB_SECRET_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const publishableKey = Deno.env.get('SB_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY');
  
  if (!url) {
    throw new Error('SUPABASE_URL is not configured');
  }
  
  if (!secretKey) {
    throw new Error('Neither SB_SECRET_KEY nor SUPABASE_SERVICE_ROLE_KEY is configured');
  }
  
  if (!publishableKey) {
    throw new Error('Neither SB_PUBLISHABLE_KEY nor SUPABASE_ANON_KEY is configured');
  }
  
  return { url, secretKey, publishableKey };
}

/**
 * Get the secret key (service role equivalent) for admin operations
 * Bypasses RLS
 */
export function getSecretKey(): string {
  const key = Deno.env.get('SB_SECRET_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!key) {
    throw new Error('Neither SB_SECRET_KEY nor SUPABASE_SERVICE_ROLE_KEY is configured');
  }
  return key;
}

/**
 * Get the publishable key (anon equivalent) for client operations
 * Respects RLS
 */
export function getPublishableKey(): string {
  const key = Deno.env.get('SB_PUBLISHABLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY');
  if (!key) {
    throw new Error('Neither SB_PUBLISHABLE_KEY nor SUPABASE_ANON_KEY is configured');
  }
  return key;
}
