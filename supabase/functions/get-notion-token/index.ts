/**
 * Supabase Edge Function: get-notion-token
 *
 * Retrieve and decrypt Notion access token for a user
 *
 * SÉCURITÉ:
 * - Vérifie que l'utilisateur existe
 * - Décrypte le token avant de le retourner
 * - Utilise SERVICE_ROLE_KEY pour bypasser RLS
 *
 * Usage:
 *   POST https://[project].supabase.co/functions/v1/get-notion-token
 *   Body: { userId }
 *
 * Response:
 *   { success: true, token: string, workspaceName: string, workspaceIcon?: string }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ENCRYPTION_KEY = Deno.env.get('TOKEN_ENCRYPTION_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Decrypt token using AES-GCM with Web Crypto API
 */
async function decryptToken(encrypted: string): Promise<string> {
  try {
    const keyData = Uint8Array.from(atob(ENCRYPTION_KEY), c => c.charCodeAt(0));

    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('[DECRYPTION] Failed to decrypt token:', error);
    throw new Error('Decryption failed');
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from('user_profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('[get-notion-token] User not found:', userId);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get active notion connection
    const { data: connection, error: connectionError } = await supabase
      .from('notion_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (connectionError) {
      if (connectionError.code === 'PGRST116') {
        return new Response(
          JSON.stringify({ error: 'No active Notion connection found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw connectionError;
    }

    // Decrypt token
    console.log('[get-notion-token] Decrypting token for user:', userId);
    const decryptedToken = await decryptToken(connection.access_token_encrypted);
    console.log('[get-notion-token] Token decrypted successfully');

    return new Response(
      JSON.stringify({
        success: true,
        token: decryptedToken,
        workspaceName: connection.workspace_name,
        workspaceIcon: connection.workspace_icon,
        workspaceId: connection.workspace_id
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[get-notion-token] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
