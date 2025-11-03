-- Add Feed Type dropdown category and default values
-- This allows administrators to manage feed types through the Settings > Dropdown Values section

-- First, check if the category already exists
DO $$
DECLARE
  category_id_var UUID;
BEGIN
  -- Check if category exists
  SELECT id INTO category_id_var
  FROM dropdown_categories
  WHERE category_key = 'feed_type';

  IF category_id_var IS NULL THEN
    -- Insert the category
    INSERT INTO dropdown_categories (category_name, category_key, description, created_at, updated_at)
    VALUES (
      'Feed Type',
      'feed_type',
      'Types of feed that can be given to hives',
      NOW(),
      NOW()
    )
    RETURNING id INTO category_id_var;

    RAISE NOTICE 'Created Feed Type category with ID: %', category_id_var;

    -- Insert default values
    INSERT INTO dropdown_values (category_id, value, display_order, is_active) VALUES
      (category_id_var, 'Sugar Syrup (1:1)', 1, true),
      (category_id_var, 'Sugar Syrup (2:1)', 2, true),
      (category_id_var, 'Fondant', 3, true),
      (category_id_var, 'Candy Board', 4, true),
      (category_id_var, 'Pollen Patty', 5, true),
      (category_id_var, 'Protein Supplement', 6, true),
      (category_id_var, 'HiveAlive', 7, true),
      (category_id_var, 'ApiHerb', 8, true),
      (category_id_var, 'Other', 9, true);

    RAISE NOTICE 'Added 9 default feed types';
  ELSE
    RAISE NOTICE 'Feed Type category already exists with ID: %', category_id_var;
  END IF;
END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

-- Show the created category and values
SELECT
  c.category_name,
  c.category_key,
  c.description,
  v.value,
  v.display_order,
  v.is_active
FROM dropdown_categories c
LEFT JOIN dropdown_values v ON c.id = v.category_id
WHERE c.category_key = 'feed_type'
ORDER BY v.display_order;

-- Summary
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Feed Type dropdown configured!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '  - Uses existing dropdown system';
  RAISE NOTICE '  - Admin-editable via Settings > Dropdown Values';
  RAISE NOTICE '  - Default feed types added';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Feed Types:';
  RAISE NOTICE '  - Sugar Syrup (1:1) - Spring feeding';
  RAISE NOTICE '  - Sugar Syrup (2:1) - Winter stores';
  RAISE NOTICE '  - Fondant - Emergency winter feed';
  RAISE NOTICE '  - Candy Board - Solid winter feed';
  RAISE NOTICE '  - Pollen Patty - Protein supplement';
  RAISE NOTICE '  - Protein Supplement - Brood building';
  RAISE NOTICE '  - HiveAlive - Commercial supplement';
  RAISE NOTICE '  - ApiHerb - Herbal supplement';
  RAISE NOTICE '  - Other - Custom feed type';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Update Feeding form to use dropdown';
  RAISE NOTICE '  2. Test in Settings > Dropdown Values';
  RAISE NOTICE '========================================';
END $$;
