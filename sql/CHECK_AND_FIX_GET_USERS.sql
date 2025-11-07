-- Check and fix get_users_with_email function

-- 1. Check if function exists and see its definition
SELECT 'Current get_users_with_email function:' as step;
SELECT pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'get_users_with_email';

-- 2. Create or replace the function to ensure it includes is_active
CREATE OR REPLACE FUNCTION public.get_users_with_email()
RETURNS TABLE (
  id UUID,
  email TEXT,
  role TEXT,
  is_active BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.email,
    p.role::TEXT,
    COALESCE(p.is_active, true) as is_active,
    p.created_at,
    p.created_at as updated_at  -- profiles doesn't have updated_at, use created_at
  FROM public.profiles p
  ORDER BY p.created_at DESC;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_users_with_email() TO authenticated;

-- 3. Test the function
SELECT 'Testing get_users_with_email():' as step;
SELECT * FROM get_users_with_email();

-- 4. Verify
SELECT 'Verification - Direct profiles query:' as step;
SELECT id, email, role, is_active, created_at
FROM public.profiles
ORDER BY created_at DESC;
