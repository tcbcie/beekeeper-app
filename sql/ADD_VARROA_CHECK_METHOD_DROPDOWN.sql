-- Add Varroa Check Method dropdown category and default values
-- This allows administrators to manage varroa check methods through the Settings > Dropdown Values section

-- First, check if the category already exists
DO $$
DECLARE
  category_id_var UUID;
BEGIN
  -- Check if category exists
  SELECT id INTO category_id_var
  FROM dropdown_categories
  WHERE category_key = 'varroa_check_method';

  IF category_id_var IS NULL THEN
    -- Insert the category
    INSERT INTO dropdown_categories (category_name, category_key, description, created_at, updated_at)
    VALUES (
      'Varroa Check Method',
      'varroa_check_method',
      'Methods for conducting varroa mite checks',
      NOW(),
      NOW()
    )
    RETURNING id INTO category_id_var;

    RAISE NOTICE 'Created Varroa Check Method category with ID: %', category_id_var;

    -- Insert default values
    INSERT INTO dropdown_values (category_id, value, display_order, is_active) VALUES
      (category_id_var, 'Alcohol Wash', 1, true),
      (category_id_var, 'Sugar Shake', 2, true),
      (category_id_var, 'Sticky Board', 3, true),
      (category_id_var, 'Drone Brood Inspection', 4, true),
      (category_id_var, 'Visual Inspection', 5, true);

    RAISE NOTICE 'Added 5 default varroa check methods';
  ELSE
    RAISE NOTICE 'Varroa Check Method category already exists with ID: %', category_id_var;
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
WHERE c.category_key = 'varroa_check_method'
ORDER BY v.display_order;

-- Summary
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Varroa Check Method dropdown configured!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '  - Uses existing dropdown system';
  RAISE NOTICE '  - Admin-editable via Settings > Dropdown Values';
  RAISE NOTICE '  - Default methods added';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Update Varroa Check form to use dropdown';
  RAISE NOTICE '  2. Test in Settings > Dropdown Values';
  RAISE NOTICE '========================================';
END $$;
