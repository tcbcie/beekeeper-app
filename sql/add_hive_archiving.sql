-- ============================================================================
-- ADD HIVE ARCHIVING FEATURE
-- ============================================================================
-- Add ability to archive hives with reasons for winter losses, drone laying
-- queens, dissolved colonies, etc. Uses dropdown_categories/dropdown_values.
-- ============================================================================

-- Add archive-related columns to hives table
ALTER TABLE public.hives
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archive_reason_id UUID REFERENCES public.dropdown_values(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS archive_notes TEXT;

-- Add comments
COMMENT ON COLUMN public.hives.archived_at IS 'When the hive was archived (NULL = not archived)';
COMMENT ON COLUMN public.hives.archive_reason_id IS 'Reference to dropdown_values for archiving reason';
COMMENT ON COLUMN public.hives.archive_notes IS 'Optional additional notes about archiving';

-- Add Archive Reason dropdown category and default values
DO $$
DECLARE
  category_id_var UUID;
BEGIN
  -- Check if category exists
  SELECT id INTO category_id_var
  FROM dropdown_categories
  WHERE category_key = 'archive_reason';

  IF category_id_var IS NULL THEN
    -- Insert the category
    INSERT INTO dropdown_categories (category_name, category_key, description, created_at, updated_at)
    VALUES (
      'Archive Reason',
      'archive_reason',
      'Reasons for archiving a hive (winter loss, drone laying queen, etc.)',
      NOW(),
      NOW()
    )
    RETURNING id INTO category_id_var;

    RAISE NOTICE 'Created Archive Reason category with ID: %', category_id_var;

    -- Insert default values
    INSERT INTO dropdown_values (category_id, value, display_order, is_active) VALUES
      (category_id_var, 'Winter Loss', 1, true),
      (category_id_var, 'Drone Laying Queen', 2, true),
      (category_id_var, 'Queenless - Failed to Requeen', 3, true),
      (category_id_var, 'Absconded', 4, true),
      (category_id_var, 'Disease/Pest Infestation', 5, true),
      (category_id_var, 'Weak Colony - Combined', 6, true),
      (category_id_var, 'Aggressive Behavior', 7, true),
      (category_id_var, 'Sold', 8, true),
      (category_id_var, 'Donated/Given Away', 9, true),
      (category_id_var, 'Equipment Retired', 10, true),
      (category_id_var, 'Other', 99, true);

    RAISE NOTICE 'Added 11 default archive reasons';
  ELSE
    RAISE NOTICE 'Archive Reason category already exists with ID: %', category_id_var;
  END IF;
END $$;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_hives_archived_at ON public.hives(archived_at);
CREATE INDEX IF NOT EXISTS idx_hives_archive_reason_id ON public.hives(archive_reason_id);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';

-- Verification - show hives table columns
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'hives'
  AND column_name IN ('archived_at', 'archive_reason_id', 'archive_notes')
ORDER BY column_name;

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
WHERE c.category_key = 'archive_reason'
ORDER BY v.display_order;

-- Summary
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Hive Archiving Feature Configured!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Features:';
  RAISE NOTICE '  - Uses existing dropdown system';
  RAISE NOTICE '  - Admin-editable via Settings > Dropdown Values';
  RAISE NOTICE '  - Tracks archive date and reason';
  RAISE NOTICE '  - Optional notes field';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Archive Reasons:';
  RAISE NOTICE '  - Winter Loss';
  RAISE NOTICE '  - Drone Laying Queen';
  RAISE NOTICE '  - Queenless - Failed to Requeen';
  RAISE NOTICE '  - Absconded';
  RAISE NOTICE '  - Disease/Pest Infestation';
  RAISE NOTICE '  - Weak Colony - Combined';
  RAISE NOTICE '  - Aggressive Behavior';
  RAISE NOTICE '  - Sold';
  RAISE NOTICE '  - Donated/Given Away';
  RAISE NOTICE '  - Equipment Retired';
  RAISE NOTICE '  - Other';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Add Archive option to Records page';
  RAISE NOTICE '  2. Update Hives page to show/filter archived hives';
  RAISE NOTICE '  3. Test archiving workflow';
  RAISE NOTICE '========================================';
END $$;
