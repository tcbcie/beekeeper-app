-- Step 1: Rename genetics column to subspecies in queens table
ALTER TABLE queens
RENAME COLUMN genetics TO subspecies;

-- Step 2: Add comment to the column
COMMENT ON COLUMN queens.subspecies IS 'Bee subspecies or breed (e.g., Italian, Carniolan, Buckfast)';

-- Step 2b: Add lineage column to queens table
ALTER TABLE queens
ADD COLUMN lineage TEXT;

-- Step 2c: Add comment to the lineage column
COMMENT ON COLUMN queens.lineage IS 'Queen lineage or breeder line information';

-- Step 3: Create dropdown category for bee subspecies
INSERT INTO dropdown_categories (category_name, category_key, description)
VALUES (
  'Bee Subspecies',
  'bee_subspecies',
  'Common bee subspecies and breeds for queen classification'
);

-- Step 4: Add common bee subspecies values
-- Note: Replace 'CATEGORY_ID' with the actual ID from the previous insert
-- Or use a subquery to get the ID automatically
INSERT INTO dropdown_values (category_id, value, display_order, is_active)
SELECT
  id as category_id,
  unnest(ARRAY[
    'Italian (Apis mellifera ligustica)',
    'Carniolan (Apis mellifera carnica)',
    'Buckfast',
    'Russian',
    'Caucasian (Apis mellifera caucasia)',
    'German/European Dark Bee (Apis mellifera mellifera)',
    'Africanized',
    'VSH (Varroa Sensitive Hygiene)',
    'Hybrid',
    'Unknown'
  ]) as value,
  generate_series(1, 10) as display_order,
  true as is_active
FROM dropdown_categories
WHERE category_key = 'bee_subspecies';
