-- Add lineage column to queens table
ALTER TABLE queens
ADD COLUMN lineage TEXT;

-- Add comment to the lineage column
COMMENT ON COLUMN queens.lineage IS 'Queen lineage or breeder line information';

-- Add queen_clipped column to queens table
ALTER TABLE queens
ADD COLUMN queen_clipped BOOLEAN DEFAULT false;

-- Add comment to the queen_clipped column
COMMENT ON COLUMN queens.queen_clipped IS 'Indicates whether the queen has had her wings clipped';
