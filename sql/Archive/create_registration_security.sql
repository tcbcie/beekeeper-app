-- CREATE REGISTRATION SECURITY SYSTEM
-- This script implements registration codes with expiration and account disable functionality

-- Step 1: Create registration_codes table
CREATE TABLE IF NOT EXISTS public.registration_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  max_uses INTEGER DEFAULT NULL, -- NULL = unlimited uses
  current_uses INTEGER DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comment
COMMENT ON TABLE public.registration_codes IS 'Registration codes required for new user sign-ups with expiration and usage limits';

-- Step 2: Add is_active column to profiles table (if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
    RAISE NOTICE 'Added is_active column to profiles table';
  ELSE
    RAISE NOTICE 'is_active column already exists in profiles table';
  END IF;
END $$;

-- Step 3: Create function to validate registration code
CREATE OR REPLACE FUNCTION public.validate_registration_code(reg_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  code_record RECORD;
  result JSON;
BEGIN
  -- Find the registration code
  SELECT * INTO code_record
  FROM public.registration_codes
  WHERE code = reg_code
    AND is_active = TRUE
    AND expires_at > NOW()
    AND (max_uses IS NULL OR current_uses < max_uses);

  -- If code not found or invalid
  IF code_record IS NULL THEN
    RETURN json_build_object(
      'valid', false,
      'message', 'Invalid, expired, or used registration code'
    );
  END IF;

  -- Code is valid
  RETURN json_build_object(
    'valid', true,
    'code_id', code_record.id,
    'message', 'Registration code is valid'
  );
END;
$$;

-- Step 4: Create function to increment code usage
CREATE OR REPLACE FUNCTION public.increment_code_usage(code_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.registration_codes
  SET current_uses = current_uses + 1,
      updated_at = NOW()
  WHERE id = code_id;
END;
$$;

-- Step 5: Create function to disable/enable user account
CREATE OR REPLACE FUNCTION public.toggle_user_account(
  target_user_id UUID,
  enable_account BOOLEAN
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_admin_id UUID;
BEGIN
  -- Get current user ID
  current_admin_id := auth.uid();

  -- Check if current user is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = current_admin_id AND role = 'Admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can enable/disable user accounts';
  END IF;

  -- Prevent admin from disabling their own account
  IF target_user_id = current_admin_id THEN
    RAISE EXCEPTION 'Cannot disable your own admin account';
  END IF;

  -- Update the user's is_active status
  UPDATE public.profiles
  SET is_active = enable_account
  WHERE id = target_user_id;

  RETURN json_build_object(
    'success', true,
    'user_id', target_user_id,
    'is_active', enable_account,
    'message', CASE
      WHEN enable_account THEN 'User account enabled successfully'
      ELSE 'User account disabled successfully'
    END
  );
END;
$$;

-- Step 6: Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_registration_codes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS registration_codes_updated_at ON public.registration_codes;

CREATE TRIGGER registration_codes_updated_at
  BEFORE UPDATE ON public.registration_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_registration_codes_updated_at();

-- Step 7: Enable RLS on registration_codes table
ALTER TABLE public.registration_codes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage registration codes" ON public.registration_codes;
DROP POLICY IF EXISTS "Anyone can validate registration codes" ON public.registration_codes;

-- Admins can do everything with registration codes
CREATE POLICY "Admins can manage registration codes"
  ON public.registration_codes
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.registration_codes TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_registration_code(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_code_usage(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_user_account(UUID, BOOLEAN) TO authenticated;

-- Step 8: Insert a default registration code (valid for 1 year)
INSERT INTO public.registration_codes (code, description, expires_at, max_uses)
VALUES (
  'BEEKEEPER2025',
  'Default registration code - valid for 1 year',
  NOW() + INTERVAL '1 year',
  NULL  -- Unlimited uses
)
ON CONFLICT (code) DO NOTHING;

-- Step 9: Update handle_new_user trigger to check if user should be active by default
-- (Existing users remain active, new users start active)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, is_active, created_at)
  VALUES (NEW.id, NEW.email, 'User', TRUE, NOW())
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE LOG 'Error in handle_new_user: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Verification
DO $$
DECLARE
  code_count INT;
  profile_has_active BOOLEAN;
BEGIN
  -- Count registration codes
  SELECT COUNT(*) INTO code_count FROM public.registration_codes;

  -- Check if profiles has is_active column
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_active'
  ) INTO profile_has_active;

  RAISE NOTICE '============================================';
  RAISE NOTICE 'REGISTRATION SECURITY SYSTEM CREATED!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Tables created:';
  RAISE NOTICE '  - registration_codes (with expiration and usage limits)';
  RAISE NOTICE '  - profiles.is_active column added: %', profile_has_active;
  RAISE NOTICE '';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '  - validate_registration_code(code)';
  RAISE NOTICE '  - increment_code_usage(code_id)';
  RAISE NOTICE '  - toggle_user_account(user_id, enable)';
  RAISE NOTICE '';
  RAISE NOTICE 'Registration codes in system: %', code_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Default code: BEEKEEPER2025';
  RAISE NOTICE 'Expires: 1 year from now';
  RAISE NOTICE 'Max uses: Unlimited';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Update login page to require registration code';
  RAISE NOTICE '2. Add admin UI to manage codes';
  RAISE NOTICE '3. Add admin UI to enable/disable accounts';
  RAISE NOTICE '============================================';
END $$;
