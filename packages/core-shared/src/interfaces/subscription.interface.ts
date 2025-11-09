/**
 * Subscription Service Interface
 *
 * Définit le contrat pour la gestion des abonnements.
 * Design Philosophy (Apple/Notion):
 * - API claire et prévisible
 * - Gestion d'erreurs explicite
 * - Opérations atomiques
 */

import {
  Subscription,
  SubscriptionStatus,
  SubscriptionTier,
  QuotaSummary,
  CreateCheckoutPayload,
  CheckoutResponse,
} from '../types/subscription.types';

export interface ISubscriptionService {
  /**
   * Initialise le service de subscription
   */
  initialize(): Promise<void>;

  /**
   * Récupère la subscription de l'utilisateur actuel
   * Crée une subscription FREE par défaut si elle n'existe pas
   */
  getCurrentSubscription(): Promise<Subscription>;

  /**
   * Récupère une subscription par user_id
   */
  getSubscription(userId: string): Promise<Subscription | null>;

  /**
   * Crée une nouvelle subscription
   */
  createSubscription(
    userId: string,
    tier: SubscriptionTier,
    options?: CreateSubscriptionOptions
  ): Promise<Subscription>;

  /**
   * Met à jour une subscription existante
   */
  updateSubscription(
    subscriptionId: string,
    updates: Partial<Subscription>
  ): Promise<Subscription>;

  /**
   * Annule une subscription
   */
  cancelSubscription(subscriptionId: string): Promise<Subscription>;

  /**
   * Réactive une subscription annulée
   */
  reactivateSubscription(subscriptionId: string): Promise<Subscription>;

  /**
   * Récupère le résumé des quotas pour l'utilisateur actuel
   */
  getQuotaSummary(): Promise<QuotaSummary>;

  /**
   * Vérifie si l'utilisateur a accès à une feature premium
   */
  hasFeatureAccess(feature: string): Promise<boolean>;

  /**
   * Vérifie si l'utilisateur est en période de grâce
   */
  isInGracePeriod(): Promise<boolean>;

  /**
   * Récupère les jours restants de la période de grâce
   */
  getGracePeriodDaysRemaining(): Promise<number>;

  /**
   * Crée une session de checkout Stripe
   */
  createCheckoutSession(
    payload: CreateCheckoutPayload
  ): Promise<CheckoutResponse>;

  /**
   * Gère un webhook Stripe
   */
  handleStripeWebhook(
    event: any,
    signature: string
  ): Promise<void>;

  /**
   * Migre un utilisateur existant vers la période de grâce
   */
  migrateToGracePeriod(userId: string): Promise<Subscription>;

  /**
   * Vérifie et met à jour les subscriptions expirées
   * (À exécuter périodiquement via cron)
   */
  syncExpiredSubscriptions(): Promise<number>;

  /**
   * Événements observables
   */
  onSubscriptionChanged(
    callback: (subscription: Subscription) => void
  ): () => void;

  onQuotaChanged(callback: (summary: QuotaSummary) => void): () => void;
}

/**
 * Options pour créer une subscription
 */
export interface CreateSubscriptionOptions {
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripePriceId?: string;
  gracePeriodDays?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Événements de subscription
 */
export enum SubscriptionEvent {
  CREATED = 'subscription:created',
  UPDATED = 'subscription:updated',
  CANCELED = 'subscription:canceled',
  REACTIVATED = 'subscription:reactivated',
  UPGRADED = 'subscription:upgraded',
  DOWNGRADED = 'subscription:downgraded',
  GRACE_PERIOD_STARTED = 'subscription:grace_period_started',
  GRACE_PERIOD_ENDING = 'subscription:grace_period_ending',
  GRACE_PERIOD_ENDED = 'subscription:grace_period_ended',
}
