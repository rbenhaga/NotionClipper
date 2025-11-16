-- Migration 005: Create increment_usage RPC function
-- ============================================
-- Description:
--   Creates the increment_usage() PostgreSQL function that updates
--   monthly usage records for subscription quota tracking.
--
-- Purpose:
--   Provides atomic increment operations for tracking:
--   - clips_count (web clips created)
--   - files_count (files uploaded)
--   - focus_mode_minutes (time in focus mode)
--   - compact_mode_minutes (time in compact mode)
--
-- Called by:
--   - SubscriptionService.incrementUsage()
--
-- Tables affected:
--   - usage_records (UPSERT)
--
-- ============================================

-- 1. Create or replace the increment_usage function
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
BEGIN
  -- Get current year and month
  v_year := EXTRACT(YEAR FROM NOW());
  v_month := EXTRACT(MONTH FROM NOW());

  -- Map action to column and increment
  CASE p_action
    WHEN 'clip' THEN
      -- Increment clips_count
      INSERT INTO public.usage_records (
        user_id, year, month, period_start, period_end, clips_count, files_count, focus_mode_minutes, compact_mode_minutes
      ) VALUES (
        p_user_id, v_year, v_month, DATE_TRUNC('month', NOW()), DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day', p_amount, 0, 0, 0
      )
      ON CONFLICT (user_id, year, month)
      DO UPDATE SET
        clips_count = usage_records.clips_count + p_amount,
        updated_at = NOW();

    WHEN 'file' THEN
      -- Increment files_count
      INSERT INTO public.usage_records (
        user_id, year, month, period_start, period_end, clips_count, files_count, focus_mode_minutes, compact_mode_minutes
      ) VALUES (
        p_user_id, v_year, v_month, DATE_TRUNC('month', NOW()), DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day', 0, p_amount, 0, 0
      )
      ON CONFLICT (user_id, year, month)
      DO UPDATE SET
        files_count = usage_records.files_count + p_amount,
        updated_at = NOW();

    WHEN 'focus_mode' THEN
      -- Increment focus_mode_minutes
      INSERT INTO public.usage_records (
        user_id, year, month, period_start, period_end, clips_count, files_count, focus_mode_minutes, compact_mode_minutes
      ) VALUES (
        p_user_id, v_year, v_month, DATE_TRUNC('month', NOW()), DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day', 0, 0, p_amount, 0
      )
      ON CONFLICT (user_id, year, month)
      DO UPDATE SET
        focus_mode_minutes = usage_records.focus_mode_minutes + p_amount,
        updated_at = NOW();

    WHEN 'compact_mode' THEN
      -- Increment compact_mode_minutes
      INSERT INTO public.usage_records (
        user_id, year, month, period_start, period_end, clips_count, files_count, focus_mode_minutes, compact_mode_minutes
      ) VALUES (
        p_user_id, v_year, v_month, DATE_TRUNC('month', NOW()), DATE_TRUNC('month', NOW()) + INTERVAL '1 month' - INTERVAL '1 day', 0, 0, 0, p_amount
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

-- 2. Add comment to function
COMMENT ON FUNCTION public.increment_usage(UUID, TEXT, INTEGER) IS
  'Atomically increments usage counters for subscription quota tracking. Actions: clip, file, focus_mode, compact_mode.';

-- 3. Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.increment_usage(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_usage(UUID, TEXT, INTEGER) TO anon;

-- ============================================
-- Verification queries (for manual testing)
-- ============================================

-- Test increment_usage function
-- SELECT increment_usage('550e8400-e29b-41d4-a716-446655440000'::UUID, 'clip', 1);
-- SELECT increment_usage('550e8400-e29b-41d4-a716-446655440000'::UUID, 'focus_mode', 15);

-- Check usage_records
-- SELECT * FROM usage_records WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::UUID;

-- Verify function exists
-- SELECT routine_name, routine_type, routine_definition
-- FROM information_schema.routines
-- WHERE routine_schema = 'public'
-- AND routine_name = 'increment_usage';
