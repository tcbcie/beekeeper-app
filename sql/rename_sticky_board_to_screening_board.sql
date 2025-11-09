-- ============================================================================
-- RENAME "Sticky Board" TO "Screening Board" IN VARROA CHECK METHODS
-- ============================================================================

-- Update the dropdown_values table to rename the method
UPDATE public.dropdown_values
SET value = 'Screening Board'
WHERE value = 'Sticky Board'
  AND category_id IN (
    SELECT id FROM public.dropdown_categories
    WHERE category_key = 'varroa_check_method'
  );

-- Update any existing varroa_checks records that use the old name
UPDATE public.varroa_checks
SET method = 'Screening Board'
WHERE method = 'Sticky Board';

-- Verify the changes
SELECT 'Updated dropdown values' as status, COUNT(*) as count
FROM public.dropdown_values
WHERE value = 'Screening Board'
  AND category_id IN (
    SELECT id FROM public.dropdown_categories
    WHERE category_key = 'varroa_check_method'
  );

SELECT 'Updated varroa checks' as status, COUNT(*) as count
FROM public.varroa_checks
WHERE method = 'Screening Board';
