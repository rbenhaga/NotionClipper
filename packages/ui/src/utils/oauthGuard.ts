/**
 * OAuth Guard - Global singleton to prevent duplicate OAuth callback handling
 * 
 * 🔧 FIX P1: Both App.tsx and Onboarding.tsx listen to auth:callback/oauth:result events.
 * This guard ensures only ONE component processes each callback, preventing:
 * - Duplicate backend save-connection requests
 * - Race conditions in service initialization
 * - Confusing UX with multiple success notifications
 * 
 * CRITICAL: The key is based on userId ONLY (not event type) to block cross-flow duplicates.
 * 
 * Usage:
 *   import { oauthGuard } from '../utils/oauthGuard';
 *   
 *   if (oauthGuard.tryAcquireForUser(userId)) {
 *     // Process the callback
 *   } else {
 *     // Skip - already handled by another component
 *   }
 */

interface OAuthGuardState {
  /** Set of userIds currently being processed or recently processed */
  handledUsers: Map<string, number>; // userId -> timestamp
  /** Timestamp of last cleanup */
  lastCleanup: number;
}

const CLEANUP_INTERVAL_MS = 60000; // Clean up old entries every minute
const USER_LOCK_TTL_MS = 10000; // Lock per user expires after 10 seconds (enough for one flow)

class OAuthGuard {
  private state: OAuthGuardState = {
    handledUsers: new Map(),
    lastCleanup: Date.now(),
  };

  /**
   * Try to acquire the lock for processing a callback FOR A SPECIFIC USER
   * This blocks ALL event types (auth:callback, oauth:result) for the same userId.
   * 
   * @param userId - The user ID from the callback (REQUIRED for proper dedup)
   * @returns true if this caller should process the callback, false if already handled
   */
  tryAcquireForUser(userId: string | undefined | null): boolean {
    this.maybeCleanup();

    // If no userId, we can't deduplicate properly - allow but warn
    if (!userId) {
      console.warn('[OAuthGuard] ⚠️ No userId provided, cannot deduplicate - allowing');
      return true;
    }

    const now = Date.now();
    const existingTimestamp = this.state.handledUsers.get(userId);

    // Check if already handled (and not expired)
    if (existingTimestamp && (now - existingTimestamp) < USER_LOCK_TTL_MS) {
      console.log(`[OAuthGuard] ⏭️ User ${userId.substring(0, 8)}... already being handled (${now - existingTimestamp}ms ago)`);
      return false;
    }

    // Mark as handled
    this.state.handledUsers.set(userId, now);
    console.log(`[OAuthGuard] ✅ Acquired lock for user: ${userId.substring(0, 8)}...`);
    return true;
  }

  /**
   * Legacy method - redirects to tryAcquireForUser
   * @deprecated Use tryAcquireForUser instead
   */
  tryAcquire(_eventType: string, callbackId?: string): boolean {
    // Extract userId from callbackId if it looks like a UUID, otherwise treat as userId
    return this.tryAcquireForUser(callbackId);
  }

  /**
   * Release a lock for a user (optional - for error recovery)
   */
  releaseForUser(userId: string): void {
    this.state.handledUsers.delete(userId);
    console.log(`[OAuthGuard] 🔓 Released lock for user: ${userId.substring(0, 8)}...`);
  }

  /**
   * Reset all locks (for logout/disconnect)
   */
  reset(): void {
    this.state.handledUsers.clear();
    console.log('[OAuthGuard] 🧹 All locks cleared');
  }

  /**
   * Check if a user is currently locked (for debugging)
   */
  isUserLocked(userId: string): boolean {
    const timestamp = this.state.handledUsers.get(userId);
    if (!timestamp) return false;
    return (Date.now() - timestamp) < USER_LOCK_TTL_MS;
  }

  /**
   * Clean up expired entries periodically
   */
  private maybeCleanup(): void {
    const now = Date.now();
    if (now - this.state.lastCleanup < CLEANUP_INTERVAL_MS) {
      return;
    }

    this.state.lastCleanup = now;
    const expiredThreshold = now - USER_LOCK_TTL_MS;
    let cleaned = 0;

    for (const [userId, timestamp] of this.state.handledUsers.entries()) {
      if (timestamp < expiredThreshold) {
        this.state.handledUsers.delete(userId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`[OAuthGuard] 🧹 Cleaned ${cleaned} expired locks`);
    }
  }
}

// Export singleton instance
// 🔍 DEBUG: Log instance creation to detect duplicate modules
const INSTANCE_ID = Math.random().toString(36).substring(2, 8);
console.log(`[OAuthGuard] 🆔 Instance created: ${INSTANCE_ID}`);

export const oauthGuard = new OAuthGuard();
