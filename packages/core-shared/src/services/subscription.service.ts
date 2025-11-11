/**
 * Subscription Service
 *
 * Gère les abonnements utilisateurs et l'intégration Stripe
 *
 * Design Philosophy (Apple/Notion):
 * - API claire et robuste
 * - Gestion d'erreurs explicite
 * - Cache intelligent pour performance
 * - Événements observables pour réactivité
 */

import {
  Subscription,
  SubscriptionStatus,
  QuotaSummary,
  QuotaUsage,
  CreateCheckoutPayload,
  CheckoutResponse,
  UsageRecord,
  isPremiumTier,
  isGracePeriod,
  isActiveSubscription,
} from '../types/subscription.types';
import { SubscriptionTier, FeatureType } from '../config/subscription.config';

import {
  ISubscriptionService,
  CreateSubscriptionOptions,
  SubscriptionEvent,
} from '../interfaces/subscription.interface';

import {
  getQuotaLimits,
  isFeatureLimited,
  calculateUsagePercentage,
  getAlertLevel,
  GRACE_PERIOD_CONFIG,
} from '../config/subscription.config';

import { EdgeFunctionService } from './edge-function.service';

type SupabaseClient = any; // Type from Supabase adapter

export class SubscriptionService implements ISubscriptionService {
  private supabaseClient: SupabaseClient | null = null;
  private currentSubscription: Subscription | null = null;
  private currentUsageRecord: UsageRecord | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes
  private lastCacheUpdate: number = 0;
  private edgeFunctionService: EdgeFunctionService | null = null;

  constructor(private readonly getSupabaseClient: () => SupabaseClient) {
    this.supabaseClient = null;
  }

  /**
   * Initialise le service
   */
  async initialize(): Promise<void> {
    this.supabaseClient = this.getSupabaseClient();

    if (!this.supabaseClient) {
      throw new Error('Supabase client not initialized');
    }

    // Initialiser l'EdgeFunctionService
    const supabaseUrl = this.supabaseClient.supabaseUrl;
    this.edgeFunctionService = new EdgeFunctionService(
      { supabaseUrl },
      async () => {
        const { data: { session } } = await this.supabaseClient.auth.getSession();
        return session?.access_token || null;
      }
    );

    // Charger la subscription initiale
    await this.loadCurrentSubscription();

    // Écouter les changements auth
    this.supabaseClient.auth.onAuthStateChange(async (event: string) => {
      if (event === 'SIGNED_IN') {
        await this.loadCurrentSubscription();
      } else if (event === 'SIGNED_OUT') {
        this.currentSubscription = null;
        this.currentUsageRecord = null;
      }
    });
  }

  /**
   * Charge la subscription de l'utilisateur courant
   */
  private async loadCurrentSubscription(): Promise<void> {
    const { data: { user } } = await this.supabaseClient.auth.getUser();

    if (!user) {
      this.currentSubscription = null;
      return;
    }

    const subscription = await this.getSubscription(user.id);

    if (!subscription) {
      // Créer une subscription FREE par défaut
      this.currentSubscription = await this.createSubscription(
        user.id,
        SubscriptionTier.FREE
      );
    } else {
      this.currentSubscription = subscription;
    }

    this.lastCacheUpdate = Date.now();
    this.emit(SubscriptionEvent.UPDATED, this.currentSubscription);
  }

  /**
   * Récupère la subscription courante
   */
  async getCurrentSubscription(): Promise<Subscription> {
    // Vérifier le cache
    if (
      this.currentSubscription &&
      Date.now() - this.lastCacheUpdate < this.cacheExpiry
    ) {
      return this.currentSubscription;
    }

    // Recharger depuis la base
    await this.loadCurrentSubscription();

    if (!this.currentSubscription) {
      throw new Error('No subscription found for current user');
    }

    return this.currentSubscription;
  }

  /**
   * Récupère une subscription par user_id
   */
  async getSubscription(userId: string): Promise<Subscription | null> {
    const { data, error } = await this.supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows found
        return null;
      }
      throw error;
    }

    return this.mapToSubscription(data);
  }

  /**
   * Crée une nouvelle subscription
   */
  async createSubscription(
    userId: string,
    tier: SubscriptionTier,
    options?: CreateSubscriptionOptions
  ): Promise<Subscription> {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const isGrace = tier === SubscriptionTier.GRACE_PERIOD;
    const gracePeriodDays = options?.gracePeriodDays || GRACE_PERIOD_CONFIG.DURATION_DAYS;
    const gracePeriodEnd = isGrace
      ? new Date(now.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000)
      : null;

    const { data, error } = await this.supabaseClient
      .from('subscriptions')
      .insert({
        user_id: userId,
        tier,
        status: isGrace ? SubscriptionStatus.GRACE_PERIOD : SubscriptionStatus.ACTIVE,
        stripe_customer_id: options?.stripeCustomerId,
        stripe_subscription_id: options?.stripeSubscriptionId,
        stripe_price_id: options?.stripePriceId,
        current_period_start: now.toISOString(),
        current_period_end: (gracePeriodEnd || periodEnd).toISOString(),
        grace_period_ends_at: gracePeriodEnd?.toISOString(),
        is_grace_period: isGrace,
        metadata: options?.metadata || {},
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    const subscription = this.mapToSubscription(data);

    // Créer l'usage record initial
    await this.createInitialUsageRecord(subscription.id, userId);

    this.emit(SubscriptionEvent.CREATED, subscription);

    return subscription;
  }

  /**
   * Crée l'usage record initial du mois
   */
  private async createInitialUsageRecord(
    subscriptionId: string,
    userId: string
  ): Promise<void> {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    await this.supabaseClient.from('usage_records').insert({
      user_id: userId,
      subscription_id: subscriptionId,
      period_start: periodStart.toISOString(),
      period_end: periodEnd.toISOString(),
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      clips_count: 0,
      files_count: 0,
      focus_mode_minutes: 0,
      compact_mode_minutes: 0,
    });
  }

  /**
   * Met à jour une subscription
   */
  async updateSubscription(
    subscriptionId: string,
    updates: Partial<Subscription>
  ): Promise<Subscription> {
    const { data, error } = await this.supabaseClient
      .from('subscriptions')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    const subscription = this.mapToSubscription(data);

    // Mettre à jour le cache si c'est la subscription courante
    if (this.currentSubscription?.id === subscriptionId) {
      this.currentSubscription = subscription;
      this.lastCacheUpdate = Date.now();
    }

    this.emit(SubscriptionEvent.UPDATED, subscription);

    return subscription;
  }

  /**
   * Annule une subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.updateSubscription(subscriptionId, {
      status: SubscriptionStatus.CANCELED,
      canceled_at: new Date(),
    });

    this.emit(SubscriptionEvent.CANCELED, subscription);

    return subscription;
  }

  /**
   * Réactive une subscription
   */
  async reactivateSubscription(subscriptionId: string): Promise<Subscription> {
    const subscription = await this.updateSubscription(subscriptionId, {
      status: SubscriptionStatus.ACTIVE,
      canceled_at: undefined,
      cancel_at: undefined,
    });

    this.emit(SubscriptionEvent.REACTIVATED, subscription);

    return subscription;
  }

  /**
   * Récupère le résumé des quotas
   */
  async getQuotaSummary(): Promise<QuotaSummary> {
    const subscription = await this.getCurrentSubscription();
    const usageRecord = await this.getCurrentUsageRecord();

    const quotas = getQuotaLimits(subscription.tier);

    // Calculer les quotas pour chaque feature
    const clips = this.createQuotaUsage(
      FeatureType.CLIPS,
      usageRecord.clips_count,
      quotas[FeatureType.CLIPS]
    );

    const files = this.createQuotaUsage(
      FeatureType.FILES,
      usageRecord.files_count,
      quotas[FeatureType.FILES]
    );

    const words_per_clip = this.createQuotaUsage(
      FeatureType.WORDS_PER_CLIP,
      0, // Pas de tracking en temps réel, vérifié au moment de l'envoi
      quotas[FeatureType.WORDS_PER_CLIP]
    );

    const focus_mode_time = this.createQuotaUsage(
      FeatureType.FOCUS_MODE_TIME,
      usageRecord.focus_mode_minutes,
      quotas[FeatureType.FOCUS_MODE_TIME]
    );

    const compact_mode_time = this.createQuotaUsage(
      FeatureType.COMPACT_MODE_TIME,
      usageRecord.compact_mode_minutes,
      quotas[FeatureType.COMPACT_MODE_TIME]
    );

    // Calculer les jours jusqu'au reset
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const daysUntilReset = Math.ceil(
      (nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    const summary: QuotaSummary = {
      tier: subscription.tier,
      status: subscription.status,
      clips,
      files,
      words_per_clip,
      focus_mode_time,
      compact_mode_time,
      period_start: new Date(usageRecord.period_start),
      period_end: new Date(usageRecord.period_end),
      days_until_reset: daysUntilReset,
      is_grace_period: subscription.is_grace_period,
      grace_period_days_remaining: subscription.is_grace_period
        ? await this.getGracePeriodDaysRemaining()
        : undefined,
    };

    return summary;
  }

  /**
   * Crée un QuotaUsage
   */
  private createQuotaUsage(
    feature: FeatureType,
    used: number,
    limit: number
  ): QuotaUsage {
    const isUnlimited = limit === Infinity;
    const remaining = isUnlimited ? Infinity : Math.max(0, limit - used);
    const percentage = calculateUsagePercentage(used, limit);
    const alertLevel = getAlertLevel(percentage);

    return {
      feature,
      used,
      limit,
      remaining,
      percentage,
      is_unlimited: isUnlimited,
      is_limited: !isUnlimited,
      alert_level: alertLevel,
      can_use: isUnlimited || remaining > 0,
    };
  }

  /**
   * Récupère l'usage record du mois courant
   */
  private async getCurrentUsageRecord(): Promise<UsageRecord> {
    // Vérifier le cache
    if (this.currentUsageRecord) {
      const now = new Date();
      const recordMonth = new Date(this.currentUsageRecord.period_start).getMonth();
      const currentMonth = now.getMonth();

      if (recordMonth === currentMonth) {
        return this.currentUsageRecord;
      }
    }

    const subscription = await this.getCurrentSubscription();
    const { data: { user } } = await this.supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('No authenticated user');
    }

    // Appeler la fonction SQL pour créer ou récupérer l'usage record
    const { data, error } = await this.supabaseClient.rpc(
      'get_or_create_current_usage_record',
      {
        p_user_id: user.id,
        p_subscription_id: subscription.id,
      }
    );

    if (error) {
      throw error;
    }

    this.currentUsageRecord = this.mapToUsageRecord(data);

    return this.currentUsageRecord;
  }

  /**
   * Vérifie l'accès à une feature premium
   */
  async hasFeatureAccess(feature: string): Promise<boolean> {
    const subscription = await this.getCurrentSubscription();

    // Premium et grace period ont accès à tout
    if (
      subscription.tier === SubscriptionTier.PREMIUM ||
      subscription.tier === SubscriptionTier.GRACE_PERIOD
    ) {
      return true;
    }

    // Free tier : vérifier les quotas
    const summary = await this.getQuotaSummary();

    switch (feature) {
      case 'focus_mode':
        return summary.focus_mode_time.can_use;
      case 'compact_mode':
        return summary.compact_mode_time.can_use;
      case 'unlimited_clips':
        return false; // Free tier n'a jamais de clips illimités
      case 'unlimited_files':
        return false;
      default:
        return false;
    }
  }

  /**
   * Vérifie si en période de grâce
   */
  async isInGracePeriod(): Promise<boolean> {
    const subscription = await this.getCurrentSubscription();
    return subscription.is_grace_period;
  }

  /**
   * Jours restants de la période de grâce
   */
  async getGracePeriodDaysRemaining(): Promise<number> {
    const subscription = await this.getCurrentSubscription();

    if (!subscription.grace_period_ends_at) {
      return 0;
    }

    const now = new Date();
    const endDate = new Date(subscription.grace_period_ends_at);
    const diffMs = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  }

  /**
   * Crée une session de checkout Stripe via Edge Function
   *
   * SÉCURITÉ: Cette méthode appelle l'Edge Function create-checkout
   * qui gère STRIPE_SECRET_KEY côté serveur. L'app n'a accès qu'au USER_TOKEN.
   *
   * Usage:
   * 1. Appeler cette méthode pour obtenir l'URL de checkout
   * 2. Ouvrir l'URL dans le navigateur (electron.shell.openExternal)
   * 3. L'utilisateur paie sur Stripe
   * 4. Stripe webhook met à jour la BDD automatiquement
   * 5. L'app recharge la subscription pour voir les changements
   */
  async createCheckoutSession(
    payload: CreateCheckoutPayload
  ): Promise<CheckoutResponse> {
    if (!this.edgeFunctionService) {
      throw new Error('EdgeFunctionService not initialized. Call initialize() first.');
    }

    try {
      // Appeler l'Edge Function de manière sécurisée
      const response = await this.edgeFunctionService.createCheckout(payload);

      console.log('Checkout session created:', response.session_id);

      return response;
    } catch (error) {
      console.error('Failed to create checkout session:', error);
      throw new Error(
        `Could not create checkout session: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Gère un webhook Stripe
   *
   * NOTE IMPORTANTE: Les webhooks Stripe sont maintenant gérés automatiquement
   * par l'Edge Function webhook-stripe. Cette méthode n'est plus nécessaire
   * côté client.
   *
   * Architecture:
   * Stripe → webhook-stripe Edge Function → Mise à jour BDD Supabase
   *
   * L'app n'a qu'à recharger la subscription après un paiement:
   * await subscriptionService.loadCurrentSubscription();
   */
  async handleStripeWebhook(event: any, signature: string): Promise<void> {
    console.warn(
      'handleStripeWebhook called on client. Webhooks are now handled server-side by Edge Functions.'
    );
    console.info(
      'To refresh subscription after payment, call: await subscriptionService.loadCurrentSubscription()'
    );
  }

  /**
   * Ouvre le Stripe Customer Portal via Edge Function
   *
   * Permet à l'utilisateur de gérer son abonnement de manière sécurisée:
   * - Voir et télécharger les factures (PDF)
   * - Mettre à jour la carte bancaire
   * - Annuler ou réactiver l'abonnement
   * - Modifier l'adresse de facturation
   *
   * Usage:
   * 1. Appeler cette méthode pour obtenir l'URL du portal
   * 2. Ouvrir l'URL dans le navigateur (electron.shell.openExternal)
   * 3. L'utilisateur gère son abonnement sur le site Stripe
   * 4. Stripe webhook met à jour la BDD automatiquement
   * 5. L'app recharge la subscription pour voir les changements
   *
   * @param returnUrl URL de retour après gestion (optionnel)
   * @returns URL du portal Stripe
   */
  async openCustomerPortal(returnUrl?: string): Promise<string> {
    if (!this.edgeFunctionService) {
      throw new Error('EdgeFunctionService not initialized. Call initialize() first.');
    }

    try {
      const { url } = await this.edgeFunctionService.createPortalSession(returnUrl);

      console.log('Customer portal session created');

      return url;
    } catch (error) {
      console.error('Failed to create customer portal session:', error);
      throw new Error(
        `Could not open customer portal: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Migre vers période de grâce
   */
  async migrateToGracePeriod(userId: string): Promise<Subscription> {
    const existingSubscription = await this.getSubscription(userId);

    if (existingSubscription) {
      // Mettre à jour vers grace period
      return await this.updateSubscription(existingSubscription.id, {
        tier: SubscriptionTier.GRACE_PERIOD,
        status: SubscriptionStatus.GRACE_PERIOD,
        is_grace_period: true,
        grace_period_ends_at: new Date(
          Date.now() + GRACE_PERIOD_CONFIG.DURATION_DAYS * 24 * 60 * 60 * 1000
        ),
      });
    } else {
      // Créer nouvelle subscription grace period
      return await this.createSubscription(userId, SubscriptionTier.GRACE_PERIOD);
    }
  }

  /**
   * Synchronise les subscriptions expirées
   */
  async syncExpiredSubscriptions(): Promise<number> {
    const { data, error } = await this.supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('is_grace_period', true)
      .lt('grace_period_ends_at', new Date().toISOString());

    if (error) {
      throw error;
    }

    let count = 0;

    for (const sub of data || []) {
      await this.updateSubscription(sub.id, {
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.ACTIVE,
        is_grace_period: false,
      });

      this.emit(SubscriptionEvent.GRACE_PERIOD_ENDED, sub);
      count++;
    }

    return count;
  }

  /**
   * Événements observables
   */
  onSubscriptionChanged(
    callback: (subscription: Subscription) => void
  ): () => void {
    return this.on(SubscriptionEvent.UPDATED, callback);
  }

  onQuotaChanged(callback: (summary: QuotaSummary) => void): () => void {
    // Récupérer le summary et appeler le callback
    const wrappedCallback = async () => {
      const summary = await this.getQuotaSummary();
      callback(summary);
    };

    return this.on(SubscriptionEvent.UPDATED, wrappedCallback);
  }

  /**
   * Émettre un événement
   */
  private emit(event: SubscriptionEvent, data: any): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.forEach((callback) => callback(data));
    }
  }

  /**
   * Écouter un événement
   */
  private on(event: SubscriptionEvent, callback: Function): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }

    this.listeners.get(event)!.add(callback);

    // Retourner une fonction pour se désabonner
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  /**
   * Mapping des données Supabase vers Subscription
   */
  private mapToSubscription(data: any): Subscription {
    return {
      id: data.id,
      user_id: data.user_id,
      tier: data.tier as SubscriptionTier,
      status: data.status as SubscriptionStatus,
      stripe_customer_id: data.stripe_customer_id,
      stripe_subscription_id: data.stripe_subscription_id,
      stripe_price_id: data.stripe_price_id,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
      current_period_start: new Date(data.current_period_start),
      current_period_end: new Date(data.current_period_end),
      cancel_at: data.cancel_at ? new Date(data.cancel_at) : undefined,
      canceled_at: data.canceled_at ? new Date(data.canceled_at) : undefined,
      grace_period_ends_at: data.grace_period_ends_at
        ? new Date(data.grace_period_ends_at)
        : undefined,
      is_grace_period: data.is_grace_period,
      metadata: data.metadata,
    };
  }

  /**
   * Mapping des données Supabase vers UsageRecord
   */
  private mapToUsageRecord(data: any): UsageRecord {
    return {
      id: data.id,
      user_id: data.user_id,
      subscription_id: data.subscription_id,
      period_start: new Date(data.period_start),
      period_end: new Date(data.period_end),
      year: data.year,
      month: data.month,
      clips_count: data.clips_count,
      files_count: data.files_count,
      focus_mode_minutes: data.focus_mode_minutes,
      compact_mode_minutes: data.compact_mode_minutes,
      last_clip_at: data.last_clip_at ? new Date(data.last_clip_at) : undefined,
      last_file_upload_at: data.last_file_upload_at
        ? new Date(data.last_file_upload_at)
        : undefined,
      last_focus_mode_at: data.last_focus_mode_at
        ? new Date(data.last_focus_mode_at)
        : undefined,
      last_compact_mode_at: data.last_compact_mode_at
        ? new Date(data.last_compact_mode_at)
        : undefined,
      created_at: new Date(data.created_at),
      updated_at: new Date(data.updated_at),
    };
  }
}
