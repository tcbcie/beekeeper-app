-- Update match_knowledge_base function to join with knowledge_sources table
-- Returns structured source data for proper citation formatting

create or replace function match_knowledge_base(
  query_embedding vector(1536),
  match_threshold float default 0.7,
  match_count int default 5
)
returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float,
  source_name text,
  source_author text,
  source_year int,
  source_url text
)
language sql stable
as $$
  select
    kb.id,
    kb.content,
    kb.metadata,
    1 - (kb.embedding <=> query_embedding) as similarity,
    ks.name as source_name,
    ks.author as source_author,
    extract(year from ks.published_date)::int as source_year,
    ks.source_url as source_url
  from knowledge_base kb
  left join knowledge_sources ks on kb.source_id = ks.id
  where 1 - (kb.embedding <=> query_embedding) > match_threshold
  order by kb.embedding <=> query_embedding asc
  limit match_count;
$$;
