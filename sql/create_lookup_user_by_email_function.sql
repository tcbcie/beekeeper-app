-- Create a function to lookup users by email
-- This is needed because auth.users is not directly accessible from the client
-- and user_profiles may not have email column

CREATE OR REPLACE FUNCTION public.lookup_user_by_email(search_email TEXT)
RETURNS TABLE(user_id UUID, email TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    au.id as user_id,
    au.email::TEXT as email
  FROM auth.users au
  WHERE LOWER(au.email) = LOWER(search_email)
  LIMIT 1;
END;
$$;

SELECT 'Created: lookup_user_by_email() function' as step;

-- Test the function
SELECT 'Testing function with current user:' as step;
SELECT * FROM public.lookup_user_by_email(
  (SELECT email FROM auth.users WHERE id = auth.uid())
);

SELECT 'COMPLETE! You can now lookup users by email from the client.' as final_message;
SELECT 'Usage: SELECT * FROM lookup_user_by_email(''user@example.com'')' as usage;
