import { Request, Response } from 'express';
import Stripe from 'stripe';
import { config } from '../config';
import { supabaseService } from '../services/supabase.service';
import logger from '../utils/logger';

// Initialize Stripe
const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2025-10-29.clover',
});

export class SubscriptionController {
  /**
   * Get current subscription
   * GET /api/subscription/current
   */
  async getCurrent(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;

      let subscription = await supabaseService.getSubscription(userId);

      // Create subscription if it doesn't exist
      if (!subscription) {
        subscription = await supabaseService.createSubscription(userId, 'FREE');
        logger.info(`Created new subscription for user ${userId}`);
      }

      res.json({
        success: true,
        subscription
      });
    } catch (error: any) {
      logger.error('Error getting subscription:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Create Stripe checkout session
   * POST /api/subscription/create-checkout
   */
  async createCheckout(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { priceId, successUrl, cancelUrl, billingCycle } = req.body;

      // Validate input
      if (!priceId || !successUrl || !cancelUrl) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: priceId, successUrl, cancelUrl'
        });
        return;
      }

      // Get or create subscription
      let subscription = await supabaseService.getSubscription(userId);
      if (!subscription) {
        subscription = await supabaseService.createSubscription(userId, 'FREE');
      }

      // Create or get Stripe customer
      let customerId = subscription.stripe_customer_id;

      if (!customerId) {
        const customer = await stripe.customers.create({
          metadata: {
            userId,
            subscriptionId: subscription.id
          }
        });

        customerId = customer.id;

        // Update subscription with customer ID
        await supabaseService.updateSubscription(subscription.id, {
          stripe_customer_id: customerId
        });

        logger.info(`Created Stripe customer ${customerId} for user ${userId}`);
      }

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          userId,
          subscriptionId: subscription.id,
          billingCycle: billingCycle || 'monthly'
        },
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
      });

      logger.info(`Created checkout session ${session.id} for user ${userId}`);

      res.json({
        success: true,
        sessionId: session.id,
        url: session.url
      });
    } catch (error: any) {
      logger.error('Error creating checkout session:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Create Stripe customer portal session
   * POST /api/subscription/portal
   */
  async createPortal(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user.id;
      const { returnUrl } = req.body;

      if (!returnUrl) {
        res.status(400).json({
          success: false,
          error: 'Missing required field: returnUrl'
        });
        return;
      }

      // Get subscription
      const subscription = await supabaseService.getSubscription(userId);

      if (!subscription || !subscription.stripe_customer_id) {
        res.status(404).json({
          success: false,
          error: 'No Stripe customer found'
        });
        return;
      }

      // Create portal session
      const session = await stripe.billingPortal.sessions.create({
        customer: subscription.stripe_customer_id,
        return_url: returnUrl,
      });

      logger.info(`Created portal session for user ${userId}`);

      res.json({
        success: true,
        url: session.url
      });
    } catch (error: any) {
      logger.error('Error creating portal session:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Handle Stripe webhooks
   * POST /api/stripe/webhook
   */
  async handleWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['stripe-signature'];

      if (!signature) {
        res.status(400).json({
          success: false,
          error: 'Missing stripe-signature header'
        });
        return;
      }

      // Verify webhook signature
      let event: Stripe.Event;

      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          signature,
          config.stripe.webhookSecret
        );
      } catch (err: any) {
        logger.error(`Webhook signature verification failed: ${err.message}`);
        res.status(400).json({
          success: false,
          error: `Webhook Error: ${err.message}`
        });
        return;
      }

      logger.info(`Received webhook event: ${event.type}`);

      // Handle different event types
      switch (event.type) {
        case 'checkout.session.completed': {
          const session = event.data.object as Stripe.Checkout.Session;
          await this.handleCheckoutCompleted(session);
          break;
        }

        case 'customer.subscription.created':
        case 'customer.subscription.updated': {
          const subscription = event.data.object as Stripe.Subscription;
          await this.handleSubscriptionUpdated(subscription);
          break;
        }

        case 'customer.subscription.deleted': {
          const subscription = event.data.object as Stripe.Subscription;
          await this.handleSubscriptionDeleted(subscription);
          break;
        }

        case 'invoice.payment_succeeded': {
          const invoice = event.data.object as Stripe.Invoice;
          await this.handlePaymentSucceeded(invoice);
          break;
        }

        case 'invoice.payment_failed': {
          const invoice = event.data.object as Stripe.Invoice;
          await this.handlePaymentFailed(invoice);
          break;
        }

        default:
          logger.info(`Unhandled webhook event type: ${event.type}`);
      }

      res.json({ success: true, received: true });
    } catch (error: any) {
      logger.error('Error handling webhook:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Handle checkout completed
   */
  private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
    try {
      const userId = session.metadata?.userId;
      const subscriptionId = session.metadata?.subscriptionId;

      if (!userId || !subscriptionId) {
        logger.error('Missing metadata in checkout session');
        return;
      }

      // Get Stripe subscription
      const stripeSubscription = await stripe.subscriptions.retrieve(
        session.subscription as string
      ) as Stripe.Subscription;

      // Update our subscription
      await supabaseService.updateSubscription(subscriptionId, {
        tier: 'PREMIUM',
        status: 'ACTIVE',
        stripe_subscription_id: stripeSubscription.id,
        stripe_customer_id: session.customer as string,
        current_period_start: new Date((stripeSubscription as any).current_period_start * 1000).toISOString(),
        current_period_end: new Date((stripeSubscription as any).current_period_end * 1000).toISOString(),
        cancel_at_period_end: false
      });

      logger.info(`Checkout completed for user ${userId}, upgraded to PREMIUM`);
    } catch (error: any) {
      logger.error('Error handling checkout completed:', error);
    }
  }

  /**
   * Handle subscription updated
   */
  private async handleSubscriptionUpdated(stripeSubscription: Stripe.Subscription): Promise<void> {
    try {
      const customerId = stripeSubscription.customer as string;

      // Find subscription by customer ID
      const subscription = await supabaseService.getSubscriptionByCustomerId(customerId);

      if (!subscription) {
        logger.error(`No subscription found for customer ${customerId}`);
        return;
      }

      // Determine tier based on subscription status
      let tier: 'FREE' | 'PREMIUM' = 'PREMIUM';
      let status: 'ACTIVE' | 'CANCELED' | 'PAST_DUE' | 'TRIALING' | 'INCOMPLETE' = 'ACTIVE';

      if (stripeSubscription.status === 'canceled' || stripeSubscription.status === 'unpaid') {
        tier = 'FREE';
        status = 'CANCELED';
      } else if (stripeSubscription.status === 'past_due') {
        status = 'PAST_DUE';
      } else if (stripeSubscription.status === 'trialing') {
        status = 'TRIALING';
      } else if (stripeSubscription.status === 'incomplete') {
        status = 'INCOMPLETE';
      }

      // Update subscription
      await supabaseService.updateSubscription(subscription.id, {
        tier,
        status,
        stripe_subscription_id: stripeSubscription.id,
        current_period_start: new Date((stripeSubscription as any).current_period_start * 1000).toISOString(),
        current_period_end: new Date((stripeSubscription as any).current_period_end * 1000).toISOString(),
        cancel_at_period_end: stripeSubscription.cancel_at_period_end
      });

      logger.info(`Updated subscription ${subscription.id} to ${tier} (${status})`);
    } catch (error: any) {
      logger.error('Error handling subscription updated:', error);
    }
  }

  /**
   * Handle subscription deleted
   */
  private async handleSubscriptionDeleted(stripeSubscription: Stripe.Subscription): Promise<void> {
    try {
      const customerId = stripeSubscription.customer as string;

      // Find subscription by customer ID
      const subscription = await supabaseService.getSubscriptionByCustomerId(customerId);

      if (!subscription) {
        logger.error(`No subscription found for customer ${customerId}`);
        return;
      }

      // Downgrade to FREE
      await supabaseService.updateSubscription(subscription.id, {
        tier: 'FREE',
        status: 'CANCELED',
        cancel_at_period_end: false
      });

      logger.info(`Subscription ${subscription.id} canceled, downgraded to FREE`);
    } catch (error: any) {
      logger.error('Error handling subscription deleted:', error);
    }
  }

  /**
   * Handle payment succeeded
   */
  private async handlePaymentSucceeded(invoice: Stripe.Invoice): Promise<void> {
    try {
      const customerId = invoice.customer as string;

      logger.info(`Payment succeeded for customer ${customerId}`);

      // If subscription was past_due, it should now be active
      // The subscription.updated webhook will handle the status change
    } catch (error: any) {
      logger.error('Error handling payment succeeded:', error);
    }
  }

  /**
   * Handle payment failed
   */
  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    try {
      const customerId = invoice.customer as string;

      logger.warn(`Payment failed for customer ${customerId}`);

      // The subscription.updated webhook will handle the status change to past_due
    } catch (error: any) {
      logger.error('Error handling payment failed:', error);
    }
  }
}

export const subscriptionController = new SubscriptionController();
