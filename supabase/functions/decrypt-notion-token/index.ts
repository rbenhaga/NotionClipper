// Edge Function: decrypt-notion-token
// Déchiffre le token Notion de manière sécurisée côté serveur
// ⚠️ CRITIQUE: Cette fonction remplace le déchiffrement client-side

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { getPublishableKey } from '../_shared/config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DecryptRequest {
  userId: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Vérifier l'authentification JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      getPublishableKey(),
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    // 2. Récupérer le token chiffré depuis la DB
    const { userId } = (await req.json()) as DecryptRequest;

    // Vérifier que l'utilisateur demande son propre token
    if (userId !== user.id) {
      throw new Error('Forbidden: Cannot decrypt token for another user');
    }

    const { data: connection, error: dbError } = await supabaseClient
      .from('notion_connections')
      .select('access_token')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();

    if (dbError || !connection) {
      throw new Error('Notion connection not found');
    }

    // 3. Déchiffrer le token avec la clé du Vault
    const encryptionKey = Deno.env.get('TOKEN_ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new Error('Encryption key not configured');
    }

    const decryptedToken = await decryptToken(connection.access_token, encryptionKey);

    // 4. Retourner le token déchiffré
    return new Response(
      JSON.stringify({
        success: true,
        token: decryptedToken,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[decrypt-notion-token] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message === 'Unauthorized' ? 401 : 500,
      }
    );
  }
});

/**
 * Déchiffre un token avec AES-256-GCM
 */
async function decryptToken(encryptedData: string, keyBase64: string): Promise<string> {
  try {
    // Parse encrypted data (format: iv:authTag:ciphertext)
    const parts = encryptedData.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format');
    }

    const [ivHex, authTagHex, ciphertextHex] = parts;

    // Convert hex to Uint8Array
    const iv = hexToUint8Array(ivHex);
    const authTag = hexToUint8Array(authTagHex);
    const ciphertext = hexToUint8Array(ciphertextHex);

    // Decode encryption key from base64
    const keyData = base64ToUint8Array(keyBase64);

    // Import key for AES-GCM
    const key = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );

    // Combine ciphertext and authTag for decryption
    const encryptedBuffer = new Uint8Array(ciphertext.length + authTag.length);
    encryptedBuffer.set(ciphertext);
    encryptedBuffer.set(authTag, ciphertext.length);

    // Decrypt
    const decryptedBuffer = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encryptedBuffer
    );

    // Convert to string
    const decoder = new TextDecoder();
    return decoder.decode(decryptedBuffer);
  } catch (error) {
    console.error('[decryptToken] Decryption failed:', error);
    throw new Error('Failed to decrypt token');
  }
}

function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
