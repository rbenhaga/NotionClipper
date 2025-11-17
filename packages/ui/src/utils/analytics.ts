/**
 * Analytics Wrapper
 *
 * Wrapper simple et extensible pour tracker les événements business clés
 * Compatible Mixpanel, Amplitude, ou custom analytics
 *
 * Design Philosophy:
 * - Type-safe avec TypeScript
 * - Fail-safe: ne casse jamais l'app si analytics échouent
 * - Extensible: facile d'ajouter de nouveaux providers
 * - Privacy-aware: respect des préférences utilisateur
 */

// ============================================
// TYPES
// ============================================

export type AnalyticsProvider = 'mixpanel' | 'amplitude' | 'custom';

export interface AnalyticsConfig {
  enabled: boolean;
  provider: AnalyticsProvider;
  apiKey?: string;
  debug?: boolean;
}

// Événements freemium trackés
export type FreemiumEvent =
  | 'Quota Reached'
  | 'Quota Warning Shown'
  | 'Upgrade Modal Shown'
  | 'Upgrade Button Clicked'
  | 'Grace Period Entered'
  | 'Grace Period Ending Soon'
  | 'Premium Feature Blocked'
  | 'Premium Trial Started'
  | 'Checkout Started'
  | 'Checkout Completed'
  | 'Checkout Cancelled';

export interface QuotaReachedEvent {
  feature: 'clips' | 'files' | 'focus_mode_time' | 'compact_mode_time';
  tier: 'free' | 'premium';
  used: number;
  limit: number;
  percentage: number;
}

export interface UpgradeModalEvent {
  feature?: string;
  quotaReached: boolean;
  source: 'quota_check' | 'grace_period' | 'settings' | 'feature_attempt';
}

export interface CheckoutEvent {
  plan: 'monthly' | 'yearly';
  amount?: number;
  currency?: string;
}

export interface GracePeriodEvent {
  daysRemaining: number;
  tier: string;
}

// ============================================
// ANALYTICS CLASS
// ============================================

class Analytics {
  private config: AnalyticsConfig = {
    enabled: false,
    provider: 'custom',
    debug: false,
  };

  private userId: string | null = null;

  /**
   * Initialise l'analytics avec la config
   */
  initialize(config: Partial<AnalyticsConfig>) {
    this.config = { ...this.config, ...config };

    if (this.config.debug) {
      console.log('[Analytics] Initialized with config:', this.config);
    }

    // TODO: Initialiser Mixpanel/Amplitude si provider configuré
    // if (this.config.provider === 'mixpanel' && this.config.apiKey) {
    //   mixpanel.init(this.config.apiKey);
    // }
  }

  /**
   * Identifie l'utilisateur
   */
  identify(userId: string, traits?: Record<string, any>) {
    if (!this.config.enabled) return;

    this.userId = userId;

    try {
      if (this.config.debug) {
        console.log('[Analytics] Identify:', userId, traits);
      }

      // TODO: Appeler provider
      // if (this.config.provider === 'mixpanel') {
      //   mixpanel.identify(userId);
      //   if (traits) mixpanel.people.set(traits);
      // }
    } catch (error) {
      this.handleError('identify', error);
    }
  }

  /**
   * Track un événement freemium
   */
  track(event: FreemiumEvent, properties?: Record<string, any>) {
    if (!this.config.enabled) return;

    try {
      const eventData = {
        event,
        properties: {
          ...properties,
          timestamp: new Date().toISOString(),
          userId: this.userId,
        },
      };

      if (this.config.debug) {
        console.log('[Analytics] Track:', eventData);
      }

      // TODO: Appeler provider
      // if (this.config.provider === 'mixpanel') {
      //   mixpanel.track(event, eventData.properties);
      // } else if (this.config.provider === 'amplitude') {
      //   amplitude.track(event, eventData.properties);
      // }

      // En attendant, on peut stocker localement pour debug
      if (this.config.debug) {
        this.storeEventLocally(eventData);
      }
    } catch (error) {
      this.handleError('track', error);
    }
  }

  /**
   * Événements spécifiques freemium (helpers typesafe)
   */

  trackQuotaReached(data: QuotaReachedEvent) {
    this.track('Quota Reached', {
      feature: data.feature,
      tier: data.tier,
      used: data.used,
      limit: data.limit,
      percentage: data.percentage,
    });
  }

  trackQuotaWarning(data: QuotaReachedEvent) {
    this.track('Quota Warning Shown', {
      feature: data.feature,
      tier: data.tier,
      remaining: data.limit - data.used,
      percentage: data.percentage,
    });
  }

  trackUpgradeModalShown(data: UpgradeModalEvent) {
    this.track('Upgrade Modal Shown', {
      feature: data.feature,
      quotaReached: data.quotaReached,
      source: data.source,
    });
  }

  trackUpgradeClicked(data: UpgradeModalEvent & { plan?: string }) {
    this.track('Upgrade Button Clicked', {
      feature: data.feature,
      quotaReached: data.quotaReached,
      source: data.source,
      plan: data.plan,
    });
  }

  trackGracePeriodEntered(data: GracePeriodEvent) {
    this.track('Grace Period Entered', {
      daysRemaining: data.daysRemaining,
      tier: data.tier,
    });
  }

  trackGracePeriodEndingSoon(data: GracePeriodEvent) {
    this.track('Grace Period Ending Soon', {
      daysRemaining: data.daysRemaining,
      tier: data.tier,
      urgency: data.daysRemaining <= 1 ? 'critical' : 'warning',
    });
  }

  trackPremiumFeatureBlocked(feature: string, tier: string) {
    this.track('Premium Feature Blocked', {
      feature,
      tier,
    });
  }

  trackPremiumTrialStarted(plan: string) {
    this.track('Premium Trial Started', {
      plan,
    });
  }

  trackCheckoutStarted(data: CheckoutEvent) {
    this.track('Checkout Started', {
      plan: data.plan,
      amount: data.amount,
      currency: data.currency,
    });
  }

  trackCheckoutCompleted(data: CheckoutEvent) {
    this.track('Checkout Completed', {
      plan: data.plan,
      amount: data.amount,
      currency: data.currency,
    });
  }

  trackCheckoutCancelled(data: CheckoutEvent) {
    this.track('Checkout Cancelled', {
      plan: data.plan,
    });
  }

  /**
   * Stockage local pour debug (localStorage)
   */
  private storeEventLocally(eventData: any) {
    try {
      const key = 'analytics_events_debug';
      const stored = localStorage.getItem(key);
      const events = stored ? JSON.parse(stored) : [];
      events.push(eventData);

      // Keep only last 100 events
      if (events.length > 100) {
        events.shift();
      }

      localStorage.setItem(key, JSON.stringify(events));
    } catch (error) {
      // Ignore localStorage errors
    }
  }

  /**
   * Récupérer les événements stockés localement (debug)
   */
  getStoredEvents(): any[] {
    try {
      const stored = localStorage.getItem('analytics_events_debug');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }

  /**
   * Clear stored events (debug)
   */
  clearStoredEvents() {
    try {
      localStorage.removeItem('analytics_events_debug');
    } catch {
      // Ignore
    }
  }

  /**
   * Gestion des erreurs (fail-safe)
   */
  private handleError(method: string, error: any) {
    if (this.config.debug) {
      console.warn(`[Analytics] Error in ${method}:`, error);
    }
    // Ne jamais throw - analytics ne doit jamais casser l'app
  }
}

// ============================================
// EXPORT SINGLETON
// ============================================

export const analytics = new Analytics();

// Auto-initialize avec config par défaut (désactivé)
analytics.initialize({
  enabled: false, // Activer manuellement dans App.tsx
  debug: process.env.NODE_ENV !== 'production',
});
