/**
 * Supabase Edge Function: get-subscription
 *
 * Récupère le statut de subscription de l'utilisateur
 *
 * SÉCURITÉ:
 * - Vérifie que l'utilisateur existe dans user_profiles
 * - Retourne uniquement les données de l'utilisateur demandé
 * - Ne expose jamais les clés Stripe
 *
 * Usage:
 *   POST https://[project].supabase.co/functions/v1/get-subscription
 *   Body: { userId: string }
 *
 * Response:
 *   {
 *     subscription: {
 *       tier: 'free' | 'premium' | 'grace_period',
 *       status: 'active' | 'canceled' | ...,
 *       currentPeriodStart: '2025-01-01T00:00:00Z',
 *       currentPeriodEnd: '2025-12-31T23:59:59Z',
 *       isGracePeriod: false,
 *       ...
 *     },
 *     quotas: {
 *       clips: { used: 10, limit: 100, remaining: 90, percentage: 10 },
 *       files: { used: 2, limit: 10, remaining: 8, percentage: 20 },
 *       focusMode: { used: 30, limit: 60, remaining: 30, percentage: 50 },
 *       compactMode: { used: 15, limit: 60, remaining: 45, percentage: 25 }
 *     }
 *   }
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders } from '../_shared/cors.ts';
import { QUOTA_LIMITS, HTTP_STATUS } from '../_shared/constants.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Use centralized quota configuration (FIX #16, #17, #18)
const QUOTAS = QUOTA_LIMITS;

serve(async (req) => {
  // Get CORS headers for this request
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Récupérer userId du body
    const { userId } = await req.json();

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
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.error('[get-subscription] User not found:', userId, profileError);
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[get-subscription] Fetching subscription for user:', userId);

    // 3. Récupérer la subscription
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (subError && subError.code !== 'PGRST116') {
      console.error('[get-subscription] Error fetching subscription:', subError);
      throw subError;
    }

    // 4. Si pas de subscription, retourner FREE par défaut
    // (Le trigger DB devrait normalement créer une subscription FREE automatiquement)
    if (!subscription) {
      console.warn('[get-subscription] No subscription found for user:', userId, '- returning FREE default');

      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      return new Response(
        JSON.stringify({
          subscription: {
            tier: 'free',
            status: 'active',
            currentPeriodStart: now.toISOString(),
            currentPeriodEnd: periodEnd.toISOString(),
            isGracePeriod: false,
          },
          quotas: {
            clips: {
              used: 0,
              limit: QUOTAS.free.clips,
              remaining: QUOTAS.free.clips,
              percentage: 0,
            },
            files: {
              used: 0,
              limit: QUOTAS.free.files,
              remaining: QUOTAS.free.files,
              percentage: 0,
            },
            focusMode: {
              used: 0,
              limit: QUOTAS.free.focus_mode_time,
              remaining: QUOTAS.free.focus_mode_time,
              percentage: 0,
            },
            compactMode: {
              used: 0,
              limit: QUOTAS.free.compact_mode_time,
              remaining: QUOTAS.free.compact_mode_time,
              percentage: 0,
            },
          },
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Récupérer l'usage du mois courant
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    const { data: usage } = await supabase
      .from('usage_records')
      .select('*')
      .eq('user_id', userId)
      .eq('year', year)
      .eq('month', month)
      .single();

    // 6. Calculer les quotas avec usage
    const tier = subscription.tier as keyof typeof QUOTAS;
    const limits = QUOTAS[tier];

    // Helper pour calculer quota info
    const calculateQuotaInfo = (used: number, limit: number | null) => {
      if (limit === null) {
        return {
          used,
          limit: null,
          remaining: null,
          percentage: 0,
        };
      }
      const remaining = Math.max(0, limit - used);
      const percentage = limit > 0 ? Math.round((used / limit) * 100) : 0;
      return { used, limit, remaining, percentage };
    };

    const quotas = {
      clips: calculateQuotaInfo(
        usage?.clips_count || 0,
        limits.clips
      ),
      files: calculateQuotaInfo(
        usage?.files_count || 0,
        limits.files
      ),
      focusMode: calculateQuotaInfo(
        usage?.focus_mode_minutes || 0,
        limits.focus_mode_time
      ),
      compactMode: calculateQuotaInfo(
        usage?.compact_mode_minutes || 0,
        limits.compact_mode_time
      ),
    };

    console.log('[get-subscription] ✅ Subscription loaded:', tier, 'Quotas:', JSON.stringify(quotas));

    // 7. Retourner le résumé
    return new Response(
      JSON.stringify({
        subscription: {
          tier: subscription.tier,
          status: subscription.status,
          currentPeriodStart: subscription.current_period_start,
          currentPeriodEnd: subscription.current_period_end,
          trialEnd: subscription.trial_end,
          cancelAt: subscription.cancel_at,
          isGracePeriod: subscription.is_grace_period,
          gracePeriodEndsAt: subscription.grace_period_ends_at,
        },
        quotas,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[get-subscription] Error:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
