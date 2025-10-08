// packages/core-electron/src/services/polling.service.ts
import { EventEmitter } from 'events';
import type { NotionPage, NotionDatabase } from '@notion-clipper/core-shared';

/**
 * Polling configuration
 */
export interface PollingConfig {
  interval: number;
  enabled: boolean;
}

export interface PollingStatus {
  isRunning: boolean;
  interval: number;
  lastPoll: number | null;
  nextPoll: number | null;
  errorCount: number;
}

export interface PollingResult {
  success: boolean;
  pagesCount?: number;
  databasesCount?: number;
  error?: string;
  timestamp: number;
}

/**
 * Polling service for periodic Notion data refresh
 * Electron-specific implementation using Node.js timers
 */
export class ElectronPollingService extends EventEmitter {
  private interval: NodeJS.Timeout | null = null;
  private isRunning = false;
  private pollingInterval: number;
  private lastPoll: number | null = null;
  private errorCount = 0;
  private readonly MAX_ERRORS = 5;

  constructor(
    private notionService: {
      getPages(forceRefresh?: boolean): Promise<NotionPage[]>;
      getDatabases?(forceRefresh?: boolean): Promise<NotionDatabase[]>;
    },
    private cacheService?: any, // Pas utilisé pour l'instant
    private defaultInterval = 30000
  ) {
    super();
    this.pollingInterval = defaultInterval;
  }

  /**
   * Start polling
   */
  start(intervalMs?: number): void {
    if (this.isRunning) {
      console.log('[POLLING] Already running');
      return;
    }

    if (intervalMs) {
      this.pollingInterval = intervalMs;
    }

    this.isRunning = true;
    this.errorCount = 0;

    console.log(`[POLLING] Starting with interval: ${this.pollingInterval}ms`);

    // First poll immediately
    this.poll();

    // Then periodic polling
    this.interval = setInterval(() => {
      this.poll();
    }, this.pollingInterval);

    this.emit('started', { interval: this.pollingInterval });
  }

  /**
   * Stop polling
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    this.isRunning = false;
    console.log('[POLLING] Stopped');

    this.emit('stopped');
  }

  /**
   * Perform a single poll
   */
  async poll(): Promise<PollingResult> {
    if (!this.notionService) {
      const error = 'Notion service not initialized';
      console.warn('[POLLING]', error);
      return {
        success: false,
        error,
        timestamp: Date.now()
      };
    }

    this.emit('poll-start');

    try {
      console.log('[POLLING] Fetching data...');

      const [pages, databases] = await Promise.all([
        this.notionService.getPages(true),
        this.notionService.getDatabases ? this.notionService.getDatabases(true) : Promise.resolve([])
      ]);

      this.lastPoll = Date.now();
      this.errorCount = 0; // Reset error count on success

      const result: PollingResult = {
        success: true,
        pagesCount: pages.length,
        databasesCount: databases.length,
        timestamp: this.lastPoll
      };

      console.log(`[POLLING] Success: ${pages.length} pages, ${databases.length} databases`);

      this.emit('poll-complete', result);

      return result;

    } catch (error: any) {
      this.errorCount++;
      console.error('[POLLING] Error:', error);

      const result: PollingResult = {
        success: false,
        error: error.message,
        timestamp: Date.now()
      };

      this.emit('poll-error', result);

      // Stop polling if too many errors
      if (this.errorCount >= this.MAX_ERRORS) {
        console.error(`[POLLING] Too many errors (${this.errorCount}), stopping`);
        this.stop();
        this.emit('max-errors-reached', { count: this.errorCount });
      }

      return result;
    }
  }

  /**
   * Force a refresh
   */
  async forceRefresh(): Promise<PollingResult> {
    console.log('[POLLING] Force refresh');
    return await this.poll();
  }

  /**
   * Change polling interval
   */
  setInterval(intervalMs: number): void {
    this.pollingInterval = intervalMs;

    if (this.isRunning) {
      console.log(`[POLLING] Updating interval to ${intervalMs}ms`);
      this.stop();
      this.start(intervalMs);
    }
  }

  /**
   * Get current status
   */
  getStatus(): PollingStatus {
    const now = Date.now();
    return {
      isRunning: this.isRunning,
      interval: this.pollingInterval,
      lastPoll: this.lastPoll,
      nextPoll: this.isRunning && this.lastPoll
        ? this.lastPoll + this.pollingInterval
        : null,
      errorCount: this.errorCount
    };
  }

  /**
   * Check if polling is healthy
   */
  isHealthy(): boolean {
    return this.isRunning && this.errorCount < this.MAX_ERRORS;
  }

  /**
   * Cleanup and stop service
   */
  cleanup(): void {
    this.stop();
    this.removeAllListeners();
  }
}