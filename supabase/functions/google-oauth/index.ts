// @ts-nocheck
/**
 * Supabase Edge Function: google-oauth
 * 
 * Échange sécurisé du code d'autorisation Google contre un access token
 * Les secrets OAuth sont stockés dans Supabase Vault (jamais exposés au client)
 * 
 * Note: Ce fichier utilise Deno, pas Node.js. Les erreurs TypeScript sont normales.
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { getSupabaseConfig } from '../_shared/config.ts';


interface OAuthRequest {
  code: string;
  redirectUri: string;
  codeVerifier?: string; // For PKCE
}

serve(async (req) => {
  // Get CORS headers for this request
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Parse request
    const { code, redirectUri, codeVerifier }: OAuthRequest = await req.json();

    if (!code || !redirectUri) {
      throw new Error('Missing required parameters: code and redirectUri');
    }

    // Get secrets from Supabase Vault
    const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_CLIENT_ID');
    const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_CLIENT_SECRET');

    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      throw new Error('OAuth credentials not configured in Supabase Vault');
    }

    console.log('[Google OAuth] Exchanging code for token...');

    // Exchange authorization code for access token
    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
    });

    // Add PKCE verifier if present
    if (codeVerifier) {
      tokenBody.append('code_verifier', codeVerifier);
    }

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenBody,
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('[Google OAuth] Token exchange failed:', errorText);
      throw new Error(`Token exchange failed: ${tokenResponse.status} - ${errorText}`);
    }

    const tokenData = await tokenResponse.json();

    console.log('[Google OAuth] Token exchange successful');

    // Fetch user info from Google
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      throw new Error('Failed to fetch user info from Google');
    }

    const userInfo = await userInfoResponse.json();

    console.log('[Google OAuth] User info fetched:', userInfo.email);

    // Create or update Supabase user
    // Get config with fallback for legacy key names (Jan 2026 migration)
    const { url, secretKey } = getSupabaseConfig();
    const supabaseAdmin = createClient(url, secretKey);

    // Try to create user (will fail if exists)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: userInfo.email,
      email_confirm: true,
      user_metadata: {
        provider: 'google',
        full_name: userInfo.name,
        avatar_url: userInfo.picture,
        google_id: userInfo.id,
        source: 'google_oauth',
      },
    });

    if (authError) {
      // If user already exists, try to get existing user
      const errorMsg = authError.message.toLowerCase();
      if (errorMsg.includes('already registered') || errorMsg.includes('already been registered') || errorMsg.includes('user with this email')) {
        console.log('[Google OAuth] User already exists, fetching existing user...');
        
        const { data: existingUser, error: fetchError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (fetchError) {
          console.error('[Google OAuth] Error fetching users:', fetchError);
          throw fetchError;
        }
        
        const user = existingUser.users.find(u => u.email === userInfo.email);
        
        if (!user) {
          console.error('[Google OAuth] User exists but could not be found in list');
          throw new Error('User exists but could not be found');
        }

        console.log('[Google OAuth] Found existing user:', user.id);

        // Update user metadata
        await supabaseAdmin.auth.admin.updateUserById(user.id, {
          user_metadata: {
            ...user.user_metadata,
            full_name: userInfo.name,
            avatar_url: userInfo.picture,
            last_login: new Date().toISOString(),
          },
        });

        return new Response(
          JSON.stringify({
            success: true,
            userId: user.id,
            email: userInfo.email,
            userInfo: {
              name: userInfo.name,
              picture: userInfo.picture,
              email: userInfo.email,
              userId: user.id,
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

    console.log('[Google OAuth] User created:', authData.user.id);

    // Generate session token for the user
    const { data: sessionData, error: sessionError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: userInfo.email,
    });

    if (sessionError) {
      console.error('[Google OAuth] Failed to generate session:', sessionError);
    }

    // Return success response
    return new Response(
      JSON.stringify({
        success: true,
        userId: authData.user.id,
        email: userInfo.email,
        userInfo: {
          name: userInfo.name,
          picture: userInfo.picture,
          email: userInfo.email,
          userId: authData.user.id,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error('[Google OAuth] Error:', error);
    
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
