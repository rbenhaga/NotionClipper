// packages/core-shared/src/services/analytics.service.ts

import {
  IAnalytics,
  IAnalyticsAdapter,
  AnalyticsEvent,
  AnalyticsConfig,
  AnalyticsSettings,
  ClipEventProperties,
  NotionEventProperties,
  SubscriptionEventProperties,
  SubscriptionPlan,
  Platform
} from '../interfaces';
import { Logger } from './logger.service';
import { v4 as uuidv4 } from 'uuid';

/**
 * Analytics Service
 *
 * Design Principles (Apple × Notion):
 * - Privacy First: Respect user preferences, anonymize data
 * - Performance: Batch events, offline queue, minimal latency
 * - Reliability: Never block user actions, graceful degradation
 * - Simplicity: Clean API, self-documenting methods
 */
export class AnalyticsService implements IAnalytics {
  private adapter: IAnalyticsAdapter;
  private config: AnalyticsConfig | null = null;
  private logger: Logger;

  // Session Management
  private sessionId: string = uuidv4();
  private sessionStartTime: number = Date.now();
  private userId: string | null = null;
  private anonymousId: string = uuidv4();

  // Event Batching (Performance Optimization)
  private eventQueue: AnalyticsEvent[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private isFlushing: boolean = false;

  // Privacy & Settings
  private analyticsEnabled: boolean = true;
  private settings: AnalyticsSettings | null = null;

  // Offline Queue
  private offlineQueue: AnalyticsEvent[] = [];
  private isOnline: boolean = true;

  constructor(adapter: IAnalyticsAdapter) {
    this.adapter = adapter;
    this.logger = new Logger(0, 'Analytics');

    // Load anonymous ID from storage if exists
    this.loadAnonymousId();

    // Listen to online/offline events (platform-specific)
    this.setupConnectivityListeners();
  }

  // ==================== INITIALIZATION ====================

  async initialize(config: AnalyticsConfig): Promise<void> {
    try {
      this.config = config;
      await this.adapter.initialize(config);

      // Load user settings if authenticated
      if (this.userId) {
        await this.loadUserSettings();
      }

      // Start batch timer
      this.startBatchTimer();

      this.logger.info('Analytics initialized', {
        platform: config.platform,
        version: config.app_version,
        batch_size: config.batch_size
      });

      // Track app opened
      await this.trackAppOpened();
    } catch (error) {
      this.logger.error('Failed to initialize analytics', error as Error);
      // Graceful degradation: disable analytics on init failure
      this.analyticsEnabled = false;
    }
  }

  // ==================== USER IDENTITY ====================

  async identify(userId: string, traits?: Record<string, any>): Promise<void> {
    this.userId = userId;

    // Load user analytics settings
    await this.loadUserSettings();

    // Track identify event
    await this.track('user_identified', traits);

    this.logger.info('User identified', { userId });
  }

  async reset(): Promise<void> {
    // Flush pending events before reset
    await this.flush();

    this.userId = null;
    this.sessionId = uuidv4();
    this.settings = null;

    this.logger.info('Analytics reset (user logged out)');
  }

  // ==================== CORE TRACKING ====================

  async track(eventName: string, properties: Record<string, any> = {}): Promise<void> {
    // Privacy check: respect user preferences
    if (!this.isEnabled()) {
      return;
    }

    // Respect Do Not Track
    if (this.config?.respect_do_not_track && this.checkDoNotTrack()) {
      return;
    }

    try {
      const event = this.buildEvent(eventName, properties);

      // Add to batch queue
      this.eventQueue.push(event);

      // Flush if batch size reached
      if (this.eventQueue.length >= (this.config?.batch_size || 10)) {
        await this.flush();
      }
    } catch (error) {
      this.logger.error('Failed to track event', error as Error, { eventName });
    }
  }

  // ==================== APP LIFECYCLE ====================

  async trackAppOpened(): Promise<void> {
    const startupTime = Date.now() - this.sessionStartTime;

    await this.track('app_opened', {
      event_category: 'app',
      startup_time_ms: startupTime,
      session_id: this.sessionId
    });
  }

  async trackAppClosed(): Promise<void> {
    const sessionDuration = Date.now() - this.sessionStartTime;

    await this.track('app_closed', {
      event_category: 'app',
      session_duration_ms: sessionDuration
    });

    // Flush all pending events before app closes
    await this.flush();
  }

  async trackAppError(error: Error): Promise<void> {
    await this.track('app_error', {
      event_category: 'app',
      error_message: error.message,
      error_stack: error.stack,
      error_name: error.name
    });
  }

  // ==================== CLIP EVENTS ====================

  async trackClipCreated(properties: ClipEventProperties): Promise<void> {
    await this.track('clip_created', {
      event_category: 'clip',
      ...properties
    });
  }

  async trackClipSent(properties: ClipEventProperties): Promise<void> {
    await this.track('clip_sent', {
      event_category: 'clip',
      ...properties
    });

    // Update subscription usage if user is authenticated
    if (this.userId) {
      try {
        await this.adapter.updateSubscriptionUsage(this.userId, 1);
      } catch (error) {
        this.logger.error('Failed to update subscription usage', error as Error);
      }
    }
  }

  async trackClipFailed(properties: ClipEventProperties & { error?: string }): Promise<void> {
    await this.track('clip_failed', {
      event_category: 'clip',
      ...properties
    });
  }

  // ==================== NOTION EVENTS ====================

  async trackNotionPageSelected(pageId: string): Promise<void> {
    await this.track('notion_page_selected', {
      event_category: 'notion',
      page_id: pageId
    });
  }

  async trackNotionWorkspaceConnected(workspaceId: string): Promise<void> {
    await this.track('notion_workspace_connected', {
      event_category: 'notion',
      workspace_id: workspaceId
    });
  }

  async trackNotionSyncCompleted(properties: NotionEventProperties): Promise<void> {
    await this.track('notion_sync_completed', {
      event_category: 'notion',
      ...properties
    });
  }

  // ==================== SUBSCRIPTION EVENTS ====================

  async trackPaywallShown(properties: SubscriptionEventProperties): Promise<void> {
    await this.track('paywall_shown', {
      event_category: 'subscription',
      ...properties
    });
  }

  async trackUpgradeClicked(ctaLocation: string): Promise<void> {
    await this.track('upgrade_clicked', {
      event_category: 'subscription',
      cta_location: ctaLocation
    });
  }

  async trackSubscriptionCreated(plan: SubscriptionPlan): Promise<void> {
    await this.track('subscription_created', {
      event_category: 'subscription',
      plan_type: plan
    });
  }

  // ==================== SETTINGS ====================

  async updateSettings(settings: Partial<AnalyticsSettings>): Promise<void> {
    if (!this.userId) {
      this.logger.warn('Cannot update settings: user not identified');
      return;
    }

    try {
      await this.adapter.updateSettings(this.userId, settings);

      // Reload settings
      await this.loadUserSettings();

      this.logger.info('Analytics settings updated', settings);
    } catch (error) {
      this.logger.error('Failed to update settings', error as Error);
    }
  }

  async getSettings(): Promise<AnalyticsSettings | null> {
    return this.settings;
  }

  isEnabled(): boolean {
    // Check global flag
    if (!this.analyticsEnabled) return false;

    // Check user settings
    if (this.settings && !this.settings.analytics_enabled) return false;

    return true;
  }

  async setEnabled(enabled: boolean): Promise<void> {
    if (this.userId) {
      await this.updateSettings({ analytics_enabled: enabled });
    } else {
      this.analyticsEnabled = enabled;
    }

    this.logger.info(`Analytics ${enabled ? 'enabled' : 'disabled'}`);
  }

  // ==================== BATCHING & FLUSHING ====================

  async flush(): Promise<void> {
    if (this.isFlushing || this.eventQueue.length === 0) {
      return;
    }

    this.isFlushing = true;

    try {
      const eventsToSend = [...this.eventQueue];
      this.eventQueue = [];

      if (this.isOnline) {
        await this.adapter.trackBatch(eventsToSend);
        this.logger.debug(`Flushed ${eventsToSend.length} events`);

        // Try to flush offline queue if any
        await this.flushOfflineQueue();
      } else {
        // Add to offline queue
        this.addToOfflineQueue(eventsToSend);
      }
    } catch (error) {
      this.logger.error('Failed to flush events', error as Error);

      // Add back to offline queue on error
      this.addToOfflineQueue(this.eventQueue);
    } finally {
      this.isFlushing = false;
    }
  }

  // ==================== PRIVATE HELPERS ====================

  private buildEvent(eventName: string, properties: Record<string, any>): AnalyticsEvent {
    if (!this.config) {
      throw new Error('Analytics not initialized');
    }

    // Determine event category from properties or infer from name
    const eventCategory = properties.event_category || this.inferEventCategory(eventName);

    // Remove event_category from properties to avoid duplication
    const { event_category, ...cleanProperties } = properties;

    return {
      user_id: this.userId,
      session_id: this.sessionId,
      anonymous_id: this.userId ? undefined : this.anonymousId,
      event_name: eventName,
      event_category: eventCategory,
      platform: this.config.platform,
      app_version: this.config.app_version,
      os_version: this.config.os_version,
      country_code: this.getCountryCode(),
      timezone: this.getTimezone(),
      properties: cleanProperties,
      created_at: new Date()
    };
  }

  private inferEventCategory(eventName: string): string {
    if (eventName.startsWith('app_')) return 'app';
    if (eventName.startsWith('clip_')) return 'clip';
    if (eventName.startsWith('notion_')) return 'notion';
    if (eventName.startsWith('workspace_')) return 'workspace';
    if (eventName.includes('subscription') || eventName.includes('paywall')) return 'subscription';
    return 'app';
  }

  private async loadUserSettings(): Promise<void> {
    if (!this.userId) return;

    try {
      this.settings = await this.adapter.getSettings(this.userId);

      if (!this.settings) {
        // Create default settings
        this.settings = {
          user_id: this.userId,
          analytics_enabled: true,
          consent_version: '1.0',
          share_platform_info: true,
          share_location_info: true,
          data_retention_days: 90
        };

        await this.adapter.updateSettings(this.userId, this.settings);
      }
    } catch (error) {
      this.logger.error('Failed to load user settings', error as Error);
    }
  }

  private startBatchTimer(): void {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }

    const interval = this.config?.batch_interval_ms || 10000; // 10 seconds default

    this.batchTimer = setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flush();
      }
    }, interval);
  }

  private setupConnectivityListeners(): void {
    // Platform-specific implementation
    // For browser: window.addEventListener('online', ...)
    // For Electron: Use electron's online/offline events

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.isOnline = true;
        this.flushOfflineQueue();
      });

      window.addEventListener('offline', () => {
        this.isOnline = false;
      });
    }
  }

  private addToOfflineQueue(events: AnalyticsEvent[]): void {
    const maxSize = this.config?.offline_queue_max_size || 1000;

    this.offlineQueue.push(...events);

    // Limit queue size
    if (this.offlineQueue.length > maxSize) {
      const excess = this.offlineQueue.length - maxSize;
      this.offlineQueue.splice(0, excess);
      this.logger.warn(`Offline queue overflow: removed ${excess} oldest events`);
    }

    this.logger.info(`Added ${events.length} events to offline queue (total: ${this.offlineQueue.length})`);
  }

  private async flushOfflineQueue(): Promise<void> {
    if (this.offlineQueue.length === 0) return;

    try {
      const eventsToSend = [...this.offlineQueue];
      this.offlineQueue = [];

      await this.adapter.trackBatch(eventsToSend);
      this.logger.info(`Flushed ${eventsToSend.length} events from offline queue`);
    } catch (error) {
      this.logger.error('Failed to flush offline queue', error as Error);
      // Keep events in queue for next retry
    }
  }

  private loadAnonymousId(): void {
    // Try to load from localStorage/electron-store
    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem('analytics_anonymous_id');
      if (stored) {
        this.anonymousId = stored;
      } else {
        window.localStorage.setItem('analytics_anonymous_id', this.anonymousId);
      }
    }
  }

  private getCountryCode(): string | undefined {
    // Privacy check
    if (this.settings && !this.settings.share_location_info) {
      return undefined;
    }

    // Use Intl API to get country from timezone
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      // Simplified: In production, use a timezone-to-country mapping
      // For now, return undefined (will be set by server-side GeoIP)
      return undefined;
    } catch {
      return undefined;
    }
  }

  private getTimezone(): string | undefined {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return undefined;
    }
  }

  private checkDoNotTrack(): boolean {
    if (typeof window !== 'undefined' && window.navigator) {
      // @ts-ignore - doNotTrack is not in TS navigator type but exists
      const dnt = window.navigator.doNotTrack || window.navigator.msDoNotTrack;
      return dnt === '1' || dnt === 'yes';
    }
    return false;
  }

  // ==================== CLEANUP ====================

  destroy(): void {
    // Flush pending events
    this.flush();

    // Clear timer
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }

    this.logger.info('Analytics service destroyed');
  }
}

// ==================== HELPER: Check Freemium Limits ====================

/**
 * Helper function to check if user has reached their limit
 * Use this before showing paywall
 */
export async function checkFreemiumLimit(
  analytics: IAnalytics,
  adapter: IAnalyticsAdapter,
  userId: string,
  limitType: 'monthly_clips' = 'monthly_clips'
): Promise<{
  reached: boolean;
  current: number;
  limit: number;
  percentage: number;
}> {
  const result = await adapter.checkLimit(userId, limitType);

  const percentage = result.limit > 0 ? (result.current / result.limit) * 100 : 0;

  // Track if limit reached (for analytics)
  if (result.reached) {
    await analytics.trackPaywallShown({
      limit_type: limitType,
      current_usage: result.current,
      limit: result.limit,
      cta_location: 'limit_check'
    });
  }

  return {
    ...result,
    percentage
  };
}
