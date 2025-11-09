-- =====================================================
-- NotionClipper Analytics Views & Aggregations
-- Migration: Materialized views for dashboard performance
-- =====================================================

-- ==================== MATERIALIZED VIEWS ====================

-- Dashboard Overview (Last 30 days)
-- Refreshed: Hourly via cron
CREATE MATERIALIZED VIEW IF NOT EXISTS analytics_overview AS
SELECT
  DATE_TRUNC('day', created_at)::date as date,
  COUNT(DISTINCT user_id) as dau,
  COUNT(DISTINCT session_id) as total_sessions,
  COUNT(*) FILTER (WHERE event_name = 'clip_sent') as total_clips,
  COUNT(*) FILTER (WHERE event_name = 'clip_failed') as failed_clips,
  COUNT(DISTINCT platform) as platforms_active,

  -- Platform breakdown
  COUNT(*) FILTER (WHERE platform LIKE 'electron-%') as desktop_events,
  COUNT(*) FILTER (WHERE platform IN ('chrome', 'firefox')) as extension_events,

  -- Geographic
  COUNT(DISTINCT country_code) as countries_active
FROM analytics_events
WHERE created_at >= NOW() - INTERVAL '30 days'
  AND created_at < DATE_TRUNC('day', NOW()) + INTERVAL '1 day'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date DESC;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_analytics_overview_date ON analytics_overview(date);

COMMENT ON MATERIALIZED VIEW analytics_overview IS 'Daily overview metrics for dashboard (last 30 days)';

-- ==================== MONTHLY ACTIVE USERS (MAU) ====================

-- MAU calculation with rolling 30-day window
CREATE MATERIALIZED VIEW IF NOT EXISTS monthly_active_users AS
SELECT
  DATE_TRUNC('month', created_at)::date as month,
  COUNT(DISTINCT user_id) FILTER (
    WHERE event_name IN ('clip_sent', 'clip_created')
  ) as mau,
  COUNT(DISTINCT user_id) FILTER (
    WHERE event_name = 'clip_sent'
  ) as active_clippers,
  COUNT(DISTINCT user_id) as total_unique_users
FROM analytics_events
WHERE created_at >= DATE_TRUNC('month', NOW() - INTERVAL '12 months')
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mau_month ON monthly_active_users(month);

COMMENT ON MATERIALIZED VIEW monthly_active_users IS 'Monthly active users (last 12 months)';

-- ==================== PLATFORM DISTRIBUTION ====================

-- Real-time platform usage breakdown
CREATE MATERIALIZED VIEW IF NOT EXISTS platform_distribution AS
SELECT
  platform,
  COUNT(DISTINCT user_id) as users,
  COUNT(*) as total_events,
  COUNT(*) FILTER (WHERE event_name = 'clip_sent') as clips_sent,
  ROUND(AVG((properties->>'word_count')::numeric), 2) as avg_word_count,
  COUNT(*) FILTER (WHERE event_name = 'app_error') as error_count
FROM analytics_events
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY platform
ORDER BY users DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_dist_platform ON platform_distribution(platform);

COMMENT ON MATERIALIZED VIEW platform_distribution IS 'Platform usage distribution (last 7 days)';

-- ==================== TOP FEATURES ====================

-- Most used features (for roadmap prioritization)
CREATE MATERIALIZED VIEW IF NOT EXISTS top_features AS
SELECT
  (properties->>'feature_name')::text as feature_name,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(*) as usage_count,
  ROUND(AVG(EXTRACT(EPOCH FROM (LAG(created_at) OVER (PARTITION BY user_id ORDER BY created_at) - created_at))), 2) as avg_time_between_uses
FROM analytics_events
WHERE created_at >= NOW() - INTERVAL '30 days'
  AND properties ? 'feature_name'
GROUP BY (properties->>'feature_name')::text
ORDER BY unique_users DESC
LIMIT 50;

COMMENT ON MATERIALIZED VIEW top_features IS 'Most used features (last 30 days)';

-- ==================== USAGE HISTOGRAM ====================

-- Distribution of clips per user (for freemium limit optimization)
CREATE MATERIALIZED VIEW IF NOT EXISTS clips_per_user_distribution AS
WITH user_clip_counts AS (
  SELECT
    user_id,
    COUNT(*) FILTER (WHERE event_name = 'clip_sent') as clips_count,
    DATE_TRUNC('month', created_at)::date as month
  FROM analytics_events
  WHERE created_at >= DATE_TRUNC('month', NOW() - INTERVAL '3 months')
    AND user_id IS NOT NULL
  GROUP BY user_id, DATE_TRUNC('month', created_at)
)
SELECT
  month,
  -- Buckets for histogram
  COUNT(*) FILTER (WHERE clips_count = 0) as zero_clips,
  COUNT(*) FILTER (WHERE clips_count BETWEEN 1 AND 5) as clips_1_5,
  COUNT(*) FILTER (WHERE clips_count BETWEEN 6 AND 10) as clips_6_10,
  COUNT(*) FILTER (WHERE clips_count BETWEEN 11 AND 25) as clips_11_25,
  COUNT(*) FILTER (WHERE clips_count BETWEEN 26 AND 50) as clips_26_50,
  COUNT(*) FILTER (WHERE clips_count BETWEEN 51 AND 100) as clips_51_100,
  COUNT(*) FILTER (WHERE clips_count > 100) as clips_100_plus,

  -- Statistics
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY clips_count) as median_clips,
  PERCENTILE_CONT(0.9) WITHIN GROUP (ORDER BY clips_count) as p90_clips,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY clips_count) as p95_clips,
  AVG(clips_count) as avg_clips
FROM user_clip_counts
GROUP BY month
ORDER BY month DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clips_dist_month ON clips_per_user_distribution(month);

COMMENT ON MATERIALIZED VIEW clips_per_user_distribution IS 'Distribution of clips per user for freemium optimization';

-- ==================== CONVERSION FUNNEL ====================

-- User journey from install to first clip
CREATE MATERIALIZED VIEW IF NOT EXISTS onboarding_funnel AS
WITH funnel_events AS (
  SELECT
    user_id,
    MIN(created_at) FILTER (WHERE event_name = 'app_opened') as first_open,
    MIN(created_at) FILTER (WHERE event_name = 'notion_workspace_connected') as first_connection,
    MIN(created_at) FILTER (WHERE event_name = 'notion_page_selected') as first_page_selection,
    MIN(created_at) FILTER (WHERE event_name = 'clip_sent') as first_clip
  FROM analytics_events
  WHERE created_at >= DATE_TRUNC('month', NOW() - INTERVAL '3 months')
    AND user_id IS NOT NULL
  GROUP BY user_id
)
SELECT
  DATE_TRUNC('week', first_open)::date as week,
  COUNT(*) as installed,
  COUNT(*) FILTER (WHERE first_connection IS NOT NULL) as connected,
  COUNT(*) FILTER (WHERE first_page_selection IS NOT NULL) as selected_page,
  COUNT(*) FILTER (WHERE first_clip IS NOT NULL) as sent_first_clip,

  -- Conversion rates
  ROUND(100.0 * COUNT(*) FILTER (WHERE first_connection IS NOT NULL) / NULLIF(COUNT(*), 0), 2) as connection_rate,
  ROUND(100.0 * COUNT(*) FILTER (WHERE first_clip IS NOT NULL) / NULLIF(COUNT(*), 0), 2) as activation_rate,

  -- Time to value
  ROUND(AVG(EXTRACT(EPOCH FROM (first_clip - first_open)) / 60), 2) as avg_minutes_to_first_clip
FROM funnel_events
WHERE first_open IS NOT NULL
GROUP BY DATE_TRUNC('week', first_open)
ORDER BY week DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_funnel_week ON onboarding_funnel(week);

COMMENT ON MATERIALIZED VIEW onboarding_funnel IS 'Onboarding conversion funnel (install to first clip)';

-- ==================== GEOGRAPHIC DISTRIBUTION ====================

-- Users by country (for market analysis)
CREATE MATERIALIZED VIEW IF NOT EXISTS geographic_distribution AS
SELECT
  country_code,
  COUNT(DISTINCT user_id) as users,
  COUNT(*) FILTER (WHERE event_name = 'clip_sent') as clips_sent,
  COUNT(DISTINCT DATE_TRUNC('day', created_at)) as active_days
FROM analytics_events
WHERE created_at >= NOW() - INTERVAL '30 days'
  AND country_code IS NOT NULL
GROUP BY country_code
ORDER BY users DESC;

CREATE UNIQUE INDEX IF NOT EXISTS idx_geo_country ON geographic_distribution(country_code);

COMMENT ON MATERIALIZED VIEW geographic_distribution IS 'User distribution by country (last 30 days)';

-- ==================== REFRESH FUNCTIONS ====================

-- Refresh all materialized views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY analytics_overview;
  REFRESH MATERIALIZED VIEW CONCURRENTLY monthly_active_users;
  REFRESH MATERIALIZED VIEW CONCURRENTLY platform_distribution;
  REFRESH MATERIALIZED VIEW CONCURRENTLY top_features;
  REFRESH MATERIALIZED VIEW CONCURRENTLY clips_per_user_distribution;
  REFRESH MATERIALIZED VIEW CONCURRENTLY onboarding_funnel;
  REFRESH MATERIALIZED VIEW CONCURRENTLY geographic_distribution;

  RAISE NOTICE 'All analytics views refreshed successfully';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION refresh_analytics_views IS 'Refreshes all materialized views for dashboard';

-- ==================== AGGREGATION FUNCTIONS ====================

-- Daily aggregation: User metrics
CREATE OR REPLACE FUNCTION aggregate_user_metrics_daily(target_date DATE DEFAULT CURRENT_DATE - 1)
RETURNS void AS $$
BEGIN
  INSERT INTO user_metrics_daily (
    user_id,
    date,
    sessions_count,
    total_events,
    clips_sent,
    files_attached,
    images_attached,
    text_clips,
    code_clips,
    html_clips,
    url_clips,
    pages_used,
    platforms_used,
    engagement_score
  )
  SELECT
    user_id,
    target_date,
    COUNT(DISTINCT session_id) as sessions_count,
    COUNT(*) as total_events,
    COUNT(*) FILTER (WHERE event_name = 'clip_sent') as clips_sent,
    COALESCE(SUM((properties->>'file_count')::int), 0) as files_attached,
    COALESCE(SUM((properties->>'image_count')::int), 0) as images_attached,
    COUNT(*) FILTER (WHERE properties->>'content_type' = 'text') as text_clips,
    COUNT(*) FILTER (WHERE properties->>'content_type' = 'code') as code_clips,
    COUNT(*) FILTER (WHERE properties->>'content_type' = 'html') as html_clips,
    COUNT(*) FILTER (WHERE properties->>'content_type' = 'url') as url_clips,
    COUNT(DISTINCT properties->>'page_id') as pages_used,
    ARRAY_AGG(DISTINCT platform) as platforms_used,
    calculate_engagement_score(
      COUNT(*) FILTER (WHERE event_name = 'clip_sent')::int,
      COUNT(DISTINCT session_id)::int,
      COALESCE(SUM((properties->>'active_duration_seconds')::int), 0)::int
    ) as engagement_score
  FROM analytics_events
  WHERE DATE_TRUNC('day', created_at) = target_date
    AND user_id IS NOT NULL
  GROUP BY user_id
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    sessions_count = EXCLUDED.sessions_count,
    total_events = EXCLUDED.total_events,
    clips_sent = EXCLUDED.clips_sent,
    files_attached = EXCLUDED.files_attached,
    images_attached = EXCLUDED.images_attached,
    text_clips = EXCLUDED.text_clips,
    code_clips = EXCLUDED.code_clips,
    html_clips = EXCLUDED.html_clips,
    url_clips = EXCLUDED.url_clips,
    pages_used = EXCLUDED.pages_used,
    platforms_used = EXCLUDED.platforms_used,
    engagement_score = EXCLUDED.engagement_score,
    updated_at = NOW();

  RAISE NOTICE 'User metrics aggregated for %', target_date;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION aggregate_user_metrics_daily IS 'Aggregates user metrics for a specific day';

-- Daily aggregation: Platform metrics
CREATE OR REPLACE FUNCTION aggregate_platform_metrics_daily(target_date DATE DEFAULT CURRENT_DATE - 1)
RETURNS void AS $$
BEGIN
  INSERT INTO platform_metrics_daily (
    platform,
    date,
    active_users,
    new_users,
    total_sessions,
    total_clips,
    total_events,
    avg_clips_per_user,
    avg_session_duration
  )
  SELECT
    platform,
    target_date,
    COUNT(DISTINCT user_id) as active_users,
    COUNT(DISTINCT user_id) FILTER (
      WHERE user_id IN (
        SELECT user_id FROM analytics_events
        WHERE DATE_TRUNC('day', created_at) = target_date
        GROUP BY user_id
        HAVING MIN(created_at) >= target_date
      )
    ) as new_users,
    COUNT(DISTINCT session_id) as total_sessions,
    COUNT(*) FILTER (WHERE event_name = 'clip_sent') as total_clips,
    COUNT(*) as total_events,
    AVG(clips_per_user) as avg_clips_per_user,
    AVG(avg_duration) as avg_session_duration
  FROM (
    SELECT
      platform,
      user_id,
      session_id,
      event_name,
      COUNT(*) FILTER (WHERE event_name = 'clip_sent') OVER (PARTITION BY user_id) as clips_per_user,
      AVG((properties->>'active_duration_seconds')::numeric) OVER (PARTITION BY session_id) as avg_duration
    FROM analytics_events
    WHERE DATE_TRUNC('day', created_at) = target_date
  ) subquery
  GROUP BY platform
  ON CONFLICT (platform, date)
  DO UPDATE SET
    active_users = EXCLUDED.active_users,
    new_users = EXCLUDED.new_users,
    total_sessions = EXCLUDED.total_sessions,
    total_clips = EXCLUDED.total_clips,
    total_events = EXCLUDED.total_events,
    avg_clips_per_user = EXCLUDED.avg_clips_per_user,
    avg_session_duration = EXCLUDED.avg_session_duration,
    created_at = NOW();

  RAISE NOTICE 'Platform metrics aggregated for %', target_date;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION aggregate_platform_metrics_daily IS 'Aggregates platform metrics for a specific day';

-- ==================== HELPER VIEWS ====================

-- Quick stats for dashboard home
CREATE OR REPLACE VIEW dashboard_quick_stats AS
SELECT
  (SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE created_at >= NOW() - INTERVAL '1 day') as dau,
  (SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE created_at >= NOW() - INTERVAL '7 days') as wau,
  (SELECT COUNT(DISTINCT user_id) FROM analytics_events WHERE created_at >= NOW() - INTERVAL '30 days') as mau,
  (SELECT COUNT(*) FROM analytics_events WHERE event_name = 'clip_sent' AND created_at >= NOW() - INTERVAL '1 day') as clips_today,
  (SELECT COUNT(*) FROM analytics_events WHERE event_name = 'clip_sent' AND created_at >= NOW() - INTERVAL '30 days') as clips_this_month,
  (SELECT COUNT(*) FROM user_subscription_status WHERE plan_type = 'premium') as premium_users,
  (SELECT COUNT(*) FROM user_subscription_status WHERE plan_type = 'free') as free_users,
  (SELECT COUNT(DISTINCT country_code) FROM analytics_events WHERE created_at >= NOW() - INTERVAL '30 days') as countries_active;

COMMENT ON VIEW dashboard_quick_stats IS 'Quick stats for dashboard home page';

-- ==================== SUCCESS MESSAGE ====================

DO $$
BEGIN
  RAISE NOTICE '✅ Analytics views created successfully!';
  RAISE NOTICE '📊 Materialized views: 7 created';
  RAISE NOTICE '⚡ Performance: Optimized with unique indexes';
  RAISE NOTICE '🔄 Refresh function: refresh_analytics_views()';
END $$;
