-- Create Terminology Table for Beekeeping Terms (English <> German)
-- Migration: 20241219_create_terminology_table.sql

CREATE TABLE IF NOT EXISTS terminology (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    english_term TEXT NOT NULL,
    german_term TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE terminology ENABLE ROW LEVEL SECURITY;

-- Allow read access for all authenticated users
CREATE POLICY "Allow read access for authenticated users"
ON terminology FOR SELECT
USING (auth.role() = 'authenticated');

-- Allow insert/update/delete for all authenticated users
CREATE POLICY "Allow write access for authenticated users"
ON terminology FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Allow update access for authenticated users"
ON terminology FOR UPDATE
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow delete access for authenticated users"
ON terminology FOR DELETE
USING (auth.role() = 'authenticated');

-- Seed initial terminology data
INSERT INTO terminology (english_term, german_term) VALUES
-- Hive Parts
('Hive', 'Beute'),
('Frame', 'Rähmchen'),
('Super', 'Honigzarge'),
('Brood Box', 'Brutraum'),
('Bottom Board', 'Bodenbrett'),
('Inner Cover', 'Innendeckel'),
('Outer Cover', 'Außendeckel'),
('Queen Excluder', 'Absperrgitter'),
('Entrance Reducer', 'Fluglochkeil'),
('Foundation', 'Mittelwand'),
('Comb', 'Wabe'),

-- Bee Anatomy & Types
('Queen', 'Königin'),
('Worker', 'Arbeiterin'),
('Drone', 'Drohne'),
('Larva', 'Larve'),
('Pupa', 'Puppe'),
('Egg', 'Ei'),
('Brood', 'Brut'),
('Stinger', 'Stachel'),

-- Actions & Behaviors
('Swarming', 'Schwärmen'),
('Foraging', 'Sammeln'),
('Waggle Dance', 'Schwänzeltanz'),
('Supersedure', 'Stille Umweiselung'),
('Robbing', 'Räuberei'),
('Bearding', 'Vorlagern'),

-- Products
('Honey', 'Honig'),
('Wax', 'Wachs'),
('Propolis', 'Propolis'),
('Royal Jelly', 'Gelée Royale'),
('Pollen', 'Pollen'),

-- Tools
('Smoker', 'Smoker'),
('Hive Tool', 'Stockmeißel'),
('Bee Brush', 'Bienenbesen'),
('Uncapping Knife', 'Entdeckelungsmesser'),
('Extractor', 'Honigschleuder'),
('Feeder', 'Futtergeschirr'),

-- Diseases & Pests
('Varroa Mite', 'Varroamilbe'),
('American Foulbrood', 'Amerikanische Faulbrut'),
('European Foulbrood', 'Europäische Faulbrut'),
('Nosema', 'Nosema'),
('Chalkbrood', 'Kalkbrut'),
('Wax Moth', 'Wachsmotte'),

-- Queen Rearing
('Queen Cell', 'Weiselzelle'),
('Swarm Cell', 'Schwarmzelle'),
('Grafting', 'Umlarven'),
('Mating Flight', 'Hochzeitsflug'),
('Virgin Queen', 'Unbegattete Königin');
