-- Drop existing table if it exists (to ensure clean schema)
DROP TABLE IF EXISTS varroa_treatment_products CASCADE;

-- Create varroa_treatment_products table to store approved varroa treatment products for Ireland
CREATE TABLE varroa_treatment_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL,
  active_ingredients TEXT NOT NULL,
  notes TEXT,
  application_method TEXT NOT NULL,
  treatment_duration TEXT NOT NULL,
  temperature_range TEXT NOT NULL,
  honey_flow_restrictions TEXT NOT NULL,
  withdrawal_period_days INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE varroa_treatment_products ENABLE ROW LEVEL SECURITY;

-- Create policy: Allow all authenticated users to read varroa treatment products (reference data)
CREATE POLICY "Allow authenticated users to read varroa treatment products"
  ON varroa_treatment_products
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policy: Only admins can insert/update/delete varroa treatment products
CREATE POLICY "Allow admins to manage varroa treatment products"
  ON varroa_treatment_products
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'Admin'
    )
  );

-- Create index for faster searches
CREATE INDEX idx_varroa_treatment_products_product_name ON varroa_treatment_products(product_name);
CREATE INDEX idx_varroa_treatment_products_active_ingredients ON varroa_treatment_products(active_ingredients);

-- Insert approved varroa treatment products for Ireland
INSERT INTO varroa_treatment_products (
  product_name,
  active_ingredients,
  notes,
  application_method,
  treatment_duration,
  temperature_range,
  honey_flow_restrictions,
  withdrawal_period_days
) VALUES
  (
    'Apiguard',
    'Thymol',
    'Gel in trays; used in late summer/autumn; avoid during honey flow.',
    'Gel trays placed on top bars',
    '2-4 weeks',
    '15-30°C',
    'Do not use during honey flow',
    0
  ),
  (
    'ApiLife Var',
    'Thymol, Eucalyptus oil, Menthol',
    'Tablet form; strong odour; avoid during honey flow.',
    'Tablets placed on top bars',
    '3-4 weeks',
    '15-30°C',
    'Do not use during honey flow',
    0
  ),
  (
    'Formic Pro',
    'Formic acid',
    'Strips; can be used during honey flow; temperature-sensitive.',
    'Strips between brood frames',
    '14 days',
    '10-29°C',
    'Can be used during honey flow',
    0
  ),
  (
    'Mite Away Quick Strips',
    'Formic acid',
    'Similar to Formic Pro; fast-acting; ventilation required.',
    'Strips between brood frames',
    '7 days',
    '10-29°C',
    'Can be used during honey flow',
    0
  ),
  (
    'Apibioxal',
    'Oxalic acid dihydrate',
    'Trickling or vaporisation; best during broodless period (winter).',
    'Trickling or vaporisation',
    'Single application',
    'Any (broodless period preferred)',
    'Apply when no supers present',
    0
  ),
  (
    'VarroMed',
    'Oxalic acid + Formic acid',
    'Ready-to-use solution; applied by trickling; suitable for brood presence.',
    'Trickling ready-to-use solution',
    'Multiple applications (10 days apart)',
    'Any (brood present allowed)',
    'Apply when no supers present',
    0
  ),
  (
    'Oxybee',
    'Oxalic acid, Glycerol, Sucrose, Essential oils',
    'For broodless colonies; organic-certified option.',
    'Trickling solution',
    'Single application',
    'Any (broodless period)',
    'Apply when no supers present',
    0
  ),
  (
    'HopGuard III',
    'Hop beta acids',
    'Strips; can be used during honey flow; less common in Ireland.',
    'Strips between brood frames',
    '14 days',
    '10-29°C',
    'Can be used during honey flow',
    0
  ),
  (
    'Apivar',
    'Amitraz',
    'Contact strips; resistance issues reported; still available in Ireland.',
    'Strips between brood frames',
    '6-10 weeks',
    '10-29°C',
    'Apply when no supers present',
    42
  )
ON CONFLICT DO NOTHING;

COMMENT ON TABLE varroa_treatment_products IS 'Approved varroa treatment products for Ireland - reference data';
COMMENT ON COLUMN varroa_treatment_products.withdrawal_period_days IS 'Days before honey can be harvested after treatment (0 = no restriction)';
