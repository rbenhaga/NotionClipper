/**
 * Quota Configuration
 *
 * Centralized quota limits for all subscription tiers
 * Used by SubscriptionService and Edge Functions
 *
 * FIX #16 - Quotas are no longer hard-coded throughout the codebase
 */

export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  PREMIUM: 'premium',
  GRACE_PERIOD: 'grace_period',
} as const;

export type SubscriptionTier = typeof SUBSCRIPTION_TIERS[keyof typeof SUBSCRIPTION_TIERS];

export interface TierQuotas {
  clips: number | null;           // Monthly web clips limit (null = unlimited)
  files: number | null;           // Monthly file uploads limit
  wordsPerClip: number | null;    // Max words per clip
  focusModeMinutes: number | null; // Monthly focus mode minutes
  compactModeMinutes: number | null; // Monthly compact mode minutes
}

/**
 * Quota limits per subscription tier
 */
export const QUOTA_LIMITS: Record<SubscriptionTier, TierQuotas> = {
  [SUBSCRIPTION_TIERS.FREE]: {
    clips: 100,
    files: 10,
    wordsPerClip: 1000,
    focusModeMinutes: 60,       // 1 hour per month
    compactModeMinutes: 60,     // 1 hour per month
  },

  [SUBSCRIPTION_TIERS.PREMIUM]: {
    clips: null,                 // Unlimited
    files: null,                 // Unlimited
    wordsPerClip: null,          // Unlimited
    focusModeMinutes: null,      // Unlimited
    compactModeMinutes: null,    // Unlimited
  },

  [SUBSCRIPTION_TIERS.GRACE_PERIOD]: {
    clips: 100,
    files: 10,
    wordsPerClip: 1000,
    focusModeMinutes: 60,
    compactModeMinutes: 60,
  },
};

/**
 * Get quota limits for a specific tier
 */
export function getQuotaLimits(tier: SubscriptionTier): TierQuotas {
  return QUOTA_LIMITS[tier] || QUOTA_LIMITS[SUBSCRIPTION_TIERS.FREE];
}

/**
 * Check if tier has unlimited quotas
 */
export function hasUnlimitedQuotas(tier: SubscriptionTier): boolean {
  return tier === SUBSCRIPTION_TIERS.PREMIUM;
}

/**
 * Calculate percentage used
 */
export function calculateQuotaPercentage(used: number, limit: number | null): number {
  if (limit === null || limit === 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

/**
 * Check if quota is exceeded
 */
export function isQuotaExceeded(used: number, limit: number | null): boolean {
  if (limit === null) return false; // Unlimited
  return used >= limit;
}

/**
 * Get remaining quota
 */
export function getRemainingQuota(used: number, limit: number | null): number | null {
  if (limit === null) return null; // Unlimited
  return Math.max(0, limit - used);
}
