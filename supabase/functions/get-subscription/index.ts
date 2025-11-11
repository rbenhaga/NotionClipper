/**
 * Supabase Edge Function: get-subscription
 *
 * Récupère le statut de subscription de l'utilisateur connecté
 *
 * SÉCURITÉ:
 * - Vérifie l'authentification utilisateur
 * - Retourne uniquement les données de l'utilisateur connecté
 * - Ne expose jamais les clés Stripe
 *
 * Usage:
 *   GET https://[project].supabase.co/functions/v1/get-subscription
 *   Headers: Authorization: Bearer [user_token]
 *
 * Response:
 *   {
 *     tier: 'free' | 'premium' | 'grace_period',
 *     status: 'active' | 'canceled' | ...,
 *     current_period_end: '2025-12-31T23:59:59Z',
 *     is_grace_period: false,
 *     quotas: { clips: { used: 10, limit: 100, ... }, ... }
 *   }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Quotas configuration (même que dans l'app)
const QUOTAS = {
  free: {
    clips: 100,
    files: 10,
    words_per_clip: 1000,
    focus_mode_time: 60,
    compact_mode_time: 60,
  },
  premium: {
    clips: Infinity,
    files: Infinity,
    words_per_clip: Infinity,
    focus_mode_time: Infinity,
    compact_mode_time: Infinity,
  },
  grace_period: {
    clips: Infinity,
    files: Infinity,
    words_per_clip: Infinity,
    focus_mode_time: Infinity,
    compact_mode_time: Infinity,
  },
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Vérifier l'authentification
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Récupérer la subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (subError && subError.code !== 'PGRST116') {
      throw subError;
    }

    // 3. Si pas de subscription, créer une FREE par défaut
    if (!subscription) {
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      const { data: newSub } = await supabase
        .from('subscriptions')
        .insert({
          user_id: user.id,
          tier: 'free',
          status: 'active',
          current_period_start: now.toISOString(),
          current_period_end: periodEnd.toISOString(),
          is_grace_period: false,
        })
        .select()
        .single();

      return new Response(
        JSON.stringify({
          tier: 'free',
          status: 'active',
          current_period_end: periodEnd.toISOString(),
          is_grace_period: false,
          quotas: QUOTAS.free,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Récupérer l'usage du mois courant
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const { data: usage } = await supabase
      .from('usage_records')
      .select('*')
      .eq('user_id', user.id)
      .eq('year', year)
      .eq('month', month)
      .single();

    // 5. Calculer les quotas avec usage
    const tier = subscription.tier as keyof typeof QUOTAS;
    const limits = QUOTAS[tier];

    const quotas = {
      clips: {
        used: usage?.clips_count || 0,
        limit: limits.clips,
        remaining: limits.clips === Infinity
          ? Infinity
          : Math.max(0, limits.clips - (usage?.clips_count || 0)),
      },
      files: {
        used: usage?.files_count || 0,
        limit: limits.files,
        remaining: limits.files === Infinity
          ? Infinity
          : Math.max(0, limits.files - (usage?.files_count || 0)),
      },
      focus_mode_time: {
        used: usage?.focus_mode_minutes || 0,
        limit: limits.focus_mode_time,
        remaining: limits.focus_mode_time === Infinity
          ? Infinity
          : Math.max(0, limits.focus_mode_time - (usage?.focus_mode_minutes || 0)),
      },
      compact_mode_time: {
        used: usage?.compact_mode_minutes || 0,
        limit: limits.compact_mode_time,
        remaining: limits.compact_mode_time === Infinity
          ? Infinity
          : Math.max(0, limits.compact_mode_time - (usage?.compact_mode_minutes || 0)),
      },
    };

    // 6. Retourner le résumé
    return new Response(
      JSON.stringify({
        tier: subscription.tier,
        status: subscription.status,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        is_grace_period: subscription.is_grace_period,
        grace_period_ends_at: subscription.grace_period_ends_at,
        quotas,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error getting subscription:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
