-- Add source_url column to knowledge_sources table for linking to original sources
ALTER TABLE knowledge_sources
ADD COLUMN IF NOT EXISTS source_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN knowledge_sources.source_url IS 'URL to the original source (article, book page, etc.)';
