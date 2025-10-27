-- Create a function to get user email by user_id
-- This is needed because auth.users is not directly accessible from the client

CREATE OR REPLACE FUNCTION public.get_user_email(search_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = search_user_id;

  RETURN COALESCE(user_email, 'Unknown');
END;
$$;

SELECT 'Created: get_user_email() function' as step;

-- Test the function
SELECT 'Testing function with current user:' as step;
SELECT get_user_email(auth.uid()) as my_email;

SELECT 'COMPLETE! You can now get user email by user_id from the client.' as final_message;
SELECT 'Usage: SELECT get_user_email(''user-uuid-here'')' as usage;
