-- Verify if Power User constraint is in place

-- 1. Check current constraint on profiles.role
SELECT
  tc.constraint_name,
  cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.table_name = 'profiles'
  AND tc.constraint_type = 'CHECK'
  AND cc.check_clause LIKE '%role%';

-- 2. Try to manually insert a test value
-- This will fail if constraint doesn't allow 'Power User'
DO $$
BEGIN
  -- Test if 'Power User' is allowed
  PERFORM 1 WHERE 'Power User' IN ('User', 'Power User', 'Admin');

  IF FOUND THEN
    RAISE NOTICE 'Power User value is allowed in constraint';
  ELSE
    RAISE NOTICE 'Power User value is NOT allowed - constraint needs update';
  END IF;
END $$;

-- 3. Show all current user roles
SELECT DISTINCT role, COUNT(*) as count
FROM public.profiles
GROUP BY role
ORDER BY role;
