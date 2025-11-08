-- Add Power User role support
-- This migration handles both enum-based and text-based role columns

DO $$
DECLARE
  column_type TEXT;
  enum_exists BOOLEAN;
BEGIN
  -- Check what type the role column is
  SELECT data_type INTO column_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'role';

  RAISE NOTICE 'Current role column type: %', column_type;

  -- If it's a USER-DEFINED type (enum), try to add the value
  IF column_type = 'USER-DEFINED' THEN
    -- Check if user_role enum exists
    SELECT EXISTS (
      SELECT 1 FROM pg_type WHERE typname = 'user_role'
    ) INTO enum_exists;

    IF enum_exists THEN
      -- Check if 'Power User' already exists in the enum
      IF NOT EXISTS (
        SELECT 1
        FROM pg_enum e
        JOIN pg_type t ON e.enumtypid = t.oid
        WHERE t.typname = 'user_role'
        AND e.enumlabel = 'Power User'
      ) THEN
        ALTER TYPE user_role ADD VALUE 'Power User';
        RAISE NOTICE 'Added "Power User" to user_role enum';
      ELSE
        RAISE NOTICE '"Power User" already exists in user_role enum';
      END IF;
    END IF;

  -- If it's TEXT or CHARACTER VARYING, add a check constraint
  ELSIF column_type IN ('text', 'character varying') THEN
    RAISE NOTICE 'Role column is TEXT-based. Adding check constraint...';

    -- Drop existing constraint if it exists
    IF EXISTS (
      SELECT 1
      FROM information_schema.table_constraints
      WHERE constraint_name = 'profiles_role_check'
        AND table_name = 'profiles'
        AND table_schema = 'public'
    ) THEN
      ALTER TABLE public.profiles DROP CONSTRAINT profiles_role_check;
      RAISE NOTICE 'Dropped existing role check constraint';
    END IF;

    -- Add new constraint with Power User included
    ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_role_check
    CHECK (role IN ('User', 'Power User', 'Admin'));

    RAISE NOTICE 'Added check constraint with Power User role';

  ELSE
    RAISE NOTICE 'Unknown role column type: %. No changes made.', column_type;
  END IF;

  -- Final verification message
  RAISE NOTICE '============================================';
  RAISE NOTICE 'POWER USER ROLE CONFIGURATION COMPLETE!';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'The role column now supports:';
  RAISE NOTICE '1. User - Standard access';
  RAISE NOTICE '2. Power User - Enhanced access (NEW!)';
  RAISE NOTICE '3. Admin - Full administrative access';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now assign users the "Power User" role';
  RAISE NOTICE 'through the User Management interface.';
  RAISE NOTICE '============================================';
END $$;
