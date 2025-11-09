/**
 * Types pour le système de subscription et usage tracking
 *
 * Architecture inspirée par Notion et Apple :
 * - Types stricts et prévisibles
 * - Immutabilité par défaut
 * - Clarté et documentation
 */

import { SubscriptionTier, FeatureType } from '../config/subscription.config';

/**
 * Subscription principale de l'utilisateur
 */
export interface Subscription {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  status: SubscriptionStatus;

  // Stripe
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  stripe_price_id?: string;

  // Dates
  created_at: Date;
  updated_at: Date;
  current_period_start: Date;
  current_period_end: Date;
  cancel_at?: Date;
  canceled_at?: Date;

  // Période de grâce
  grace_period_ends_at?: Date;
  is_grace_period: boolean;

  // Métadonnées
  metadata?: Record<string, unknown>;
}

/**
 * Status de subscription
 */
export enum SubscriptionStatus {
  ACTIVE = 'active',
  TRIALING = 'trialing',
  PAST_DUE = 'past_due',
  CANCELED = 'canceled',
  UNPAID = 'unpaid',
  GRACE_PERIOD = 'grace_period',
  INCOMPLETE = 'incomplete',
  INCOMPLETE_EXPIRED = 'incomplete_expired',
}

/**
 * Usage tracking par utilisateur et par mois
 */
export interface UsageRecord {
  id: string;
  user_id: string;
  subscription_id: string;

  // Période (mois calendaire)
  period_start: Date;
  period_end: Date;
  year: number;
  month: number; // 1-12

  // Compteurs d'usage
  clips_count: number;
  files_count: number;
  focus_mode_minutes: number;
  compact_mode_minutes: number;

  // Métadonnées
  last_clip_at?: Date;
  last_file_upload_at?: Date;
  last_focus_mode_at?: Date;
  last_compact_mode_at?: Date;

  // Timestamps
  created_at: Date;
  updated_at: Date;
}

/**
 * Événement d'usage (pour tracking détaillé)
 */
export interface UsageEvent {
  id: string;
  user_id: string;
  subscription_id: string;
  usage_record_id: string;

  // Type d'événement
  event_type: UsageEventType;
  feature: FeatureType;

  // Détails
  metadata?: {
    word_count?: number;
    file_size?: number;
    file_type?: string;
    duration_minutes?: number;
    is_multiple_selection?: boolean;
    page_count?: number;
  };

  // Timestamp
  created_at: Date;
}

/**
 * Types d'événements d'usage
 */
export enum UsageEventType {
  CLIP_SENT = 'clip_sent',
  FILE_UPLOADED = 'file_uploaded',
  FOCUS_MODE_STARTED = 'focus_mode_started',
  FOCUS_MODE_ENDED = 'focus_mode_ended',
  COMPACT_MODE_STARTED = 'compact_mode_started',
  COMPACT_MODE_ENDED = 'compact_mode_ended',
  QUOTA_LIMIT_REACHED = 'quota_limit_reached',
  UPGRADE_PROMPT_SHOWN = 'upgrade_prompt_shown',
  UPGRADE_CLICKED = 'upgrade_clicked',
}

/**
 * Résumé des quotas pour l'UI
 */
export interface QuotaSummary {
  tier: SubscriptionTier;
  status: SubscriptionStatus;

  // Quotas et usage
  clips: QuotaUsage;
  files: QuotaUsage;
  words_per_clip: QuotaUsage;
  focus_mode_time: QuotaUsage;
  compact_mode_time: QuotaUsage;

  // Période
  period_start: Date;
  period_end: Date;
  days_until_reset: number;

  // Période de grâce
  is_grace_period: boolean;
  grace_period_days_remaining?: number;
}

/**
 * Usage d'un quota spécifique
 */
export interface QuotaUsage {
  feature: FeatureType;
  used: number;
  limit: number;
  remaining: number;
  percentage: number;
  is_unlimited: boolean;
  is_limited: boolean;
  alert_level: 'normal' | 'warning' | 'critical';
  can_use: boolean;
}

/**
 * Résultat de vérification de quota
 */
export interface QuotaCheckResult {
  allowed: boolean;
  feature: FeatureType;
  current_usage: number;
  limit: number;
  remaining: number;
  requires_upgrade: boolean;
  message?: string;
  upgrade_url?: string;
}

/**
 * Configuration d'une session de mode (Focus/Compact)
 */
export interface ModeSession {
  id: string;
  user_id: string;
  mode_type: 'focus' | 'compact';
  started_at: Date;
  ended_at?: Date;
  duration_minutes: number;
  is_active: boolean;
  was_interrupted: boolean;
}

/**
 * Payload pour créer un checkout Stripe
 */
export interface CreateCheckoutPayload {
  user_id: string;
  email: string;
  success_url: string;
  cancel_url: string;
  metadata?: Record<string, string>;
}

/**
 * Réponse de création de checkout
 */
export interface CheckoutResponse {
  session_id: string;
  checkout_url: string;
  expires_at: Date;
}

/**
 * Payload webhook Stripe
 */
export interface StripeWebhookPayload {
  type: StripeWebhookEventType;
  data: {
    object: unknown;
  };
  created: number;
}

/**
 * Types d'événements Stripe
 */
export enum StripeWebhookEventType {
  CHECKOUT_COMPLETED = 'checkout.session.completed',
  SUBSCRIPTION_CREATED = 'customer.subscription.created',
  SUBSCRIPTION_UPDATED = 'customer.subscription.updated',
  SUBSCRIPTION_DELETED = 'customer.subscription.deleted',
  INVOICE_PAID = 'invoice.paid',
  INVOICE_PAYMENT_FAILED = 'invoice.payment_failed',
  CUSTOMER_CREATED = 'customer.created',
  CUSTOMER_UPDATED = 'customer.updated',
  CUSTOMER_DELETED = 'customer.deleted',
}

/**
 * Statistiques d'usage pour analytics
 */
export interface UsageStatistics {
  total_clips: number;
  total_files: number;
  total_focus_time_minutes: number;
  total_compact_time_minutes: number;
  average_clips_per_day: number;
  most_active_day?: Date;
  upgrade_prompts_shown: number;
  conversion_rate?: number;
}

/**
 * Options pour récupérer l'usage
 */
export interface GetUsageOptions {
  user_id: string;
  start_date?: Date;
  end_date?: Date;
  include_events?: boolean;
  include_statistics?: boolean;
}

/**
 * Helper type guards
 */
export function isPremiumTier(tier: SubscriptionTier): boolean {
  return tier === SubscriptionTier.PREMIUM;
}

export function isFreeTier(tier: SubscriptionTier): boolean {
  return tier === SubscriptionTier.FREE;
}

export function isGracePeriod(tier: SubscriptionTier): boolean {
  return tier === SubscriptionTier.GRACE_PERIOD;
}

export function isActiveSubscription(status: SubscriptionStatus): boolean {
  return [
    SubscriptionStatus.ACTIVE,
    SubscriptionStatus.TRIALING,
    SubscriptionStatus.GRACE_PERIOD,
  ].includes(status);
}

export function canUseFeature(quota: QuotaUsage): boolean {
  return quota.can_use && (quota.is_unlimited || quota.remaining > 0);
}
