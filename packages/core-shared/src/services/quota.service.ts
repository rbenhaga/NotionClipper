/**
 * Quota Service
 *
 * Vérifie et applique les quotas freemium/premium
 *
 * Design Philosophy (Apple/Notion):
 * - UX non frustrante : avertir avant de bloquer
 * - Messages clairs et encourageants
 * - Performance : cache et vérifications rapides
 * - Fail-safe : en cas de doute, autoriser (meilleure UX)
 */

import {
  QuotaCheckResult,
  QuotaSummary,
  UsageEventType,
} from '../types/subscription.types';

import {
  FeatureType,
  getQuotaLimits,
  SUBSCRIPTION_MESSAGES,
  UI_CONFIG,
} from '../config/subscription.config';

import { ISubscriptionService } from '../interfaces/subscription.interface';
import { IUsageTrackingService } from './usage-tracking.service';

export interface IQuotaService {
  initialize(): Promise<void>;

  // Vérifications de quotas
  canSendClip(wordCount: number): Promise<QuotaCheckResult>;
  canUploadFile(): Promise<QuotaCheckResult>;
  canUseFocusMode(): Promise<QuotaCheckResult>;
  canUseCompactMode(): Promise<QuotaCheckResult>;

  // Vérifications génériques
  checkQuota(feature: FeatureType, amount?: number): Promise<QuotaCheckResult>;

  // Helpers UX
  getQuotaWarning(feature: FeatureType): Promise<string | null>;
  shouldShowUpgradePrompt(feature: FeatureType): Promise<boolean>;

  // Métadonnées
  getQuotaSummary(): Promise<QuotaSummary>;
}

export class QuotaService implements IQuotaService {
  private cachedSummary: QuotaSummary | null = null;
  private cacheExpiry: number = 2 * 60 * 1000; // 2 minutes
  private lastCacheUpdate: number = 0;

  constructor(
    private readonly subscriptionService: ISubscriptionService,
    private readonly usageTrackingService: IUsageTrackingService
  ) {}

  async initialize(): Promise<void> {
    // Précharger le résumé
    await this.loadQuotaSummary();

    // Écouter les changements de quota
    this.subscriptionService.onQuotaChanged(async (summary) => {
      this.cachedSummary = summary;
      this.lastCacheUpdate = Date.now();
    });
  }

  /**
   * Charge le résumé des quotas
   */
  private async loadQuotaSummary(): Promise<void> {
    this.cachedSummary = await this.subscriptionService.getQuotaSummary();
    this.lastCacheUpdate = Date.now();
  }

  /**
   * Récupère le résumé avec cache
   */
  async getQuotaSummary(): Promise<QuotaSummary> {
    // Vérifier le cache
    if (
      this.cachedSummary &&
      Date.now() - this.lastCacheUpdate < this.cacheExpiry
    ) {
      return this.cachedSummary;
    }

    // Recharger
    await this.loadQuotaSummary();

    if (!this.cachedSummary) {
      throw new Error('Failed to load quota summary');
    }

    return this.cachedSummary;
  }

  /**
   * Vérifie si un clip peut être envoyé
   */
  async canSendClip(wordCount: number): Promise<QuotaCheckResult> {
    const summary = await this.getQuotaSummary();

    // Vérifier le quota de clips
    const clipsQuota = summary.clips;

    if (!clipsQuota.can_use) {
      return {
        allowed: false,
        feature: FeatureType.CLIPS,
        current_usage: clipsQuota.used,
        limit: clipsQuota.limit,
        remaining: 0,
        requires_upgrade: true,
        message: SUBSCRIPTION_MESSAGES.FREE_TIER.QUOTA_REACHED('clips'),
      };
    }

    // Vérifier la limite de mots
    const wordsQuota = summary.words_per_clip;

    if (wordsQuota.is_limited && wordCount > wordsQuota.limit) {
      return {
        allowed: false,
        feature: FeatureType.WORDS_PER_CLIP,
        current_usage: wordCount,
        limit: wordsQuota.limit,
        remaining: 0,
        requires_upgrade: true,
        message: `Ce clip dépasse la limite de ${wordsQuota.limit} mots (${wordCount} mots)`,
      };
    }

    // Tout est OK
    return {
      allowed: true,
      feature: FeatureType.CLIPS,
      current_usage: clipsQuota.used,
      limit: clipsQuota.limit,
      remaining: clipsQuota.remaining,
      requires_upgrade: false,
      message: this.getUsageMessage(clipsQuota.used, clipsQuota.limit, 'clips'),
    };
  }

  /**
   * Vérifie si un fichier peut être uploadé
   */
  async canUploadFile(): Promise<QuotaCheckResult> {
    const summary = await this.getQuotaSummary();
    const filesQuota = summary.files;

    if (!filesQuota.can_use) {
      return {
        allowed: false,
        feature: FeatureType.FILES,
        current_usage: filesQuota.used,
        limit: filesQuota.limit,
        remaining: 0,
        requires_upgrade: true,
        message: SUBSCRIPTION_MESSAGES.FREE_TIER.QUOTA_REACHED('fichiers'),
      };
    }

    return {
      allowed: true,
      feature: FeatureType.FILES,
      current_usage: filesQuota.used,
      limit: filesQuota.limit,
      remaining: filesQuota.remaining,
      requires_upgrade: false,
      message: this.getUsageMessage(filesQuota.used, filesQuota.limit, 'fichiers'),
    };
  }

  /**
   * Vérifie si le Focus Mode peut être utilisé
   */
  async canUseFocusMode(): Promise<QuotaCheckResult> {
    const summary = await this.getQuotaSummary();
    const focusQuota = summary.focus_mode_time;

    if (!focusQuota.can_use) {
      return {
        allowed: false,
        feature: FeatureType.FOCUS_MODE_TIME,
        current_usage: focusQuota.used,
        limit: focusQuota.limit,
        remaining: 0,
        requires_upgrade: true,
        message: `Limite mensuelle du Mode Focus atteinte (${focusQuota.limit} minutes)`,
      };
    }

    return {
      allowed: true,
      feature: FeatureType.FOCUS_MODE_TIME,
      current_usage: focusQuota.used,
      limit: focusQuota.limit,
      remaining: focusQuota.remaining,
      requires_upgrade: false,
      message: focusQuota.is_unlimited
        ? 'Mode Focus illimité'
        : `${focusQuota.remaining} minutes restantes ce mois-ci`,
    };
  }

  /**
   * Vérifie si le Compact Mode peut être utilisé
   */
  async canUseCompactMode(): Promise<QuotaCheckResult> {
    const summary = await this.getQuotaSummary();
    const compactQuota = summary.compact_mode_time;

    if (!compactQuota.can_use) {
      return {
        allowed: false,
        feature: FeatureType.COMPACT_MODE_TIME,
        current_usage: compactQuota.used,
        limit: compactQuota.limit,
        remaining: 0,
        requires_upgrade: true,
        message: `Limite mensuelle du Mode Compact atteinte (${compactQuota.limit} minutes)`,
      };
    }

    return {
      allowed: true,
      feature: FeatureType.COMPACT_MODE_TIME,
      current_usage: compactQuota.used,
      limit: compactQuota.limit,
      remaining: compactQuota.remaining,
      requires_upgrade: false,
      message: compactQuota.is_unlimited
        ? 'Mode Compact illimité'
        : `${compactQuota.remaining} minutes restantes ce mois-ci`,
    };
  }

  /**
   * Vérification générique de quota
   */
  async checkQuota(
    feature: FeatureType,
    amount: number = 1
  ): Promise<QuotaCheckResult> {
    switch (feature) {
      case FeatureType.CLIPS:
        return await this.canSendClip(0); // Word count vérifié séparément

      case FeatureType.FILES:
        return await this.canUploadFile();

      case FeatureType.FOCUS_MODE_TIME:
        return await this.canUseFocusMode();

      case FeatureType.COMPACT_MODE_TIME:
        return await this.canUseCompactMode();

      default:
        // Par défaut, autoriser (fail-safe)
        return {
          allowed: true,
          feature,
          current_usage: 0,
          limit: Infinity,
          remaining: Infinity,
          requires_upgrade: false,
        };
    }
  }

  /**
   * Récupère un warning si quota proche de la limite
   */
  async getQuotaWarning(feature: FeatureType): Promise<string | null> {
    const summary = await this.getQuotaSummary();

    let quota;

    switch (feature) {
      case FeatureType.CLIPS:
        quota = summary.clips;
        break;
      case FeatureType.FILES:
        quota = summary.files;
        break;
      case FeatureType.FOCUS_MODE_TIME:
        quota = summary.focus_mode_time;
        break;
      case FeatureType.COMPACT_MODE_TIME:
        quota = summary.compact_mode_time;
        break;
      default:
        return null;
    }

    // Pas de warning pour illimité
    if (quota.is_unlimited) {
      return null;
    }

    // Warning si au-dessus du seuil
    if (quota.alert_level === 'warning') {
      return `Attention : ${quota.remaining}/${quota.limit} restants ce mois-ci`;
    }

    // Critique si presque épuisé
    if (quota.alert_level === 'critical') {
      return `⚠️ Bientôt épuisé : ${quota.remaining}/${quota.limit} restants`;
    }

    return null;
  }

  /**
   * Détermine si on doit afficher un prompt d'upgrade
   */
  async shouldShowUpgradePrompt(feature: FeatureType): Promise<boolean> {
    const summary = await this.getQuotaSummary();

    // Jamais afficher pour premium
    if (summary.tier === 'premium') {
      return false;
    }

    let quota;

    switch (feature) {
      case FeatureType.CLIPS:
        quota = summary.clips;
        break;
      case FeatureType.FILES:
        quota = summary.files;
        break;
      case FeatureType.FOCUS_MODE_TIME:
        quota = summary.focus_mode_time;
        break;
      case FeatureType.COMPACT_MODE_TIME:
        quota = summary.compact_mode_time;
        break;
      default:
        return false;
    }

    // Afficher si limite atteinte ou critique
    return quota.alert_level === 'critical' || !quota.can_use;
  }

  /**
   * Génère un message d'usage
   */
  private getUsageMessage(
    used: number,
    limit: number,
    featureName: string
  ): string {
    if (limit === Infinity) {
      return `Utilisation illimitée`;
    }

    const remaining = Math.max(0, limit - used);
    return SUBSCRIPTION_MESSAGES.FREE_TIER.QUOTA_WARNING(
      remaining,
      limit,
      featureName
    );
  }

  /**
   * Log un événement de limite atteinte
   */
  private async logQuotaLimitReached(feature: FeatureType): Promise<void> {
    await this.usageTrackingService.logEvent(
      UsageEventType.QUOTA_LIMIT_REACHED,
      feature
    );
  }

  /**
   * Log un événement d'affichage du prompt d'upgrade
   */
  async logUpgradePromptShown(feature: FeatureType): Promise<void> {
    await this.usageTrackingService.logEvent(
      UsageEventType.UPGRADE_PROMPT_SHOWN,
      feature
    );
  }

  /**
   * Log un click sur upgrade
   */
  async logUpgradeClicked(feature: FeatureType): Promise<void> {
    await this.usageTrackingService.logEvent(
      UsageEventType.UPGRADE_CLICKED,
      feature
    );
  }
}
