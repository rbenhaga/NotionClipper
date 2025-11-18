import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';
import logger from '../utils/logger';

export class SupabaseService {
  private client: SupabaseClient;

  constructor() {
    this.client = createClient(config.supabase.url, config.supabase.key, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  /**
   * Get subscription for user
   */
  async getSubscription(userId: string) {
    const { data, error } = await this.client
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error getting subscription:', error);
      throw error;
    }

    return data;
  }

  /**
   * Get or create current usage record
   */
  async getUsageRecord(userId: string, subscriptionId: string) {
    const { data, error } = await this.client.rpc(
      'get_or_create_current_usage_record',
      {
        p_user_id: userId,
        p_subscription_id: subscriptionId,
      }
    );

    if (error) {
      logger.error('Error getting usage record:', error);
      throw error;
    }

    // RPC returns array
    return Array.isArray(data) ? data[0] : data;
  }

  /**
   * Increment usage counter
   */
  async incrementUsage(userId: string, feature: string, amount: number) {
    const { data, error } = await this.client.rpc('increment_usage_counter', {
      p_user_id: userId,
      p_feature: feature,
      p_increment: amount,
    });

    if (error) {
      logger.error('Error incrementing usage:', error);
      throw error;
    }

    return data;
  }

  /**
   * Create subscription
   */
  async createSubscription(userId: string, tier: string) {
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    const { data, error } = await this.client
      .from('subscriptions')
      .insert({
        user_id: userId,
        tier,
        status: 'active',
        current_period_start: now.toISOString(),
        current_period_end: periodEnd.toISOString(),
        is_grace_period: false,
      })
      .select()
      .single();

    if (error) {
      logger.error('Error creating subscription:', error);
      throw error;
    }

    return data;
  }

  /**
   * Update subscription
   */
  async updateSubscription(subscriptionId: string, updates: any) {
    const { data, error } = await this.client
      .from('subscriptions')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', subscriptionId)
      .select()
      .single();

    if (error) {
      logger.error('Error updating subscription:', error);
      throw error;
    }

    return data;
  }

  /**
   * Get subscription by Stripe customer ID
   */
  async getSubscriptionByCustomerId(customerId: string) {
    const { data, error } = await this.client
      .from('subscriptions')
      .select('*')
      .eq('stripe_customer_id', customerId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error getting subscription by customer ID:', error);
      throw error;
    }

    return data;
  }

  /**
   * Get user profile
   */
  async getUserProfile(userId: string) {
    const { data, error } = await this.client
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error getting user profile:', error);
      throw error;
    }

    return data;
  }
}

export const supabaseService = new SupabaseService();
export default supabaseService;
