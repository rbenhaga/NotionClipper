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
  private readonly MAX_ERRORS = 3;
  private networkErrorCount = 0;
  private readonly MAX_NETWORK_ERRORS = 2;
  private isNetworkPaused = false;
  private networkRetryTimeout: NodeJS.Timeout | null = null;

  // ✅ FIX: Logger seulement les logs importants
  private logLevel: 'silent' | 'error' | 'info' = process.env.NODE_ENV === 'development' ? 'info' : 'silent';

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
      if (this.logLevel === 'info') console.log('[POLLING] Already running');
      return;
    }

    if (intervalMs) {
      this.pollingInterval = intervalMs;
    }

    this.isRunning = true;
    this.errorCount = 0;
    this.networkErrorCount = 0;
    this.isNetworkPaused = false;

    if (this.logLevel === 'info') {
      console.log(`[POLLING] ▶️ Started (interval: ${this.pollingInterval}ms)`);
    }

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
    if (!this.isRunning) return;

    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    if (this.networkRetryTimeout) {
      clearTimeout(this.networkRetryTimeout);
      this.networkRetryTimeout = null;
    }

    this.isRunning = false;
    this.isNetworkPaused = false;
    
    if (this.logLevel === 'info') {
      console.log('[POLLING] ⏹️ Stopped');
    }

    this.emit('stopped');
  }

  /**
   * Check if error is network-related
   */
  private isNetworkError(error: any): boolean {
    const networkErrorCodes = ['ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'ENETUNREACH'];
    const networkErrorMessages = ['getaddrinfo ENOTFOUND', 'network error', 'fetch failed'];

    return networkErrorCodes.some(code => error.code === code) ||
      networkErrorMessages.some(msg => error.message?.toLowerCase().includes(msg.toLowerCase()));
  }

  /**
   * Pause polling due to network issues and start network detection
   */
  private pauseForNetworkIssues(): void {
    if (this.isNetworkPaused) return;

    this.isNetworkPaused = true;
    
    if (this.logLevel !== 'silent') {
      console.warn('[POLLING] ⏸️ Paused - Network issues detected, retrying with backoff...');
    }

    // Clear current interval
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    // Start network detection with exponential backoff
    this.startNetworkDetection();
  }

  /**
   * Start network detection with exponential backoff
   */
  private startNetworkDetection(attempt = 1): void {
    const baseDelay = 30000; // 30 seconds
    const maxDelay = 300000; // 5 minutes
    const delay = Math.min(baseDelay * Math.pow(1.5, attempt - 1), maxDelay);

    // ✅ FIX: Logger seulement les tentatives importantes (1, 5, 10, 15...)
    if (attempt === 1 || attempt % 5 === 0) {
      console.log(`[POLLING] 🔄 Network retry attempt ${attempt} in ${delay / 1000}s`);
    }

    this.networkRetryTimeout = setTimeout(async () => {
      try {
        // Try to get pages without forcing refresh to test connectivity
        await this.notionService.getPages(false);

        // If successful, resume polling
        console.log('[POLLING] ✅ Network restored, resuming polling...');
        this.isNetworkPaused = false;
        this.networkErrorCount = 0;

        if (this.isRunning) {
          this.interval = setInterval(() => {
            this.poll();
          }, this.pollingInterval);
        }

      } catch (error: any) {
        // Still no network, continue detection
        if (this.isNetworkError(error)) {
          this.startNetworkDetection(attempt + 1);
        } else {
          // Different error, might be API issue, resume normal polling
          console.log('[POLLING] ⚠️ Non-network error detected, resuming polling...');
          this.isNetworkPaused = false;
          this.networkErrorCount = 0;

          if (this.isRunning) {
            this.interval = setInterval(() => {
              this.poll();
            }, this.pollingInterval);
          }
        }
      }
    }, delay);
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

    // Skip if network is paused
    if (this.isNetworkPaused) {
      return {
        success: false,
        error: 'Network paused',
        timestamp: Date.now()
      };
    }

    this.emit('poll-start');

    try {
      // ✅ FIX: Supprimer le log verbeux "Fetching data..."
      const [pages, databases] = await Promise.all([
        this.notionService.getPages(true),
        this.notionService.getDatabases ? this.notionService.getDatabases(true) : Promise.resolve([])
      ]);

      this.lastPoll = Date.now();
      this.errorCount = 0; // Reset error count on success
      this.networkErrorCount = 0; // Reset network error count on success

      const result: PollingResult = {
        success: true,
        pagesCount: pages.length,
        databasesCount: databases.length,
        timestamp: this.lastPoll
      };

      // ✅ FIX: Logger seulement en mode info ET si changement significatif
      if (this.logLevel === 'info' && (this.errorCount > 0 || this.networkErrorCount > 0)) {
        console.log(`[POLLING] ✅ Recovered: ${pages.length} pages, ${databases.length} databases`);
      }

      this.emit('poll-complete', result);

      return result;

    } catch (error: any) {
      this.errorCount++;

      const result: PollingResult = {
        success: false,
        error: error.message,
        timestamp: Date.now()
      };

      // Check if it's a network error
      if (this.isNetworkError(error)) {
        this.networkErrorCount++;
        
        // ✅ FIX: Logger seulement la première erreur réseau
        if (this.networkErrorCount === 1) {
          console.warn('[POLLING] 🌐 Network issues detected, initiating backoff retry...');
        }

        if (this.networkErrorCount >= this.MAX_NETWORK_ERRORS) {
          this.pauseForNetworkIssues();
        }
      } else {
        // ✅ FIX: Logger les erreurs API seulement si nouvelles
        if (this.errorCount === 1) {
          console.error('[POLLING] ❌ API Error:', error.message);
        }
      }

      this.emit('poll-error', result);

      // Stop polling if too many general errors
      if (this.errorCount >= this.MAX_ERRORS && !this.isNetworkPaused) {
        console.error(`[POLLING] ❌ Max errors reached (${this.errorCount}), stopping`);
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
    if (this.logLevel === 'info') {
      console.log('[POLLING] 🔄 Force refresh');
    }
    return await this.poll();
  }

  /**
   * Change polling interval
   */
  setInterval(intervalMs: number): void {
    this.pollingInterval = intervalMs;

    if (this.isRunning) {
      if (this.logLevel === 'info') {
        console.log(`[POLLING] 📅 Interval updated: ${intervalMs}ms`);
      }
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
      isRunning: this.isRunning && !this.isNetworkPaused,
      interval: this.pollingInterval,
      lastPoll: this.lastPoll,
      nextPoll: this.isRunning && this.lastPoll && !this.isNetworkPaused
        ? this.lastPoll + this.pollingInterval
        : null,
      errorCount: this.errorCount
    };
  }

  /**
   * Check if polling is healthy
   */
  isHealthy(): boolean {
    return this.isRunning && this.errorCount < this.MAX_ERRORS && !this.isNetworkPaused;
  }

  /**
   * Check if currently paused due to network issues
   */
  isNetworkPausedStatus(): boolean {
    return this.isNetworkPaused;
  }

  /**
   * Cleanup and stop service
   */
  cleanup(): void {
    this.stop();
    this.removeAllListeners();
  }
}