/**
 * Stripe Service
 *
 * Gère les paiements et subscriptions via Stripe
 *
 * Design Philosophy (Apple/Notion):
 * - Intégration simple et robuste
 * - Gestion d'erreurs claire
 * - Webhooks sécurisés
 * - Checkout optimisé pour conversion
 */

import Stripe from 'stripe';
import {
  CreateCheckoutPayload,
  CheckoutResponse,
  StripeWebhookPayload,
  StripeWebhookEventType,
} from '../types/subscription.types';
import { STRIPE_CONFIG } from '../config/subscription.config';

export interface StripeConfig {
  secretKey: string;
  publishableKey: string;
  premiumPriceId: string;
  webhookSecret: string;
}

export class StripeService {
  private stripe: Stripe;
  private config: StripeConfig;

  constructor(config: StripeConfig) {
    this.config = config;
    this.stripe = new Stripe(config.secretKey, {
      apiVersion: '2024-11-20.acacia',
      typescript: true,
    });
  }

  /**
   * Crée une session de checkout
   */
  async createCheckoutSession(
    payload: CreateCheckoutPayload
  ): Promise<CheckoutResponse> {
    try {
      const session = await this.stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
          {
            price: this.config.premiumPriceId,
            quantity: 1,
          },
        ],
        customer_email: payload.email,
        client_reference_id: payload.user_id,
        success_url: payload.success_url,
        cancel_url: payload.cancel_url,
        metadata: {
          user_id: payload.user_id,
          ...payload.metadata,
        },
        subscription_data: {
          metadata: {
            user_id: payload.user_id,
          },
        },
        allow_promotion_codes: true,
        billing_address_collection: 'auto',
      });

      return {
        session_id: session.id,
        checkout_url: session.url!,
        expires_at: new Date(session.expires_at * 1000),
      };
    } catch (error) {
      console.error('Stripe checkout error:', error);
      throw new Error(
        `Failed to create checkout session: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Récupère une session de checkout
   */
  async getCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    return await this.stripe.checkout.sessions.retrieve(sessionId);
  }

  /**
   * Récupère une subscription
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return await this.stripe.subscriptions.retrieve(subscriptionId);
  }

  /**
   * Annule une subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    return await this.stripe.subscriptions.cancel(subscriptionId);
  }

  /**
   * Réactive une subscription annulée
   */
  async reactivateSubscription(
    subscriptionId: string
  ): Promise<Stripe.Subscription> {
    return await this.stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });
  }

  /**
   * Met à jour le mode de paiement
   */
  async updatePaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<Stripe.Customer> {
    return await this.stripe.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
  }

  /**
   * Crée un portal client pour gérer l'abonnement
   */
  async createCustomerPortalSession(
    customerId: string,
    returnUrl: string
  ): Promise<string> {
    const session = await this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return session.url;
  }

  /**
   * Vérifie et construit un événement webhook
   */
  async constructWebhookEvent(
    payload: string | Buffer,
    signature: string
  ): Promise<Stripe.Event> {
    try {
      return this.stripe.webhooks.constructEvent(
        payload,
        signature,
        this.config.webhookSecret
      );
    } catch (error) {
      console.error('Webhook signature verification failed:', error);
      throw new Error('Invalid webhook signature');
    }
  }

  /**
   * Traite un événement webhook
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    console.log(`Processing Stripe webhook: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session
        );
        break;

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription
        );
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription
        );
        break;

      case 'invoice.paid':
        await this.handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(
          event.data.object as Stripe.Invoice
        );
        break;

      default:
        console.log(`Unhandled webhook event type: ${event.type}`);
    }
  }

  /**
   * Gère checkout.session.completed
   */
  private async handleCheckoutCompleted(
    session: Stripe.Checkout.Session
  ): Promise<void> {
    console.log('Checkout completed:', session.id);
    // La logique métier sera dans SubscriptionService
  }

  /**
   * Gère customer.subscription.updated
   */
  private async handleSubscriptionUpdated(
    subscription: Stripe.Subscription
  ): Promise<void> {
    console.log('Subscription updated:', subscription.id);
    // La logique métier sera dans SubscriptionService
  }

  /**
   * Gère customer.subscription.deleted
   */
  private async handleSubscriptionDeleted(
    subscription: Stripe.Subscription
  ): Promise<void> {
    console.log('Subscription deleted:', subscription.id);
    // La logique métier sera dans SubscriptionService
  }

  /**
   * Gère invoice.paid
   */
  private async handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
    console.log('Invoice paid:', invoice.id);
    // La logique métier sera dans SubscriptionService
  }

  /**
   * Gère invoice.payment_failed
   */
  private async handleInvoicePaymentFailed(
    invoice: Stripe.Invoice
  ): Promise<void> {
    console.log('Invoice payment failed:', invoice.id);
    // La logique métier sera dans SubscriptionService
  }

  /**
   * Récupère les informations d'un client
   */
  async getCustomer(customerId: string): Promise<Stripe.Customer> {
    return await this.stripe.customers.retrieve(customerId) as Stripe.Customer;
  }

  /**
   * Crée un client Stripe
   */
  async createCustomer(email: string, metadata?: Record<string, string>): Promise<Stripe.Customer> {
    return await this.stripe.customers.create({
      email,
      metadata,
    });
  }
}
