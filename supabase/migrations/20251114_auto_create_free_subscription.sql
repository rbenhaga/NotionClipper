-- Migration: Auto-create FREE subscription for new users
-- Date: 2025-11-14
-- Purpose: Automatically create a FREE tier subscription when a new user is created
-- This ensures all users always have a subscription tier (no more null subscriptions)

-- 1. Create function that will be triggered on user_profiles INSERT
CREATE OR REPLACE FUNCTION public.create_free_subscription_for_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER -- Run with elevated privileges to bypass RLS
AS $$
BEGIN
  -- Only create subscription if one doesn't already exist
  -- (prevents duplicates if trigger fires multiple times)
  IF NOT EXISTS (
    SELECT 1
    FROM public.subscriptions
    WHERE user_id = NEW.id
  ) THEN
    -- Insert FREE tier subscription
    INSERT INTO public.subscriptions (
      user_id,
      tier,
      status,
      current_period_start,
      current_period_end,
      is_grace_period,
      created_at,
      updated_at
    ) VALUES (
      NEW.id,                                  -- user_id from new user_profiles row
      'free',                                   -- tier
      'active',                                 -- status
      NOW(),                                    -- current_period_start
      NOW() + INTERVAL '1 month',               -- current_period_end (1 month from now)
      FALSE,                                    -- is_grace_period
      NOW(),                                    -- created_at
      NOW()                                     -- updated_at
    );

    -- Log the creation (optional, for debugging)
    RAISE NOTICE 'Created FREE subscription for user: %', NEW.id;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Create trigger that fires AFTER INSERT on user_profiles
DROP TRIGGER IF EXISTS on_user_profile_created ON public.user_profiles;

CREATE TRIGGER on_user_profile_created
  AFTER INSERT ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_free_subscription_for_new_user();

-- 3. Backfill: Create FREE subscriptions for existing users who don't have one
-- This is a one-time operation for existing users
INSERT INTO public.subscriptions (
  user_id,
  tier,
  status,
  current_period_start,
  current_period_end,
  is_grace_period,
  created_at,
  updated_at
)
SELECT
  up.id,                                       -- user_id
  'free',                                      -- tier
  'active',                                    -- status
  NOW(),                                       -- current_period_start
  NOW() + INTERVAL '1 month',                  -- current_period_end
  FALSE,                                       -- is_grace_period
  NOW(),                                       -- created_at
  NOW()                                        -- updated_at
FROM public.user_profiles up
LEFT JOIN public.subscriptions s ON s.user_id = up.id
WHERE s.user_id IS NULL                        -- Only users without subscription
ON CONFLICT (user_id) DO NOTHING;              -- Prevent duplicates

-- 4. Comment for documentation
COMMENT ON FUNCTION public.create_free_subscription_for_new_user() IS
'Automatically creates a FREE tier subscription for new users.
Triggered after INSERT on user_profiles table.
Ensures all users have a subscription tier (fixes NULL subscription issues).';

COMMENT ON TRIGGER on_user_profile_created ON public.user_profiles IS
'Auto-creates FREE subscription when a new user profile is created.
Part of subscription system refactoring (2025-11-14).';
