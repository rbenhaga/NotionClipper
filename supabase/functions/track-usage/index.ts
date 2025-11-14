// supabase/functions/track-usage/index.ts
// Edge Function to track usage (clips, files) in Supabase
// Uses SERVICE_ROLE_KEY to bypass RLS (for custom OAuth users)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Create client with SERVICE_ROLE_KEY to bypass RLS
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    const { userId, feature, increment = 1, metadata } = await req.json()

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'userId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!feature || !['clips', 'files'].includes(feature)) {
      return new Response(
        JSON.stringify({ error: 'Invalid feature. Must be clips or files' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`[track-usage] Tracking ${feature} for user ${userId}, increment: ${increment}`)

    // Get or create subscription
    let { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .single()

    if (subError || !subscription) {
      console.log('[track-usage] No subscription found, returning default')
      return new Response(
        JSON.stringify({ success: true, message: 'No subscription to track' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Call increment_usage_counter RPC
    const { data, error } = await supabase.rpc('increment_usage_counter', {
      p_user_id: userId,
      p_feature: feature,
      p_increment: increment
    })

    if (error) {
      console.error('[track-usage] Error incrementing usage:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Log usage event if metadata provided
    if (metadata && data) {
      try {
        const eventType = feature === 'clips' ? 'clip_sent' : 'file_uploaded'

        await supabase.from('usage_events').insert({
          user_id: userId,
          subscription_id: subscription.id,
          usage_record_id: data.id,
          event_type: eventType,
          feature: feature,
          metadata: metadata || {}
        })
      } catch (eventError) {
        console.error('[track-usage] Failed to log event:', eventError)
        // Don't fail the request if event logging fails
      }
    }

    console.log(`[track-usage] ✅ Successfully tracked ${feature}`)

    return new Response(
      JSON.stringify({
        success: true,
        usage: data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('[track-usage] Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
