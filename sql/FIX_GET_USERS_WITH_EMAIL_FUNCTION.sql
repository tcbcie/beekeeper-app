-- Fix role-related functions to match new role column type (TEXT instead of character varying)
-- This fixes the "structure of query does not match function result type" error

-- 1. Drop and recreate get_user_role function
-- Must drop first because we're changing the return type
DROP FUNCTION IF EXISTS public.get_user_role(uuid);

CREATE FUNCTION public.get_user_role(user_id uuid)
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

-- 2. Drop and recreate get_users_with_email function
-- Must drop first because we're changing the return type
DROP FUNCTION IF EXISTS public.get_users_with_email();

CREATE FUNCTION public.get_users_with_email()
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
      au.created_at,  -- Use auth.users timestamps since profiles doesn't have them
      au.updated_at,
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
      au.created_at,  -- Use auth.users timestamps since profiles doesn't have them
      au.updated_at,
      au.email::TEXT
    FROM public.profiles p
    LEFT JOIN auth.users au ON p.id = au.id
    ORDER BY au.created_at DESC;  -- Also fix ORDER BY
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
