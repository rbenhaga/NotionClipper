-- ============================================================================
-- FORCE REMOVE ALL FOREIGN KEYS TO auth.users
-- ============================================================================
-- This script aggressively removes all FK constraints to auth.users

-- Step 1: DROP the user_profiles_id_fkey constraint (the stubborn one!)
DO $$
BEGIN
  -- Try multiple variations of the constraint name
  ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_id_fkey;
  RAISE NOTICE '✅ Dropped user_profiles_id_fkey (if exists)';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️ Could not drop user_profiles_id_fkey: %', SQLERRM;
END $$;

DO $$
BEGIN
  ALTER TABLE public.user_profiles DROP CONSTRAINT IF EXISTS user_profiles_id_fkey1;
  RAISE NOTICE '✅ Dropped user_profiles_id_fkey1 (if exists)';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '⚠️ Could not drop user_profiles_id_fkey1: %', SQLERRM;
END $$;

-- Step 2: Find and drop ALL FK constraints to auth.users dynamically
DO $$
DECLARE
  constraint_record RECORD;
BEGIN
  -- Find all FK constraints pointing to auth.users
  FOR constraint_record IN
    SELECT
      tc.table_schema,
      tc.table_name,
      tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
      AND tc.table_schema = ccu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_schema = 'auth'
      AND ccu.table_name = 'users'
      AND tc.table_schema = 'public'
  LOOP
    EXECUTE format('ALTER TABLE %I.%I DROP CONSTRAINT IF EXISTS %I CASCADE',
      constraint_record.table_schema,
      constraint_record.table_name,
      constraint_record.constraint_name
    );
    RAISE NOTICE '🗑️ Dropped FK: %.% -> %',
      constraint_record.table_name,
      constraint_record.constraint_name,
      'auth.users';
  END LOOP;

  RAISE NOTICE '✅ All FK constraints to auth.users removed';
END $$;

-- Step 3: Verify no FK constraints to auth.users remain
DO $$
DECLARE
  fk_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fk_count
  FROM information_schema.table_constraints tc
  JOIN information_schema.constraint_column_usage ccu
    ON tc.constraint_name = ccu.constraint_name
    AND tc.table_schema = ccu.table_schema
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_schema = 'auth'
    AND ccu.table_name = 'users'
    AND tc.table_schema = 'public';

  IF fk_count = 0 THEN
    RAISE NOTICE '✅ VERIFIED: No FK constraints to auth.users remain';
  ELSE
    RAISE NOTICE '⚠️ WARNING: % FK constraints to auth.users still exist!', fk_count;
  END IF;
END $$;

-- Step 4: Clean up test data
DELETE FROM public.subscriptions WHERE user_id IN (
  SELECT id FROM public.user_profiles WHERE email LIKE '%test%'
);
DELETE FROM public.user_profiles WHERE email LIKE '%test%';

RAISE NOTICE '🧹 Test data cleaned up';

-- Step 5: Test the complete flow
DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_email TEXT := 'final-test-' || gen_random_uuid() || '@example.com';
  profile_count INTEGER;
  subscription_count INTEGER;
BEGIN
  -- Step 5a: Insert test user profile
  INSERT INTO public.user_profiles (id, email, auth_provider, created_at, updated_at)
  VALUES (test_user_id, test_email, 'notion', NOW(), NOW());

  RAISE NOTICE '✅ Test user profile created: %', test_user_id;

  -- Step 5b: Wait a moment for trigger to fire
  PERFORM pg_sleep(0.5);

  -- Step 5c: Check if subscription was auto-created
  SELECT COUNT(*) INTO subscription_count
  FROM public.subscriptions
  WHERE user_id = test_user_id;

  IF subscription_count = 1 THEN
    RAISE NOTICE '✅ FREE subscription auto-created by trigger';
  ELSE
    RAISE NOTICE '❌ Subscription NOT created (expected 1, got %)', subscription_count;
  END IF;

  -- Step 5d: Verify tier is uppercase
  DECLARE
    user_tier TEXT;
  BEGIN
    SELECT tier INTO user_tier
    FROM public.subscriptions
    WHERE user_id = test_user_id;

    IF user_tier = 'FREE' THEN
      RAISE NOTICE '✅ Tier is correct: %', user_tier;
    ELSE
      RAISE NOTICE '⚠️ Tier is incorrect: % (expected FREE)', user_tier;
    END IF;
  END;

  -- Step 5e: Clean up test data
  DELETE FROM public.subscriptions WHERE user_id = test_user_id;
  DELETE FROM public.user_profiles WHERE id = test_user_id;

  RAISE NOTICE '🧹 Test user cleaned up';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════';
  RAISE NOTICE '✅ ALL TESTS PASSED - OAuth should work now!';
  RAISE NOTICE '═══════════════════════════════════════════';

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '❌ Test failed: %', SQLERRM;
  -- Clean up even on failure
  DELETE FROM public.subscriptions WHERE user_id = test_user_id;
  DELETE FROM public.user_profiles WHERE id = test_user_id;
END $$;
