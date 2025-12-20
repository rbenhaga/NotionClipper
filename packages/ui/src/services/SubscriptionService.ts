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
 * ✅ MIGRATED: Uses NotionClipperWeb backend instead of Supabase Edge Functions
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { authDataManager } from './AuthDataManager';
import { fetchWithRetry } from '../utils/edgeFunctions';

// Get backend API URL from global config (set by app's backend.ts)
const getBackendApiUrl = (): string => {
  const baseUrl =
    (typeof window !== 'undefined' && (window as any).__BACKEND_API_URL__) ||
    process.env.VITE_BACKEND_API_URL ||
    process.env.BACKEND_API_URL ||
    'http://localhost:3001';

  return `${baseUrl.replace(/\/api\/?$/, '')}/api`;
};

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
  private supabaseUrl: string | null = null;
  private supabaseKey: string | null = null;
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
   * Initialiser avec le client Supabase et les credentials
   * @param supabaseClient - Client Supabase
   * @param supabaseUrl - URL du projet Supabase (optionnel, extrait du client si non fourni)
   * @param supabaseKey - Clé anon Supabase (optionnel, extrait du client si non fourni)
   */
  initialize(supabaseClient: SupabaseClient | null, supabaseUrl?: string, supabaseKey?: string) {
    this.supabaseClient = supabaseClient;
    this.supabaseUrl = supabaseUrl || null;
    this.supabaseKey = supabaseKey || null;
    console.log('[SubscriptionService] Initialized with Supabase:', !!supabaseClient, 'URL:', !!this.supabaseUrl, 'Key:', !!this.supabaseKey);
  }

  /**
   * Récupérer le statut d'abonnement de l'utilisateur (avec cache)
   * ✅ MIGRATED: Uses NotionClipperWeb backend instead of Supabase Edge Functions
   */
  async getSubscriptionStatus(forceRefresh: boolean = false): Promise<SubscriptionStatus | null> {
    try {
      // Vérifier le cache si pas de forceRefresh
      if (!forceRefresh && this.cachedStatus && Date.now() - this.cacheTimestamp < this.CACHE_DURATION) {
        console.log('[SubscriptionService] 💾 Using cached subscription status');
        return this.cachedStatus;
      }

      // Get auth token from localStorage
      const token = localStorage.getItem('token');
      const authData = authDataManager.getCurrentData();

      if (!token || !authData?.userId) {
        console.warn('[SubscriptionService] No authenticated user');
        return this.getFreeTierDefault();
      }

      console.log('[SubscriptionService] Fetching subscription for user:', authData.userId);

      // 🔧 MIGRATED: Use NotionClipperWeb backend instead of Supabase Edge Function
      const backendUrl = getBackendApiUrl();
      
      // Fetch subscription from backend
      const subscriptionResponse = await fetch(`${backendUrl}/user/subscription`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!subscriptionResponse.ok) {
        console.error('[SubscriptionService] Error fetching subscription:', subscriptionResponse.status);
        return this.getFreeTierDefault();
      }

      const subscriptionData = await subscriptionResponse.json();
      
      // Fetch current usage from backend
      const usageResponse = await fetch(`${backendUrl}/usage/current`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      let usageData = { clips_count: 0, files_count: 0, focus_mode_minutes: 0, compact_mode_minutes: 0 };
      if (usageResponse.ok) {
        const usageResult = await usageResponse.json();
        usageData = usageResult.data?.usage || usageData;
      }

      // Build subscription status from backend response
      const subscription = subscriptionData.data;
      const tier = (subscription?.tier || 'FREE').toLowerCase() as 'free' | 'premium' | 'grace_period';
      const isPremium = tier === 'premium' || tier === 'grace_period';
      
      // Define limits based on tier
      const limits = isPremium 
        ? { clips: null, files: null, focusMode: null, compactMode: null } // unlimited
        : { clips: 100, files: 10, focusMode: 60, compactMode: 60 }; // free tier limits

      const buildQuotaInfo = (used: number, limit: number | null): QuotaInfo => ({
        used,
        limit,
        remaining: limit === null ? null : Math.max(0, limit - used),
        percentage: limit === null ? 0 : Math.min(100, (used / limit) * 100),
      });

      this.cachedStatus = {
        subscription: {
          tier,
          status: (subscription?.status || 'active') as SubscriptionTier['status'],
          currentPeriodStart: subscription?.current_period_start,
          currentPeriodEnd: subscription?.current_period_end,
          isGracePeriod: tier === 'grace_period',
        },
        quotas: {
          clips: buildQuotaInfo(usageData.clips_count || 0, limits.clips),
          files: buildQuotaInfo(usageData.files_count || 0, limits.files),
          focusMode: buildQuotaInfo(usageData.focus_mode_minutes || 0, limits.focusMode),
          compactMode: buildQuotaInfo(usageData.compact_mode_minutes || 0, limits.compactMode),
        },
      };
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
   * ✅ MIGRATED: Uses NotionClipperWeb backend instead of Supabase RPC
   */
  async incrementUsage(action: ActionType, amount: number = 1): Promise<void> {
    try {
      const authData = authDataManager.getCurrentData();

      if (!authData?.userId) {
        console.warn('[SubscriptionService] No authenticated user, skipping usage increment');
        return;
      }

      console.log(`[SubscriptionService] Incrementing usage for user ${authData.userId}: ${action} +${amount}`);

      // Map action types to backend feature names
      const featureMap: Record<ActionType, string> = {
        'clip': 'clips',
        'file': 'files',
        'focus_mode': 'focus_mode_minutes',
        'compact_mode': 'compact_mode_minutes',
      };

      const feature = featureMap[action];
      const backendUrl = getBackendApiUrl();

      // 🔧 MIGRATED: Use NotionClipperWeb backend instead of Supabase RPC
      // 🔒 SECURITY FIX P0 #1: Send auth token, backend extracts userId from JWT
      const token = localStorage.getItem('token') || localStorage.getItem('backend_api_token');
      
      const response = await fetch(`${backendUrl}/usage/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({
          // userId sent for backward compatibility, but backend should use JWT
          userId: authData.userId,
          feature,
          increment: amount,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('[SubscriptionService] Error incrementing usage:', errorData);
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
