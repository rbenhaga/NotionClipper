/**
 * Supabase Edge Function: get-user-by-workspace
 *
 * Recherche un utilisateur basé sur son workspace_id Notion
 * Utilisé pour la reconnexion automatique (éviter de redemander l'email)
 *
 * SÉCURITÉ:
 * - Utilise SERVICE_ROLE_KEY pour bypasser RLS
 * - Valide les données d'entrée
 *
 * Usage:
 *   POST https://[project].supabase.co/functions/v1/get-user-by-workspace
 *   Body: { workspaceId: string }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

// Configuration depuis variables d'environnement
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface GetUserByWorkspaceRequest {
  workspaceId: string;
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
    const body: GetUserByWorkspaceRequest = await req.json();
    const { workspaceId } = body;

    // 2. Valider les données
    if (!workspaceId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: workspaceId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[get-user-by-workspace] Searching for workspace:', workspaceId);

    // 3. Créer le client Supabase avec SERVICE_ROLE_KEY (bypass RLS)
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 4. Chercher dans notion_connections
    const { data: connection, error: connectionError } = await supabase
      .from('notion_connections')
      .select('user_id, is_active')
      .eq('workspace_id', workspaceId)
      .eq('is_active', true)
      .maybeSingle();

    if (connectionError) {
      console.error('[get-user-by-workspace] Error querying notion_connections:', connectionError);
      return new Response(
        JSON.stringify({
          error: 'Database query failed',
          details: connectionError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!connection) {
      console.log('[get-user-by-workspace] No active connection found for workspace:', workspaceId);
      return new Response(
        JSON.stringify({ user: null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[get-user-by-workspace] Found connection for user:', connection.user_id);

    // 5. Récupérer le profil utilisateur
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, email, full_name, avatar_url, auth_provider')
      .eq('id', connection.user_id)
      .maybeSingle();

    if (profileError) {
      console.error('[get-user-by-workspace] Error querying user_profiles:', profileError);
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch user profile',
          details: profileError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userProfile) {
      console.log('[get-user-by-workspace] User profile not found for userId:', connection.user_id);
      return new Response(
        JSON.stringify({ user: null }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[get-user-by-workspace] ✅ User found:', userProfile.email);

    // 6. Retourner le profil utilisateur
    return new Response(
      JSON.stringify({
        user: {
          id: userProfile.id,
          email: userProfile.email,
          full_name: userProfile.full_name,
          avatar_url: userProfile.avatar_url,
          auth_provider: userProfile.auth_provider
        }
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[get-user-by-workspace] Error:', error);

    return new Response(
      JSON.stringify({
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
