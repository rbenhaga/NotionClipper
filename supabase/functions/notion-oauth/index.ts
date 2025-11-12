// @ts-nocheck
/**
 * Supabase Edge Function: notion-oauth
 * 
 * Échange sécurisé du code d'autorisation Notion contre un access token
 * Les secrets OAuth sont stockés dans Supabase Vault (jamais exposés au client)
 * 
 * Note: Ce fichier utilise Deno, pas Node.js. Les erreurs TypeScript sont normales.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface OAuthRequest {
  code: string;
  redirectUri: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request
    const { code, redirectUri }: OAuthRequest = await req.json();

    if (!code || !redirectUri) {
      throw new Error('Missing required parameters: code and redirectUri');
    }

    // Get secrets from Supabase Vault
    const NOTION_CLIENT_ID = Deno.env.get('NOTION_CLIENT_ID');
    const NOTION_CLIENT_SECRET = Deno.env.get('NOTION_CLIENT_SECRET');

    if (!NOTION_CLIENT_ID || !NOTION_CLIENT_SECRET) {
      throw new Error('OAuth credentials not configured in Supabase Vault');
    }

    console.log('[Notion OAuth] Exchanging code for token...');

    // Exchange authorization code for access token
    // Notion uses Basic Authentication
    const credentials = btoa(`${NOTION_CLIENT_ID}:${NOTION_CLIENT_SECRET}`);
    
    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    });

    const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: tokenBody,
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[Notion OAuth] Token exchange failed:', errorText);
      throw new Error(`Token exchange failed: ${tokenResponse.status} - ${errorText}`);
    }

    const tokenData = await tokenResponse.json();

    console.log('[Notion OAuth] Token exchange successful for workspace:', tokenData.workspace_name);

    // Create or update Supabase user
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Use workspace_id as unique identifier
    const email = `${tokenData.workspace_id}@notionclipper.app`;

    // Try to create user (will fail if exists)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: {
        provider: 'notion',
        notion_workspace_id: tokenData.workspace_id,
        notion_workspace_name: tokenData.workspace_name,
        notion_workspace_icon: tokenData.workspace_icon,
        source: 'notion_oauth',
      },
    });

    if (authError) {
      // If user already exists, try to get existing user
      const errorMsg = authError.message.toLowerCase();
      if (errorMsg.includes('already registered') || errorMsg.includes('already been registered') || errorMsg.includes('user with this email')) {
        console.log('[Notion OAuth] User already exists, fetching existing user...');
        
        const { data: existingUser, error: fetchError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (fetchError) {
          console.error('[Notion OAuth] Error fetching users:', fetchError);
          throw fetchError;
        }
        
        const user = existingUser.users.find(u => u.email === email);
        
        if (!user) {
          console.error('[Notion OAuth] User exists but could not be found in list');
          throw new Error('User exists but could not be found');
        }

        console.log('[Notion OAuth] Found existing user:', user.id);

        // Update user metadata
        await supabaseAdmin.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...user.user_metadata,
            notion_workspace_name: tokenData.workspace_name,
            notion_workspace_icon: tokenData.workspace_icon,
            last_login: new Date().toISOString(),
          },
        });

        return new Response(
          JSON.stringify({
            success: true,
            userId: user.id,
            token: tokenData.access_token,
            workspace: {
              id: tokenData.workspace_id,
              name: tokenData.workspace_name,
              icon: tokenData.workspace_icon,
            },
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          }
        );
      }
      
      throw authError;
    }

    console.log('[Notion OAuth] User created:', authData.user.id);

    // Return success response with userId
    return new Response(
      JSON.stringify({
        success: true,
        userId: authData.user.id,
        token: tokenData.access_token,
        workspace: {
          id: tokenData.workspace_id,
          name: tokenData.workspace_name,
          icon: tokenData.workspace_icon,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('[Notion OAuth] Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'OAuth exchange failed',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
