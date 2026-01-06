/**
 * Supabase Edge Function: get-user-profile
 *
 * Récupère le profil utilisateur depuis user_profiles
 * Utilisé pour vérifier si un utilisateur existe avant de créer un doublon
 *
 * SÉCURITÉ:
 * - Utilise SERVICE_ROLE_KEY pour bypasser RLS
 * - Valide les données d'entrée
 * - Ne retourne que les données du userId demandé
 *
 * Usage:
 *   POST https://[project].supabase.co/functions/v1/get-user-profile
 *   Body: { userId: string }
 *
 * Response:
 *   { success: true, profile: { id, email, full_name, avatar_url, auth_provider } }
 *   ou
 *   { success: false, error: 'User not found' }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { getSupabaseConfig } from '../_shared/config.ts';

// Get config with fallback for legacy key names (Jan 2026 migration)
const { url: SUPABASE_URL, secretKey: SERVICE_ROLE_KEY } = getSupabaseConfig();

interface GetUserProfileRequest {
  userId: string;
}

serve(async (req) => {
  // Get CORS headers for this request
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Récupérer le body
    const body: GetUserProfileRequest = await req.json();
    const { userId } = body;

    // 2. Valider les données
    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required field: userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[get-user-profile] Fetching profile for user:', userId);

    // 3. Créer le client Supabase avec SERVICE_ROLE_KEY (bypass RLS)
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 4. Récupérer le profil utilisateur
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, avatar_url, auth_provider, created_at, updated_at')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) {
      console.error('[get-user-profile] Error querying user_profiles:', profileError);
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Database query failed',
          details: profileError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile) {
      console.log('[get-user-profile] User not found:', userId);
      return new Response(
        JSON.stringify({ success: false, error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[get-user-profile] ✅ User profile found:', profile.email);

    // 5. Retourner le profil utilisateur
    return new Response(
      JSON.stringify({
        success: true,
        profile: {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name,
          avatar_url: profile.avatar_url,
          auth_provider: profile.auth_provider,
          created_at: profile.created_at,
          updated_at: profile.updated_at
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[get-user-profile] Error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
