-- Create varroa_treatments table
CREATE TABLE IF NOT EXISTS varroa_treatments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hive_id UUID NOT NULL REFERENCES hives(id) ON DELETE CASCADE,
    treatment_date DATE NOT NULL,
    treatment_type VARCHAR(100) NOT NULL,
    product_name VARCHAR(255),
    dosage VARCHAR(100),
    temperature DECIMAL(5,2),
    weather_conditions VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on hive_id for faster queries
CREATE INDEX IF NOT EXISTS idx_varroa_treatments_hive_id ON varroa_treatments(hive_id);

-- Create index on treatment_date for sorting
CREATE INDEX IF NOT EXISTS idx_varroa_treatments_date ON varroa_treatments(treatment_date DESC);

-- Create varroa_checks table
CREATE TABLE IF NOT EXISTS varroa_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hive_id UUID NOT NULL REFERENCES hives(id) ON DELETE CASCADE,
    check_date DATE NOT NULL,
    method VARCHAR(100) NOT NULL,
    mites_count INTEGER,
    sample_size INTEGER,
    infestation_rate DECIMAL(5,2),
    action_threshold_reached BOOLEAN DEFAULT FALSE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index on hive_id for faster queries
CREATE INDEX IF NOT EXISTS idx_varroa_checks_hive_id ON varroa_checks(hive_id);

-- Create index on check_date for sorting
CREATE INDEX IF NOT EXISTS idx_varroa_checks_date ON varroa_checks(check_date DESC);

-- Enable Row Level Security (RLS)
-- Note: If you're not using RLS on your hives table yet, you can comment out these sections
-- The tables will still work, but without row-level security restrictions

-- Uncomment the following lines if you have user_id column in hives table and want RLS:
/*
ALTER TABLE varroa_treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE varroa_checks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for varroa_treatments
-- Users can only see/modify treatments for their own hives
CREATE POLICY "Users can view their own varroa treatments"
    ON varroa_treatments FOR SELECT
    USING (
        hive_id IN (
            SELECT id FROM hives WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own varroa treatments"
    ON varroa_treatments FOR INSERT
    WITH CHECK (
        hive_id IN (
            SELECT id FROM hives WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own varroa treatments"
    ON varroa_treatments FOR UPDATE
    USING (
        hive_id IN (
            SELECT id FROM hives WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own varroa treatments"
    ON varroa_treatments FOR DELETE
    USING (
        hive_id IN (
            SELECT id FROM hives WHERE user_id = auth.uid()
        )
    );

-- Create RLS policies for varroa_checks
-- Users can only see/modify checks for their own hives
CREATE POLICY "Users can view their own varroa checks"
    ON varroa_checks FOR SELECT
    USING (
        hive_id IN (
            SELECT id FROM hives WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own varroa checks"
    ON varroa_checks FOR INSERT
    WITH CHECK (
        hive_id IN (
            SELECT id FROM hives WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own varroa checks"
    ON varroa_checks FOR UPDATE
    USING (
        hive_id IN (
            SELECT id FROM hives WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own varroa checks"
    ON varroa_checks FOR DELETE
    USING (
        hive_id IN (
            SELECT id FROM hives WHERE user_id = auth.uid()
        )
    );
*/

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_varroa_treatments_updated_at
    BEFORE UPDATE ON varroa_treatments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_varroa_checks_updated_at
    BEFORE UPDATE ON varroa_checks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
