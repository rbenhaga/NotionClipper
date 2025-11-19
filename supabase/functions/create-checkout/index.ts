/**
 * Supabase Edge Function: create-checkout
 *
 * Crée une session Stripe Checkout de manière sécurisée
 *
 * SÉCURITÉ:
 * - STRIPE_SECRET_KEY stockée côté serveur uniquement
 * - Vérifie que l'utilisateur existe dans la base de données
 * - Associe la subscription au user_id
 *
 * Usage:
 *   POST https://[project].supabase.co/functions/v1/create-checkout
 *   Body: { userId: string, success_url?, cancel_url?, trial_days?, plan? }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';
import { getCorsHeaders } from '../_shared/cors.ts';

// Configuration depuis variables d'environnement (coffre-fort)
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;
const STRIPE_MONTHLY_PRICE_ID = Deno.env.get('STRIPE_PRICE_MONTHLY')!; // Prix mensuel (2.99€/mois)
const STRIPE_ANNUAL_PRICE_ID = Deno.env.get('STRIPE_PRICE_ANNUAL'); // Prix annuel (28.68€/an)
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

serve(async (req) => {
  // Get CORS headers for this request
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Récupérer le body
    const { userId, success_url, cancel_url, trial_days, plan = 'monthly' } = await req.json();

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Missing userId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Vérifier que l'utilisateur existe dans user_profiles
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, email, full_name')
      .eq('id', userId) // ✅ FIX: La colonne s'appelle 'id'
      .single();

    if (profileError || !profile) {
      console.error('[create-checkout] User not found:', userId, profileError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!profile.email) {
      console.error('[create-checkout] User has no email:', userId);
      return new Response(
        JSON.stringify({ error: 'User has no email' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[create-checkout] Creating checkout for user:', userId, profile.email);

    // 3. Déterminer le price_id selon le plan
    let priceId = STRIPE_MONTHLY_PRICE_ID;
    if (plan === 'annual' && STRIPE_ANNUAL_PRICE_ID) {
      priceId = STRIPE_ANNUAL_PRICE_ID;
    }

    // 4. Créer la session Stripe Checkout
    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2024-11-20.acacia',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // 4.5 Préparer les options de subscription_data
    const subscriptionData: any = {
      metadata: {
        user_id: userId,
      },
    };

    // Si trial_days est fourni, configurer l'essai gratuit
    if (trial_days && trial_days > 0) {
      subscriptionData.trial_period_days = trial_days;
      subscriptionData.trial_settings = {
        end_behavior: {
          missing_payment_method: 'cancel', // Annule l'abonnement si pas de CB à la fin du trial
        },
      };
    }

    // 5. Créer la session de checkout
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      customer_email: profile.email,
      client_reference_id: userId,
      success_url: success_url || 'https://notionclipper.com/subscription/success',
      cancel_url: cancel_url || 'https://notionclipper.com/subscription/canceled',
      metadata: {
        user_id: userId,
        user_email: profile.email,
      },
      subscription_data: subscriptionData,
      // Toujours demander le moyen de paiement, même pendant l'essai
      payment_method_collection: trial_days && trial_days > 0 ? 'always' : 'if_required',
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    });

    console.log('[create-checkout] Checkout session created:', session.id, session.url);

    // 6. Retourner l'URL de checkout
    return new Response(
      JSON.stringify({
        url: session.url,
        session_id: session.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('[create-checkout] Error:', error);

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
