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
import { getCorsHeaders } from '../_shared/cors.ts';

// Configuration depuis variables d'environnement
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;


interface CreateUserRequest {
  userId: string;
  email: string;
  fullName?: string;
  avatarUrl?: string;
  authProvider: 'google' | 'notion';
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

    // 4. 🔧 FIX BUG #1: Vérifier si l'email existe déjà dans la base
    // Cela permet de gérer les cas où un utilisateur se connecte avec différents providers
    // (ex: Google puis Notion avec le même email)
    const { data: existingProfileByEmail } = await supabase
      .from('user_profiles')
      .select('id, full_name, avatar_url, auth_provider')
      .eq('email', email)
      .maybeSingle();

    let profile;
    let profileError;

    if (existingProfileByEmail) {
      // Email existe déjà - UPDATE le profil existant
      console.log('[create-user] Email already exists, updating existing profile:', existingProfileByEmail.id);

      // Si le userId est différent, on garde l'ID existant (même utilisateur, provider différent)
      const targetUserId = existingProfileByEmail.id;

      const { data, error } = await supabase
        .from('user_profiles')
        .update({
          // Préserver les données existantes si les nouvelles sont null
          full_name: fullName || existingProfileByEmail.full_name || null,
          avatar_url: avatarUrl || existingProfileByEmail.avatar_url || null,
          // Mettre à jour le provider uniquement si c'est le même userId
          auth_provider: userId === targetUserId ? authProvider : existingProfileByEmail.auth_provider,
          updated_at: new Date().toISOString()
        })
        .eq('id', targetUserId)
        .select()
        .single();

      profile = data;
      profileError = error;

      if (!error) {
        console.log('[create-user] ✅ Existing profile updated for email:', email);
      }
    } else {
      // Email nouveau - Vérifier si userId existe
      const { data: existingUserById } = await supabase
        .from('user_profiles')
        .select('full_name, avatar_url')
        .eq('id', userId)
        .maybeSingle();

      if (existingUserById) {
        // UserId existe - UPDATE
        console.log('[create-user] UserId exists, updating profile:', userId);

        const { data, error } = await supabase
          .from('user_profiles')
          .update({
            email: email,
            full_name: fullName || existingUserById.full_name || null,
            avatar_url: avatarUrl || existingUserById.avatar_url || null,
            auth_provider: authProvider,
            updated_at: new Date().toISOString()
          })
          .eq('id', userId)
          .select()
          .single();

        profile = data;
        profileError = error;
      } else {
        // Nouveau utilisateur - INSERT
        console.log('[create-user] New user, creating profile:', userId);

        const { data, error } = await supabase
          .from('user_profiles')
          .insert({
            id: userId,
            email: email,
            full_name: fullName || null,
            avatar_url: avatarUrl || null,
            auth_provider: authProvider,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        profile = data;
        profileError = error;
      }
    }

    if (profileError) {
      console.error('[create-user] Error saving user_profiles:', profileError);
      return new Response(
        JSON.stringify({
          error: 'Failed to create user profile',
          details: profileError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[create-user] ✅ User profile created/updated:', profile.id);

    // 5. Créer une subscription FREE par défaut si elle n'existe pas
    // 🔧 FIX: Utiliser profile.id (le vrai userId dans la BDD) au lieu du userId passé en paramètre
    const actualUserId = profile.id;
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', actualUserId)
      .maybeSingle();

    if (!existingSubscription) {
      console.log('[create-user] Creating FREE subscription for user:', actualUserId);

      const now = new Date().toISOString();
      const periodEnd = new Date();
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      // 🔥 MIGRATION: Tier value now UPPERCASE
      const { error: subError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: actualUserId,
          tier: 'FREE',
          status: 'active',
          current_period_start: now,
          current_period_end: periodEnd.toISOString(),
          created_at: now,
          updated_at: now
        });

      if (subError) {
        console.error('[create-user] Error creating subscription:', subError);
        // Ne pas bloquer la création de l'utilisateur
      } else {
        console.log('[create-user] ✅ FREE subscription created');
      }
    } else {
      console.log('[create-user] Subscription already exists for user:', actualUserId);
    }

    // 6. Retourner le profil créé (avec le vrai userId)
    return new Response(
      JSON.stringify({
        success: true,
        profile: profile,
        userId: actualUserId // Retourner le vrai userId pour que le client puisse l'utiliser
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
