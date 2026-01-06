// Edge Function: rotate-encryption-key
// Rechiffre tous les tokens Notion avec une nouvelle clé de chiffrement
// ⚠️ ADMIN ONLY - Nécessite un token d'admin pour s'exécuter

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { getSupabaseConfig } from '../_shared/config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Vérifier le token admin
    const adminToken = req.headers.get('X-Admin-Token');
    const expectedToken = Deno.env.get('ADMIN_ROTATION_TOKEN');
    
    if (!adminToken || adminToken !== expectedToken) {
      throw new Error('Unauthorized: Invalid admin token');
    }

    const oldKey = Deno.env.get('OLD_TOKEN_ENCRYPTION_KEY');
    const newKey = Deno.env.get('TOKEN_ENCRYPTION_KEY');

    if (!oldKey || !newKey) {
      throw new Error('Missing encryption keys in environment');
    }

    // Get config with fallback for legacy key names (Jan 2026 migration)
    const { url, secretKey } = getSupabaseConfig();
    const supabaseClient = createClient(url, secretKey);

    // Récupérer tous les tokens actifs
    const { data: connections, error } = await supabaseClient
      .from('notion_connections')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;

    let migrated = 0;
    let failed = 0;

    // Rechiffrer chaque token
    for (const conn of connections || []) {
      try {
        const decrypted = await decryptToken(conn.access_token, oldKey);
        const encrypted = await encryptToken(decrypted, newKey);

        await supabaseClient
          .from('notion_connections')
          .update({ access_token: encrypted })
          .eq('id', conn.id);

        migrated++;
      } catch (err) {
        console.error(`Failed to migrate token for user ${conn.user_id}:`, err);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, migrated, failed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function decryptToken(encryptedData: string, keyBase64: string): Promise<string> {
  const parts = encryptedData.split(':');
  if (parts.length !== 3) throw new Error('Invalid format');

  const [ivHex, authTagHex, ciphertextHex] = parts;
  const iv = hexToUint8Array(ivHex);
  const authTag = hexToUint8Array(authTagHex);
  const ciphertext = hexToUint8Array(ciphertextHex);
  const keyData = base64ToUint8Array(keyBase64);

  const key = await crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM' }, false, ['decrypt']);
  const encryptedBuffer = new Uint8Array(ciphertext.length + authTag.length);
  encryptedBuffer.set(ciphertext);
  encryptedBuffer.set(authTag, ciphertext.length);

  const decryptedBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, encryptedBuffer);
  return new TextDecoder().decode(decryptedBuffer);
}

async function encryptToken(token: string, keyBase64: string): Promise<string> {
  const keyData = base64ToUint8Array(keyBase64);
  const key = await crypto.subtle.importKey('raw', keyData, { name: 'AES-GCM' }, false, ['encrypt']);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const data = encoder.encode(token);

  const encryptedBuffer = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  const encryptedArray = new Uint8Array(encryptedBuffer);
  const ciphertext = encryptedArray.slice(0, -16);
  const authTag = encryptedArray.slice(-16);

  return `${uint8ArrayToHex(iv)}:${uint8ArrayToHex(authTag)}:${uint8ArrayToHex(ciphertext)}`;
}

function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes;
}

function uint8ArrayToHex(arr: Uint8Array): string {
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}
