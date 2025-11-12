/**
 * Application Constants
 *
 * Centralized constants to avoid magic numbers and hard-coded values
 * FIX #17 - Magic numbers replaced with named constants
 * FIX #18 - Configuration centralized
 */

/**
 * Cache durations (milliseconds)
 */
export const CACHE_DURATION = {
  SUBSCRIPTION_STATUS: 5 * 60 * 1000,  // 5 minutes
  USER_PROFILE: 10 * 60 * 1000,         // 10 minutes
  NOTION_PAGES: 30 * 1000,              // 30 seconds
  PAGE_BLOCKS: 5 * 60 * 1000,           // 5 minutes
} as const;

/**
 * Retry configuration
 */
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_DELAY_MS: 1000,    // 1 second
  MAX_DELAY_MS: 10000,       // 10 seconds
  TIMEOUT_MS: 30000,         // 30 seconds
} as const;

/**
 * Debounce delays (milliseconds)
 */
export const DEBOUNCE_DELAY = {
  SEARCH: 300,
  AUTO_SAVE: 1000,
  WINDOW_RESIZE: 150,
} as const;

/**
 * Pagination
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

/**
 * File size limits (bytes)
 */
export const FILE_SIZE_LIMIT = {
  IMAGE: 5 * 1024 * 1024,      // 5 MB
  DOCUMENT: 10 * 1024 * 1024,   // 10 MB
  MAX: 50 * 1024 * 1024,        // 50 MB
} as const;

/**
 * Text length limits
 */
export const TEXT_LENGTH = {
  CLIP_TITLE_MAX: 200,
  CLIP_CONTENT_MAX: 50000,
  SEARCH_QUERY_MAX: 100,
  USER_NAME_MAX: 100,
  EMAIL_MAX: 255,
} as const;

/**
 * Animation durations (milliseconds)
 */
export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

/**
 * Z-index layers
 */
export const Z_INDEX = {
  DROPDOWN: 1000,
  MODAL_BACKDROP: 1040,
  MODAL: 1050,
  TOOLTIP: 1060,
  TOAST: 1070,
} as const;

/**
 * Local storage keys
 */
export const STORAGE_KEY = {
  USER_ID: 'user_id',
  USER_EMAIL: 'user_email',
  USER_NAME: 'user_name',
  USER_PICTURE: 'user_picture',
  AUTH_PROVIDER: 'auth_provider',
  NOTION_WORKSPACE: 'notion_workspace',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  ONBOARDING_PROGRESS: 'onboarding_progress',
  THEME: 'theme',
  LANGUAGE: 'language',
} as const;

/**
 * API endpoints
 */
export const API_ENDPOINT = {
  GET_SUBSCRIPTION: 'get-subscription',
  CREATE_CHECKOUT: 'create-checkout',
  CREATE_PORTAL: 'create-portal-session',
  CREATE_USER: 'create-user',
  SAVE_NOTION_CONNECTION: 'save-notion-connection',
  GET_NOTION_TOKEN: 'get-notion-token',
  GOOGLE_OAUTH: 'google-oauth',
  NOTION_OAUTH: 'notion-oauth',
  WEBHOOK_STRIPE: 'webhook-stripe',
} as const;

/**
 * Environment variables
 */
export const ENV = {
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  IS_DEVELOPMENT: process.env.NODE_ENV === 'development',
  IS_TEST: process.env.NODE_ENV === 'test',
} as const;

/**
 * Feature flags
 */
export const FEATURE_FLAGS = {
  ENABLE_ANALYTICS: true,
  ENABLE_ERROR_REPORTING: true,
  ENABLE_VERBOSE_LOGGING: !ENV.IS_PRODUCTION,
  ENABLE_PERFORMANCE_MONITORING: ENV.IS_PRODUCTION,
} as const;

/**
 * Error messages
 */
export const ERROR_MESSAGE = {
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  NOT_FOUND: 'The requested resource was not found.',
  SERVER_ERROR: 'Server error. Please try again later.',
  QUOTA_EXCEEDED: 'You have reached your quota limit. Please upgrade to continue.',
  INVALID_INPUT: 'Invalid input. Please check your data and try again.',
} as const;

/**
 * Success messages
 */
export const SUCCESS_MESSAGE = {
  SAVED: 'Changes saved successfully.',
  DELETED: 'Deleted successfully.',
  COPIED: 'Copied to clipboard.',
  UPLOADED: 'File uploaded successfully.',
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
