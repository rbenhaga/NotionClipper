-- Migration: Create subscriptions and usage_records tables
-- Date: 2025-11-12
-- Description: Tables for premium/freemium system with quotas

-- ============================================
-- TABLE: subscriptions
-- ============================================
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Subscription tier
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'premium', 'grace_period')),
  status TEXT NOT NULL DEFAULT 'active',

  -- Stripe IDs
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,

  -- Billing period
  current_period_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  current_period_end TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '1 month',

  -- Trial
  trial_end TIMESTAMPTZ,

  -- Grace period (for past_due, trial ending soon, etc.)
  is_grace_period BOOLEAN NOT NULL DEFAULT FALSE,
  grace_period_ends_at TIMESTAMPTZ,

  -- Cancellation
  cancel_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index pour recherche rapide par user_id
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_id_idx
  ON public.subscriptions(user_id);

-- Index pour recherche par Stripe IDs
CREATE INDEX IF NOT EXISTS subscriptions_stripe_customer_id_idx
  ON public.subscriptions(stripe_customer_id);

CREATE INDEX IF NOT EXISTS subscriptions_stripe_subscription_id_idx
  ON public.subscriptions(stripe_subscription_id);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION public.update_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_subscriptions_updated_at();

-- ============================================
-- TABLE: usage_records
-- ============================================
CREATE TABLE IF NOT EXISTS public.usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Period tracking
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),

  -- Usage counters
  clips_count INTEGER NOT NULL DEFAULT 0,
  files_count INTEGER NOT NULL DEFAULT 0,
  total_words INTEGER NOT NULL DEFAULT 0,
  focus_mode_minutes INTEGER NOT NULL DEFAULT 0,
  compact_mode_minutes INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Unique constraint: un seul record par user/period
  CONSTRAINT usage_records_user_period_unique UNIQUE (user_id, year, month)
);

-- Index pour recherche rapide
CREATE INDEX IF NOT EXISTS usage_records_user_id_idx
  ON public.usage_records(user_id);

CREATE INDEX IF NOT EXISTS usage_records_period_idx
  ON public.usage_records(user_id, year, month);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION public.update_usage_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER usage_records_updated_at
  BEFORE UPDATE ON public.usage_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_usage_records_updated_at();

-- ============================================
-- RLS (Row Level Security)
-- ============================================

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_records ENABLE ROW LEVEL SECURITY;

-- Policies pour subscriptions
CREATE POLICY "Users can view their own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert subscriptions"
  ON public.subscriptions FOR INSERT
  WITH CHECK (true); -- Only service role can insert

CREATE POLICY "Service role can update subscriptions"
  ON public.subscriptions FOR UPDATE
  USING (true); -- Only service role can update

-- Policies pour usage_records
CREATE POLICY "Users can view their own usage"
  ON public.usage_records FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage usage records"
  ON public.usage_records FOR ALL
  USING (true); -- Only service role can manage

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

/**
 * Increment usage for a specific action
 * Called from Edge Functions or backend
 */
CREATE OR REPLACE FUNCTION public.increment_usage(
  p_user_id UUID,
  p_action TEXT,
  p_amount INTEGER DEFAULT 1
)
RETURNS VOID AS $$
DECLARE
  v_year INTEGER;
  v_month INTEGER;
  v_period_start TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
BEGIN
  -- Get current period
  v_year := EXTRACT(YEAR FROM NOW());
  v_month := EXTRACT(MONTH FROM NOW());
  v_period_start := DATE_TRUNC('month', NOW());
  v_period_end := v_period_start + INTERVAL '1 month';

  -- Insert or update usage record
  INSERT INTO public.usage_records (
    user_id,
    year,
    month,
    period_start,
    period_end,
    clips_count,
    files_count,
    total_words,
    focus_mode_minutes,
    compact_mode_minutes
  )
  VALUES (
    p_user_id,
    v_year,
    v_month,
    v_period_start,
    v_period_end,
    CASE WHEN p_action = 'clip' THEN p_amount ELSE 0 END,
    CASE WHEN p_action = 'file' THEN p_amount ELSE 0 END,
    CASE WHEN p_action = 'words' THEN p_amount ELSE 0 END,
    CASE WHEN p_action = 'focus_mode' THEN p_amount ELSE 0 END,
    CASE WHEN p_action = 'compact_mode' THEN p_amount ELSE 0 END
  )
  ON CONFLICT (user_id, year, month)
  DO UPDATE SET
    clips_count = usage_records.clips_count +
      (CASE WHEN p_action = 'clip' THEN p_amount ELSE 0 END),
    files_count = usage_records.files_count +
      (CASE WHEN p_action = 'file' THEN p_amount ELSE 0 END),
    total_words = usage_records.total_words +
      (CASE WHEN p_action = 'words' THEN p_amount ELSE 0 END),
    focus_mode_minutes = usage_records.focus_mode_minutes +
      (CASE WHEN p_action = 'focus_mode' THEN p_amount ELSE 0 END),
    compact_mode_minutes = usage_records.compact_mode_minutes +
      (CASE WHEN p_action = 'compact_mode' THEN p_amount ELSE 0 END),
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

/**
 * Check if user can perform an action based on quota
 * Returns: true if allowed, false if quota exceeded
 */
CREATE OR REPLACE FUNCTION public.check_quota(
  p_user_id UUID,
  p_action TEXT,
  p_amount INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  v_tier TEXT;
  v_current_usage INTEGER;
  v_limit INTEGER;
BEGIN
  -- Get user tier
  SELECT tier INTO v_tier
  FROM public.subscriptions
  WHERE user_id = p_user_id;

  -- If no subscription, assume free
  IF v_tier IS NULL THEN
    v_tier := 'free';
  END IF;

  -- Premium and grace_period have unlimited quotas
  IF v_tier IN ('premium', 'grace_period') THEN
    RETURN TRUE;
  END IF;

  -- Get current usage
  SELECT
    CASE p_action
      WHEN 'clip' THEN clips_count
      WHEN 'file' THEN files_count
      WHEN 'focus_mode' THEN focus_mode_minutes
      WHEN 'compact_mode' THEN compact_mode_minutes
      ELSE 0
    END
  INTO v_current_usage
  FROM public.usage_records
  WHERE user_id = p_user_id
    AND year = EXTRACT(YEAR FROM NOW())
    AND month = EXTRACT(MONTH FROM NOW());

  -- If no usage record, start at 0
  IF v_current_usage IS NULL THEN
    v_current_usage := 0;
  END IF;

  -- Get limit for free tier
  v_limit := CASE p_action
    WHEN 'clip' THEN 100
    WHEN 'file' THEN 10
    WHEN 'focus_mode' THEN 60
    WHEN 'compact_mode' THEN 60
    ELSE 0
  END;

  -- Check if quota exceeded
  RETURN (v_current_usage + p_amount) <= v_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.subscriptions IS 'User subscription status and billing information';
COMMENT ON TABLE public.usage_records IS 'Monthly usage tracking for quota enforcement';
COMMENT ON FUNCTION public.increment_usage IS 'Increment usage counter for a specific action';
COMMENT ON FUNCTION public.check_quota IS 'Check if user has remaining quota for an action';
