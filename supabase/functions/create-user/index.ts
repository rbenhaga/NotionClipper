/**
 * Supabase Edge Function: create-user
 *
 * Crée ou met à jour un utilisateur dans user_profiles
 * Utilisé après l'authentification OAuth (Google/Notion)
 *
 * SÉCURITÉ:
 * - Utilise SERVICE_ROLE_KEY pour bypasser RLS
 * - Valide les données d'entrée
 *
 * Usage:
 *   POST https://[project].supabase.co/functions/v1/create-user
 *   Body: { userId: string, email: string, fullName?: string, avatarUrl?: string, authProvider: string }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Configuration depuis variables d'environnement
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateUserRequest {
  userId: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  authProvider: 'google' | 'notion';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Récupérer le body
    const body: CreateUserRequest = await req.json();
    const { userId, email, fullName, avatarUrl, authProvider } = body;

    // 2. Valider les données
    if (!userId || !email || !authProvider) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, email, authProvider' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Valider le format email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[create-user] Creating/updating user:', userId, email);

    // 3. Créer le client Supabase avec SERVICE_ROLE_KEY (bypass RLS)
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // 4. Upsert user_profiles (preserves existing data if new values are null)
    // First check if user exists to handle null values properly
    const { data: existingUser } = await supabase
      .from('user_profiles')
      .select('full_name, avatar_url')
      .eq('id', userId)
      .single();

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId, // ✅ FIX: La colonne s'appelle 'id', pas 'user_id'
        email: email,
        // ✅ FIX #32: Preserve existing data if new value is null (COALESCE pattern)
        full_name: fullName || existingUser?.full_name || null,
        avatar_url: avatarUrl || existingUser?.avatar_url || null,
        auth_provider: authProvider,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id', // ✅ FIX: Conflit sur 'id'
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (profileError) {
      console.error('[create-user] Error upserting user_profiles:', profileError);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to create user profile',
          details: profileError.message 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[create-user] ✅ User profile created/updated:', userId);

    // 5. Créer une subscription FREE par défaut si elle n'existe pas
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .single();

    if (!existingSubscription) {
      console.log('[create-user] Creating FREE subscription for user:', userId);
      
      const { error: subError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          tier: 'free',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (subError) {
        console.error('[create-user] Error creating subscription:', subError);
        // Ne pas bloquer la création de l'utilisateur
      } else {
        console.log('[create-user] ✅ FREE subscription created');
      }
    }

    // 6. Retourner le profil créé
    return new Response(
      JSON.stringify({
        success: true,
        profile: profile
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[create-user] Error:', error);

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
