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
const ENCRYPTION_KEY = Deno.env.get('TOKEN_ENCRYPTION_KEY')!; // 32-byte base64 key from Supabase Vault

/**
 * Encrypt token using AES-GCM with Web Crypto API
 * @param plaintext - Token to encrypt
 * @returns Base64-encoded encrypted data (IV + ciphertext)
 */
async function encryptToken(plaintext: string): Promise<string> {
  try {
    // Decode encryption key from base64
    const keyData = Uint8Array.from(atob(ENCRYPTION_KEY), c => c.charCodeAt(0));

    // Import key for AES-GCM
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );

    // Generate random IV (12 bytes for GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));

    // Encrypt
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    const ciphertext = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    // Combine IV + ciphertext
    const combined = new Uint8Array(iv.length + ciphertext.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(ciphertext), iv.length);

    // Return as base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('[ENCRYPTION] Failed to encrypt token:', error);
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypt token using AES-GCM with Web Crypto API
 * @param encrypted - Base64-encoded encrypted data (IV + ciphertext)
 * @returns Decrypted token
 */
async function decryptToken(encrypted: string): Promise<string> {
  try {
    // Decode encryption key from base64
    const keyData = Uint8Array.from(atob(ENCRYPTION_KEY), c => c.charCodeAt(0));

    // Import key for AES-GCM
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM', length: 256 },
      false,
      ['decrypt']
    );

    // Decode base64
    const combined = Uint8Array.from(atob(encrypted), c => c.charCodeAt(0));

    // Extract IV and ciphertext
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);

    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );

    // Return as string
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('[DECRYPTION] Failed to decrypt token:', error);
    throw new Error('Decryption failed');
  }
}

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

    // 🔐 Encrypt token before storing
    console.log('[save-notion-connection] Encrypting token...');
    const encryptedToken = await encryptToken(accessToken);
    console.log('[save-notion-connection] Token encrypted successfully');

    // Upsert notion_connections
    const { data: connection, error: connectionError } = await supabase
      .from('notion_connections')
      .upsert({
        user_id: userId,
        workspace_id: workspaceId,
        workspace_name: workspaceName,
        workspace_icon: workspaceIcon || null,
        access_token_encrypted: encryptedToken, // ✅ NOW ACTUALLY ENCRYPTED
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
