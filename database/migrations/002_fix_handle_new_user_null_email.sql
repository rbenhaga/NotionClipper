-- Migration: Fix handle_new_user trigger to support NULL email
-- Date: 2025-11-12
-- Description: Allows users from Notion OAuth to be created without email addresses

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Recreate function with NULL email support
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_email TEXT;
  user_name TEXT;
BEGIN
  -- Get email (may be NULL for Notion OAuth)
  user_email := NEW.email;

  -- Get full_name from raw_user_meta_data, with fallback
  user_name := COALESCE(
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'name',
    'User'
  );

  -- Insert into user_profiles with NULL-safe email
  INSERT INTO public.user_profiles (id, email, full_name, avatar_url, created_at, updated_at)
  VALUES (
    NEW.id,
    user_email, -- Can be NULL
    user_name,
    NEW.raw_user_meta_data->>'avatar_url',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = COALESCE(EXCLUDED.email, user_profiles.email),
    full_name = COALESCE(EXCLUDED.full_name, user_profiles.full_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url),
    updated_at = NOW();

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't prevent user creation
    RAISE WARNING 'Error in handle_new_user for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure user_profiles table allows NULL email
ALTER TABLE public.user_profiles
  ALTER COLUMN email DROP NOT NULL;

-- Add unique constraint for email only when it's not NULL
DROP INDEX IF EXISTS user_profiles_email_key;
CREATE UNIQUE INDEX user_profiles_email_unique
  ON public.user_profiles(email)
  WHERE email IS NOT NULL;

-- Add comment
COMMENT ON FUNCTION public.handle_new_user() IS
  'Automatically create user profile when auth user is created. Supports NULL email for OAuth providers like Notion.';
