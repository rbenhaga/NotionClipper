/**
 * Edge Functions Utilities
 *
 * Provides retry logic and error handling for Supabase Edge Function calls
 *
 * Features:
 * - Exponential backoff retry strategy
 * - Configurable max retries
 * - Timeout handling
 * - Error categorization (transient vs permanent)
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface RetryOptions {
  maxRetries?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  timeoutMs?: number;
}

export interface InvokeResult<T = any> {
  data: T | null;
  error: Error | null;
  attempts: number;
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  timeoutMs: 30000,
};

/**
 * Check if error is transient (should retry) or permanent (should fail immediately)
 */
function isTransientError(error: any): boolean {
  if (!error) return false;

  // Network errors - should retry
  if (error.message?.includes('NetworkError')) return true;
  if (error.message?.includes('fetch failed')) return true;
  if (error.message?.includes('timeout')) return true;

  // HTTP status codes that should retry
  const status = error.status || error.statusCode;
  if (status) {
    // 408 Request Timeout
    // 429 Too Many Requests
    // 500 Internal Server Error
    // 502 Bad Gateway
    // 503 Service Unavailable
    // 504 Gateway Timeout
    return [408, 429, 500, 502, 503, 504].includes(status);
  }

  // Unknown errors - don't retry by default (could be validation errors)
  return false;
}

/**
 * Calculate exponential backoff delay with jitter
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const exponentialDelay = options.initialDelayMs * Math.pow(2, attempt);
  const jitter = Math.random() * 0.3 * exponentialDelay; // Add 0-30% jitter
  const delay = Math.min(exponentialDelay + jitter, options.maxDelayMs);
  return Math.floor(delay);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Invoke Supabase Edge Function with retry logic and exponential backoff
 *
 * @example
 * ```typescript
 * const result = await invokeWithRetry(
 *   supabaseClient,
 *   'get-subscription',
 *   { userId: '123' },
 *   { maxRetries: 3, initialDelayMs: 1000 }
 * );
 *
 * if (result.error) {
 *   console.error('Failed after', result.attempts, 'attempts:', result.error);
 * } else {
 *   console.log('Success:', result.data);
 * }
 * ```
 */
export async function invokeWithRetry<T = any>(
  client: SupabaseClient,
  functionName: string,
  body: any,
  options: RetryOptions = {}
): Promise<InvokeResult<T>> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < opts.maxRetries; attempt++) {
    try {
      console.log(`[EdgeFunction] Invoking ${functionName} (attempt ${attempt + 1}/${opts.maxRetries})`);

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), opts.timeoutMs);

      try {
        const { data, error } = await client.functions.invoke<T>(functionName, { body });

        clearTimeout(timeoutId);

        // Success - no error
        if (!error) {
          console.log(`[EdgeFunction] ✅ ${functionName} succeeded on attempt ${attempt + 1}`);
          return {
            data,
            error: null,
            attempts: attempt + 1,
          };
        }

        // Edge Function returned an error
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if error is transient
        if (!isTransientError(error)) {
          console.error(`[EdgeFunction] ❌ ${functionName} failed with permanent error:`, error);
          return {
            data: null,
            error: lastError,
            attempts: attempt + 1,
          };
        }

        console.warn(`[EdgeFunction] ⚠️ ${functionName} failed with transient error:`, error);
      } catch (invokeError: any) {
        clearTimeout(timeoutId);

        // Handle abort (timeout)
        if (invokeError.name === 'AbortError') {
          lastError = new Error(`Timeout after ${opts.timeoutMs}ms`);
          console.warn(`[EdgeFunction] ⏱️ ${functionName} timed out on attempt ${attempt + 1}`);
        } else {
          lastError = invokeError instanceof Error ? invokeError : new Error(String(invokeError));
          console.warn(`[EdgeFunction] ⚠️ ${functionName} threw error on attempt ${attempt + 1}:`, invokeError);
        }
      }

      // If not last attempt, wait before retrying
      if (attempt < opts.maxRetries - 1) {
        const delayMs = calculateDelay(attempt, opts);
        console.log(`[EdgeFunction] 🔄 Retrying ${functionName} in ${delayMs}ms...`);
        await sleep(delayMs);
      }

    } catch (error: any) {
      // Unexpected error in retry loop itself
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[EdgeFunction] ❌ Unexpected error in retry loop for ${functionName}:`, error);
      break;
    }
  }

  // All retries exhausted
  console.error(`[EdgeFunction] ❌ ${functionName} failed after ${opts.maxRetries} attempts`);
  return {
    data: null,
    error: lastError || new Error('Max retries reached'),
    attempts: opts.maxRetries,
  };
}

/**
 * Invoke Edge Function via fetch with retry logic
 *
 * Use this when you need more control or when SupabaseClient.functions.invoke is not available
 *
 * @example
 * ```typescript
 * const result = await fetchWithRetry(
 *   'https://project.supabase.co/functions/v1/my-function',
 *   {
 *     method: 'POST',
 *     headers: { 'Authorization': 'Bearer token' },
 *     body: JSON.stringify({ foo: 'bar' })
 *   }
 * );
 * ```
 */
export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  options: RetryOptions = {}
): Promise<InvokeResult<any>> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < opts.maxRetries; attempt++) {
    try {
      console.log(`[EdgeFunction] Fetching ${url} (attempt ${attempt + 1}/${opts.maxRetries})`);

      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), opts.timeoutMs);

      try {
        const response = await fetch(url, {
          ...init,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Success
        if (response.ok) {
          const data = await response.json();
          console.log(`[EdgeFunction] ✅ Fetch succeeded on attempt ${attempt + 1}`);
          return {
            data,
            error: null,
            attempts: attempt + 1,
          };
        }

        // HTTP error
        const errorData = await response.json().catch(() => ({ error: response.statusText }));
        lastError = new Error(errorData.error || `HTTP ${response.status}`);
        (lastError as any).status = response.status;

        // Check if error is transient
        if (!isTransientError(lastError)) {
          console.error(`[EdgeFunction] ❌ Fetch failed with permanent error:`, lastError);
          return {
            data: null,
            error: lastError,
            attempts: attempt + 1,
          };
        }

        console.warn(`[EdgeFunction] ⚠️ Fetch failed with transient error:`, lastError);
      } catch (fetchError: any) {
        clearTimeout(timeoutId);

        // Handle abort (timeout)
        if (fetchError.name === 'AbortError') {
          lastError = new Error(`Timeout after ${opts.timeoutMs}ms`);
          console.warn(`[EdgeFunction] ⏱️ Fetch timed out on attempt ${attempt + 1}`);
        } else {
          lastError = fetchError instanceof Error ? fetchError : new Error(String(fetchError));
          console.warn(`[EdgeFunction] ⚠️ Fetch threw error on attempt ${attempt + 1}:`, fetchError);
        }
      }

      // If not last attempt, wait before retrying
      if (attempt < opts.maxRetries - 1) {
        const delayMs = calculateDelay(attempt, opts);
        console.log(`[EdgeFunction] 🔄 Retrying fetch in ${delayMs}ms...`);
        await sleep(delayMs);
      }

    } catch (error: any) {
      // Unexpected error in retry loop itself
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`[EdgeFunction] ❌ Unexpected error in retry loop:`, error);
      break;
    }
  }

  // All retries exhausted
  console.error(`[EdgeFunction] ❌ Fetch failed after ${opts.maxRetries} attempts`);
  return {
    data: null,
    error: lastError || new Error('Max retries reached'),
    attempts: opts.maxRetries,
  };
}
