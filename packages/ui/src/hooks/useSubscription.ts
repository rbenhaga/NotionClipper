/**
 * useSubscription Hook
 *
 * Hook React pour accéder facilement au système de subscription
 *
 * Design Philosophy:
 * - API simple et intuitive
 * - Réactivité automatique (re-render sur changement)
 * - Gestion d'erreurs gracieuse
 * - Performance optimisée (cache)
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  QuotaSummary,
  QuotaCheckResult,
  Subscription,
} from '@notion-clipper/core-shared/src/types/subscription.types';
import { FeatureType, SubscriptionTier } from '@notion-clipper/core-shared/src/config/subscription.config';

// Ces services seront injectés via context ou props
interface SubscriptionServices {
  subscriptionService: any;
  quotaService: any;
  usageTrackingService: any;
}

export interface UseSubscriptionResult {
  // État
  subscription: Subscription | null;
  quotaSummary: QuotaSummary | null;
  isLoading: boolean;
  error: Error | null;

  // Helpers
  isPremium: boolean;
  isFree: boolean;
  isGracePeriod: boolean;
  graceDaysRemaining: number;

  // Vérifications de quotas
  canSendClip: (wordCount: number) => Promise<QuotaCheckResult>;
  canUploadFile: () => Promise<QuotaCheckResult>;
  canUseFocusMode: () => Promise<QuotaCheckResult>;
  canUseCompactMode: () => Promise<QuotaCheckResult>;

  // Actions
  trackClip: (wordCount: number, isMultiple: boolean, pageCount: number) => Promise<void>;
  trackFileUpload: (fileSize: number, fileType: string) => Promise<void>;
  startFocusMode: () => Promise<string>; // Retourne session ID
  endFocusMode: (sessionId: string) => Promise<void>;
  startCompactMode: () => Promise<string>;
  endCompactMode: (sessionId: string) => Promise<void>;

  // Refresh
  refresh: () => Promise<void>;
}

export function useSubscription(
  services: SubscriptionServices
): UseSubscriptionResult {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [quotaSummary, setQuotaSummary] = useState<QuotaSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [graceDaysRemaining, setGraceDaysRemaining] = useState(0);

  const { subscriptionService, quotaService, usageTrackingService } = services;

  /**
   * Charge les données initiales
   */
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [sub, summary] = await Promise.all([
        subscriptionService.getCurrentSubscription(),
        quotaService.getQuotaSummary(),
      ]);

      setSubscription(sub);
      setQuotaSummary(summary);

      if (sub.is_grace_period) {
        const days = await subscriptionService.getGracePeriodDaysRemaining();
        setGraceDaysRemaining(days);
      }
    } catch (err) {
      setError(err as Error);
      console.error('Failed to load subscription data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [subscriptionService, quotaService]);

  /**
   * Initialisation et abonnement aux changements
   */
  useEffect(() => {
    loadData();

    // S'abonner aux changements de subscription
    const unsubscribeSubscription = subscriptionService.onSubscriptionChanged(
      (sub: Subscription) => {
        setSubscription(sub);
      }
    );

    // S'abonner aux changements de quotas
    const unsubscribeQuota = subscriptionService.onQuotaChanged(
      (summary: QuotaSummary) => {
        setQuotaSummary(summary);
      }
    );

    return () => {
      unsubscribeSubscription();
      unsubscribeQuota();
    };
  }, [loadData, subscriptionService]);

  /**
   * Helpers calculés
   */
  const isPremium = useMemo(
    () => subscription?.tier === SubscriptionTier.PREMIUM,
    [subscription]
  );

  const isFree = useMemo(
    () => subscription?.tier === SubscriptionTier.FREE,
    [subscription]
  );

  const isGracePeriod = useMemo(
    () => subscription?.tier === SubscriptionTier.GRACE_PERIOD,
    [subscription]
  );

  /**
   * Vérifications de quotas
   */
  const canSendClip = useCallback(
    async (wordCount: number) => {
      return await quotaService.canSendClip(wordCount);
    },
    [quotaService]
  );

  const canUploadFile = useCallback(async () => {
    return await quotaService.canUploadFile();
  }, [quotaService]);

  const canUseFocusMode = useCallback(async () => {
    return await quotaService.canUseFocusMode();
  }, [quotaService]);

  const canUseCompactMode = useCallback(async () => {
    return await quotaService.canUseCompactMode();
  }, [quotaService]);

  /**
   * Tracking actions
   */
  const trackClip = useCallback(
    async (wordCount: number, isMultiple: boolean, pageCount: number) => {
      await usageTrackingService.trackClip(wordCount, isMultiple, pageCount);
      await loadData(); // Refresh quotas
    },
    [usageTrackingService, loadData]
  );

  const trackFileUpload = useCallback(
    async (fileSize: number, fileType: string) => {
      await usageTrackingService.trackFileUpload(fileSize, fileType);
      await loadData();
    },
    [usageTrackingService, loadData]
  );

  const startFocusMode = useCallback(async () => {
    const session = await usageTrackingService.trackFocusModeStart();
    return session.id;
  }, [usageTrackingService]);

  const endFocusMode = useCallback(
    async (sessionId: string) => {
      await usageTrackingService.trackFocusModeEnd(sessionId);
      await loadData();
    },
    [usageTrackingService, loadData]
  );

  const startCompactMode = useCallback(async () => {
    const session = await usageTrackingService.trackCompactModeStart();
    return session.id;
  }, [usageTrackingService]);

  const endCompactMode = useCallback(
    async (sessionId: string) => {
      await usageTrackingService.trackCompactModeEnd(sessionId);
      await loadData();
    },
    [usageTrackingService, loadData]
  );

  return {
    // État
    subscription,
    quotaSummary,
    isLoading,
    error,

    // Helpers
    isPremium,
    isFree,
    isGracePeriod,
    graceDaysRemaining,

    // Vérifications
    canSendClip,
    canUploadFile,
    canUseFocusMode,
    canUseCompactMode,

    // Actions
    trackClip,
    trackFileUpload,
    startFocusMode,
    endFocusMode,
    startCompactMode,
    endCompactMode,

    // Refresh
    refresh: loadData,
  };
}

/**
 * Hook simplifié pour vérifier un quota spécifique
 */
export function useQuotaCheck(
  services: SubscriptionServices,
  feature: FeatureType
): {
  canUse: boolean;
  isLoading: boolean;
  checkResult: QuotaCheckResult | null;
  refresh: () => Promise<void>;
} {
  const [checkResult, setCheckResult] = useState<QuotaCheckResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { quotaService } = services;

  const check = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await quotaService.checkQuota(feature);
      setCheckResult(result);
    } catch (error) {
      console.error('Quota check failed:', error);
    } finally {
      setIsLoading(false);
    }
  }, [quotaService, feature]);

  useEffect(() => {
    check();
  }, [check]);

  return {
    canUse: checkResult?.allowed ?? true, // Fail-safe: autoriser par défaut
    isLoading,
    checkResult,
    refresh: check,
  };
}
