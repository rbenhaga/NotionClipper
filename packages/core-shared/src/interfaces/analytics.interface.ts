// packages/core-shared/src/interfaces/analytics.interface.ts

/**
 * Analytics Interfaces
 * Design: Apple-level privacy, Notion-level simplicity
 */

// ==================== EVENT TYPES ====================

/**
 * Event Categories
 */
export type EventCategory = 'app' | 'clip' | 'notion' | 'workspace' | 'subscription';

/**
 * Platform Types
 */
export type Platform =
  | 'electron-windows'
  | 'electron-macos'
  | 'electron-linux'
  | 'chrome'
  | 'firefox'
  | 'edge'
  | 'safari';

/**
 * Content Types
 */
export type ContentType = 'text' | 'html' | 'code' | 'url' | 'markdown' | 'image';

/**
 * Subscription Plans
 */
export type SubscriptionPlan = 'free' | 'premium';

/**
 * Subscription Status
 */
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing';

// ==================== EVENT INTERFACES ====================

/**
 * Base Analytics Event
 */
export interface AnalyticsEvent {
  // Identity
  user_id?: string | null;
  session_id: string;
  anonymous_id?: string;

  // Event
  event_name: string;
  event_category: EventCategory;

  // Context
  platform: Platform;
  app_version: string;
  os_version?: string;

  // Geographic (anonymized)
  country_code?: string;
  timezone?: string;

  // Properties (flexible JSONB)
  properties?: Record<string, any>;

  // Metadata
  created_at?: Date;
}

/**
 * Clip Event Properties
 */
export interface ClipEventProperties {
  content_type: ContentType;
  file_count?: number;
  image_count?: number;
  word_count?: number;
  has_code_block?: boolean;
  source?: 'focus_mode' | 'clipboard' | 'selection' | 'drag_drop';
  page_id?: string;
  workspace_id?: string;
}

/**
 * App Event Properties
 */
export interface AppEventProperties {
  startup_time_ms?: number;
  previous_version?: string;
  error_message?: string;
  error_stack?: string;
}

/**
 * Notion Event Properties
 */
export interface NotionEventProperties {
  workspace_count?: number;
  page_count?: number;
  database_count?: number;
  sync_duration_ms?: number;
}

/**
 * Subscription Event Properties
 */
export interface SubscriptionEventProperties {
  limit_type?: 'monthly_clips' | 'file_size' | 'features';
  current_usage?: number;
  limit?: number;
  cta_location?: string;
  plan_type?: SubscriptionPlan;
}

// ==================== USER METRICS ====================

/**
 * User Daily Metrics
 */
export interface UserMetricsDaily {
  user_id: string;
  date: Date;
  sessions_count: number;
  total_events: number;
  active_duration_seconds: number;
  clips_sent: number;
  files_attached: number;
  images_attached: number;
  text_clips: number;
  code_clips: number;
  html_clips: number;
  url_clips: number;
  pages_used: number;
  workspaces_used: number;
  platforms_used: Platform[];
  engagement_score: number;
}

/**
 * Subscription Status
 */
export interface SubscriptionStatus {
  user_id: string;
  plan_type: SubscriptionPlan;
  status: SubscriptionStatus;
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  current_period_start?: Date;
  current_period_end?: Date;
  monthly_clips_limit: number;
  monthly_clips_used: number;
  limit_reset_at?: Date;
}

// ==================== PRIVACY SETTINGS ====================

/**
 * Analytics Settings (RGPD Compliance)
 */
export interface AnalyticsSettings {
  user_id?: string;
  analytics_enabled: boolean;
  consent_given_at?: Date;
  consent_version: string;
  share_platform_info: boolean;
  share_location_info: boolean;
  data_retention_days: number;
}

// ==================== ANALYTICS CONFIG ====================

/**
 * Analytics Service Configuration
 */
export interface AnalyticsConfig {
  // Supabase connection
  supabaseUrl: string;
  supabaseKey: string;

  // Privacy
  anonymize_ip: boolean;
  respect_do_not_track: boolean;

  // Performance
  batch_size: number; // Events batched before sending
  batch_interval_ms: number; // Max time before sending batch
  offline_queue_max_size: number;

  // Platform info
  platform: Platform;
  app_version: string;
  os_version?: string;
}

// ==================== ANALYTICS ADAPTER ====================

/**
 * Analytics Adapter Interface
 * Platform-specific implementation (Supabase, PostHog, etc.)
 */
export interface IAnalyticsAdapter {
  /**
   * Initialize the adapter
   */
  initialize(config: AnalyticsConfig): Promise<void>;

  /**
   * Track a single event
   */
  track(event: AnalyticsEvent): Promise<void>;

  /**
   * Track multiple events (batch)
   */
  trackBatch(events: AnalyticsEvent[]): Promise<void>;

  /**
   * Get user analytics settings
   */
  getSettings(userId: string): Promise<AnalyticsSettings | null>;

  /**
   * Update user analytics settings
   */
  updateSettings(userId: string, settings: Partial<AnalyticsSettings>): Promise<void>;

  /**
   * Get user subscription status
   */
  getSubscriptionStatus(userId: string): Promise<SubscriptionStatus | null>;

  /**
   * Update subscription usage
   */
  updateSubscriptionUsage(userId: string, clips_count: number): Promise<void>;

  /**
   * Check if user has reached their limit
   */
  checkLimit(userId: string, limitType: 'monthly_clips'): Promise<{
    reached: boolean;
    current: number;
    limit: number;
  }>;
}

// ==================== ANALYTICS SERVICE ====================

/**
 * Analytics Service Interface
 */
export interface IAnalytics {
  /**
   * Initialize analytics
   */
  initialize(config: AnalyticsConfig): Promise<void>;

  /**
   * Track an event
   */
  track(eventName: string, properties?: Record<string, any>): Promise<void>;

  /**
   * Track app lifecycle events
   */
  trackAppOpened(): Promise<void>;
  trackAppClosed(): Promise<void>;
  trackAppError(error: Error): Promise<void>;

  /**
   * Track clip events
   */
  trackClipCreated(properties: ClipEventProperties): Promise<void>;
  trackClipSent(properties: ClipEventProperties): Promise<void>;
  trackClipFailed(properties: ClipEventProperties & { error?: string }): Promise<void>;

  /**
   * Track Notion events
   */
  trackNotionPageSelected(pageId: string): Promise<void>;
  trackNotionWorkspaceConnected(workspaceId: string): Promise<void>;
  trackNotionSyncCompleted(properties: NotionEventProperties): Promise<void>;

  /**
   * Track subscription events
   */
  trackPaywallShown(properties: SubscriptionEventProperties): Promise<void>;
  trackUpgradeClicked(ctaLocation: string): Promise<void>;
  trackSubscriptionCreated(plan: SubscriptionPlan): Promise<void>;

  /**
   * Set user identity
   */
  identify(userId: string, traits?: Record<string, any>): Promise<void>;

  /**
   * Clear user identity (logout)
   */
  reset(): Promise<void>;

  /**
   * Update analytics settings
   */
  updateSettings(settings: Partial<AnalyticsSettings>): Promise<void>;

  /**
   * Get current analytics settings
   */
  getSettings(): Promise<AnalyticsSettings | null>;

  /**
   * Flush pending events
   */
  flush(): Promise<void>;

  /**
   * Check if analytics is enabled
   */
  isEnabled(): boolean;

  /**
   * Enable/disable analytics
   */
  setEnabled(enabled: boolean): Promise<void>;
}

// ==================== DASHBOARD TYPES ====================

/**
 * Dashboard Quick Stats
 */
export interface DashboardQuickStats {
  dau: number; // Daily Active Users
  wau: number; // Weekly Active Users
  mau: number; // Monthly Active Users
  clips_today: number;
  clips_this_month: number;
  premium_users: number;
  free_users: number;
  countries_active: number;
}

/**
 * Platform Distribution
 */
export interface PlatformDistribution {
  platform: Platform;
  users: number;
  total_events: number;
  clips_sent: number;
  avg_word_count: number;
  error_count: number;
}

/**
 * Retention Cohort
 */
export interface RetentionCohort {
  cohort_month: Date;
  platform: Platform;
  users_count: number;
  day_1_retention: number;
  day_7_retention: number;
  day_30_retention: number;
  day_90_retention: number;
  conversion_rate?: number;
}

/**
 * Clips Distribution (for freemium optimization)
 */
export interface ClipsDistribution {
  month: Date;
  zero_clips: number;
  clips_1_5: number;
  clips_6_10: number;
  clips_11_25: number;
  clips_26_50: number;
  clips_51_100: number;
  clips_100_plus: number;
  median_clips: number;
  p90_clips: number;
  p95_clips: number;
  avg_clips: number;
}

/**
 * Geographic Distribution
 */
export interface GeographicDistribution {
  country_code: string;
  users: number;
  clips_sent: number;
  active_days: number;
}

/**
 * Onboarding Funnel
 */
export interface OnboardingFunnel {
  week: Date;
  installed: number;
  connected: number;
  selected_page: number;
  sent_first_clip: number;
  connection_rate: number;
  activation_rate: number;
  avg_minutes_to_first_clip: number;
}

// ==================== EXPORT ALL ====================

export type {
  EventCategory,
  Platform,
  ContentType,
  SubscriptionPlan,
  AnalyticsEvent,
  ClipEventProperties,
  AppEventProperties,
  NotionEventProperties,
  SubscriptionEventProperties,
  UserMetricsDaily,
  AnalyticsSettings,
  AnalyticsConfig,
  IAnalyticsAdapter,
  IAnalytics,
  DashboardQuickStats,
  PlatformDistribution,
  RetentionCohort,
  ClipsDistribution,
  GeographicDistribution,
  OnboardingFunnel
};
