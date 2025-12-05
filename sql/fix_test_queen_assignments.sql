-- Fix test data: Assign Q2024 queens to hives H1-H6
-- This script assigns test queens to test hives
-- Note: Only H1-H6 exist in the database, H7-H10 were not created

-- Update hives to assign queens (case-insensitive status check)
UPDATE hives h
SET queen_id = q.id
FROM queens q
WHERE h.hive_number = 'H1'
  AND q.queen_number = 'Q2024-001'
  AND LOWER(h.status) = 'active';

UPDATE hives h
SET queen_id = q.id
FROM queens q
WHERE h.hive_number = 'H2'
  AND q.queen_number = 'Q2024-002'
  AND LOWER(h.status) = 'active';

UPDATE hives h
SET queen_id = q.id
FROM queens q
WHERE h.hive_number = 'H3'
  AND q.queen_number = 'Q2024-003'
  AND LOWER(h.status) = 'active';

UPDATE hives h
SET queen_id = q.id
FROM queens q
WHERE h.hive_number = 'H4'
  AND q.queen_number = 'Q2024-004'
  AND LOWER(h.status) = 'active';

UPDATE hives h
SET queen_id = q.id
FROM queens q
WHERE h.hive_number = 'H5'
  AND q.queen_number = 'Q2024-005'
  AND LOWER(h.status) IN ('active', 'weak');

UPDATE hives h
SET queen_id = q.id
FROM queens q
WHERE h.hive_number = 'H6'
  AND q.queen_number = 'Q2024-006'
  AND LOWER(h.status) = 'active';

-- Verify the assignments
SELECT
  h.hive_number,
  q.queen_number,
  a.name as apiary_name
FROM hives h
JOIN queens q ON h.queen_id = q.id
JOIN apiaries a ON h.apiary_id = a.id
WHERE h.hive_number IN ('H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7', 'H8', 'H9', 'H10')
  AND h.status = 'active'
ORDER BY h.hive_number;
