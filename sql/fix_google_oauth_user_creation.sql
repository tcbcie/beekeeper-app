-- FIX GOOGLE OAUTH USER CREATION
-- This script ensures that new users created via Google OAuth get a profile record

-- Step 1: Ensure profiles table exists and has correct structure
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    RAISE EXCEPTION 'profiles table does not exist! Run CONSOLIDATE_to_profiles_table_v3.sql first';
  END IF;

  RAISE NOTICE 'profiles table exists';
END $$;

-- Step 2: Create or replace the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, created_at)
  VALUES (NEW.id, NEW.email, 'User', NOW())
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Step 4: Create the trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 5: Ensure RLS policies allow profile creation
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow new user profile creation" ON public.profiles;
DROP POLICY IF EXISTS "Service role can do anything" ON public.profiles;

-- Create policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id);

-- CRITICAL: Allow service role to insert new profiles (needed for trigger)
CREATE POLICY "Allow new user profile creation"
  ON public.profiles
  FOR INSERT
  WITH CHECK (true);

-- Step 6: Grant necessary permissions
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON public.profiles TO postgres, service_role;
GRANT SELECT, UPDATE ON public.profiles TO authenticated;

-- Step 7: Backfill any missing profiles for existing users
INSERT INTO public.profiles (id, email, role, created_at)
SELECT
  au.id,
  au.email,
  'User',
  au.created_at
FROM auth.users au
LEFT JOIN public.profiles p ON au.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Step 8: Verify the setup
DO $$
DECLARE
  trigger_count INT;
  policy_count INT;
  missing_profiles INT;
BEGIN
  -- Check trigger exists
  SELECT COUNT(*) INTO trigger_count
  FROM information_schema.triggers
  WHERE trigger_name = 'on_auth_user_created'
    AND event_object_table = 'users'
    AND event_object_schema = 'auth';

  -- Check policies exist
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'profiles';

  -- Check for users without profiles
  SELECT COUNT(*) INTO missing_profiles
  FROM auth.users au
  LEFT JOIN public.profiles p ON au.id = p.id
  WHERE p.id IS NULL;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'GOOGLE OAUTH FIX COMPLETE!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Trigger "on_auth_user_created" exists: %', trigger_count > 0;
  RAISE NOTICE 'Number of RLS policies on profiles: %', policy_count;
  RAISE NOTICE 'Users without profiles: %', missing_profiles;
  RAISE NOTICE '============================================';
  RAISE NOTICE 'What was done:';
  RAISE NOTICE '1. Created/updated handle_new_user() function';
  RAISE NOTICE '2. Created trigger on auth.users INSERT';
  RAISE NOTICE '3. Updated RLS policies to allow profile creation';
  RAISE NOTICE '4. Granted necessary permissions';
  RAISE NOTICE '5. Backfilled missing profiles for existing users';
  RAISE NOTICE '============================================';

  IF trigger_count = 0 THEN
    RAISE WARNING 'Trigger was not created! Check permissions.';
  END IF;

  IF missing_profiles > 0 THEN
    RAISE WARNING 'There are still % users without profiles!', missing_profiles;
  END IF;
END $$;
