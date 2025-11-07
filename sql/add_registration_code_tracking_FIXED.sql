-- Add registration code tracking to profiles table
-- This allows admins to see which code each user signed up with

-- Step 1: Add column to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS used_registration_code_id UUID REFERENCES public.registration_codes(id) ON DELETE SET NULL;

-- Add comment
COMMENT ON COLUMN public.profiles.used_registration_code_id IS 'The registration code that was used to sign up this user';

-- Step 2: Create a view to see users with their registration codes
CREATE OR REPLACE VIEW public.users_with_registration_codes AS
SELECT
  p.id,
  p.email,
  p.role,
  p.is_active,
  p.created_at,
  rc.code as registration_code,
  rc.description as code_description,
  rc.created_at as code_created_at
FROM public.profiles p
LEFT JOIN public.registration_codes rc ON p.used_registration_code_id = rc.id
ORDER BY p.created_at DESC;

-- Grant permissions
GRANT SELECT ON public.users_with_registration_codes TO authenticated;

-- Step 3: DROP and recreate get_users_with_email function to include registration code
DROP FUNCTION IF EXISTS public.get_users_with_email();

CREATE OR REPLACE FUNCTION public.get_users_with_email()
RETURNS TABLE (
  id UUID,
  email TEXT,
  role TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  registration_code TEXT,
  code_description TEXT
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT
    p.id,
    p.email,
    p.role::TEXT,
    COALESCE(p.is_active, true) as is_active,
    p.created_at,
    rc.code as registration_code,
    rc.description as code_description
  FROM public.profiles p
  LEFT JOIN public.registration_codes rc ON p.used_registration_code_id = rc.id
  ORDER BY p.created_at DESC;
$$;

GRANT EXECUTE ON FUNCTION public.get_users_with_email() TO authenticated;

-- Step 4: Update handle_new_user trigger to accept registration code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  reg_code_id UUID;
BEGIN
  -- Try to get registration_code_id from user metadata
  reg_code_id := (NEW.raw_user_meta_data->>'registration_code_id')::UUID;

  INSERT INTO public.profiles (
    id,
    email,
    role,
    is_active,
    used_registration_code_id,
    created_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    'User',
    TRUE,
    reg_code_id,
    NOW()
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      used_registration_code_id = COALESCE(EXCLUDED.used_registration_code_id, profiles.used_registration_code_id);

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'REGISTRATION CODE TRACKING ADDED!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Changes made:';
  RAISE NOTICE '1. Added used_registration_code_id column to profiles';
  RAISE NOTICE '2. Created users_with_registration_codes view';
  RAISE NOTICE '3. Updated get_users_with_email() to include code info';
  RAISE NOTICE '4. Updated handle_new_user() to store code reference';
  RAISE NOTICE '';
  RAISE NOTICE 'New users will now have their registration code tracked.';
  RAISE NOTICE 'View users and their codes: SELECT * FROM users_with_registration_codes;';
  RAISE NOTICE '============================================';
END $$;

-- Test query
SELECT id, email, role, registration_code, code_description
FROM get_users_with_email()
LIMIT 5;
