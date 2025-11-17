import logger from '../utils/logger';

// Quota limits by tier
const QUOTA_LIMITS = {
  FREE: {
    clips: 50,
    files: 5,
    words_per_clip: 500,
    focus_mode_time: 60, // minutes
    compact_mode_time: 60,
  },
  PREMIUM: {
    clips: Infinity,
    files: Infinity,
    words_per_clip: Infinity,
    focus_mode_time: Infinity,
    compact_mode_time: Infinity,
  },
  GRACE_PERIOD: {
    clips: Infinity,
    files: Infinity,
    words_per_clip: Infinity,
    focus_mode_time: Infinity,
    compact_mode_time: Infinity,
  },
};

export class QuotaService {
  /**
   * Calculate quota summary for user
   */
  calculateSummary(subscription: any, usage: any) {
    const tier = subscription?.tier || 'FREE';
    const limits = QUOTA_LIMITS[tier as keyof typeof QUOTA_LIMITS] || QUOTA_LIMITS.FREE;

    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const daysUntilReset = Math.ceil(
      (nextMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      tier,
      status: subscription?.status || 'active',
      clips: this.createQuotaUsage('clips', usage?.clips_count || 0, limits.clips),
      files: this.createQuotaUsage('files', usage?.files_count || 0, limits.files),
      words_per_clip: this.createQuotaUsage('words_per_clip', 0, limits.words_per_clip),
      focus_mode_time: this.createQuotaUsage(
        'focus_mode_time',
        usage?.focus_mode_minutes || 0,
        limits.focus_mode_time
      ),
      compact_mode_time: this.createQuotaUsage(
        'compact_mode_time',
        usage?.compact_mode_minutes || 0,
        limits.compact_mode_time
      ),
      period_start: usage?.period_start || new Date(now.getFullYear(), now.getMonth(), 1),
      period_end: usage?.period_end || nextMonth,
      days_until_reset: daysUntilReset,
      is_grace_period: subscription?.is_grace_period || false,
    };
  }

  /**
   * Create quota usage object
   */
  private createQuotaUsage(feature: string, used: number, limit: number) {
    const isUnlimited = limit === Infinity;
    const remaining = isUnlimited ? Infinity : Math.max(0, limit - used);
    const percentage = isUnlimited ? 0 : (used / limit) * 100;

    let alertLevel: 'none' | 'warning' | 'critical' = 'none';
    if (!isUnlimited) {
      if (percentage >= 90) alertLevel = 'critical';
      else if (percentage >= 75) alertLevel = 'warning';
    }

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
   * Check if user can perform action
   */
  canPerformAction(summary: any, feature: string, amount: number = 1): boolean {
    const quota = summary[feature];
    if (!quota) {
      logger.warn(`Unknown feature: ${feature}`);
      return false;
    }

    return quota.can_use && (quota.is_unlimited || quota.remaining >= amount);
  }
}

export const quotaService = new QuotaService();
export default quotaService;
