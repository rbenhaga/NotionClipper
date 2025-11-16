/**
 * Production-Safe Logger
 *
 * Provides level-based logging with automatic filtering in production.
 * Usage:
 *   - logger.debug(...) → Only in development
 *   - logger.info(...) → Always shown
 *   - logger.warn(...) → Always shown
 *   - logger.error(...) → Always shown
 *
 * Design Philosophy:
 *   - Debug logs expose internal state (URLs, flags, init status) - hide in production
 *   - Info/warn/error are user-facing - always show
 *   - Respects Apple design: clean, minimal UI even in console
 */

// Detect environment (Vite, Webpack, or Node.js)
const IS_PRODUCTION =
  (typeof import.meta !== 'undefined' && import.meta.env?.MODE === 'production') ||
  (typeof process !== 'undefined' && process.env?.NODE_ENV === 'production') ||
  false;

/**
 * Logger with environment-aware filtering
 */
export const logger = {
  /**
   * Debug logging - ONLY in development
   * Use for: internal state, URLs, flags, initialization details
   * @example logger.debug('[AuthDataManager] URL:', supabaseUrl)
   */
  debug: (...args: any[]) => {
    if (!IS_PRODUCTION) {
      console.log(...args);
    }
  },

  /**
   * Info logging - ALWAYS shown
   * Use for: user-facing success messages, important events
   * @example logger.info('[AuthDataManager] Auth data saved')
   */
  info: (...args: any[]) => {
    console.log(...args);
  },

  /**
   * Warning logging - ALWAYS shown
   * Use for: recoverable errors, fallbacks, deprecated features
   * @example logger.warn('[SubscriptionService] Using ephemeral subscription')
   */
  warn: (...args: any[]) => {
    console.warn(...args);
  },

  /**
   * Error logging - ALWAYS shown
   * Use for: exceptions, failed operations, critical errors
   * @example logger.error('[NotionService] Failed to send clip:', error)
   */
  error: (...args: any[]) => {
    console.error(...args);
  },
};

/**
 * Development-only assertion helper
 * Throws error in development, warns in production
 */
export const devAssert = (condition: boolean, message: string) => {
  if (!condition) {
    if (IS_PRODUCTION) {
      console.warn(`[DevAssert] ${message}`);
    } else {
      throw new Error(`[DevAssert] ${message}`);
    }
  }
};

/**
 * Performance timing helper (debug-only)
 */
export const perfTime = (label: string) => {
  if (!IS_PRODUCTION) {
    console.time(label);
  }
};

export const perfTimeEnd = (label: string) => {
  if (!IS_PRODUCTION) {
    console.timeEnd(label);
  }
};

/**
 * Conditional debug group (collapsed in console)
 */
export const debugGroup = (label: string, collapsed: boolean = true) => {
  if (!IS_PRODUCTION) {
    if (collapsed) {
      console.groupCollapsed(label);
    } else {
      console.group(label);
    }
  }
};

export const debugGroupEnd = () => {
  if (!IS_PRODUCTION) {
    console.groupEnd();
  }
};
