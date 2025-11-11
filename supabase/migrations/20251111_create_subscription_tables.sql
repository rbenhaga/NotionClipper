-- NotionClipper Freemium/Premium System
-- Migration: Create subscription tables and functions
-- Created: 2025-11-11
-- Design Philosophy: Apple/Notion - Simple, robust, scalable

-- ==============================================================================
-- TABLES
-- ==============================================================================

-- Subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Subscription details
  tier TEXT NOT NULL CHECK (tier IN ('free', 'premium', 'grace_period')),
  status TEXT NOT NULL CHECK (status IN ('active', 'trialing', 'past_due', 'canceled', 'unpaid', 'grace_period', 'incomplete', 'incomplete_expired')),

  -- Stripe integration
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,

  -- Dates
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL,
  cancel_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,

  -- Grace period
  grace_period_ends_at TIMESTAMPTZ,
  is_grace_period BOOLEAN NOT NULL DEFAULT FALSE,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Indexes
  UNIQUE(user_id)
);

CREATE INDEX idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_customer_id ON subscriptions(stripe_customer_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_tier ON subscriptions(tier);
CREATE INDEX idx_subscriptions_grace_period ON subscriptions(is_grace_period, grace_period_ends_at) WHERE is_grace_period = TRUE;

-- Usage records table (monthly tracking)
CREATE TABLE IF NOT EXISTS usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,

  -- Period (calendar month)
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),

  -- Usage counters
  clips_count INTEGER NOT NULL DEFAULT 0,
  files_count INTEGER NOT NULL DEFAULT 0,
  focus_mode_minutes INTEGER NOT NULL DEFAULT 0,
  compact_mode_minutes INTEGER NOT NULL DEFAULT 0,

  -- Last usage timestamps
  last_clip_at TIMESTAMPTZ,
  last_file_upload_at TIMESTAMPTZ,
  last_focus_mode_at TIMESTAMPTZ,
  last_compact_mode_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Un seul record par user/mois
  UNIQUE(user_id, year, month)
);

CREATE INDEX idx_usage_records_user_id ON usage_records(user_id);
CREATE INDEX idx_usage_records_subscription_id ON usage_records(subscription_id);
CREATE INDEX idx_usage_records_period ON usage_records(year, month);

-- Usage events table (detailed tracking)
CREATE TABLE IF NOT EXISTS usage_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  usage_record_id UUID NOT NULL REFERENCES usage_records(id) ON DELETE CASCADE,

  -- Event details
  event_type TEXT NOT NULL CHECK (event_type IN (
    'clip_sent',
    'file_uploaded',
    'focus_mode_started',
    'focus_mode_ended',
    'compact_mode_started',
    'compact_mode_ended',
    'quota_limit_reached',
    'upgrade_prompt_shown',
    'upgrade_clicked'
  )),
  feature TEXT NOT NULL CHECK (feature IN (
    'clips',
    'files',
    'words_per_clip',
    'focus_mode_time',
    'compact_mode_time',
    'multiple_selections'
  )),

  -- Metadata (flexible)
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Timestamp
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_usage_events_user_id ON usage_events(user_id);
CREATE INDEX idx_usage_events_subscription_id ON usage_events(subscription_id);
CREATE INDEX idx_usage_events_usage_record_id ON usage_events(usage_record_id);
CREATE INDEX idx_usage_events_event_type ON usage_events(event_type);
CREATE INDEX idx_usage_events_created_at ON usage_events(created_at DESC);

-- Mode sessions table (tracking Focus/Compact mode sessions)
CREATE TABLE IF NOT EXISTS mode_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  usage_record_id UUID NOT NULL REFERENCES usage_records(id) ON DELETE CASCADE,

  -- Session details
  mode_type TEXT NOT NULL CHECK (mode_type IN ('focus', 'compact')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  duration_minutes INTEGER DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  was_interrupted BOOLEAN NOT NULL DEFAULT FALSE,

  -- Metadata
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX idx_mode_sessions_user_id ON mode_sessions(user_id);
CREATE INDEX idx_mode_sessions_is_active ON mode_sessions(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_mode_sessions_mode_type ON mode_sessions(mode_type);

-- ==============================================================================
-- FUNCTIONS
-- ==============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_usage_records_updated_at
  BEFORE UPDATE ON usage_records
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to get or create current month usage record
CREATE OR REPLACE FUNCTION get_or_create_current_usage_record(
  p_user_id UUID,
  p_subscription_id UUID
)
RETURNS usage_records AS $$
DECLARE
  v_record usage_records;
  v_year INTEGER;
  v_month INTEGER;
  v_period_start TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
BEGIN
  -- Get current year and month
  v_year := EXTRACT(YEAR FROM NOW());
  v_month := EXTRACT(MONTH FROM NOW());

  -- Calculate period boundaries
  v_period_start := DATE_TRUNC('month', NOW());
  v_period_end := DATE_TRUNC('month', NOW() + INTERVAL '1 month');

  -- Try to get existing record
  SELECT * INTO v_record
  FROM usage_records
  WHERE user_id = p_user_id
    AND year = v_year
    AND month = v_month;

  -- Create if doesn't exist
  IF NOT FOUND THEN
    INSERT INTO usage_records (
      user_id,
      subscription_id,
      period_start,
      period_end,
      year,
      month
    ) VALUES (
      p_user_id,
      p_subscription_id,
      v_period_start,
      v_period_end,
      v_year,
      v_month
    )
    RETURNING * INTO v_record;
  END IF;

  RETURN v_record;
END;
$$ LANGUAGE plpgsql;

-- Function to increment usage counter
CREATE OR REPLACE FUNCTION increment_usage_counter(
  p_user_id UUID,
  p_feature TEXT,
  p_increment INTEGER DEFAULT 1
)
RETURNS usage_records AS $$
DECLARE
  v_record usage_records;
  v_subscription_id UUID;
  v_field TEXT;
BEGIN
  -- Get subscription ID
  SELECT id INTO v_subscription_id
  FROM subscriptions
  WHERE user_id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No subscription found for user %', p_user_id;
  END IF;

  -- Get or create current month record
  v_record := get_or_create_current_usage_record(p_user_id, v_subscription_id);

  -- Determine which field to update
  CASE p_feature
    WHEN 'clips' THEN v_field := 'clips_count';
    WHEN 'files' THEN v_field := 'files_count';
    WHEN 'focus_mode_time' THEN v_field := 'focus_mode_minutes';
    WHEN 'compact_mode_time' THEN v_field := 'compact_mode_minutes';
    ELSE RAISE EXCEPTION 'Invalid feature: %', p_feature;
  END CASE;

  -- Update the record
  EXECUTE format(
    'UPDATE usage_records SET %I = %I + $1, updated_at = NOW() WHERE id = $2 RETURNING *',
    v_field, v_field
  ) USING p_increment, v_record.id INTO v_record;

  -- Update last usage timestamp
  CASE p_feature
    WHEN 'clips' THEN
      UPDATE usage_records SET last_clip_at = NOW() WHERE id = v_record.id;
    WHEN 'files' THEN
      UPDATE usage_records SET last_file_upload_at = NOW() WHERE id = v_record.id;
    WHEN 'focus_mode_time' THEN
      UPDATE usage_records SET last_focus_mode_at = NOW() WHERE id = v_record.id;
    WHEN 'compact_mode_time' THEN
      UPDATE usage_records SET last_compact_mode_at = NOW() WHERE id = v_record.id;
  END CASE;

  -- Return updated record
  SELECT * INTO v_record FROM usage_records WHERE id = v_record.id;

  RETURN v_record;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE mode_sessions ENABLE ROW LEVEL SECURITY;

-- Subscriptions policies
-- ⚡ OPTIMIZED: Using (SELECT auth.uid()) instead of auth.uid() for better performance
-- This prevents re-evaluation of auth.uid() for each row
CREATE POLICY "Users can view their own subscription"
  ON subscriptions FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own subscription"
  ON subscriptions FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own subscription"
  ON subscriptions FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Usage records policies
CREATE POLICY "Users can view their own usage records"
  ON usage_records FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own usage records"
  ON usage_records FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own usage records"
  ON usage_records FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

-- Usage events policies
CREATE POLICY "Users can view their own usage events"
  ON usage_events FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own usage events"
  ON usage_events FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- Mode sessions policies
CREATE POLICY "Users can view their own mode sessions"
  ON mode_sessions FOR SELECT
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own mode sessions"
  ON mode_sessions FOR INSERT
  WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own mode sessions"
  ON mode_sessions FOR UPDATE
  USING ((SELECT auth.uid()) = user_id);

-- ==============================================================================
-- INITIAL DATA (Optional)
-- ==============================================================================

-- You can add initial data here if needed
-- For example, create a default subscription for existing users

COMMENT ON TABLE subscriptions IS 'Stores user subscription information (free/premium/grace)';
COMMENT ON TABLE usage_records IS 'Tracks monthly usage of features (clips, files, modes)';
COMMENT ON TABLE usage_events IS 'Detailed log of all usage events for analytics';
COMMENT ON TABLE mode_sessions IS 'Tracks Focus/Compact mode sessions with duration';
