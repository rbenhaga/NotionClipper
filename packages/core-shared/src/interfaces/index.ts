// packages/core-shared/src/interfaces/index.ts
export { IClipboard } from './clipboard.interface';
export { IStorage } from './storage.interface';
export { INotionAPI } from './notion-api.interface';
export { IConfig } from './config.interface';
export { ICacheAdapter, type CacheStats, type CacheEntry } from './cache.interface';

// ✅ NEW: Auth & Workspace interfaces
export {
  IAuth,
  IWorkspace,
  ISupabaseAdapter,
  type User,
  type NotionWorkspace,
  type OAuthState,
  type AuthResult,
  type WorkspaceSelection,
  type AuthMethod,
  type AuthConfig
} from './auth.interface';

// ✅ NEW: Analytics interfaces
export {
  IAnalytics,
  IAnalyticsAdapter,
  type AnalyticsEvent,
  type AnalyticsConfig,
  type AnalyticsSettings,
  type EventCategory,
  type Platform,
  type ContentType,
  type SubscriptionPlan,
  type SubscriptionStatus,
  type ClipEventProperties,
  type AppEventProperties,
  type NotionEventProperties,
  type SubscriptionEventProperties,
  type UserMetricsDaily,
  type DashboardQuickStats,
  type PlatformDistribution,
  type RetentionCohort,
  type ClipsDistribution,
  type GeographicDistribution,
  type OnboardingFunnel
} from './analytics.interface';