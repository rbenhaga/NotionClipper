-- Migration 007: Create get_or_create_current_usage_record function
-- ============================================
-- Description:
--   Creates get_or_create_current_usage_record() RPC function
--   Used by SubscriptionService to get or create usage_records
--
-- Purpose:
--   Returns the current month's usage record for a user+subscription
--   Creates a new record if it doesn't exist
--
-- Called by:
--   - packages/core-shared/src/services/subscription.service.ts (getCurrentUsageRecord)
--   - packages/core-shared/src/services/usage-tracking.service.ts (getCurrentUsageRecord)
--
-- Parameters:
--   p_user_id UUID - The user's ID
--   p_subscription_id UUID - The subscription's ID
--
-- Returns:
--   usage_records row with all fields
-- ============================================

-- Drop existing function if it exists (allows re-running migration)
DROP FUNCTION IF EXISTS public.get_or_create_current_usage_record(UUID, UUID);

-- Create get_or_create_current_usage_record function
CREATE OR REPLACE FUNCTION public.get_or_create_current_usage_record(
  p_user_id UUID,
  p_subscription_id UUID
)
RETURNS TABLE(
  id UUID,
  user_id UUID,
  subscription_id UUID,
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
  v_year INTEGER;
  v_month INTEGER;
  v_record_id UUID;
BEGIN
  -- Get current year and month
  v_year := EXTRACT(YEAR FROM NOW());
  v_month := EXTRACT(MONTH FROM NOW());

  -- Try to find existing record for this month
  SELECT ur.id INTO v_record_id
  FROM public.usage_records ur
  WHERE ur.user_id = p_user_id
    AND ur.subscription_id = p_subscription_id
    AND ur.year = v_year
    AND ur.month = v_month
  LIMIT 1;

  -- If no record exists, create one
  IF v_record_id IS NULL THEN
    INSERT INTO public.usage_records (
      user_id,
      subscription_id,
      year,
      month,
      clips_count,
      files_count,
      focus_mode_minutes,
      compact_mode_minutes
    ) VALUES (
      p_user_id,
      p_subscription_id,
      v_year,
      v_month,
      0, -- clips_count
      0, -- files_count
      0, -- focus_mode_minutes
      0  -- compact_mode_minutes
    )
    RETURNING id INTO v_record_id;
  END IF;

  -- Return the record (existing or newly created)
  RETURN QUERY
  SELECT
    ur.id,
    ur.user_id,
    ur.subscription_id,
    ur.year,
    ur.month,
    ur.clips_count,
    ur.files_count,
    ur.focus_mode_minutes,
    ur.compact_mode_minutes,
    ur.created_at,
    ur.updated_at
  FROM public.usage_records ur
  WHERE ur.id = v_record_id;

END;
$$;

-- Add comment to function
COMMENT ON FUNCTION public.get_or_create_current_usage_record(UUID, UUID) IS
  'Gets or creates the current month''s usage record for a user+subscription pair. Used by SubscriptionService and UsageTrackingService.';

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.get_or_create_current_usage_record(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_current_usage_record(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.get_or_create_current_usage_record(UUID, UUID) TO service_role;

-- ============================================
-- Verification queries (for manual testing)
-- ============================================

-- Test get_or_create_current_usage_record function
-- SELECT * FROM get_or_create_current_usage_record(
--   '550e8400-e29b-41d4-a716-446655440000'::UUID,
--   '660e8400-e29b-41d4-a716-446655440000'::UUID
-- );

-- Check usage_records
-- SELECT * FROM usage_records
-- WHERE user_id = '550e8400-e29b-41d4-a716-446655440000'::UUID;

-- Verify function exists
-- SELECT routine_name, routine_type, routine_definition
-- FROM information_schema.routines
-- WHERE routine_schema = 'public'
-- AND routine_name = 'get_or_create_current_usage_record';
