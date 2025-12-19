-- Enable the pgvector extension for vector embeddings
-- This must be run before creating tables with vector columns
create extension if not exists vector with schema extensions;
