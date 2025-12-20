-- Create table to track ingested knowledge base sources
CREATE TABLE IF NOT EXISTS knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  author TEXT,
  published_date DATE,
  file_path TEXT,
  file_hash TEXT UNIQUE, -- SHA-256 hash for duplicate detection
  chunks_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add source_id column to knowledge_base table to link chunks to sources
ALTER TABLE knowledge_base
ADD COLUMN IF NOT EXISTS source_id UUID REFERENCES knowledge_sources(id) ON DELETE CASCADE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_knowledge_base_source_id ON knowledge_base(source_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_sources_file_hash ON knowledge_sources(file_hash);

-- RLS policies for knowledge_sources (admin only write, authenticated read)
ALTER TABLE knowledge_sources ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read sources
CREATE POLICY "Allow authenticated read on knowledge_sources"
ON knowledge_sources FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert/update/delete (handled via service role key in API)
