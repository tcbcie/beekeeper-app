-- Check foreign keys on varroa_treatments table

-- 1. Show all foreign keys on varroa_treatments
SELECT
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'varroa_treatments'
  AND tc.table_schema = 'public';

-- 2. Check if there's a foreign key from varroa_treatments.user_id to profiles.id
SELECT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND tc.table_name = 'varroa_treatments'
      AND kcu.column_name = 'user_id'
      AND ccu.table_name = 'profiles'
) AS has_user_id_fk_to_profiles;
