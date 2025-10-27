-- Check the actual column names in each table to fix the hive_id error

-- Check queens table structure
SELECT 'queens table columns:' as step;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'queens'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check inspections table structure
SELECT 'inspections table columns:' as step;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'inspections'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check varroa_checks table structure
SELECT 'varroa_checks table columns:' as step;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'varroa_checks'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check varroa_treatments table structure
SELECT 'varroa_treatments table columns:' as step;
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'varroa_treatments'
  AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'DONE - Check the column names above' as final_message;
