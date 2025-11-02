-- Check what columns actually exist in profiles table
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

-- Also get a sample row to see actual data
SELECT * FROM profiles LIMIT 1;
