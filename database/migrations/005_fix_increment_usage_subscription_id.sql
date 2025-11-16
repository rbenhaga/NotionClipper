-- Migration 005 FIX: Add subscription_id to increment_usage function
-- ============================================
-- Description:
--   Fixes increment_usage() to include subscription_id when inserting usage_records
--   Resolves: "null value in column subscription_id violates not-null constraint"
--
-- Problem:
--   - usage_records table has subscription_id NOT NULL constraint
--   - increment_usage was inserting without subscription_id
--
-- Solution:
--   - Fetch subscription_id from subscriptions table before INSERT
--   - Include subscription_id in INSERT statement
--
-- ============================================

-- Drop and recreate increment_usage with subscription_id support
DROP FUNCTION IF EXISTS public.increment_usage(UUID, TEXT, INTEGER);

CREATE OR REPLACE FUNCTION public.increment_usage(
  p_user_id UUID,
  p_action TEXT,
  p_amount INTEGER DEFAULT 1
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year INTEGER;
  v_month INTEGER;
  v_subscription_id UUID;
BEGIN
  -- Get current year and month
  v_year := EXTRACT(YEAR FROM NOW());
  v_month := EXTRACT(MONTH FROM NOW());

  -- Get subscription_id for the user
  SELECT id INTO v_subscription_id
  FROM public.subscriptions
  WHERE user_id = p_user_id
  LIMIT 1;

  -- If no subscription found, raise warning and exit
  IF v_subscription_id IS NULL THEN
    RAISE WARNING 'No subscription found for user %. Cannot track usage.', p_user_id;
    RETURN;
  END IF;

  -- Map action to column and increment
  CASE p_action
    WHEN 'clip' THEN
      -- Increment clips_count
      INSERT INTO public.usage_records (
        user_id, subscription_id, year, month, clips_count, files_count, focus_mode_minutes, compact_mode_minutes
      ) VALUES (
        p_user_id, v_subscription_id, v_year, v_month, p_amount, 0, 0, 0
      )
      ON CONFLICT (user_id, year, month)
      DO UPDATE SET
        clips_count = usage_records.clips_count + p_amount,
        updated_at = NOW();

    WHEN 'file' THEN
      -- Increment files_count
      INSERT INTO public.usage_records (
        user_id, subscription_id, year, month, clips_count, files_count, focus_mode_minutes, compact_mode_minutes
      ) VALUES (
        p_user_id, v_subscription_id, v_year, v_month, 0, p_amount, 0, 0
      )
      ON CONFLICT (user_id, year, month)
      DO UPDATE SET
        files_count = usage_records.files_count + p_amount,
        updated_at = NOW();

    WHEN 'focus_mode' THEN
      -- Increment focus_mode_minutes
      INSERT INTO public.usage_records (
        user_id, subscription_id, year, month, clips_count, files_count, focus_mode_minutes, compact_mode_minutes
      ) VALUES (
        p_user_id, v_subscription_id, v_year, v_month, 0, 0, p_amount, 0
      )
      ON CONFLICT (user_id, year, month)
      DO UPDATE SET
        focus_mode_minutes = usage_records.focus_mode_minutes + p_amount,
        updated_at = NOW();

    WHEN 'compact_mode' THEN
      -- Increment compact_mode_minutes
      INSERT INTO public.usage_records (
        user_id, subscription_id, year, month, clips_count, files_count, focus_mode_minutes, compact_mode_minutes
      ) VALUES (
        p_user_id, v_subscription_id, v_year, v_month, 0, 0, 0, p_amount
      )
      ON CONFLICT (user_id, year, month)
      DO UPDATE SET
        compact_mode_minutes = usage_records.compact_mode_minutes + p_amount,
        updated_at = NOW();

    ELSE
      -- Unknown action - log error but don't fail
      RAISE WARNING 'Unknown action type: %. Valid actions: clip, file, focus_mode, compact_mode', p_action;
      RETURN;
  END CASE;

  -- Log successful increment (optional, can be disabled in production)
  RAISE NOTICE 'Incremented % for user % by % (period: %/%)', p_action, p_user_id, p_amount, v_year, v_month;

END;
$$;

-- Add comment to function
COMMENT ON FUNCTION public.increment_usage(UUID, TEXT, INTEGER) IS
  'Atomically increments usage counters for subscription quota tracking. Actions: clip, file, focus_mode, compact_mode. Includes subscription_id lookup.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.increment_usage(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_usage(UUID, TEXT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_usage(UUID, TEXT, INTEGER) TO service_role;

-- ============================================
-- Verification queries (for manual testing)
-- ============================================

-- Test increment_usage function with existing user
-- SELECT increment_usage((SELECT id FROM user_profiles LIMIT 1), 'clip', 1);

-- Check usage_records
-- SELECT * FROM usage_records ORDER BY updated_at DESC LIMIT 5;
