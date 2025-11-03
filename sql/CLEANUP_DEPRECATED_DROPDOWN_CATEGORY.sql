-- Remove deprecated "Varroa Treatment Product Name" dropdown category
-- This category is no longer needed as varroa treatment products are now managed
-- through the dedicated "Varroa Treatments" section in Settings

DO $$
DECLARE
  category_id_var UUID;
  values_count INTEGER;
BEGIN
  -- Find the deprecated category
  SELECT id INTO category_id_var
  FROM dropdown_categories
  WHERE category_key = 'varroa_treatment_product';

  IF category_id_var IS NOT NULL THEN
    -- Count how many values exist
    SELECT COUNT(*) INTO values_count
    FROM dropdown_values
    WHERE category_id = category_id_var;

    RAISE NOTICE 'Found deprecated category "Varroa Treatment Product Name" with % values', values_count;

    -- Delete associated values first
    DELETE FROM dropdown_values
    WHERE category_id = category_id_var;

    RAISE NOTICE 'Deleted % values', values_count;

    -- Delete the category
    DELETE FROM dropdown_categories
    WHERE id = category_id_var;

    RAISE NOTICE 'Deleted category "Varroa Treatment Product Name"';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Cleanup complete!';
    RAISE NOTICE 'Varroa treatment products are now managed in Settings > Varroa Treatments';
    RAISE NOTICE '========================================';
  ELSE
    RAISE NOTICE 'Category "varroa_treatment_product" not found - already cleaned up or never existed';
  END IF;
END $$;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
