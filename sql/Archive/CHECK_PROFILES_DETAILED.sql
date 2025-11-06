-- Check detailed profiles table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default,
  is_generated,
  generation_expression
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'profiles'
ORDER BY ordinal_position;

-- Check sample data to see what's populated
SELECT id, first_name, last_name, full_name, email FROM profiles LIMIT 5;
