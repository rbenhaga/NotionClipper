-- =====================================================
-- NotionClipper Analytics Schema
-- Migration: Initial analytics infrastructure
-- Author: Claude (Apple × Notion design standards)
-- RGPD Compliant | Performance Optimized
-- =====================================================

-- ==================== EXTENSIONS ====================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pgcrypto for hashing (IP anonymization)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==================== ANALYTICS EVENTS ====================

-- Raw event stream (time-series data)
-- Retention: 90 days (RGPD compliant)
CREATE TABLE IF NOT EXISTS analytics_events (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- User Context
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id UUID NOT NULL,
  anonymous_id VARCHAR(64), -- For non-authenticated users

  -- Event Data
  event_name VARCHAR(100) NOT NULL,
  event_category VARCHAR(50) NOT NULL, -- 'app', 'clip', 'notion', 'workspace', 'subscription'

  -- Platform Context
  platform VARCHAR(20) NOT NULL, -- 'electron-windows', 'electron-macos', 'electron-linux', 'chrome', 'firefox'
  app_version VARCHAR(20) NOT NULL,
  os_version VARCHAR(50),

  -- Geographic (anonymized)
  country_code CHAR(2), -- ISO 3166-1 alpha-2
  timezone VARCHAR(50),

  -- Event Properties (JSONB for flexibility)
  properties JSONB DEFAULT '{}'::jsonb,

  -- Metadata (privacy-safe hashed data)
  ip_hash VARCHAR(64), -- SHA-256 hashed IP (not reversible)
  user_agent_hash VARCHAR(64) -- Hashed for privacy
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_events_user_created ON analytics_events(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_name_created ON analytics_events(event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_platform ON analytics_events(platform, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_category ON analytics_events(event_category, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_created ON analytics_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_session ON analytics_events(session_id);

-- GIN index for JSONB property queries
CREATE INDEX IF NOT EXISTS idx_events_properties ON analytics_events USING GIN(properties);

-- Comment
COMMENT ON TABLE analytics_events IS 'Raw analytics events with 90-day retention policy';

-- ==================== USER METRICS DAILY ====================

-- Pre-aggregated daily metrics per user (dashboard performance)
CREATE TABLE IF NOT EXISTS user_metrics_daily (
  -- Composite Primary Key
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,

  -- Activity Metrics
  sessions_count INT DEFAULT 0,
  total_events INT DEFAULT 0,
  active_duration_seconds INT DEFAULT 0,

  -- Clip Metrics (KEY FOR FREEMIUM LIMITS)
  clips_sent INT DEFAULT 0,
  files_attached INT DEFAULT 0,
  images_attached INT DEFAULT 0,

  -- Content Type Distribution
  text_clips INT DEFAULT 0,
  code_clips INT DEFAULT 0,
  html_clips INT DEFAULT 0,
  url_clips INT DEFAULT 0,

  -- Notion Activity
  pages_used INT DEFAULT 0, -- Distinct pages
  workspaces_used INT DEFAULT 0, -- Distinct workspaces

  -- Platform Used
  platforms_used VARCHAR(50)[], -- Array of platforms used today

  -- Engagement Score (0-100 composite)
  engagement_score DECIMAL(5,2) DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (user_id, date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_metrics_date ON user_metrics_daily(date DESC);
CREATE INDEX IF NOT EXISTS idx_user_metrics_clips ON user_metrics_daily(clips_sent DESC);
CREATE INDEX IF NOT EXISTS idx_user_metrics_engagement ON user_metrics_daily(engagement_score DESC);

COMMENT ON TABLE user_metrics_daily IS 'Daily aggregated metrics per user for fast dashboard queries';

-- ==================== PLATFORM METRICS DAILY ====================

-- Aggregate metrics by platform
CREATE TABLE IF NOT EXISTS platform_metrics_daily (
  -- Composite Primary Key
  platform VARCHAR(20) NOT NULL,
  date DATE NOT NULL,

  -- User Metrics
  active_users INT DEFAULT 0,
  new_users INT DEFAULT 0,

  -- Activity Metrics
  total_sessions INT DEFAULT 0,
  total_clips INT DEFAULT 0,
  total_events INT DEFAULT 0,

  -- Averages per User
  avg_clips_per_user DECIMAL(10,2) DEFAULT 0,
  avg_session_duration DECIMAL(10,2) DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (platform, date)
);

CREATE INDEX IF NOT EXISTS idx_platform_metrics_date ON platform_metrics_daily(date DESC);

COMMENT ON TABLE platform_metrics_daily IS 'Platform distribution analytics';

-- ==================== RETENTION COHORTS ====================

-- Cohort analysis for retention tracking
CREATE TABLE IF NOT EXISTS retention_cohorts (
  -- Cohort Definition
  cohort_month DATE NOT NULL, -- First day of signup month
  platform VARCHAR(20) NOT NULL,

  -- Cohort Size
  users_count INT NOT NULL,

  -- Retention Rates (%)
  day_1_retention DECIMAL(5,2),
  day_7_retention DECIMAL(5,2),
  day_30_retention DECIMAL(5,2),
  day_90_retention DECIMAL(5,2),

  -- Activity Retention (sent at least 1 clip)
  day_1_active_retention DECIMAL(5,2),
  day_7_active_retention DECIMAL(5,2),
  day_30_active_retention DECIMAL(5,2),

  -- Conversion Metrics (for premium)
  conversion_rate DECIMAL(5,2),
  avg_days_to_conversion DECIMAL(10,2),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  PRIMARY KEY (cohort_month, platform)
);

CREATE INDEX IF NOT EXISTS idx_retention_cohort_month ON retention_cohorts(cohort_month DESC);

COMMENT ON TABLE retention_cohorts IS 'User retention analysis by signup cohort';

-- ==================== FEATURE USAGE ====================

-- Track feature adoption and usage
CREATE TABLE IF NOT EXISTS feature_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,
  feature_name VARCHAR(100) NOT NULL,

  -- Usage Metrics
  total_users INT DEFAULT 0,
  total_usage_count INT DEFAULT 0,

  -- User Segments
  free_users INT DEFAULT 0,
  premium_users INT DEFAULT 0,

  -- Platform Distribution
  platform_distribution JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(date, feature_name)
);

CREATE INDEX IF NOT EXISTS idx_feature_usage_date ON feature_usage(date DESC);
CREATE INDEX IF NOT EXISTS idx_feature_usage_feature ON feature_usage(feature_name);

COMMENT ON TABLE feature_usage IS 'Feature adoption and usage tracking';

-- ==================== USER SUBSCRIPTION STATUS ====================

-- Subscription tracking (ready for Stripe integration)
CREATE TABLE IF NOT EXISTS user_subscription_status (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Subscription State
  plan_type VARCHAR(20) NOT NULL DEFAULT 'free', -- 'free', 'premium'
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'cancelled', 'past_due', 'trialing'

  -- Stripe Integration (future)
  stripe_customer_id VARCHAR(100) UNIQUE,
  stripe_subscription_id VARCHAR(100) UNIQUE,

  -- Billing
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,

  -- Trial
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,

  -- Usage Limits (freemium enforcement)
  monthly_clips_limit INT DEFAULT 50, -- Free tier limit
  monthly_clips_used INT DEFAULT 0,
  limit_reset_at TIMESTAMPTZ,

  -- Metadata
  upgraded_at TIMESTAMPTZ,
  downgraded_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscription_plan ON user_subscription_status(plan_type);
CREATE INDEX IF NOT EXISTS idx_subscription_status ON user_subscription_status(status);
CREATE INDEX IF NOT EXISTS idx_subscription_stripe_customer ON user_subscription_status(stripe_customer_id);

COMMENT ON TABLE user_subscription_status IS 'User subscription and freemium limits tracking';

-- ==================== ANALYTICS SETTINGS ====================

-- User privacy preferences (RGPD compliance)
CREATE TABLE IF NOT EXISTS analytics_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Consent
  analytics_enabled BOOLEAN DEFAULT TRUE,
  consent_given_at TIMESTAMPTZ,
  consent_version VARCHAR(10) DEFAULT '1.0',

  -- Privacy Options
  share_platform_info BOOLEAN DEFAULT TRUE,
  share_location_info BOOLEAN DEFAULT TRUE, -- Country only, no IP

  -- Data Retention
  data_retention_days INT DEFAULT 90,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE analytics_settings IS 'User analytics preferences and RGPD consent';

-- ==================== HELPER FUNCTIONS ====================

-- Function to anonymize IP address (SHA-256 hash)
CREATE OR REPLACE FUNCTION anonymize_ip(ip_address TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN encode(digest(ip_address, 'sha256'), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION anonymize_ip IS 'Anonymizes IP addresses using SHA-256 hashing (RGPD compliant)';

-- Function to calculate engagement score
CREATE OR REPLACE FUNCTION calculate_engagement_score(
  clips_sent INT,
  sessions_count INT,
  active_duration_seconds INT
)
RETURNS DECIMAL(5,2) AS $$
DECLARE
  score DECIMAL(5,2);
BEGIN
  -- Engagement formula (weighted):
  -- 50% clips activity (max 50 points)
  -- 30% session frequency (max 30 points)
  -- 20% active time (max 20 points)

  score :=
    LEAST(clips_sent * 2.5, 50) +  -- 20 clips = 50 points
    LEAST(sessions_count * 3, 30) + -- 10 sessions = 30 points
    LEAST(active_duration_seconds / 180.0, 20); -- 3600s = 20 points

  RETURN LEAST(score, 100);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION calculate_engagement_score IS 'Calculates user engagement score (0-100)';

-- ==================== ROW LEVEL SECURITY (RLS) ====================

-- Enable RLS on all tables
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE retention_cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscription_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_settings ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only see their own data
CREATE POLICY "Users can view own analytics events"
  ON analytics_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own daily metrics"
  ON user_metrics_daily FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own subscription"
  ON user_subscription_status FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view own settings"
  ON analytics_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own settings"
  ON analytics_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role can access all data (for analytics service and dashboard)
-- Note: This is configured via Supabase service_role key, not RLS

-- ==================== AUTOMATED CLEANUP ====================

-- Function to delete old events (90-day retention)
CREATE OR REPLACE FUNCTION cleanup_old_analytics_events()
RETURNS void AS $$
BEGIN
  DELETE FROM analytics_events
  WHERE created_at < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_analytics_events IS 'Deletes analytics events older than 90 days (RGPD compliance)';

-- ==================== INITIAL DATA ====================

-- Create default analytics settings for existing users
INSERT INTO analytics_settings (user_id, analytics_enabled, consent_given_at)
SELECT
  id,
  TRUE,
  NOW()
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- Create default subscription status for existing users
INSERT INTO user_subscription_status (user_id, plan_type, status)
SELECT
  id,
  'free',
  'active'
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- ==================== SUCCESS MESSAGE ====================

DO $$
BEGIN
  RAISE NOTICE '✅ NotionClipper Analytics Schema created successfully!';
  RAISE NOTICE '📊 Tables: 7 created';
  RAISE NOTICE '🔒 RLS policies: Enabled';
  RAISE NOTICE '🎯 RGPD compliant: Yes';
  RAISE NOTICE '⚡ Performance: Optimized with indexes';
END $$;
