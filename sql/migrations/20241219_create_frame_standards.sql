-- Create Frame Standards Table for Frame Cell Calculator
-- Migration: 20241219_create_frame_standards.sql

CREATE TABLE IF NOT EXISTS frame_standards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    label TEXT NOT NULL,
    width_mm INTEGER NOT NULL,
    height_mm INTEGER NOT NULL,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE frame_standards ENABLE ROW LEVEL SECURITY;

-- Allow read access for all authenticated users
CREATE POLICY "Allow read access for authenticated users"
ON frame_standards FOR SELECT
USING (auth.role() = 'authenticated');

-- Allow write access for admins only (users with role = 'Admin' in profiles)
CREATE POLICY "Allow insert for admins"
ON frame_standards FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'Admin'
    )
);

CREATE POLICY "Allow update for admins"
ON frame_standards FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'Admin'
    )
);

CREATE POLICY "Allow delete for admins"
ON frame_standards FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'Admin'
    )
);

-- Seed initial frame standards data
INSERT INTO frame_standards (label, width_mm, height_mm, display_order) VALUES
('British National Deep', 335, 195, 1),
('British National Shallow', 335, 115, 2),
('Langstroth Deep', 425, 210, 3),
('Langstroth Medium', 425, 146, 4),
('Langstroth Shallow', 425, 117, 5),
('Dadant Modified Deep', 425, 270, 6),
('Dadant Modified Shallow', 425, 127, 7),
('Smith', 350, 195, 8),
('Commercial', 406, 195, 9);
