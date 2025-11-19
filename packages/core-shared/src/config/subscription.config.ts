/**
 * Subscription & Freemium Configuration
 *
 * Cette configuration définit les limites et quotas pour les plans gratuits et premium.
 * Toutes les valeurs sont facilement modifiables pour ajuster la stratégie produit.
 *
 * Design Philosophy (Apple/Notion):
 * - Généreux mais incitatif à upgrader
 * - Pas de frustration utilisateur
 * - Communication claire et encourageante
 * - Expérience premium évidente
 */

export enum SubscriptionTier {
  FREE = 'FREE',
  PREMIUM = 'PREMIUM',
  GRACE_PERIOD = 'GRACE_PERIOD', // Pour migration utilisateurs existants
}

export enum FeatureType {
  CLIPS = 'clips',
  FILES = 'files',
  WORDS_PER_CLIP = 'words_per_clip',
  FOCUS_MODE_TIME = 'focus_mode_time',
  COMPACT_MODE_TIME = 'compact_mode_time',
  MULTIPLE_SELECTIONS = 'multiple_selections',
}

/**
 * Configuration des quotas par plan
 *
 * Limites mensuelles (réinitialisées le 1er de chaque mois)
 */
export const SUBSCRIPTION_QUOTAS = {
  [SubscriptionTier.FREE]: {
    // Nombre de clips par mois (un envoi multiple = 1 clip)
    [FeatureType.CLIPS]: 100,

    // Nombre de fichiers uploadés par mois
    [FeatureType.FILES]: 10,

    // Limite de mots par clip (généreuse pour ne pas frustrer)
    [FeatureType.WORDS_PER_CLIP]: 1000,

    // Temps d'utilisation du Mode Focus par mois (en minutes)
    [FeatureType.FOCUS_MODE_TIME]: 60, // 1 heure

    // Temps d'utilisation du Mode Compact par mois (en minutes)
    [FeatureType.COMPACT_MODE_TIME]: 60, // 1 heure

    // Nombre d'envois multiples sélections autorisés
    // Note: Un envoi multiple compte comme 1 clip normal
    [FeatureType.MULTIPLE_SELECTIONS]: Infinity, // Pas de limite spécifique, compte dans clips
  },

  [SubscriptionTier.PREMIUM]: {
    // Premium = Illimité
    [FeatureType.CLIPS]: Infinity,
    [FeatureType.FILES]: Infinity,
    [FeatureType.WORDS_PER_CLIP]: Infinity,
    [FeatureType.FOCUS_MODE_TIME]: Infinity,
    [FeatureType.COMPACT_MODE_TIME]: Infinity,
    [FeatureType.MULTIPLE_SELECTIONS]: Infinity,
  },

  [SubscriptionTier.GRACE_PERIOD]: {
    // Période de grâce : premium temporaire (30 jours)
    [FeatureType.CLIPS]: Infinity,
    [FeatureType.FILES]: Infinity,
    [FeatureType.WORDS_PER_CLIP]: Infinity,
    [FeatureType.FOCUS_MODE_TIME]: Infinity,
    [FeatureType.COMPACT_MODE_TIME]: Infinity,
    [FeatureType.MULTIPLE_SELECTIONS]: Infinity,
  },
} as const;

/**
 * Configuration Stripe
 */
export const STRIPE_CONFIG = {
  // Prix en centimes (2.99€ = 299 centimes)
  PREMIUM_PRICE_CENTS: 299,
  CURRENCY: 'eur',

  // IDs Stripe (à définir dans les variables d'environnement)
  PUBLISHABLE_KEY_ENV: 'STRIPE_PUBLISHABLE_KEY',
  SECRET_KEY_ENV: 'STRIPE_SECRET_KEY',
  MONTHLY_PRICE_ID_ENV: 'STRIPE_PRICE_MONTHLY',
  ANNUAL_PRICE_ID_ENV: 'STRIPE_PRICE_ANNUAL',
  WEBHOOK_SECRET_ENV: 'STRIPE_WEBHOOK_SECRET',
} as const;

/**
 * Configuration période de grâce
 */
export const GRACE_PERIOD_CONFIG = {
  // Durée en jours pour les utilisateurs existants
  DURATION_DAYS: 30,

  // Date de déploiement du système freemium (à définir lors du déploiement)
  // Les utilisateurs créés avant cette date bénéficient de la période de grâce
  DEPLOYMENT_DATE: new Date('2025-11-09'), // Aujourd'hui
} as const;

/**
 * Messages UX (style Apple : clair, encourageant, non intrusif)
 */
export const SUBSCRIPTION_MESSAGES = {
  FREE_TIER: {
    WELCOME: 'Profitez de NotionClipper gratuitement',
    QUOTA_WARNING: (remaining: number, total: number, feature: string) =>
      `${remaining}/${total} ${feature} restants ce mois-ci`,
    QUOTA_REACHED: (feature: string) =>
      `Limite mensuelle de ${feature} atteinte`,
    UPGRADE_CTA: 'Passer à Premium pour continuer',
    UPGRADE_BENEFIT: 'Clips illimités, modes premium, et plus encore',
  },

  PREMIUM_TIER: {
    WELCOME: 'Merci d\'être membre Premium',
    UNLIMITED: 'Utilisation illimitée',
    BENEFIT_ACTIVE: 'Tous les modes premium activés',
  },

  GRACE_PERIOD: {
    WELCOME: 'Période d\'essai Premium',
    EXPIRING_SOON: (daysLeft: number) =>
      `Votre période d'essai se termine dans ${daysLeft} jours`,
    EXPIRED: 'Votre période d\'essai est terminée',
    UPGRADE_CTA: 'Continuer avec Premium',
  },

  UPGRADE_MODAL: {
    TITLE: 'Passez à Premium',
    SUBTITLE: 'Débloquez tout le potentiel de NotionClipper',
    FEATURES: [
      'Clips illimités',
      'Upload de fichiers sans limite',
      'Modes Focus et Compact en illimité',
      'Aucune limite de longueur de texte',
      'Support prioritaire',
    ],
    PRICE: '3,99€/mois',
    CTA_PRIMARY: 'Passer à Premium',
    CTA_SECONDARY: 'Rester en gratuit',
  },
} as const;

/**
 * Configuration UI/UX
 */
export const UI_CONFIG = {
  // Seuil d'affichage des warnings (%)
  QUOTA_WARNING_THRESHOLD: 0.8, // Afficher warning à 80% d'utilisation
  QUOTA_CRITICAL_THRESHOLD: 0.95, // Afficher alerte critique à 95%

  // Animations (Framer Motion)
  ANIMATION_DURATION: 0.3,
  ANIMATION_EASE: [0.4, 0, 0.2, 1], // Courbe Apple (ease-in-out)

  // Couleurs (style Apple/Notion)
  COLORS: {
    FREE_BADGE: 'text-notion-gray-500 bg-notion-gray-100',
    PREMIUM_BADGE: 'text-blue-600 bg-blue-50',
    GRACE_BADGE: 'text-purple-600 bg-purple-50',
    WARNING: 'text-orange-600',
    CRITICAL: 'text-red-600',
    SUCCESS: 'text-green-600',
  },

  // Positions des compteurs
  COUNTER_POSITION: 'sidebar-bottom', // 'sidebar-bottom' | 'header-right'
} as const;

/**
 * Helper type pour les quotas
 */
export type QuotaLimits = typeof SUBSCRIPTION_QUOTAS[SubscriptionTier];

/**
 * Helper pour récupérer les quotas d'un tier
 */
export function getQuotaLimits(tier: SubscriptionTier): QuotaLimits {
  return SUBSCRIPTION_QUOTAS[tier];
}

/**
 * Helper pour vérifier si une feature est limitée
 */
export function isFeatureLimited(
  tier: SubscriptionTier,
  feature: FeatureType
): boolean {
  const limit = SUBSCRIPTION_QUOTAS[tier][feature];
  return limit !== Infinity;
}

/**
 * Helper pour formater un prix
 */
export function formatPrice(cents: number, currency: string = 'EUR'): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(cents / 100);
}

/**
 * Helper pour calculer le pourcentage d'usage
 */
export function calculateUsagePercentage(used: number, limit: number): number {
  if (limit === Infinity) return 0;
  return Math.min((used / limit) * 100, 100);
}

/**
 * Helper pour déterminer le niveau d'alerte
 */
export function getAlertLevel(
  usagePercentage: number
): 'normal' | 'warning' | 'critical' {
  if (usagePercentage >= UI_CONFIG.QUOTA_CRITICAL_THRESHOLD * 100) {
    return 'critical';
  }
  if (usagePercentage >= UI_CONFIG.QUOTA_WARNING_THRESHOLD * 100) {
    return 'warning';
  }
  return 'normal';
}
