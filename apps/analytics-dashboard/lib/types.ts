// lib/types.ts

export interface DashboardStats {
  dau: number;
  wau: number;
  mau: number;
  clips_today: number;
  clips_this_month: number;
  premium_users: number;
  free_users: number;
  countries_active: number;
}

export interface AnalyticsOverview {
  date: string;
  dau: number;
  total_sessions: number;
  total_clips: number;
  failed_clips: number;
  platforms_active: number;
  desktop_events: number;
  extension_events: number;
  countries_active: number;
}

export interface PlatformDistribution {
  platform: string;
  users: number;
  total_events: number;
  clips_sent: number;
  avg_word_count: number;
  error_count: number;
}

export interface ClipsDistribution {
  month: string;
  zero_clips: number;
  clips_1_5: number;
  clips_6_10: number;
  clips_11_25: number;
  clips_26_50: number;
  clips_51_100: number;
  clips_100_plus: number;
  median_clips: number;
  p90_clips: number;
  p95_clips: number;
  avg_clips: number;
}

export interface RetentionCohort {
  cohort_month: string;
  platform: string;
  users_count: number;
  day_1_retention: number;
  day_7_retention: number;
  day_30_retention: number;
  day_90_retention: number;
  conversion_rate: number | null;
}

export interface GeographicDistribution {
  country_code: string;
  users: number;
  clips_sent: number;
  active_days: number;
}

export interface OnboardingFunnel {
  week: string;
  installed: number;
  connected: number;
  selected_page: number;
  sent_first_clip: number;
  connection_rate: number;
  activation_rate: number;
  avg_minutes_to_first_clip: number;
}
