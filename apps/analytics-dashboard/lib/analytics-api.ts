// lib/analytics-api.ts
import { supabase } from './supabase';
import type {
  DashboardStats,
  AnalyticsOverview,
  PlatformDistribution,
  ClipsDistribution,
  RetentionCohort,
  GeographicDistribution,
} from './types';

/**
 * Analytics API Client
 * Fetches data from Supabase views and tables
 */

export async function getDashboardStats(): Promise<DashboardStats | null> {
  try {
    const { data, error } = await supabase
      .from('dashboard_quick_stats')
      .select('*')
      .single();

    if (error) throw error;

    return data as DashboardStats;
  } catch (error) {
    console.error('Failed to fetch dashboard stats:', error);
    return null;
  }
}

export async function getAnalyticsOverview(days: number = 30): Promise<AnalyticsOverview[]> {
  try {
    const { data, error } = await supabase
      .from('analytics_overview')
      .select('*')
      .order('date', { ascending: false })
      .limit(days);

    if (error) throw error;

    return (data || []) as AnalyticsOverview[];
  } catch (error) {
    console.error('Failed to fetch analytics overview:', error);
    return [];
  }
}

export async function getPlatformDistribution(): Promise<PlatformDistribution[]> {
  try {
    const { data, error } = await supabase
      .from('platform_distribution')
      .select('*')
      .order('users', { ascending: false });

    if (error) throw error;

    return (data || []) as PlatformDistribution[];
  } catch (error) {
    console.error('Failed to fetch platform distribution:', error);
    return [];
  }
}

export async function getClipsDistribution(months: number = 3): Promise<ClipsDistribution[]> {
  try {
    const { data, error } = await supabase
      .from('clips_per_user_distribution')
      .select('*')
      .order('month', { ascending: false })
      .limit(months);

    if (error) throw error;

    return (data || []) as ClipsDistribution[];
  } catch (error) {
    console.error('Failed to fetch clips distribution:', error);
    return [];
  }
}

export async function getRetentionCohorts(months: number = 12): Promise<RetentionCohort[]> {
  try {
    const { data, error } = await supabase
      .from('retention_cohorts')
      .select('*')
      .order('cohort_month', { ascending: false })
      .limit(months);

    if (error) throw error;

    return (data || []) as RetentionCohort[];
  } catch (error) {
    console.error('Failed to fetch retention cohorts:', error);
    return [];
  }
}

export async function getGeographicDistribution(): Promise<GeographicDistribution[]> {
  try {
    const { data, error } = await supabase
      .from('geographic_distribution')
      .select('*')
      .order('users', { ascending: false })
      .limit(50);

    if (error) throw error;

    return (data || []) as GeographicDistribution[];
  } catch (error) {
    console.error('Failed to fetch geographic distribution:', error);
    return [];
  }
}

/**
 * Refresh all materialized views (admin only)
 */
export async function refreshAnalyticsViews(): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('refresh_analytics_views');

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Failed to refresh analytics views:', error);
    return false;
  }
}
