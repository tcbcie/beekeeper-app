-- Beekeeper App - Settings Database Migration
-- This migration creates tables to manage dropdown values used throughout the application

-- =====================================================
-- Table: dropdown_categories
-- Purpose: Stores categories of dropdown menus (e.g., queen_source, queen_status, honey_stores_level)
-- =====================================================
CREATE TABLE IF NOT EXISTS dropdown_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_name VARCHAR(100) NOT NULL,
  category_key VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add comment to table
COMMENT ON TABLE dropdown_categories IS 'Stores categories of dropdown menus used across the beekeeper application';
COMMENT ON COLUMN dropdown_categories.category_name IS 'Human-readable name for the category (e.g., "Queen Source")';
COMMENT ON COLUMN dropdown_categories.category_key IS 'System key for the category (e.g., "queen_source"), used in code';
COMMENT ON COLUMN dropdown_categories.description IS 'Optional description of what this category is used for';

-- =====================================================
-- Table: dropdown_values
-- Purpose: Stores individual values for each dropdown category
-- =====================================================
CREATE TABLE IF NOT EXISTS dropdown_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES dropdown_categories(id) ON DELETE CASCADE,
  value VARCHAR(100) NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_category_value UNIQUE (category_id, value)
);

-- Add comment to table
COMMENT ON TABLE dropdown_values IS 'Stores individual values for dropdown menus';
COMMENT ON COLUMN dropdown_values.category_id IS 'Foreign key to dropdown_categories';
COMMENT ON COLUMN dropdown_values.value IS 'The actual dropdown value displayed to users';
COMMENT ON COLUMN dropdown_values.display_order IS 'Order in which values should appear in the dropdown (ascending)';
COMMENT ON COLUMN dropdown_values.is_active IS 'Whether this value is active and should be shown in dropdowns';

-- =====================================================
-- Indexes for better query performance
-- =====================================================
CREATE INDEX idx_dropdown_values_category_id ON dropdown_values(category_id);
CREATE INDEX idx_dropdown_values_display_order ON dropdown_values(display_order);
CREATE INDEX idx_dropdown_values_is_active ON dropdown_values(is_active);
CREATE INDEX idx_dropdown_categories_category_key ON dropdown_categories(category_key);

-- =====================================================
-- Function to update updated_at timestamp
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- =====================================================
-- Triggers to automatically update updated_at
-- =====================================================
CREATE TRIGGER update_dropdown_categories_updated_at BEFORE UPDATE ON dropdown_categories
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dropdown_values_updated_at BEFORE UPDATE ON dropdown_values
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Seed Data: Initial dropdown categories and values
-- =====================================================
-- Note: Queen marking colors are hardcoded in the application and not managed here

-- Category: Queen Source
INSERT INTO dropdown_categories (category_name, category_key, description)
VALUES ('Queen Source', 'queen_source', 'Where the queen came from (bred, purchased, or swarm)')
ON CONFLICT (category_key) DO NOTHING;

INSERT INTO dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Bred', 1, TRUE FROM dropdown_categories WHERE category_key = 'queen_source'
ON CONFLICT (category_id, value) DO NOTHING;

INSERT INTO dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Purchased', 2, TRUE FROM dropdown_categories WHERE category_key = 'queen_source'
ON CONFLICT (category_id, value) DO NOTHING;

INSERT INTO dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Swarm', 3, TRUE FROM dropdown_categories WHERE category_key = 'queen_source'
ON CONFLICT (category_id, value) DO NOTHING;

-- Category: Queen Status
INSERT INTO dropdown_categories (category_name, category_key, description)
VALUES ('Queen Status', 'queen_status', 'Current status of the queen bee')
ON CONFLICT (category_key) DO NOTHING;

INSERT INTO dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Active', 1, TRUE FROM dropdown_categories WHERE category_key = 'queen_status'
ON CONFLICT (category_id, value) DO NOTHING;

INSERT INTO dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Retired', 2, TRUE FROM dropdown_categories WHERE category_key = 'queen_status'
ON CONFLICT (category_id, value) DO NOTHING;

INSERT INTO dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Dead', 3, TRUE FROM dropdown_categories WHERE category_key = 'queen_status'
ON CONFLICT (category_id, value) DO NOTHING;

-- Category: Honey Stores Level
INSERT INTO dropdown_categories (category_name, category_key, description)
VALUES ('Honey Stores Level', 'honey_stores_level', 'Amount of honey stores in the hive during inspection')
ON CONFLICT (category_key) DO NOTHING;

INSERT INTO dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Low', 1, TRUE FROM dropdown_categories WHERE category_key = 'honey_stores_level'
ON CONFLICT (category_id, value) DO NOTHING;

INSERT INTO dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Medium', 2, TRUE FROM dropdown_categories WHERE category_key = 'honey_stores_level'
ON CONFLICT (category_id, value) DO NOTHING;

INSERT INTO dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Good', 3, TRUE FROM dropdown_categories WHERE category_key = 'honey_stores_level'
ON CONFLICT (category_id, value) DO NOTHING;

INSERT INTO dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Excellent', 4, TRUE FROM dropdown_categories WHERE category_key = 'honey_stores_level'
ON CONFLICT (category_id, value) DO NOTHING;

-- Category: Varroa Treatment Product Name
INSERT INTO dropdown_categories (category_name, category_key, description)
VALUES ('Varroa Treatment Product Name', 'varroa_treatment_product', 'Product names for varroa mite treatments')
ON CONFLICT (category_key) DO NOTHING;

INSERT INTO dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Apiguard', 1, TRUE FROM dropdown_categories WHERE category_key = 'varroa_treatment_product'
ON CONFLICT (category_id, value) DO NOTHING;

INSERT INTO dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'ApiLife Var', 2, TRUE FROM dropdown_categories WHERE category_key = 'varroa_treatment_product'
ON CONFLICT (category_id, value) DO NOTHING;

INSERT INTO dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Apistan', 3, TRUE FROM dropdown_categories WHERE category_key = 'varroa_treatment_product'
ON CONFLICT (category_id, value) DO NOTHING;

INSERT INTO dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Apivar', 4, TRUE FROM dropdown_categories WHERE category_key = 'varroa_treatment_product'
ON CONFLICT (category_id, value) DO NOTHING;

INSERT INTO dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Formic Pro', 5, TRUE FROM dropdown_categories WHERE category_key = 'varroa_treatment_product'
ON CONFLICT (category_id, value) DO NOTHING;

INSERT INTO dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Mite Away Quick Strips', 6, TRUE FROM dropdown_categories WHERE category_key = 'varroa_treatment_product'
ON CONFLICT (category_id, value) DO NOTHING;

INSERT INTO dropdown_values (category_id, value, display_order, is_active)
SELECT id, 'Oxalic Acid', 7, TRUE FROM dropdown_categories WHERE category_key = 'varroa_treatment_product'
ON CONFLICT (category_id, value) DO NOTHING;

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on both tables
ALTER TABLE dropdown_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE dropdown_values ENABLE ROW LEVEL SECURITY;

-- Policy: Authenticated users can read all dropdown categories
CREATE POLICY "Authenticated users can view dropdown categories"
  ON dropdown_categories
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can read all dropdown values
CREATE POLICY "Authenticated users can view dropdown values"
  ON dropdown_values
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert dropdown categories
CREATE POLICY "Authenticated users can insert dropdown categories"
  ON dropdown_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update dropdown categories
CREATE POLICY "Authenticated users can update dropdown categories"
  ON dropdown_categories
  FOR UPDATE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can delete dropdown categories
CREATE POLICY "Authenticated users can delete dropdown categories"
  ON dropdown_categories
  FOR DELETE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can insert dropdown values
CREATE POLICY "Authenticated users can insert dropdown values"
  ON dropdown_values
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Policy: Authenticated users can update dropdown values
CREATE POLICY "Authenticated users can update dropdown values"
  ON dropdown_values
  FOR UPDATE
  TO authenticated
  USING (true);

-- Policy: Authenticated users can delete dropdown values
CREATE POLICY "Authenticated users can delete dropdown values"
  ON dropdown_values
  FOR DELETE
  TO authenticated
  USING (true);

-- =====================================================
-- End of Migration
-- =====================================================
