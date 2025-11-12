/**
 * Supabase Edge Function: save-notion-connection
 *
 * Sauvegarde une connexion Notion pour un utilisateur
 *
 * SÉCURITÉ:
 * - Utilise SERVICE_ROLE_KEY pour bypasser RLS
 * - Valide que l'utilisateur existe
 *
 * Usage:
 *   POST https://[project].supabase.co/functions/v1/save-notion-connection
 *   Body: { userId, workspaceId, workspaceName, workspaceIcon?, accessToken, isActive }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SaveNotionConnectionRequest {
  userId: string;
  workspaceId: string;
  workspaceName: string;
  workspaceIcon?: string;
  accessToken: string;
  isActive: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body: SaveNotionConnectionRequest = await req.json();
    const { userId, workspaceId, workspaceName, workspaceIcon, accessToken, isActive } = body;

    if (!userId || !workspaceId || !workspaceName || !accessToken) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[save-notion-connection] Saving for user:', userId, 'workspace:', workspaceId);

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Vérifier que l'utilisateur existe
    const { data: user, error: userError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', userId) // ✅ FIX: La colonne s'appelle 'id'
      .single();

    if (userError || !user) {
      console.error('[save-notion-connection] User not found:', userId);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upsert notion_connections
    const { data: connection, error: connectionError } = await supabase
      .from('notion_connections')
      .upsert({
        user_id: userId,
        workspace_id: workspaceId,
        workspace_name: workspaceName,
        workspace_icon: workspaceIcon || null,
        access_token_encrypted: accessToken, // TODO: Encrypt in production
        is_active: isActive,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,workspace_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (connectionError) {
      console.error('[save-notion-connection] Error:', connectionError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to save connection',
          details: connectionError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[save-notion-connection] ✅ Connection saved');

    return new Response(
      JSON.stringify({ success: true, connection }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[save-notion-connection] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
