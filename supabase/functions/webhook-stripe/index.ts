/**
 * Supabase Edge Function: webhook-stripe
 *
 * Reçoit et traite les webhooks Stripe de manière sécurisée
 *
 * SÉCURITÉ:
 * - Vérifie la signature Stripe (STRIPE_WEBHOOK_SECRET)
 * - Utilise SERVICE_ROLE_KEY pour modifier la BDD
 * - Rejette les webhooks non signés
 *
 * Événements gérés:
 * - checkout.session.completed : Nouveau paiement
 * - customer.subscription.updated : Changement de plan
 * - customer.subscription.deleted : Annulation
 * - customer.subscription.trial_will_end : Fin d'essai imminente
 * - invoice.payment_failed : Échec de paiement
 *
 * Usage:
 *   POST https://[project].supabase.co/functions/v1/webhook-stripe
 *   Headers: stripe-signature: [signature]
 *   Body: [Stripe Event]
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';
import { getCorsHeaders } from '../_shared/cors.ts';
import { getSupabaseConfig } from '../_shared/config.ts';

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET')!;
// Get config with fallback for legacy key names (Jan 2026 migration)
const { url: SUPABASE_URL, secretKey: SERVICE_ROLE_KEY } = getSupabaseConfig();

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-11-20.acacia',
  httpClient: Stripe.createFetchHttpClient(),
});

serve(async (req) => {
  // Get CORS headers for this request
  const corsHeaders = getCorsHeaders(req);

  try {
    // 1. Récupérer la signature et le body
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      return new Response(
        JSON.stringify({ error: 'No signature' }),
        { status: 400 }
      );
    }

    const body = await req.text();

    // 2. Vérifier la signature Stripe
    let event: Stripe.Event;

    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 400 }
      );
    }

    // 3. Traiter l'événement
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    console.log(`Processing Stripe webhook: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, supabase);
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription, supabase);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, supabase);
        break;

      case 'customer.subscription.trial_will_end':
        await handleTrialWillEnd(event.data.object as Stripe.Subscription, supabase);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.Invoice, supabase);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: 'Webhook handler failed' }),
      { status: 500 }
    );
  }
});

/**
 * Gère checkout.session.completed
 * Crée ou met à jour la subscription dans Supabase
 */
async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  supabase: any
) {
  const userId = session.metadata?.user_id || session.client_reference_id;

  if (!userId) {
    console.error('No user_id in checkout session');
    return;
  }

  console.log(`Checkout completed for user ${userId}`);

  // Récupérer la subscription Stripe
  const subscriptionId = session.subscription as string;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  // Créer ou mettre à jour dans Supabase
  const { data: existingSub } = await supabase
    .from('subscriptions')
    .select('id')
    .eq('user_id', userId)
    .single();

  // 🔥 MIGRATION: Tier values now UPPERCASE, removed is_grace_period
  const isInTrial = subscription.status === 'trialing';
  const tier = isInTrial ? 'GRACE_PERIOD' : 'PREMIUM';

  const subscriptionData = {
    user_id: userId,
    tier: tier,
    status: subscription.status,
    stripe_customer_id: session.customer as string,
    stripe_subscription_id: subscriptionId,
    stripe_price_id: subscription.items.data[0].price.id,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
  };

  if (existingSub) {
    // Update
    await supabase
      .from('subscriptions')
      .update(subscriptionData)
      .eq('user_id', userId);
  } else {
    // Insert
    await supabase
      .from('subscriptions')
      .insert(subscriptionData);
  }

  console.log(`Subscription created/updated for user ${userId}`);
}

/**
 * Gère customer.subscription.updated
 */
async function handleSubscriptionUpdated(
  subscription: Stripe.Subscription,
  supabase: any
) {
  const userId = subscription.metadata?.user_id;

  if (!userId) {
    console.error('No user_id in subscription metadata');
    return;
  }

  console.log(`Subscription updated for user ${userId}, status: ${subscription.status}`);

  // 🔥 MIGRATION: Tier values now UPPERCASE, removed is_grace_period
  let tier = 'FREE';

  if (subscription.status === 'trialing') {
    tier = 'GRACE_PERIOD';
  } else if (subscription.status === 'active') {
    tier = 'PREMIUM';
  } else if (subscription.status === 'past_due' || subscription.status === 'unpaid') {
    // Garder grace_period pour quelques jours de tolérance
    tier = 'GRACE_PERIOD';
  }

  await supabase
    .from('subscriptions')
    .update({
      tier: tier,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      trial_end: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      cancel_at: subscription.cancel_at
        ? new Date(subscription.cancel_at * 1000).toISOString()
        : null,
    })
    .eq('user_id', userId);

  console.log(`Subscription updated: tier=${tier}`);
}

/**
 * Gère customer.subscription.deleted
 */
async function handleSubscriptionDeleted(
  subscription: Stripe.Subscription,
  supabase: any
) {
  const userId = subscription.metadata?.user_id;

  if (!userId) {
    console.error('No user_id in subscription metadata');
    return;
  }

  console.log(`Subscription deleted for user ${userId}`);

  // 🔥 MIGRATION: Tier value now UPPERCASE
  await supabase
    .from('subscriptions')
    .update({
      tier: 'FREE',
      status: 'canceled',
      canceled_at: new Date().toISOString(),
    })
    .eq('user_id', userId);
}

/**
 * Gère customer.subscription.trial_will_end
 * Appelé 3 jours avant la fin du trial
 */
async function handleTrialWillEnd(
  subscription: Stripe.Subscription,
  supabase: any
) {
  const userId = subscription.metadata?.user_id;

  if (!userId) {
    console.error('No user_id in subscription metadata');
    return;
  }

  console.log(`Trial will end soon for user ${userId}`);

  // Optionnel: envoyer une notification ou email
  // Pour l'instant, juste logger
  const trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end * 1000)
    : null;

  console.log(`Trial ends at: ${trialEnd?.toISOString()}`);
}

/**
 * Gère invoice.payment_failed
 */
async function handlePaymentFailed(
  invoice: Stripe.Invoice,
  supabase: any
) {
  const subscriptionId = invoice.subscription as string;

  if (!subscriptionId) {
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const userId = subscription.metadata?.user_id;

  if (!userId) {
    return;
  }

  console.log(`Payment failed for user ${userId}`);

  // 🔥 MIGRATION: Tier value now UPPERCASE, removed is_grace_period
  await supabase
    .from('subscriptions')
    .update({
      tier: 'GRACE_PERIOD',
      status: 'past_due',
    })
    .eq('user_id', userId);
}
