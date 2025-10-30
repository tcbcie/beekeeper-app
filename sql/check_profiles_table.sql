-- Check if profiles table exists and is usable for trigger
-- Run this to diagnose why the auto-accept trigger SQL is failing

-- Step 1: Check if profiles table exists
SELECT 'Step 1: Checking if profiles table exists...' as step;

SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'profiles'
    )
    THEN '✅ YES - profiles table exists'
    ELSE '❌ NO - profiles table does NOT exist'
  END as table_exists;

-- Step 2: If exists, show structure
SELECT 'Step 2: Profiles table structure (if exists)...' as step;

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Step 3: Check if any profiles exist
SELECT 'Step 3: Checking if any profiles exist...' as step;

SELECT
  CASE
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')
    THEN (
      SELECT COALESCE(COUNT(*)::TEXT, '0') || ' profiles found'
      FROM public.profiles
    )
    ELSE 'Table does not exist'
  END as profile_count;

-- Step 4: Check if there's a user_profiles table instead
SELECT 'Step 4: Checking for user_profiles table...' as step;

SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'user_profiles'
    )
    THEN '✅ YES - user_profiles table exists'
    ELSE '❌ NO - user_profiles table does NOT exist'
  END as user_profiles_exists;

-- Step 5: Show what tables DO exist in public schema
SELECT 'Step 5: All tables in public schema...' as step;

SELECT
  table_name,
  CASE
    WHEN table_name LIKE '%profile%' THEN '👤 Profile-related'
    WHEN table_name LIKE '%team%' THEN '👥 Team-related'
    WHEN table_name LIKE '%user%' THEN '👤 User-related'
    ELSE '📊 Other'
  END as category
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY
  CASE
    WHEN table_name LIKE '%profile%' OR table_name LIKE '%user%' THEN 1
    WHEN table_name LIKE '%team%' THEN 2
    ELSE 3
  END,
  table_name;

-- Step 6: Recommendation
SELECT '
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DIAGNOSIS COMPLETE

Based on the results above:

IF "profiles table exists" = YES:
  ✅ Run: sql/create_auto_accept_invitation_alternative.sql
  This will create the trigger on the profiles table.

IF "profiles table exists" = NO:
  ⚠️ Your project does not have a profiles table
  SOLUTION: Use the webhook approach instead

  Option 1 (Recommended): Deploy Edge Function webhook
    1. supabase functions deploy auto-accept-invitations
    2. Configure webhook in Supabase Dashboard
    3. See: AUTO_ACCEPT_SETUP_GUIDE.md → Option 2

  Option 2: Create profiles table manually
    Run this SQL:

    CREATE TABLE public.profiles (
      id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    -- Create trigger to auto-populate on signup
    CREATE OR REPLACE FUNCTION public.handle_new_user()
    RETURNS TRIGGER AS $$
    BEGIN
      INSERT INTO public.profiles (id)
      VALUES (NEW.id);
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- This requires auth.users trigger permission (same issue)
    -- So this won''t work either - use webhook instead!

IF "user_profiles table exists" = YES:
  ⚠️ Your project uses user_profiles instead of profiles
  TRY: Modify the trigger SQL to use user_profiles table
  OR: Use webhook approach (safer)

RECOMMENDATION:
Since you''re getting permission errors, the webhook approach is most reliable.
It works regardless of table structure and doesn''t need any triggers.

Next step: Deploy auto-accept-invitations Edge Function
See: AUTO_ACCEPT_SETUP_GUIDE.md → Option 2 (Webhook)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
' as recommendation;
