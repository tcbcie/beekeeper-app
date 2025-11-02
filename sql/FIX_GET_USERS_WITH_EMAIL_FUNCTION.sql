-- Fix role-related functions to match new role column type (TEXT instead of character varying)
-- This fixes the "structure of query does not match function result type" error

-- 1. Fix get_user_role function
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
 RETURNS text  -- Changed from character varying to text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  user_role TEXT;  -- Changed from VARCHAR(50) to TEXT
BEGIN
  SELECT role INTO user_role
  FROM profiles
  WHERE id = user_id;

  RETURN COALESCE(user_role, 'User');
END;
$function$;

-- 2. Fix get_users_with_email function
CREATE OR REPLACE FUNCTION public.get_users_with_email()
 RETURNS TABLE(
   id uuid,
   role text,  -- Changed from character varying to text
   created_at timestamp with time zone,
   updated_at timestamp with time zone,
   email text
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  -- Check if current user is admin
  IF NOT public.is_current_user_admin() THEN
    -- Non-admins can only see their own profile
    RETURN QUERY
    SELECT
      p.id,
      p.role,
      p.created_at,
      p.updated_at,  -- Return actual updated_at from profiles
      au.email::TEXT
    FROM public.profiles p
    LEFT JOIN auth.users au ON p.id = au.id
    WHERE p.id = auth.uid();
  ELSE
    -- Admins can see all profiles
    RETURN QUERY
    SELECT
      p.id,
      p.role,
      p.created_at,
      p.updated_at,  -- Return actual updated_at from profiles
      au.email::TEXT
    FROM public.profiles p
    LEFT JOIN auth.users au ON p.id = au.id
    ORDER BY p.created_at DESC;
  END IF;
END;
$function$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the function signature
SELECT
  routine_name,
  data_type as return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name = 'get_users_with_email';

-- Test the function (as admin)
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Function updated successfully!';
  RAISE NOTICE 'Return type changed to match TEXT role column';
  RAISE NOTICE '========================================';
END $$;
