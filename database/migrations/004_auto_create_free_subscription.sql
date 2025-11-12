-- Migration 004: Auto-create FREE subscription for new users
-- ============================================
-- Description:
--   Automatically creates a FREE subscription when a new user is created
--   in the user_profiles table.
--
-- Purpose:
--   Ensures every user has a subscription record from day 1,
--   fixing the issue where new users had no subscription and
--   couldn't use the quota system.
--
-- Tables affected:
--   - subscriptions (INSERT trigger)
--
-- ============================================

-- 1. Create function to auto-create FREE subscription
CREATE OR REPLACE FUNCTION public.create_free_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if subscription already exists (safety check)
  IF EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = NEW.id
  ) THEN
    RAISE NOTICE 'Subscription already exists for user %', NEW.id;
    RETURN NEW;
  END IF;

  -- Create FREE subscription for new user
  INSERT INTO public.subscriptions (
    user_id,
    tier,
    status,
    current_period_start,
    current_period_end,
    is_grace_period
  ) VALUES (
    NEW.id,
    'free',
    'active',
    NOW(),
    NOW() + INTERVAL '1 month',
    FALSE
  );

  RAISE NOTICE 'Created FREE subscription for user %', NEW.id;

  RETURN NEW;
END;
$$;

-- Add comment to function
COMMENT ON FUNCTION public.create_free_subscription() IS
  'Automatically creates a FREE subscription when a new user is inserted into user_profiles';

-- 2. Create trigger on user_profiles table
DROP TRIGGER IF EXISTS on_user_profile_created ON public.user_profiles;

CREATE TRIGGER on_user_profile_created
  AFTER INSERT ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_free_subscription();

-- Add comment to trigger
COMMENT ON TRIGGER on_user_profile_created ON public.user_profiles IS
  'Trigger that creates a FREE subscription automatically when a new user is created';

-- 3. Backfill existing users without subscriptions (FIX #33)
-- This ensures existing users who don't have a subscription get one
INSERT INTO public.subscriptions (
  user_id,
  tier,
  status,
  current_period_start,
  current_period_end,
  is_grace_period
)
SELECT
  up.id,
  'free',
  'active',
  NOW(),
  NOW() + INTERVAL '1 month',
  FALSE
FROM public.user_profiles up
WHERE NOT EXISTS (
  SELECT 1
  FROM public.subscriptions s
  WHERE s.user_id = up.id
)
ON CONFLICT (user_id) DO NOTHING;

-- Log how many users were backfilled
DO $$
DECLARE
  backfilled_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO backfilled_count
  FROM public.user_profiles up
  WHERE EXISTS (
    SELECT 1
    FROM public.subscriptions s
    WHERE s.user_id = up.id
    AND s.created_at >= NOW() - INTERVAL '1 minute'
  );

  RAISE NOTICE 'Backfilled % existing users with FREE subscriptions', backfilled_count;
END $$;

-- ============================================
-- Verification queries (for manual testing)
-- ============================================

-- Check that the function exists
-- SELECT routine_name, routine_type
-- FROM information_schema.routines
-- WHERE routine_schema = 'public'
-- AND routine_name = 'create_free_subscription';

-- Check that the trigger exists
-- SELECT trigger_name, event_manipulation, event_object_table
-- FROM information_schema.triggers
-- WHERE trigger_schema = 'public'
-- AND trigger_name = 'on_user_profile_created';

-- Verify all users have subscriptions
-- SELECT
--   (SELECT COUNT(*) FROM user_profiles) as total_users,
--   (SELECT COUNT(*) FROM subscriptions) as total_subscriptions,
--   (SELECT COUNT(*) FROM user_profiles up WHERE NOT EXISTS (
--     SELECT 1 FROM subscriptions s WHERE s.user_id = up.id
--   )) as users_without_subscription;
