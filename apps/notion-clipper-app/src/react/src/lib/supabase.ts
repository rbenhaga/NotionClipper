/**
 * Supabase Client Singleton
 * 
 * CRITICAL: Only ONE instance of SupabaseClient should exist in the app.
 * Multiple instances cause "Multiple GoTrueClient instances detected" warning
 * and can lead to auth state inconsistencies.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Module-level singleton
let supabaseClient: SupabaseClient | null = null;

// Get environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * Get the singleton Supabase client
 * Creates it on first call, returns cached instance on subsequent calls
 */
export function getSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[Supabase] Missing URL or Anon Key');
    return null;
  }
  
  if (!supabaseClient) {
    console.log('[Supabase] Creating singleton client...');
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
    });
  }
  
  return supabaseClient;
}

/**
 * Get Supabase URL (for services that need it)
 */
export function getSupabaseUrl(): string {
  return supabaseUrl;
}

/**
 * Get Supabase Anon Key (for services that need it)
 */
export function getSupabaseAnonKey(): string {
  return supabaseAnonKey;
}

// Export for backward compatibility
export { supabaseUrl, supabaseAnonKey };
