-- Fix varroa_treatments table structure
-- The current varroa_treatments table is actually a product catalog
-- This migration:
-- 1. Renames varroa_treatments to varroa_treatment_products (product catalog)
-- 2. Creates a new varroa_treatments table for actual treatment records

-- Step 1: Rename the existing table (if it exists and hasn't been renamed yet)
DO $$
BEGIN
  -- Check if varroa_treatment_products doesn't exist but varroa_treatments does
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'varroa_treatment_products')
     AND EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'varroa_treatments')
  THEN
    -- Check if the existing varroa_treatments has the product catalog structure
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'varroa_treatments'
      AND column_name = 'active_ingredients'
    ) AND NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'varroa_treatments'
      AND column_name = 'hive_id'
    )
    THEN
      -- It's the product catalog, rename it
      ALTER TABLE varroa_treatments RENAME TO varroa_treatment_products;

      -- Rename the primary key constraint (if it exists)
      BEGIN
        ALTER TABLE varroa_treatment_products RENAME CONSTRAINT varroa_treatments_pkey TO varroa_treatment_products_pkey;
      EXCEPTION
        WHEN undefined_object THEN
          -- Constraint doesn't exist or already renamed, ignore
          NULL;
      END;

      -- Rename indexes
      ALTER INDEX IF EXISTS idx_varroa_treatments_product_name RENAME TO idx_varroa_treatment_products_product_name;
      ALTER INDEX IF EXISTS idx_varroa_treatments_active_ingredients RENAME TO idx_varroa_treatment_products_active_ingredients;
    END IF;
  END IF;
END $$;

-- Step 2: Create the actual varroa_treatments table for treatment records
CREATE TABLE IF NOT EXISTS public.varroa_treatments (
  id UUID NOT NULL DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  hive_id UUID NOT NULL REFERENCES public.hives(id) ON DELETE CASCADE,
  treatment_date DATE NOT NULL,
  treatment_type TEXT NOT NULL,
  product_name TEXT NULL,
  dosage TEXT NULL,
  temperature DECIMAL(4,1) NULL,
  weather_conditions TEXT NULL,
  notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT varroa_treatments_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_varroa_treatments_user_id ON public.varroa_treatments(user_id);
CREATE INDEX IF NOT EXISTS idx_varroa_treatments_hive_id ON public.varroa_treatments(hive_id);
CREATE INDEX IF NOT EXISTS idx_varroa_treatments_treatment_date ON public.varroa_treatments(treatment_date);

-- Add comments
COMMENT ON TABLE public.varroa_treatments IS 'Records of varroa treatments applied to hives';
COMMENT ON COLUMN public.varroa_treatments.user_id IS 'User who recorded the treatment';
COMMENT ON COLUMN public.varroa_treatments.hive_id IS 'Hive that received the treatment';
COMMENT ON COLUMN public.varroa_treatments.treatment_date IS 'Date the treatment was applied';
COMMENT ON COLUMN public.varroa_treatments.treatment_type IS 'Type/name of treatment applied';
COMMENT ON COLUMN public.varroa_treatments.product_name IS 'Optional product name if different from type';
COMMENT ON COLUMN public.varroa_treatments.dosage IS 'Dosage/amount applied';
COMMENT ON COLUMN public.varroa_treatments.temperature IS 'Temperature in Celsius when treatment was applied';
COMMENT ON COLUMN public.varroa_treatments.weather_conditions IS 'Weather conditions during treatment';
COMMENT ON COLUMN public.varroa_treatments.notes IS 'Additional notes about the treatment';

-- Enable RLS on the varroa_treatments table
ALTER TABLE public.varroa_treatments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (in case table was created before)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view their own varroa treatments" ON public.varroa_treatments;
  DROP POLICY IF EXISTS "Users can insert their own varroa treatments" ON public.varroa_treatments;
  DROP POLICY IF EXISTS "Users can update their own varroa treatments" ON public.varroa_treatments;
  DROP POLICY IF EXISTS "Users can delete their own varroa treatments" ON public.varroa_treatments;
EXCEPTION
  WHEN undefined_column THEN
    -- Table doesn't have user_id column yet, policies don't exist, ignore
    NULL;
  WHEN undefined_table THEN
    -- Table doesn't exist yet, policies don't exist, ignore
    NULL;
END $$;

-- Create RLS policies
CREATE POLICY "Users can view their own varroa treatments"
  ON public.varroa_treatments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own varroa treatments"
  ON public.varroa_treatments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own varroa treatments"
  ON public.varroa_treatments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own varroa treatments"
  ON public.varroa_treatments FOR DELETE
  USING (auth.uid() = user_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to auto-update updated_at
DROP TRIGGER IF EXISTS update_varroa_treatments_updated_at ON public.varroa_treatments;
CREATE TRIGGER update_varroa_treatments_updated_at
  BEFORE UPDATE ON public.varroa_treatments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
