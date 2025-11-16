-- Migration 006: Create increment_usage_counter RPC wrapper
-- ============================================
-- Description:
--   Creates increment_usage_counter() as a wrapper around increment_usage()
--   to match the API used by track-usage Edge Function and UsageTrackingService
--
-- Purpose:
--   Maps modern parameter names (p_feature, p_increment) to legacy names (p_action, p_amount)
--   Maps feature values: 'clips' → 'clip', 'files' → 'file', etc.
--
-- Called by:
--   - supabase/functions/track-usage/index.ts
--   - packages/core-shared/src/services/usage-tracking.service.ts
--
-- Dependencies:
--   - increment_usage() function (created in migration 005)
--
-- ============================================

-- Drop existing function if it exists (allows re-running migration)
DROP FUNCTION IF EXISTS public.increment_usage_counter(UUID, TEXT, INTEGER);

-- Create increment_usage_counter function that wraps increment_usage
CREATE OR REPLACE FUNCTION public.increment_usage_counter(
  p_user_id UUID,
  p_feature TEXT,
  p_increment INTEGER DEFAULT 1
)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  year INTEGER,
  month INTEGER,
  clips_count INTEGER,
  files_count INTEGER,
  focus_mode_minutes INTEGER,
  compact_mode_minutes INTEGER,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action TEXT;
  v_year INTEGER;
  v_month INTEGER;
BEGIN
  -- Get current year and month
  v_year := EXTRACT(YEAR FROM NOW());
  v_month := EXTRACT(MONTH FROM NOW());

  -- Map feature to action (clips → clip, files → file)
  CASE p_feature
    WHEN 'clips' THEN
      v_action := 'clip';
    WHEN 'files' THEN
      v_action := 'file';
    WHEN 'focus_mode_time' THEN
      v_action := 'focus_mode';
    WHEN 'compact_mode_time' THEN
      v_action := 'compact_mode';
    ELSE
      RAISE EXCEPTION 'Invalid feature: %. Valid features: clips, files, focus_mode_time, compact_mode_time', p_feature;
  END CASE;

  -- Call the underlying increment_usage function
  PERFORM public.increment_usage(p_user_id, v_action, p_increment);

  -- Return the updated usage record
  RETURN QUERY
  SELECT
    ur.id,
    ur.user_id,
    ur.year,
    ur.month,
    ur.clips_count,
    ur.files_count,
    ur.focus_mode_minutes,
    ur.compact_mode_minutes,
    ur.created_at,
    ur.updated_at
  FROM public.usage_records ur
  WHERE ur.user_id = p_user_id
    AND ur.year = v_year
    AND ur.month = v_month;

END;
$$;

-- Add comment to function
COMMENT ON FUNCTION public.increment_usage_counter(UUID, TEXT, INTEGER) IS
  'Wrapper around increment_usage() with modern API. Maps feature names: clips, files, focus_mode_time, compact_mode_time.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.increment_usage_counter(UUID, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_usage_counter(UUID, TEXT, INTEGER) TO anon;
GRANT EXECUTE ON FUNCTION public.increment_usage_counter(UUID, TEXT, INTEGER) TO service_role;

-- ============================================
-- Verification queries (for manual testing)
-- ============================================

-- Test increment_usage_counter function
-- SELECT * FROM increment_usage_counter('550e8400-e29b-41d4-a716-446655440000'::UUID, 'clips', 1);
-- SELECT * FROM increment_usage_counter('550e8400-e29b-41d4-a716-446655440000'::UUID, 'files', 3);

-- Check usage_records
-- SELECT * FROM usage_records WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::UUID;

-- Verify both functions exist
-- SELECT routine_name, routine_type
-- FROM information_schema.routines
-- WHERE routine_schema = 'public'
-- AND routine_name IN ('increment_usage', 'increment_usage_counter');
