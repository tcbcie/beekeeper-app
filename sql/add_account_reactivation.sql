-- ============================================================================
-- ADD ACCOUNT REACTIVATION SYSTEM
-- ============================================================================
-- Allows soft-deleted users to request account reactivation
-- ============================================================================

-- Create reactivation requests table
CREATE TABLE IF NOT EXISTS public.reactivation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  original_email TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  processed_at TIMESTAMPTZ,
  processed_by UUID REFERENCES auth.users(id),
  admin_notes TEXT,
  UNIQUE(user_id, status) -- Only one pending request per user
);

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_reactivation_requests_status ON public.reactivation_requests(status);
CREATE INDEX IF NOT EXISTS idx_reactivation_requests_original_email ON public.reactivation_requests(original_email);

-- Enable RLS
ALTER TABLE public.reactivation_requests ENABLE ROW LEVEL SECURITY;

-- Users can only see their own requests
CREATE POLICY "Users can view own reactivation requests"
  ON public.reactivation_requests
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create reactivation requests for their own account
CREATE POLICY "Users can create own reactivation requests"
  ON public.reactivation_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Only admins can update/process requests
CREATE POLICY "Admins can update reactivation requests"
  ON public.reactivation_requests
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

-- Admins can view all requests
CREATE POLICY "Admins can view all reactivation requests"
  ON public.reactivation_requests
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'Admin'
    )
  );

-- Function to request account reactivation
CREATE OR REPLACE FUNCTION public.request_account_reactivation(
  p_email TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID;
  v_profile RECORD;
  v_existing_request RECORD;
BEGIN
  -- Find user by original_email
  SELECT id, email, original_email, deleted_at, is_active
  INTO v_profile
  FROM public.profiles
  WHERE original_email = p_email
    AND deleted_at IS NOT NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'No deleted account found with this email address'
    );
  END IF;

  v_user_id := v_profile.id;

  -- Check for existing pending request
  SELECT * INTO v_existing_request
  FROM public.reactivation_requests
  WHERE user_id = v_user_id
    AND status = 'pending';

  IF FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'A reactivation request is already pending for this account',
      'requested_at', v_existing_request.requested_at
    );
  END IF;

  -- Create reactivation request
  INSERT INTO public.reactivation_requests (
    user_id,
    original_email,
    status
  ) VALUES (
    v_user_id,
    p_email,
    'pending'
  );

  RETURN json_build_object(
    'success', true,
    'message', 'Reactivation request submitted successfully. An administrator will review your request.',
    'user_id', v_user_id
  );
END;
$$;

-- Function to reactivate an account (admin only)
CREATE OR REPLACE FUNCTION public.reactivate_user_account(
  p_request_id UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request RECORD;
  v_profile RECORD;
  v_original_email TEXT;
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'Admin'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Only administrators can reactivate accounts'
    );
  END IF;

  -- Get request details
  SELECT * INTO v_request
  FROM public.reactivation_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Reactivation request not found'
    );
  END IF;

  IF v_request.status != 'pending' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Request has already been processed',
      'status', v_request.status
    );
  END IF;

  -- Get user profile
  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = v_request.user_id;

  v_original_email := v_profile.original_email;

  -- Restore the account
  UPDATE public.profiles
  SET
    deleted_at = NULL,
    is_active = true,
    email = v_original_email
  WHERE id = v_request.user_id;

  -- Restore auth.users account
  UPDATE auth.users
  SET
    email = v_original_email,
    email_confirmed_at = NOW(),
    banned_until = NULL
  WHERE id = v_request.user_id;

  -- Mark request as approved
  UPDATE public.reactivation_requests
  SET
    status = 'approved',
    processed_at = NOW(),
    processed_by = auth.uid(),
    admin_notes = p_admin_notes
  WHERE id = p_request_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Account reactivated successfully',
    'user_id', v_request.user_id,
    'email', v_original_email
  );
END;
$$;

-- Function to reject reactivation request
CREATE OR REPLACE FUNCTION public.reject_reactivation_request(
  p_request_id UUID,
  p_admin_notes TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_request RECORD;
BEGIN
  -- Check if caller is admin
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'Admin'
  ) THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Only administrators can reject reactivation requests'
    );
  END IF;

  -- Get request details
  SELECT * INTO v_request
  FROM public.reactivation_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Reactivation request not found'
    );
  END IF;

  IF v_request.status != 'pending' THEN
    RETURN json_build_object(
      'success', false,
      'message', 'Request has already been processed',
      'status', v_request.status
    );
  END IF;

  -- Mark request as rejected
  UPDATE public.reactivation_requests
  SET
    status = 'rejected',
    processed_at = NOW(),
    processed_by = auth.uid(),
    admin_notes = p_admin_notes
  WHERE id = p_request_id;

  RETURN json_build_object(
    'success', true,
    'message', 'Reactivation request rejected',
    'request_id', p_request_id
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.request_account_reactivation TO anon;
GRANT EXECUTE ON FUNCTION public.reactivate_user_account TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_reactivation_request TO authenticated;

-- Verification
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE '✅ ACCOUNT REACTIVATION SYSTEM CREATED!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Tables:';
  RAISE NOTICE '  ✓ reactivation_requests';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions:';
  RAISE NOTICE '  ✓ request_account_reactivation(email)';
  RAISE NOTICE '  ✓ reactivate_user_account(request_id, notes)';
  RAISE NOTICE '  ✓ reject_reactivation_request(request_id, notes)';
  RAISE NOTICE '';
  RAISE NOTICE 'How it works:';
  RAISE NOTICE '  1. Deleted user visits reactivation page';
  RAISE NOTICE '  2. Enters their original email';
  RAISE NOTICE '  3. System creates reactivation request';
  RAISE NOTICE '  4. Admin reviews and approves/rejects';
  RAISE NOTICE '  5. If approved, account is fully restored';
  RAISE NOTICE '';
  RAISE NOTICE 'Security:';
  RAISE NOTICE '  ✓ RLS policies protect data';
  RAISE NOTICE '  ✓ Only admins can approve/reject';
  RAISE NOTICE '  ✓ Users can only see their own requests';
  RAISE NOTICE '============================================';
END $$;
