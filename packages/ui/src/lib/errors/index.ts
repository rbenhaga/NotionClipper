// packages/ui/src/lib/errors/index.ts
// 🎯 Error handling utilities and custom error classes

// ============================================
// CUSTOM ERROR CLASSES
// ============================================
export class ClipperError extends Error {
  public readonly code: string;
  public readonly context?: Record<string, any>;

  constructor(message: string, code: string, context?: Record<string, any>) {
    super(message);
    this.name = 'ClipperError';
    this.code = code;
    this.context = context;
  }
}

export class ValidationError extends ClipperError {
  public readonly field?: string;

  constructor(message: string, field?: string, context?: Record<string, any>) {
    super(message, 'VALIDATION_ERROR', context);
    this.name = 'ValidationError';
    this.field = field;
  }
}

export class NetworkError extends ClipperError {
  public readonly status?: number;
  public readonly url?: string;

  constructor(message: string, status?: number, url?: string, context?: Record<string, any>) {
    super(message, 'NETWORK_ERROR', context);
    this.name = 'NetworkError';
    this.status = status;
    this.url = url;
  }
}

export class NotionError extends ClipperError {
  public readonly notionCode?: string;

  constructor(message: string, notionCode?: string, context?: Record<string, any>) {
    super(message, 'NOTION_ERROR', context);
    this.name = 'NotionError';
    this.notionCode = notionCode;
  }
}

export class ConfigError extends ClipperError {
  public readonly configKey?: string;

  constructor(message: string, configKey?: string, context?: Record<string, any>) {
    super(message, 'CONFIG_ERROR', context);
    this.name = 'ConfigError';
    this.configKey = configKey;
  }
}

// ============================================
// ERROR CODES
// ============================================
export const ERROR_CODES = {
  // General
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
  INVALID_INPUT: 'INVALID_INPUT',
  PERMISSION_DENIED: 'PERMISSION_DENIED',
  
  // Network
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  CONNECTION_ERROR: 'CONNECTION_ERROR',
  
  // Authentication
  AUTH_ERROR: 'AUTH_ERROR',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  
  // Notion API
  NOTION_ERROR: 'NOTION_ERROR',
  NOTION_RATE_LIMIT: 'NOTION_RATE_LIMIT',
  NOTION_INVALID_PAGE: 'NOTION_INVALID_PAGE',
  
  // Configuration
  CONFIG_ERROR: 'CONFIG_ERROR',
  CONFIG_MISSING: 'CONFIG_MISSING',
  CONFIG_INVALID: 'CONFIG_INVALID',
  
  // File Operations
  FILE_ERROR: 'FILE_ERROR',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  FILE_INVALID_TYPE: 'FILE_INVALID_TYPE',
  
  // Clipboard
  CLIPBOARD_ERROR: 'CLIPBOARD_ERROR',
  CLIPBOARD_EMPTY: 'CLIPBOARD_EMPTY',
  CLIPBOARD_PERMISSION: 'CLIPBOARD_PERMISSION',
} as const;

// ============================================
// ERROR HANDLERS
// ============================================
export interface ErrorHandler {
  (error: Error): void;
}

export class ErrorManager {
  private handlers: Map<string, ErrorHandler[]> = new Map();
  private globalHandlers: ErrorHandler[] = [];

  /**
   * Registers an error handler for specific error codes
   */
  onError(code: string, handler: ErrorHandler): () => void {
    if (!this.handlers.has(code)) {
      this.handlers.set(code, []);
    }
    this.handlers.get(code)!.push(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.handlers.get(code);
      if (handlers) {
        const index = handlers.indexOf(handler);
        if (index > -1) {
          handlers.splice(index, 1);
        }
      }
    };
  }

  /**
   * Registers a global error handler
   */
  onAnyError(handler: ErrorHandler): () => void {
    this.globalHandlers.push(handler);

    // Return unsubscribe function
    return () => {
      const index = this.globalHandlers.indexOf(handler);
      if (index > -1) {
        this.globalHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Handles an error by calling appropriate handlers
   */
  handleError(error: Error): void {
    console.error('[ErrorManager]', error);

    // Call specific handlers
    if (error instanceof ClipperError) {
      const handlers = this.handlers.get(error.code);
      if (handlers) {
        handlers.forEach(handler => {
          try {
            handler(error);
          } catch (handlerError) {
            console.error('[ErrorManager] Handler error:', handlerError);
          }
        });
      }
    }

    // Call global handlers
    this.globalHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (handlerError) {
        console.error('[ErrorManager] Global handler error:', handlerError);
      }
    });
  }
}

// ============================================
// ERROR UTILITIES
// ============================================
/**
 * Safely executes an async function and handles errors
 */
export async function safeAsync<T>(
  fn: () => Promise<T>,
  fallback?: T
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    console.error('[safeAsync]', error);
    return fallback;
  }
}

/**
 * Safely executes a function and handles errors
 */
export function safe<T>(fn: () => T, fallback?: T): T | undefined {
  try {
    return fn();
  } catch (error) {
    console.error('[safe]', error);
    return fallback;
  }
}

/**
 * Creates a retry wrapper for functions
 */
export function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  maxRetries = 3,
  delay = 1000
): T {
  return (async (...args: Parameters<T>) => {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn(...args);
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempt)));
        }
      }
    }
    
    throw lastError!;
  }) as T;
}

/**
 * Converts unknown error to ClipperError
 */
export function toClipperError(error: unknown, defaultCode = ERROR_CODES.UNKNOWN_ERROR): ClipperError {
  if (error instanceof ClipperError) {
    return error;
  }
  
  if (error instanceof Error) {
    return new ClipperError(error.message, defaultCode, { originalError: error });
  }
  
  return new ClipperError(
    typeof error === 'string' ? error : 'An unknown error occurred',
    defaultCode,
    { originalError: error }
  );
}

/**
 * Global error manager instance
 */
export const errorManager = new ErrorManager();

// ============================================
// ERROR BOUNDARY HELPERS
// ============================================
export interface ErrorInfo {
  componentStack: string;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

export function createErrorBoundaryState(): ErrorBoundaryState {
  return { hasError: false };
}

export function handleErrorBoundaryError(
  error: Error,
  errorInfo: ErrorInfo
): ErrorBoundaryState {
  console.error('[ErrorBoundary]', error, errorInfo);
  errorManager.handleError(error);
  
  return {
    hasError: true,
    error,
    errorInfo,
  };
}