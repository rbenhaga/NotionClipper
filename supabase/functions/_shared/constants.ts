/**
 * Edge Functions Constants
 *
 * Centralized constants for Supabase Edge Functions
 * FIX #16, #17, #18 - Quotas and magic numbers centralized
 */

/**
 * Subscription tiers
 */
export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  PREMIUM: 'premium',
  GRACE_PERIOD: 'grace_period',
} as const;

export type SubscriptionTier = typeof SUBSCRIPTION_TIERS[keyof typeof SUBSCRIPTION_TIERS];

/**
 * Quota limits per tier
 * 🔥 MIGRATION: Keys changed to UPPERCASE to match VPS schema (FREE, PREMIUM, GRACE_PERIOD)
 */
export const QUOTA_LIMITS = {
  FREE: {
    clips: 100,
    files: 10,
    words_per_clip: 1000,
    focus_mode_time: 60,       // minutes
    compact_mode_time: 60,     // minutes
  },

  PREMIUM: {
    clips: null,               // Unlimited
    files: null,
    words_per_clip: null,
    focus_mode_time: null,
    compact_mode_time: null,
  },

  GRACE_PERIOD: {
    clips: 100,
    files: 10,
    words_per_clip: 1000,
    focus_mode_time: 60,
    compact_mode_time: 60,
  },
} as const;

/**
 * HTTP status codes
 */
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

/**
 * Error messages
 */
export const ERROR_MESSAGES = {
  MISSING_FIELDS: 'Missing required fields',
  INVALID_EMAIL: 'Invalid email format',
  USER_NOT_FOUND: 'User not found',
  SUBSCRIPTION_NOT_FOUND: 'Subscription not found',
  UNAUTHORIZED: 'Unauthorized',
  INTERNAL_ERROR: 'Internal server error',
  ENCRYPTION_FAILED: 'Encryption failed',
  DECRYPTION_FAILED: 'Decryption failed',
} as const;

/**
 * Retry configuration
 */
export const RETRY_CONFIG = {
  MAX_ATTEMPTS: 3,
  INITIAL_DELAY_MS: 1000,
  MAX_DELAY_MS: 10000,
} as const;

/**
 * Cache durations (milliseconds)
 */
export const CACHE_DURATION = {
  SUBSCRIPTION: 5 * 60 * 1000,    // 5 minutes
  USER_PROFILE: 10 * 60 * 1000,   // 10 minutes
  PAGE_BLOCKS: 5 * 60 * 1000,     // 5 minutes
} as const;

/**
 * Validation patterns
 */
export const VALIDATION = {
  EMAIL_REGEX: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  UUID_REGEX: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
} as const;

/**
 * Environment helpers
 */
export const ENV = {
  isProduction: () => Deno.env.get('ENVIRONMENT') === 'production',
  isDevelopment: () => Deno.env.get('ENVIRONMENT') === 'development',
} as const;
