// packages/ui/src/services/SubscriptionService.ts
/**
 * SubscriptionService - Service centralisé pour gérer les abonnements et quotas
 *
 * Fonctionnalités :
 * - Récupérer le statut d'abonnement de l'utilisateur
 * - Vérifier les quotas avant les actions
 * - Incrémenter l'usage après les actions
 * - Gérer le cache pour réduire les appels API
 *
 * ✅ FIX: Utilise AuthDataManager pour obtenir userId au lieu de Supabase Auth JWT
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { authDataManager } from './AuthDataManager';

export interface SubscriptionTier {
  tier: 'free' | 'premium' | 'grace_period';
  status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'unpaid' | 'incomplete' | 'none';
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  trialEnd?: string;
  cancelAt?: string;
  isGracePeriod: boolean;
  gracePeriodEndsAt?: string;
}

export interface QuotaInfo {
  used: number;
  limit: number | null; // null = unlimited
  remaining: number | null; // null = unlimited
  percentage: number; // 0-100
}

export interface Quotas {
  clips: QuotaInfo;
  files: QuotaInfo;
  focusMode: QuotaInfo;
  compactMode: QuotaInfo;
}

export interface SubscriptionStatus {
  subscription: SubscriptionTier;
  quotas: Quotas;
}

export type ActionType = 'clip' | 'file' | 'focus_mode' | 'compact_mode';

export class SubscriptionService {
  private static instance: SubscriptionService;
  private supabaseClient: SupabaseClient | null = null;
  private cachedStatus: SubscriptionStatus | null = null;
  private cacheTimestamp: number = 0;
  private readonly CACHE_DURATION = 60 * 1000; // 1 minute

  private constructor() {}

  static getInstance(): SubscriptionService {
    if (!SubscriptionService.instance) {
      SubscriptionService.instance = new SubscriptionService();
    }
    return SubscriptionService.instance;
  }

  /**
   * Initialiser avec le client Supabase
   */
  initialize(supabaseClient: SupabaseClient | null) {
    this.supabaseClient = supabaseClient;
    console.log('[SubscriptionService] Initialized with Supabase:', !!supabaseClient);
  }

  /**
   * Récupérer le statut d'abonnement de l'utilisateur (avec cache)
   * ✅ FIX: Utilise AuthDataManager au lieu de Supabase Auth
   */
  async getSubscriptionStatus(forceRefresh: boolean = false): Promise<SubscriptionStatus | null> {
    try {
      // Vérifier le cache si pas de forceRefresh
      if (!forceRefresh && this.cachedStatus && Date.now() - this.cacheTimestamp < this.CACHE_DURATION) {
        console.log('[SubscriptionService] 💾 Using cached subscription status');
        return this.cachedStatus;
      }

      if (!this.supabaseClient) {
        console.warn('[SubscriptionService] Supabase not initialized');
        return this.getFreeTierDefault();
      }

      // ✅ FIX: Utiliser AuthDataManager au lieu de supabaseClient.auth
      const authData = authDataManager.getCurrentData();

      if (!authData?.userId) {
        console.warn('[SubscriptionService] No authenticated user');
        return this.getFreeTierDefault();
      }

      console.log('[SubscriptionService] Fetching subscription for user:', authData.userId);

      // Appeler l'Edge Function get-subscription avec userId
      const { data, error } = await this.supabaseClient.functions.invoke('get-subscription', {
        body: { userId: authData.userId }
      });

      if (error) {
        console.error('[SubscriptionService] Error calling get-subscription:', error);
        return this.getFreeTierDefault();
      }

      if (!data) {
        console.warn('[SubscriptionService] No data returned from get-subscription');
        return this.getFreeTierDefault();
      }

      // Mettre en cache
      this.cachedStatus = data as SubscriptionStatus;
      this.cacheTimestamp = Date.now();

      console.log('[SubscriptionService] ✅ Subscription status loaded:', this.cachedStatus.subscription.tier);
      return this.cachedStatus;
    } catch (error) {
      console.error('[SubscriptionService] Exception getting subscription:', error);
      return this.getFreeTierDefault();
    }
  }

  /**
   * Vérifier si l'utilisateur peut effectuer une action
   * @param action Type d'action (clip, file, focus_mode, compact_mode)
   * @param amount Quantité (par défaut 1)
   * @returns true si autorisé, false si quota dépassé
   */
  async canPerformAction(action: ActionType, amount: number = 1): Promise<boolean> {
    try {
      const status = await this.getSubscriptionStatus();

      if (!status) {
        // En cas d'erreur, autoriser (fail-safe)
        console.warn('[SubscriptionService] Could not get status, allowing action (fail-safe)');
        return true;
      }

      // Premium et grace_period ont toujours accès illimité
      if (status.subscription.tier === 'premium' || status.subscription.tier === 'grace_period') {
        return true;
      }

      // Vérifier le quota pour l'action spécifique
      const quotaKey = this.getQuotaKey(action);
      const quota = status.quotas[quotaKey];

      if (!quota) {
        console.warn('[SubscriptionService] Unknown quota key:', quotaKey);
        return true; // fail-safe
      }

      // Si limit est null, c'est illimité
      if (quota.limit === null) {
        return true;
      }

      // Vérifier si l'utilisateur dépasse la limite
      const wouldExceed = (quota.used + amount) > quota.limit;

      if (wouldExceed) {
        console.warn(`[SubscriptionService] ❌ Quota exceeded for ${action}: ${quota.used}/${quota.limit}`);
        return false;
      }

      console.log(`[SubscriptionService] ✅ Quota OK for ${action}: ${quota.used + amount}/${quota.limit}`);
      return true;
    } catch (error) {
      console.error('[SubscriptionService] Error checking quota:', error);
      return true; // fail-safe: autoriser en cas d'erreur
    }
  }

  /**
   * Incrémenter l'usage après une action réussie
   * @param action Type d'action
   * @param amount Quantité (par défaut 1)
   * ✅ FIX: Utilise AuthDataManager au lieu de Supabase Auth
   */
  async incrementUsage(action: ActionType, amount: number = 1): Promise<void> {
    try {
      if (!this.supabaseClient) {
        console.warn('[SubscriptionService] Supabase not initialized, skipping usage increment');
        return;
      }

      // ✅ FIX: Utiliser AuthDataManager au lieu de supabaseClient.auth
      const authData = authDataManager.getCurrentData();

      if (!authData?.userId) {
        console.warn('[SubscriptionService] No authenticated user, skipping usage increment');
        return;
      }

      console.log(`[SubscriptionService] Incrementing usage for user ${authData.userId}: ${action} +${amount}`);

      // Appeler la fonction SQL increment_usage via RPC
      const { error } = await this.supabaseClient.rpc('increment_usage', {
        p_user_id: authData.userId,
        p_action: action,
        p_amount: amount
      });

      if (error) {
        console.error('[SubscriptionService] Error incrementing usage:', error);
        return;
      }

      console.log(`[SubscriptionService] ✅ Usage incremented: ${action} +${amount}`);

      // Invalider le cache pour forcer un rafraîchissement au prochain appel
      this.invalidateCache();
    } catch (error) {
      console.error('[SubscriptionService] Exception incrementing usage:', error);
    }
  }

  /**
   * Invalider le cache (forcer un rafraîchissement au prochain appel)
   */
  invalidateCache(): void {
    this.cachedStatus = null;
    this.cacheTimestamp = 0;
    console.log('[SubscriptionService] 🗑️ Cache invalidated');
  }

  /**
   * Vérifier si l'utilisateur est premium
   */
  async isPremium(): Promise<boolean> {
    const status = await this.getSubscriptionStatus();
    return status?.subscription.tier === 'premium' || status?.subscription.tier === 'grace_period' || false;
  }

  /**
   * Obtenir les quotas actuels
   */
  async getQuotas(): Promise<Quotas | null> {
    const status = await this.getSubscriptionStatus();
    return status?.quotas || null;
  }

  /**
   * PRIVATE - Obtenir la clé de quota pour une action
   */
  private getQuotaKey(action: ActionType): keyof Quotas {
    const mapping: Record<ActionType, keyof Quotas> = {
      'clip': 'clips',
      'file': 'files',
      'focus_mode': 'focusMode',
      'compact_mode': 'compactMode'
    };
    return mapping[action];
  }

  /**
   * PRIVATE - Retourner un statut par défaut (free tier) en cas d'erreur
   */
  private getFreeTierDefault(): SubscriptionStatus {
    return {
      subscription: {
        tier: 'free',
        status: 'active',
        isGracePeriod: false
      },
      quotas: {
        clips: {
          used: 0,
          limit: 100,
          remaining: 100,
          percentage: 0
        },
        files: {
          used: 0,
          limit: 10,
          remaining: 10,
          percentage: 0
        },
        focusMode: {
          used: 0,
          limit: 60,
          remaining: 60,
          percentage: 0
        },
        compactMode: {
          used: 0,
          limit: 60,
          remaining: 60,
          percentage: 0
        }
      }
    };
  }
}

// Export singleton instance
export const subscriptionService = SubscriptionService.getInstance();
