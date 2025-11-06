-- Update all database functions to use 'profiles' instead of 'user_profiles'

-- 1. Update delete_user function
CREATE OR REPLACE FUNCTION public.delete_user(user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Only allow admin users to delete auth accounts
  -- Check if the current user is an admin
  IF NOT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid()
    AND role = 'Admin'
  ) THEN
    RAISE EXCEPTION 'Only admin users can delete auth accounts';
  END IF;

  -- Prevent users from deleting their own auth account
  IF user_id = auth.uid() THEN
    RAISE EXCEPTION 'Cannot delete your own auth account';
  END IF;

  -- Delete from auth.users (this will cascade to auth.identities and other auth tables)
  DELETE FROM auth.users WHERE id = user_id;

  -- Log the deletion (optional - you can remove this if you don't want logging)
  RAISE NOTICE 'Auth user % deleted by admin %', user_id, auth.uid();
END;
$function$;

-- 2. Update get_user_role function
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
 RETURNS character varying
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  user_role VARCHAR(50);
BEGIN
  SELECT role INTO user_role
  FROM profiles
  WHERE id = user_id;

  RETURN COALESCE(user_role, 'User');
END;
$function$;

-- 3. Update get_users_with_email function
CREATE OR REPLACE FUNCTION public.get_users_with_email()
 RETURNS TABLE(id uuid, role character varying, created_at timestamp with time zone, updated_at timestamp with time zone, email text)
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
      NULL::timestamp with time zone as updated_at,
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
      NULL::timestamp with time zone as updated_at,
      au.email::TEXT
    FROM public.profiles p
    LEFT JOIN auth.users au ON p.id = au.id
    ORDER BY p.created_at DESC;
  END IF;
END;
$function$;

-- 4. Update handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'User');
  RETURN NEW;
END;
$function$;

-- 5. Update has_valid_invitation function
CREATE OR REPLACE FUNCTION public.has_valid_invitation(team_uuid uuid, user_uuid uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM team_invitations
    WHERE team_id = team_uuid
    AND (
      email = (SELECT email FROM profiles WHERE id = user_uuid)
      OR email = (SELECT email FROM auth.users WHERE id = user_uuid)
    )
    AND status = 'pending'
    AND expires_at > NOW()
  );
$function$;

-- 6. Update is_admin function
CREATE OR REPLACE FUNCTION public.is_admin(user_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id AND role = 'Admin'
  );
END;
$function$;

-- 7. Update is_current_user_admin function
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  user_role VARCHAR(50);
BEGIN
  SELECT role INTO user_role
  FROM public.profiles
  WHERE id = auth.uid()
  LIMIT 1;

  RETURN COALESCE(user_role = 'Admin', FALSE);
END;
$function$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

-- Summary
DO $$
BEGIN
  RAISE NOTICE '============================================';
  RAISE NOTICE 'FUNCTIONS UPDATED!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Updated 7 functions to use profiles table:';
  RAISE NOTICE '  - delete_user';
  RAISE NOTICE '  - get_user_role';
  RAISE NOTICE '  - get_users_with_email';
  RAISE NOTICE '  - handle_new_user';
  RAISE NOTICE '  - has_valid_invitation';
  RAISE NOTICE '  - is_admin';
  RAISE NOTICE '  - is_current_user_admin';
  RAISE NOTICE 'Schema cache reload notification sent';
  RAISE NOTICE '============================================';
END $$;
