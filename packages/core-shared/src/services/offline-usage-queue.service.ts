/**
 * Offline Usage Queue Service
 * 
 * 🔒 SECURITY: Tracks usage events offline and syncs when back online
 * Prevents users from bypassing quotas by going offline
 */

export interface PendingUsageEvent {
  id: string;
  feature: 'clips' | 'files' | 'focus_mode_minutes' | 'compact_mode_minutes';
  amount: number;
  timestamp: number;
  retryCount: number;
}

export class OfflineUsageQueueService {
  private readonly STORAGE_KEY = 'pending-usage-events';
  private readonly MAX_RETRY_COUNT = 5;
  private isSyncing = false;

  /**
   * Add usage event to offline queue
   */
  addToQueue(feature: string, amount: number): void {
    const event: PendingUsageEvent = {
      id: `usage-${Date.now()}-${Math.random()}`,
      feature: feature as any,
      amount,
      timestamp: Date.now(),
      retryCount: 0
    };

    const queue = this.getQueue();
    queue.push(event);
    this.saveQueue(queue);

    console.log(`[OfflineUsageQueue] ✅ Added to queue: ${feature} +${amount}`);
  }

  /**
   * Get all pending events
   */
  getQueue(): PendingUsageEvent[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('[OfflineUsageQueue] Error reading queue:', error);
      return [];
    }
  }

  /**
   * Save queue to localStorage
   */
  private saveQueue(queue: PendingUsageEvent[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('[OfflineUsageQueue] Error saving queue:', error);
    }
  }

  /**
   * Sync all pending events
   * Returns number of successfully synced events
   */
  async syncQueue(trackFn: (feature: string, amount: number) => Promise<void>): Promise<number> {
    if (this.isSyncing) {
      console.log('[OfflineUsageQueue] Already syncing, skipping...');
      return 0;
    }

    this.isSyncing = true;
    const queue = this.getQueue();

    if (queue.length === 0) {
      this.isSyncing = false;
      return 0;
    }

    console.log(`[OfflineUsageQueue] 🔄 Syncing ${queue.length} pending events...`);

    let successCount = 0;
    const failedEvents: PendingUsageEvent[] = [];

    for (const event of queue) {
      try {
        await trackFn(event.feature, event.amount);
        successCount++;
        console.log(`[OfflineUsageQueue] ✅ Synced: ${event.feature} +${event.amount}`);
      } catch (error) {
        console.error(`[OfflineUsageQueue] ❌ Failed to sync event:`, error);
        
        // Increment retry count
        event.retryCount++;
        
        // Keep in queue if under max retries
        if (event.retryCount < this.MAX_RETRY_COUNT) {
          failedEvents.push(event);
        } else {
          console.warn(`[OfflineUsageQueue] ⚠️ Max retries reached for event, dropping:`, event);
        }
      }
    }

    // Save failed events back to queue
    this.saveQueue(failedEvents);

    console.log(`[OfflineUsageQueue] ✅ Sync complete: ${successCount}/${queue.length} succeeded`);
    
    this.isSyncing = false;
    return successCount;
  }

  /**
   * Clear all pending events
   */
  clear(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    console.log('[OfflineUsageQueue] 🧹 Queue cleared');
  }

  /**
   * Get queue statistics
   */
  getStats(): { count: number; totalAmount: Record<string, number> } {
    const queue = this.getQueue();
    const totalAmount: Record<string, number> = {};

    for (const event of queue) {
      totalAmount[event.feature] = (totalAmount[event.feature] || 0) + event.amount;
    }

    return {
      count: queue.length,
      totalAmount
    };
  }
}
