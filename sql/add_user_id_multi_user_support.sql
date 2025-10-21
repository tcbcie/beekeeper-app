-- Migration: Add user_id columns to all tables for multi-user support
-- Date: 2025-10-21
-- Purpose: Implement proper data isolation between users

-- Add user_id column to apiaries table
ALTER TABLE apiaries ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to hives table
ALTER TABLE hives ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to queens table
ALTER TABLE queens ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to inspections table
ALTER TABLE inspections ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to varroa_checks table
ALTER TABLE varroa_checks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to varroa_treatments table
ALTER TABLE varroa_treatments ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to feedings table
ALTER TABLE feedings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to harvests table
ALTER TABLE harvests ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Add user_id column to rearing_batches table
ALTER TABLE rearing_batches ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create indexes on user_id columns for better query performance
CREATE INDEX IF NOT EXISTS idx_apiaries_user_id ON apiaries(user_id);
CREATE INDEX IF NOT EXISTS idx_hives_user_id ON hives(user_id);
CREATE INDEX IF NOT EXISTS idx_queens_user_id ON queens(user_id);
CREATE INDEX IF NOT EXISTS idx_inspections_user_id ON inspections(user_id);
CREATE INDEX IF NOT EXISTS idx_varroa_checks_user_id ON varroa_checks(user_id);
CREATE INDEX IF NOT EXISTS idx_varroa_treatments_user_id ON varroa_treatments(user_id);
CREATE INDEX IF NOT EXISTS idx_feedings_user_id ON feedings(user_id);
CREATE INDEX IF NOT EXISTS idx_harvests_user_id ON harvests(user_id);
CREATE INDEX IF NOT EXISTS idx_rearing_batches_user_id ON rearing_batches(user_id);

-- Enable Row Level Security (RLS) on all tables
ALTER TABLE apiaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE hives ENABLE ROW LEVEL SECURITY;
ALTER TABLE queens ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE varroa_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE varroa_treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedings ENABLE ROW LEVEL SECURITY;
ALTER TABLE harvests ENABLE ROW LEVEL SECURITY;
ALTER TABLE rearing_batches ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for apiaries
DROP POLICY IF EXISTS "Users can view their own apiaries" ON apiaries;
CREATE POLICY "Users can view their own apiaries" ON apiaries
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own apiaries" ON apiaries;
CREATE POLICY "Users can insert their own apiaries" ON apiaries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own apiaries" ON apiaries;
CREATE POLICY "Users can update their own apiaries" ON apiaries
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own apiaries" ON apiaries;
CREATE POLICY "Users can delete their own apiaries" ON apiaries
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for hives
DROP POLICY IF EXISTS "Users can view their own hives" ON hives;
CREATE POLICY "Users can view their own hives" ON hives
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own hives" ON hives;
CREATE POLICY "Users can insert their own hives" ON hives
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own hives" ON hives;
CREATE POLICY "Users can update their own hives" ON hives
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own hives" ON hives;
CREATE POLICY "Users can delete their own hives" ON hives
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for queens
DROP POLICY IF EXISTS "Users can view their own queens" ON queens;
CREATE POLICY "Users can view their own queens" ON queens
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own queens" ON queens;
CREATE POLICY "Users can insert their own queens" ON queens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own queens" ON queens;
CREATE POLICY "Users can update their own queens" ON queens
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own queens" ON queens;
CREATE POLICY "Users can delete their own queens" ON queens
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for inspections
DROP POLICY IF EXISTS "Users can view their own inspections" ON inspections;
CREATE POLICY "Users can view their own inspections" ON inspections
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own inspections" ON inspections;
CREATE POLICY "Users can insert their own inspections" ON inspections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own inspections" ON inspections;
CREATE POLICY "Users can update their own inspections" ON inspections
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own inspections" ON inspections;
CREATE POLICY "Users can delete their own inspections" ON inspections
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for varroa_checks
DROP POLICY IF EXISTS "Users can view their own varroa_checks" ON varroa_checks;
CREATE POLICY "Users can view their own varroa_checks" ON varroa_checks
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own varroa_checks" ON varroa_checks;
CREATE POLICY "Users can insert their own varroa_checks" ON varroa_checks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own varroa_checks" ON varroa_checks;
CREATE POLICY "Users can update their own varroa_checks" ON varroa_checks
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own varroa_checks" ON varroa_checks;
CREATE POLICY "Users can delete their own varroa_checks" ON varroa_checks
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for varroa_treatments
DROP POLICY IF EXISTS "Users can view their own varroa_treatments" ON varroa_treatments;
CREATE POLICY "Users can view their own varroa_treatments" ON varroa_treatments
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own varroa_treatments" ON varroa_treatments;
CREATE POLICY "Users can insert their own varroa_treatments" ON varroa_treatments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own varroa_treatments" ON varroa_treatments;
CREATE POLICY "Users can update their own varroa_treatments" ON varroa_treatments
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own varroa_treatments" ON varroa_treatments;
CREATE POLICY "Users can delete their own varroa_treatments" ON varroa_treatments
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for feedings
DROP POLICY IF EXISTS "Users can view their own feedings" ON feedings;
CREATE POLICY "Users can view their own feedings" ON feedings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own feedings" ON feedings;
CREATE POLICY "Users can insert their own feedings" ON feedings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own feedings" ON feedings;
CREATE POLICY "Users can update their own feedings" ON feedings
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own feedings" ON feedings;
CREATE POLICY "Users can delete their own feedings" ON feedings
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for harvests
DROP POLICY IF EXISTS "Users can view their own harvests" ON harvests;
CREATE POLICY "Users can view their own harvests" ON harvests
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own harvests" ON harvests;
CREATE POLICY "Users can insert their own harvests" ON harvests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own harvests" ON harvests;
CREATE POLICY "Users can update their own harvests" ON harvests
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own harvests" ON harvests;
CREATE POLICY "Users can delete their own harvests" ON harvests
  FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for rearing_batches
DROP POLICY IF EXISTS "Users can view their own rearing_batches" ON rearing_batches;
CREATE POLICY "Users can view their own rearing_batches" ON rearing_batches
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own rearing_batches" ON rearing_batches;
CREATE POLICY "Users can insert their own rearing_batches" ON rearing_batches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own rearing_batches" ON rearing_batches;
CREATE POLICY "Users can update their own rearing_batches" ON rearing_batches
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own rearing_batches" ON rearing_batches;
CREATE POLICY "Users can delete their own rearing_batches" ON rearing_batches
  FOR DELETE USING (auth.uid() = user_id);

-- Note: dropdown_categories and dropdown_values remain shared (no user_id)
-- These are system-wide configuration tables accessible to all users
