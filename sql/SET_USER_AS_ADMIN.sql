-- HELPER SCRIPT: Set a specific user as admin
-- Replace 'your@email.com' with the actual email address

-- Method 1: Set by email address (recommended)
-- UPDATE public.profiles
-- SET role = 'Admin'
-- WHERE email = 'your@email.com';

-- Method 2: Set by user ID
-- UPDATE public.profiles
-- SET role = 'Admin'
-- WHERE id = 'user-uuid-here';

-- To use this script:
-- 1. Uncomment one of the UPDATE statements above
-- 2. Replace the placeholder with actual email or user ID
-- 3. Run the script

-- Example for setting by email:
-- UPDATE public.profiles SET role = 'Admin' WHERE email = 'admin@example.com';

-- Verify the update
SELECT
  id,
  email,
  first_name,
  last_name,
  role,
  created_at
FROM public.profiles
WHERE role = 'Admin'
ORDER BY created_at;

-- Show message
DO $$
DECLARE
  admin_count INT;
BEGIN
  SELECT COUNT(*) INTO admin_count FROM public.profiles WHERE role = 'Admin';

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Current admin user count: %', admin_count;
  RAISE NOTICE '========================================';

  IF admin_count = 0 THEN
    RAISE NOTICE 'No admin users found.';
    RAISE NOTICE 'Uncomment and edit one of the UPDATE statements above,';
    RAISE NOTICE 'then run this script again.';
  ELSE
    RAISE NOTICE 'Admin users listed above can access the Settings page.';
  END IF;

  RAISE NOTICE '========================================';
END $$;
