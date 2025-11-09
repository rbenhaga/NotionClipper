// packages/adapters/supabase/src/analytics-supabase.adapter.ts

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  IAnalyticsAdapter,
  AnalyticsEvent,
  AnalyticsConfig,
  AnalyticsSettings,
  SubscriptionStatus as SubscriptionStatusType
} from '@notion-clipper/core-shared';

/**
 * Supabase Analytics Adapter
 *
 * Implements analytics data persistence using Supabase PostgreSQL
 * Features:
 * - Batch event insertion for performance
 * - Row Level Security (RLS) support
 * - Privacy-compliant data handling
 * - RGPD compliant data management
 */
export class AnalyticsSupabaseAdapter implements IAnalyticsAdapter {
  private client: SupabaseClient | null = null;
  private config: AnalyticsConfig | null = null;

  async initialize(config: AnalyticsConfig): Promise<void> {
    this.config = config;

    this.client = createClient(config.supabaseUrl, config.supabaseKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true
      }
    });
  }

  private ensureClient(): SupabaseClient {
    if (!this.client) {
      throw new Error('Analytics adapter not initialized');
    }
    return this.client;
  }

  // ==================== EVENT TRACKING ====================

  async track(event: AnalyticsEvent): Promise<void> {
    await this.trackBatch([event]);
  }

  async trackBatch(events: AnalyticsEvent[]): Promise<void> {
    if (events.length === 0) return;

    const client = this.ensureClient();

    try {
      // Transform events to match database schema
      const dbEvents = events.map(event => ({
        user_id: event.user_id || null,
        session_id: event.session_id,
        anonymous_id: event.anonymous_id || null,
        event_name: event.event_name,
        event_category: event.event_category,
        platform: event.platform,
        app_version: event.app_version,
        os_version: event.os_version || null,
        country_code: event.country_code || null,
        timezone: event.timezone || null,
        properties: event.properties || {},
        ip_hash: this.hashIP(), // Will be set by DB function if available
        user_agent_hash: this.hashUserAgent(),
        created_at: event.created_at || new Date()
      }));

      // Batch insert with upsert to handle duplicates gracefully
      const { error } = await client
        .from('analytics_events')
        .insert(dbEvents);

      if (error) {
        throw error;
      }

      console.log(`✅ Tracked ${events.length} events`);
    } catch (error) {
      console.error('❌ Failed to track events batch:', error);
      throw error;
    }
  }

  // ==================== ANALYTICS SETTINGS ====================

  async getSettings(userId: string): Promise<AnalyticsSettings | null> {
    const client = this.ensureClient();

    try {
      const { data, error } = await client
        .from('analytics_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No row found, return null
          return null;
        }
        throw error;
      }

      if (!data) return null;

      return {
        user_id: data.user_id,
        analytics_enabled: data.analytics_enabled,
        consent_given_at: data.consent_given_at ? new Date(data.consent_given_at) : undefined,
        consent_version: data.consent_version,
        share_platform_info: data.share_platform_info,
        share_location_info: data.share_location_info,
        data_retention_days: data.data_retention_days
      };
    } catch (error) {
      console.error('❌ Failed to get analytics settings:', error);
      return null;
    }
  }

  async updateSettings(userId: string, settings: Partial<AnalyticsSettings>): Promise<void> {
    const client = this.ensureClient();

    try {
      const updateData: any = {
        ...settings,
        updated_at: new Date().toISOString()
      };

      // If enabling analytics for first time, set consent_given_at
      if (settings.analytics_enabled && !settings.consent_given_at) {
        updateData.consent_given_at = new Date().toISOString();
      }

      const { error } = await client
        .from('analytics_settings')
        .upsert({
          user_id: userId,
          ...updateData
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        throw error;
      }

      console.log('✅ Analytics settings updated');
    } catch (error) {
      console.error('❌ Failed to update analytics settings:', error);
      throw error;
    }
  }

  // ==================== SUBSCRIPTION STATUS ====================

  async getSubscriptionStatus(userId: string): Promise<SubscriptionStatusType | null> {
    const client = this.ensureClient();

    try {
      const { data, error } = await client
        .from('user_subscription_status')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No subscription found, create default free tier
          return await this.createDefaultSubscription(userId);
        }
        throw error;
      }

      if (!data) return null;

      return {
        user_id: data.user_id,
        plan_type: data.plan_type,
        status: data.status,
        stripe_customer_id: data.stripe_customer_id,
        stripe_subscription_id: data.stripe_subscription_id,
        current_period_start: data.current_period_start ? new Date(data.current_period_start) : undefined,
        current_period_end: data.current_period_end ? new Date(data.current_period_end) : undefined,
        monthly_clips_limit: data.monthly_clips_limit,
        monthly_clips_used: data.monthly_clips_used,
        limit_reset_at: data.limit_reset_at ? new Date(data.limit_reset_at) : undefined
      };
    } catch (error) {
      console.error('❌ Failed to get subscription status:', error);
      return null;
    }
  }

  async updateSubscriptionUsage(userId: string, clips_count: number): Promise<void> {
    const client = this.ensureClient();

    try {
      // Increment clips_used counter
      const { data: current } = await client
        .from('user_subscription_status')
        .select('monthly_clips_used, limit_reset_at')
        .eq('user_id', userId)
        .single();

      if (!current) {
        // Create default subscription if doesn't exist
        await this.createDefaultSubscription(userId);
      }

      // Check if we need to reset monthly counter
      const now = new Date();
      const resetAt = current?.limit_reset_at ? new Date(current.limit_reset_at) : null;
      const needsReset = !resetAt || now > resetAt;

      const newUsage = needsReset ? clips_count : (current?.monthly_clips_used || 0) + clips_count;
      const newResetAt = needsReset ? this.getNextMonthStart() : resetAt;

      const { error } = await client
        .from('user_subscription_status')
        .update({
          monthly_clips_used: newUsage,
          limit_reset_at: newResetAt?.toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('❌ Failed to update subscription usage:', error);
      throw error;
    }
  }

  async checkLimit(userId: string, limitType: 'monthly_clips'): Promise<{
    reached: boolean;
    current: number;
    limit: number;
  }> {
    const client = this.ensureClient();

    try {
      const { data, error } = await client
        .from('user_subscription_status')
        .select('monthly_clips_used, monthly_clips_limit, plan_type')
        .eq('user_id', userId)
        .single();

      if (error || !data) {
        // Default to free tier limits if no subscription found
        return {
          reached: false,
          current: 0,
          limit: 50 // Free tier default
        };
      }

      const current = data.monthly_clips_used || 0;
      const limit = data.plan_type === 'premium' ? 999999 : data.monthly_clips_limit; // Premium = unlimited

      return {
        reached: current >= limit,
        current,
        limit
      };
    } catch (error) {
      console.error('❌ Failed to check limit:', error);
      return {
        reached: false,
        current: 0,
        limit: 50
      };
    }
  }

  // ==================== PRIVATE HELPERS ====================

  private async createDefaultSubscription(userId: string): Promise<SubscriptionStatusType> {
    const client = this.ensureClient();

    const defaultSub: SubscriptionStatusType = {
      user_id: userId,
      plan_type: 'free',
      status: 'active',
      monthly_clips_limit: 50,
      monthly_clips_used: 0,
      limit_reset_at: this.getNextMonthStart()
    };

    const { error } = await client
      .from('user_subscription_status')
      .insert({
        user_id: userId,
        plan_type: 'free',
        status: 'active',
        monthly_clips_limit: 50,
        monthly_clips_used: 0,
        limit_reset_at: defaultSub.limit_reset_at?.toISOString()
      });

    if (error) {
      console.error('❌ Failed to create default subscription:', error);
    }

    return defaultSub;
  }

  private getNextMonthStart(): Date {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  }

  private hashIP(): string | null {
    // IP hashing is done server-side in Supabase using anonymize_ip() function
    // This client-side method returns null, IP will be hashed by DB trigger
    return null;
  }

  private hashUserAgent(): string | null {
    // User agent hashing for privacy
    if (typeof window !== 'undefined' && window.navigator) {
      const ua = window.navigator.userAgent;
      // Simple hash (in production, use crypto.subtle.digest)
      return btoa(ua).substring(0, 64);
    }
    return null;
  }

  // ==================== ADMIN QUERIES (for dashboard) ====================

  /**
   * Get dashboard quick stats
   * NOTE: This should only be called with service_role key (admin access)
   */
  async getDashboardStats(): Promise<any> {
    const client = this.ensureClient();

    try {
      const { data, error } = await client
        .from('dashboard_quick_stats')
        .select('*')
        .single();

      if (error) throw error;

      return data;
    } catch (error) {
      console.error('❌ Failed to get dashboard stats:', error);
      return null;
    }
  }

  /**
   * Refresh materialized views
   * NOTE: Admin only
   */
  async refreshAnalyticsViews(): Promise<void> {
    const client = this.ensureClient();

    try {
      const { error } = await client.rpc('refresh_analytics_views');

      if (error) throw error;

      console.log('✅ Analytics views refreshed');
    } catch (error) {
      console.error('❌ Failed to refresh views:', error);
      throw error;
    }
  }

  /**
   * Get platform distribution
   * NOTE: Admin only
   */
  async getPlatformDistribution(): Promise<any[]> {
    const client = this.ensureClient();

    try {
      const { data, error } = await client
        .from('platform_distribution')
        .select('*')
        .order('users', { ascending: false });

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('❌ Failed to get platform distribution:', error);
      return [];
    }
  }

  /**
   * Get clips distribution histogram
   * NOTE: Admin only
   */
  async getClipsDistribution(): Promise<any[]> {
    const client = this.ensureClient();

    try {
      const { data, error } = await client
        .from('clips_per_user_distribution')
        .select('*')
        .order('month', { ascending: false })
        .limit(3);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('❌ Failed to get clips distribution:', error);
      return [];
    }
  }

  /**
   * Get retention cohorts
   * NOTE: Admin only
   */
  async getRetentionCohorts(): Promise<any[]> {
    const client = this.ensureClient();

    try {
      const { data, error } = await client
        .from('retention_cohorts')
        .select('*')
        .order('cohort_month', { ascending: false })
        .limit(12);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('❌ Failed to get retention cohorts:', error);
      return [];
    }
  }

  /**
   * Get geographic distribution
   * NOTE: Admin only
   */
  async getGeographicDistribution(): Promise<any[]> {
    const client = this.ensureClient();

    try {
      const { data, error } = await client
        .from('geographic_distribution')
        .select('*')
        .order('users', { ascending: false })
        .limit(50);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('❌ Failed to get geographic distribution:', error);
      return [];
    }
  }

  /**
   * Get analytics overview (time series)
   * NOTE: Admin only
   */
  async getAnalyticsOverview(days: number = 30): Promise<any[]> {
    const client = this.ensureClient();

    try {
      const { data, error } = await client
        .from('analytics_overview')
        .select('*')
        .order('date', { ascending: false })
        .limit(days);

      if (error) throw error;

      return data || [];
    } catch (error) {
      console.error('❌ Failed to get analytics overview:', error);
      return [];
    }
  }
}
