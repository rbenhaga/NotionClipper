// packages/core-shared/src/interfaces/index.ts
export type { IClipboard } from './clipboard.interface';
export type { IStorage } from './storage.interface';
export type { INotionAPI } from './notion-api.interface';
export type { IConfig } from './config.interface';
export type { ICacheAdapter, CacheStats, CacheEntry } from './cache.interface';

// ✅ NEW: Auth & Workspace interfaces
export type {
  IAuth,
  IWorkspace,
  ISupabaseAdapter,
  User,
  NotionWorkspace,
  OAuthState,
  AuthResult,
  WorkspaceSelection,
  AuthMethod,
  AuthConfig
} from './auth.interface';

// Subscription interfaces
export type {
  ISubscriptionService,
  CreateSubscriptionOptions,
  SubscriptionEvent
} from './subscription.interface';