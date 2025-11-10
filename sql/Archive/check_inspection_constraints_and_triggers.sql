-- ============================================================================
-- CHECK INSPECTION CONSTRAINTS AND TRIGGERS
-- ============================================================================
-- Check for any constraints or triggers that might be causing 400 Bad Request
-- ============================================================================

-- Check all constraints on inspections table
SELECT
  con.conname AS constraint_name,
  con.contype AS constraint_type,
  CASE con.contype
    WHEN 'c' THEN 'CHECK'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 't' THEN 'CONSTRAINT TRIGGER'
    WHEN 'x' THEN 'EXCLUSION'
  END AS constraint_type_name,
  pg_get_constraintdef(con.oid) AS constraint_definition
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
WHERE rel.relname = 'inspections'
  AND nsp.nspname = 'public'
ORDER BY con.contype, con.conname;

-- Check all triggers on inspections table
SELECT
  tgname AS trigger_name,
  tgenabled AS is_enabled,
  pg_get_triggerdef(oid) AS trigger_definition
FROM pg_trigger
WHERE tgrelid = 'public.inspections'::regclass
  AND tgisinternal = false
ORDER BY tgname;

-- Check the table's RLS status and policies
SELECT
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE tablename = 'inspections'
  AND schemaname = 'public';

-- List all RLS policies
SELECT
  policyname,
  cmd AS command,
  permissive,
  roles,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_policies
WHERE tablename = 'inspections'
  AND schemaname = 'public'
ORDER BY cmd, policyname;

-- Check column defaults and nullability
SELECT
  column_name,
  data_type,
  character_maximum_length,
  is_nullable,
  column_default,
  CASE
    WHEN is_nullable = 'NO' AND column_default IS NULL THEN 'MUST BE PROVIDED'
    WHEN is_nullable = 'NO' AND column_default IS NOT NULL THEN 'HAS DEFAULT'
    ELSE 'OPTIONAL'
  END AS requirement_status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'inspections'
ORDER BY ordinal_position;
