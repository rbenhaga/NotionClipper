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
import { subscriptionLogger as logger } from './logger.service';

type SupabaseClient = any; // Type from Supabase adapter

export class SubscriptionService implements ISubscriptionService {
  private supabaseClient: SupabaseClient | null = null;
  private currentSubscription: Subscription | null = null;
  private currentUsageRecord: UsageRecord | null = null;
  private listeners: Map<string, Set<Function>> = new Map();
  private cacheExpiry: number = 5 * 60 * 1000; // 5 minutes
  private lastCacheUpdate: number = 0;
  private edgeFunctionService: EdgeFunctionService | null = null;
  private hasLoggedClientWarning: boolean = false; // 🔧 FIX BUG #8: Track if we've warned about missing client
  private hasLoggedNoAuthWarning: boolean = false; // 🔧 FIX: Track if we've warned about no auth to prevent spam after logout

  constructor(
    private readonly getSupabaseClient: () => SupabaseClient,
    private readonly supabaseUrl: string,
    private readonly supabaseKey: string
  ) {
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

    // ✅ FIX CRITIQUE: Utiliser supabaseUrl et supabaseKey passés au constructor
    // Le SupabaseClient ne les expose PAS comme propriétés publiques !
    logger.debug('Initialized with Supabase', { hasUrl: !!this.supabaseUrl, hasKey: !!this.supabaseKey });

    // 🔧 FIX: Validate that supabaseUrl and supabaseKey are available
    if (!this.supabaseUrl || !this.supabaseKey) {
      logger.error('Missing supabaseUrl or supabaseKey', new Error('Supabase config missing'), { supabaseUrl: !!this.supabaseUrl, supabaseKey: !!this.supabaseKey });
      throw new Error('Supabase URL and Key are required');
    }

    this.edgeFunctionService = new EdgeFunctionService(
      { supabaseUrl: this.supabaseUrl, supabaseKey: this.supabaseKey },
      async () => {
        // 🔧 FIX CRITICAL: Check supabaseClient null before accessing .auth
        // For OAuth users (Notion/Google), there's no Supabase session, so we return null
        // Edge Functions will use apikey instead
        if (!this.supabaseClient) {
          return null;
        }

        try {
          const { data: { session } } = await this.supabaseClient.auth.getSession();
          return session?.access_token || null;
        } catch (error) {
          logger.warn('Failed to get auth session', error);
          return null;
        }
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
   * 🔧 FIX BUG #4: Invalidate cache to force fresh data fetch
   * Call this after operations that modify subscription/usage (e.g., track-usage)
   */
  invalidateCache(): void {
    this.currentSubscription = null;
    this.currentUsageRecord = null;
    this.lastCacheUpdate = 0;
    logger.debug(' 🗑️ Cache invalidated - next fetch will be fresh');
  }

  /**
   * Charge la subscription de l'utilisateur courant
   * 🔧 FIX BUG #3: Utiliser AuthDataManager au lieu de Supabase Auth
   */
  private async loadCurrentSubscription(): Promise<void> {
    // ✅ FIX: Vérifier que supabaseClient existe
    if (!this.supabaseClient) {
      // 🔧 FIX BUG #8: Only log warning once to reduce console spam
      if (!this.hasLoggedClientWarning) {
        logger.debug(' Supabase client not yet initialized, using defaults');
        this.hasLoggedClientWarning = true;
      }
      this.currentSubscription = null;
      return;
    }

    // 🔧 FIX BUG #3: Utiliser AuthDataManager pour obtenir userId
    // L'authentification est gérée via OAuth custom (Google/Notion), pas via Supabase Auth
    const authData = await this.getAuthData();

    if (!authData?.userId) {
      // 🔧 FIX: Only log warning once to prevent spam after logout
      if (!this.hasLoggedNoAuthWarning) {
        logger.debug(' No authenticated user');
        this.hasLoggedNoAuthWarning = true;
      }
      this.currentSubscription = null;
      return;
    }

    // Reset warning flag when user is authenticated (for future logouts)
    this.hasLoggedNoAuthWarning = false;

    // 🔧 FIX: Use Edge Function instead of direct query (bypasses RLS for OAuth users)
    // If Edge Function is not deployed or fails, create ephemeral FREE subscription
    let subscription: Subscription | null = null;

    if (this.edgeFunctionService) {
      try {
        const result = await this.edgeFunctionService.getSubscription(authData.userId);
        subscription = this.mapToSubscription(result.subscription);
      } catch (error) {
        logger.warn(' Edge Function failed (not deployed or 401):', error);
        // 🔧 FIX CRITICAL: Don't try direct query or creation - they will fail due to RLS
        // Instead, create ephemeral FREE subscription in memory
        logger.debug(' Creating ephemeral FREE subscription for OAuth user');
        const now = new Date();
        const periodEnd = new Date(now);
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        this.currentSubscription = {
          id: 'ephemeral-free',
          user_id: authData.userId,
          tier: SubscriptionTier.FREE,
          status: SubscriptionStatus.ACTIVE,
          created_at: now,
          updated_at: now,
          current_period_start: now,
          current_period_end: periodEnd,
          is_grace_period: false,
          metadata: { ephemeral: true, reason: 'Edge Function not deployed' }
        };

        this.lastCacheUpdate = Date.now();
        this.emit(SubscriptionEvent.UPDATED, this.currentSubscription);
        return;
      }
    } else {
      // No Edge Function service - create ephemeral FREE subscription
      logger.debug(' No Edge Function service, creating ephemeral FREE subscription');
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      this.currentSubscription = {
        id: 'ephemeral-free',
        user_id: authData.userId,
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.ACTIVE,
        created_at: now,
        updated_at: now,
        current_period_start: now,
        current_period_end: periodEnd,
        is_grace_period: false,
        metadata: { ephemeral: true, reason: 'No Edge Function service' }
      };

      this.lastCacheUpdate = Date.now();
      this.emit(SubscriptionEvent.UPDATED, this.currentSubscription);
      return;
    }

    // Si subscription trouvée via Edge Function, l'utiliser
    if (subscription) {
      this.currentSubscription = subscription;
    } else {
      // Edge Function a réussi mais pas de subscription trouvée
      // Créer ephemeral FREE subscription
      logger.debug(' No subscription found, creating ephemeral FREE');
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      this.currentSubscription = {
        id: 'ephemeral-free',
        user_id: authData.userId,
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.ACTIVE,
        created_at: now,
        updated_at: now,
        current_period_start: now,
        current_period_end: periodEnd,
        is_grace_period: false,
        metadata: { ephemeral: true, reason: 'No subscription in database' }
      };
    }

    this.lastCacheUpdate = Date.now();
    this.emit(SubscriptionEvent.UPDATED, this.currentSubscription);
  }

  /**
   * 🔧 FIX BUG #3: Helper pour obtenir les données d'authentification
   * Essaie d'abord AuthDataManager (custom OAuth), puis fallback sur Supabase Auth
   */
  private async getAuthData(): Promise<{ userId: string } | null> {
    // 🔧 FIX: Try AuthDataManager first (for custom OAuth: Notion, Google)
    try {
      const authDataManager = (window as any).__AUTH_DATA_MANAGER__;
      if (authDataManager && typeof authDataManager.getCurrentData === 'function') {
        const authData = authDataManager.getCurrentData();
        if (authData?.userId) {
          return { userId: authData.userId };
        }
      }
    } catch (error) {
      logger.error(' Failed to get user from AuthDataManager:', error);
    }

    // Fallback: Utiliser Supabase Auth (for future Supabase Auth users)
    // 🔧 FIX CRITICAL: Check supabaseClient null before accessing .auth (prevents "Cannot read properties of null")
    if (!this.supabaseClient) {
      return null;
    }

    try {
      const { data: { user } } = await this.supabaseClient.auth.getUser();
      if (user) {
        return { userId: user.id };
      }
    } catch (error) {
      logger.error(' Failed to get user from Supabase Auth:', error);
    }

    return null;
  }

  /**
   * Récupère la subscription courante
   *
   * Utilise l'Edge Function pour créer automatiquement une subscription FREE
   * si elle n'existe pas (contourne les RLS)
   */
  async getCurrentSubscription(): Promise<Subscription | null> {
    // Vérifier le cache
    if (
      this.currentSubscription &&
      Date.now() - this.lastCacheUpdate < this.cacheExpiry
    ) {
      return this.currentSubscription;
    }

    // 🔧 FIX: Obtenir userId d'abord avant d'appeler Edge Function
    const authData = await this.getAuthData();
    if (!authData) {
      logger.warn(' No authenticated user, returning null');
      return null;
    }

    // Utiliser l'Edge Function qui crée automatiquement une subscription FREE si nécessaire
    if (this.edgeFunctionService) {
      try {
        const result = await this.edgeFunctionService.getSubscription(authData.userId);

        this.currentSubscription = this.mapToSubscription(result.subscription);
        this.lastCacheUpdate = Date.now();
        this.emit(SubscriptionEvent.UPDATED, this.currentSubscription);
        return this.currentSubscription;
      } catch (error) {
        logger.error('Failed to get subscription via Edge Function', error as Error);
        // Fallback to direct DB access
      }
    }

    // Recharger depuis la base (fallback)
    await this.loadCurrentSubscription();

    // 🔧 FIX: Return a default FREE tier subscription instead of null
    // This ensures users always have a subscription tier, preventing "No subscription found" errors
    if (!this.currentSubscription) {
      logger.warn(' No subscription found, creating default FREE tier');

      // Create a minimal FREE tier subscription object (not persisted to DB - ephemeral)
      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setMonth(periodEnd.getMonth() + 1);

      this.currentSubscription = {
        id: 'default-free',
        user_id: authData?.userId || 'unknown',
        tier: SubscriptionTier.FREE,
        status: SubscriptionStatus.ACTIVE,
        created_at: now,
        updated_at: now,
        current_period_start: now,
        current_period_end: periodEnd,
        is_grace_period: false,
        metadata: { ephemeral: true }
      };

      this.lastCacheUpdate = Date.now();
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

    // ✅ FIX: Gérer le cas où subscription ou usageRecord est null
    if (!subscription || !usageRecord) {
      logger.warn(' No subscription or usage record, returning default quotas');
      // Retourner des quotas par défaut (FREE tier, usage 0)
      const quotas = getQuotaLimits(SubscriptionTier.FREE);
      const now = new Date();
      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const daysUntilReset = Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      return {
        tier: SubscriptionTier.FREE,
        status: 'active' as SubscriptionStatus,
        clips: this.createQuotaUsage(FeatureType.CLIPS, 0, quotas[FeatureType.CLIPS]),
        files: this.createQuotaUsage(FeatureType.FILES, 0, quotas[FeatureType.FILES]),
        words_per_clip: this.createQuotaUsage(FeatureType.WORDS_PER_CLIP, 0, quotas[FeatureType.WORDS_PER_CLIP]),
        focus_mode_time: this.createQuotaUsage(FeatureType.FOCUS_MODE_TIME, 0, quotas[FeatureType.FOCUS_MODE_TIME]),
        compact_mode_time: this.createQuotaUsage(FeatureType.COMPACT_MODE_TIME, 0, quotas[FeatureType.COMPACT_MODE_TIME]),
        period_start: new Date(now.getFullYear(), now.getMonth(), 1),
        period_end: periodEnd,
        days_until_reset: daysUntilReset,
        is_grace_period: false,
      };
    }

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
   * 🔧 FIX BUG #3: Utiliser AuthDataManager au lieu de Supabase Auth
   */
  private async getCurrentUsageRecord(): Promise<UsageRecord | null> {
    // Vérifier le cache
    if (this.currentUsageRecord) {
      const now = new Date();
      const recordMonth = new Date(this.currentUsageRecord.period_start).getMonth();
      const currentMonth = now.getMonth();

      if (recordMonth === currentMonth) {
        return this.currentUsageRecord;
      }
    }

    // ✅ FIX: Vérifier que supabaseClient existe
    if (!this.supabaseClient) {
      // 🔧 FIX BUG #8: Silently return null if not initialized (no spam)
      return null;
    }

    const subscription = await this.getCurrentSubscription();

    // Si pas de subscription, retourner null
    if (!subscription) {
      return null;
    }

    // 🔧 FIX CRITICAL: If subscription is ephemeral, don't try to query database
    // This happens when Edge Function is not deployed and we created in-memory subscription
    if (subscription.metadata?.ephemeral) {
      logger.debug(' Ephemeral subscription, returning null usage record');
      return null; // getQuotaSummary will handle null and return default quotas
    }

    // 🔧 FIX BUG #3: Utiliser AuthDataManager pour obtenir userId
    const authData = await this.getAuthData();

    if (!authData?.userId) {
      logger.warn(' No authenticated user for usage record');
      return null;
    }

    try {
      // Appeler la fonction SQL pour créer ou récupérer l'usage record
      const { data, error } = await this.supabaseClient.rpc(
        'get_or_create_current_usage_record',
        {
          p_user_id: authData.userId,
          p_subscription_id: subscription.id,
        }
      );

      if (error) {
        logger.error(' Failed to get usage record:', error);
        return null; // Return null instead of throwing
      }

      // 🔧 FIX: RPC functions with RETURNS SETOF return an array, not a single object
      // Extract the first (and only) record from the array
      const record = Array.isArray(data) ? data[0] : data;

      if (!record) {
        logger.warn(' No usage record returned from RPC function');
        return null;
      }

      this.currentUsageRecord = this.mapToUsageRecord(record);
      return this.currentUsageRecord;
    } catch (error) {
      logger.error(' Exception getting usage record:', error);
      return null;
    }
  }

  /**
   * Vérifie l'accès à une feature premium
   */
  async hasFeatureAccess(feature: string): Promise<boolean> {
    const subscription = await this.getCurrentSubscription();

    // Si pas de subscription, pas d'accès
    if (!subscription) {
      return false;
    }

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
   * Vérifie si l'utilisateur peut effectuer une action (clip, file)
   * Utilisé pour le quota checking avant envoi
   *
   * @param feature - Type d'action: 'clip' ou 'file'
   * @param amount - Nombre d'actions à effectuer (défaut: 1)
   * @returns true si l'action est autorisée, false si quota atteint
   *
   * @example
   * const canSend = await subscriptionService.canPerformAction('clip', 1);
   * if (!canSend) {
   *   showUpgradeModal();
   *   return;
   * }
   */
  async canPerformAction(feature: 'clip' | 'file', amount: number = 1): Promise<boolean> {
    try {
      const summary = await this.getQuotaSummary();

      switch (feature) {
        case 'clip':
          // Vérifier si l'utilisateur peut utiliser les clips ET si le quota restant est suffisant
          return summary.clips.can_use && (summary.clips.remaining >= amount || summary.clips.remaining === null);

        case 'file':
          // Vérifier si l'utilisateur peut uploader des fichiers ET si le quota restant est suffisant
          return summary.files.can_use && (summary.files.remaining >= amount || summary.files.remaining === null);

        default:
          logger.warn('Unknown feature', { feature });
          return false;
      }
    } catch (error) {
      logger.error(' Error checking quota:', error);
      // Fail-safe: allow action if error (évite de bloquer l'utilisateur)
      return true;
    }
  }

  /**
   * Vérifie si en période de grâce
   */
  async isInGracePeriod(): Promise<boolean> {
    const subscription = await this.getCurrentSubscription();
    return subscription?.is_grace_period || false;
  }

  /**
   * Jours restants de la période de grâce
   */
  async getGracePeriodDaysRemaining(): Promise<number> {
    const subscription = await this.getCurrentSubscription();

    if (!subscription || !subscription.grace_period_ends_at) {
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

      logger.debug('Checkout session created', { sessionId: response.session_id });

      return response;
    } catch (error) {
      logger.error('Failed to create checkout session', error as Error);
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
    logger.warn(
      'handleStripeWebhook called on client. Webhooks are now handled server-side by Edge Functions.'
    );
    logger.info(
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

      logger.debug('Customer portal session created');

      return url;
    } catch (error) {
      logger.error('Failed to create customer portal session', error as Error);
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
