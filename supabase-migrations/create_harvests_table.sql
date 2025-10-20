-- Create harvests table
CREATE TABLE IF NOT EXISTS harvests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hive_id UUID NOT NULL REFERENCES hives(id) ON DELETE CASCADE,
  harvest_date DATE NOT NULL,
  honey_weight NUMERIC(10, 2),
  wax_weight NUMERIC(10, 2),
  unit TEXT NOT NULL DEFAULT 'kg',
  frames_harvested INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on hive_id for faster queries
CREATE INDEX IF NOT EXISTS idx_harvests_hive_id ON harvests(hive_id);

-- Create index on harvest_date for sorting
CREATE INDEX IF NOT EXISTS idx_harvests_harvest_date ON harvests(harvest_date DESC);

-- Enable Row Level Security
ALTER TABLE harvests ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to manage their own harvests
CREATE POLICY "Users can manage their own harvests"
  ON harvests
  FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_harvests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER harvests_updated_at
  BEFORE UPDATE ON harvests
  FOR EACH ROW
  EXECUTE FUNCTION update_harvests_updated_at();
