// @ts-nocheck
/**
 * Supabase Edge Function: save-notion-connection
 * 
 * Chiffre et stocke le token Notion de manière sécurisée
 * Le token est chiffré avec TOKEN_ENCRYPTION_KEY avant d'être stocké en BDD
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';

interface SaveConnectionRequest {
  userId: string;
  workspaceId: string;
  workspaceName: string;
  workspaceIcon?: string;
  accessToken: string;
  isActive: boolean;
}

/**
 * Chiffre un token avec AES-256-GCM
 */
async function encryptToken(token: string, keyBase64: string): Promise<string> {
  try {
    // Décoder la clé base64
    const keyData = Uint8Array.from(atob(keyBase64), c => c.charCodeAt(0));
    
    // Importer la clé
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt']
    );
    
    // Générer un IV aléatoire (12 bytes pour GCM)
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Encoder le token en bytes
    const tokenBytes = new TextEncoder().encode(token);
    
    // Chiffrer
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      tokenBytes
    );
    
    // Combiner IV + encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv, 0);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    // Encoder en base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('[save-notion-connection] Encryption error:', error);
    throw new Error(`Failed to encrypt token: ${error.message}`);
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const {
      userId,
      workspaceId,
      workspaceName,
      workspaceIcon,
      accessToken,
      isActive
    }: SaveConnectionRequest = await req.json();

    if (!userId || !workspaceId || !accessToken) {
      throw new Error('Missing required parameters: userId, workspaceId, accessToken');
    }

    // Récupérer la clé de chiffrement
    const ENCRYPTION_KEY = Deno.env.get('TOKEN_ENCRYPTION_KEY');
    if (!ENCRYPTION_KEY) {
      throw new Error('TOKEN_ENCRYPTION_KEY not configured in Supabase Vault');
    }

    console.log('[save-notion-connection] Encrypting token for user:', userId);

    // Chiffrer le token
    const encryptedToken = await encryptToken(accessToken, ENCRYPTION_KEY);

    console.log('[save-notion-connection] Token encrypted successfully');

    // Créer le client Supabase admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Sauvegarder dans la table notion_connections
    const { data, error } = await supabaseAdmin
      .from('notion_connections')
      .upsert({
        user_id: userId,
        workspace_id: workspaceId,
        workspace_name: workspaceName,
        workspace_icon: workspaceIcon,
        access_token_encrypted: encryptedToken, // Token chiffré (colonne renommée)
        is_active: isActive,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,workspace_id'
      })
      .select()
      .single();

    if (error) {
      console.error('[save-notion-connection] Database error:', error);
      throw error;
    }

    console.log('[save-notion-connection] Connection saved successfully');

    return new Response(
      JSON.stringify({
        success: true,
        connection: {
          id: data.id,
          userId: data.user_id,
          workspaceId: data.workspace_id,
          workspaceName: data.workspace_name,
          isActive: data.is_active
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error: any) {
    console.error('[save-notion-connection] Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to save Notion connection'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});
