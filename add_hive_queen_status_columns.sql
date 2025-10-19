-- Add queen status columns to hives table
-- These fields are for tracking queen status when no specific queen is assigned

ALTER TABLE hives
ADD COLUMN queen_marked BOOLEAN DEFAULT false;

ALTER TABLE hives
ADD COLUMN queen_marking_color TEXT;

ALTER TABLE hives
ADD COLUMN queen_mated BOOLEAN DEFAULT false;

ALTER TABLE hives
ADD COLUMN queen_clipped BOOLEAN DEFAULT false;

-- Add comments to the columns
COMMENT ON COLUMN hives.queen_marked IS 'Indicates if the queen is marked (when no specific queen assigned)';
COMMENT ON COLUMN hives.queen_marking_color IS 'Color of queen marking (White, Yellow, Red, Green, Blue) when manually recorded';
COMMENT ON COLUMN hives.queen_mated IS 'Indicates if the queen is mated (when no specific queen assigned)';
COMMENT ON COLUMN hives.queen_clipped IS 'Indicates if the queen has clipped wings (when no specific queen assigned)';
