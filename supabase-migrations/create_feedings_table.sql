-- Create feedings table
CREATE TABLE IF NOT EXISTS feedings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  hive_id UUID NOT NULL REFERENCES hives(id) ON DELETE CASCADE,
  feed_date DATE NOT NULL,
  feed_type TEXT NOT NULL,
  quantity NUMERIC(10, 2),
  unit TEXT NOT NULL DEFAULT 'kg',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on hive_id for faster queries
CREATE INDEX IF NOT EXISTS idx_feedings_hive_id ON feedings(hive_id);

-- Create index on feed_date for sorting
CREATE INDEX IF NOT EXISTS idx_feedings_feed_date ON feedings(feed_date DESC);

-- Enable Row Level Security
ALTER TABLE feedings ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to manage their own feedings
CREATE POLICY "Users can manage their own feedings"
  ON feedings
  FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feedings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER feedings_updated_at
  BEFORE UPDATE ON feedings
  FOR EACH ROW
  EXECUTE FUNCTION update_feedings_updated_at();
