-- Knowledge base for beekeeping documents (books, articles, guides)
-- This table stores chunked text with vector embeddings for semantic search

create table if not exists knowledge_base (
  id bigserial primary key,
  content text not null,
  metadata jsonb default '{}',
  embedding vector(1536), -- OpenAI text-embedding-3-small produces 1536 dimensions
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for vector similarity search (HNSW is faster than IVFFlat for read-heavy workloads)
create index if not exists knowledge_base_embedding_idx
on knowledge_base
using hnsw (embedding vector_cosine_ops);

-- RLS policies
alter table knowledge_base enable row level security;

-- Knowledge base is readable by all authenticated users
create policy "Knowledge base is readable by authenticated users"
on knowledge_base for select
to authenticated
using (true);

-- Only admins can insert into knowledge base
create policy "Only admins can insert into knowledge base"
on knowledge_base for insert
to authenticated
with check (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'Admin'
  )
);

-- Only admins can update knowledge base
create policy "Only admins can update knowledge base"
on knowledge_base for update
to authenticated
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'Admin'
  )
);

-- Only admins can delete from knowledge base
create policy "Only admins can delete from knowledge base"
on knowledge_base for delete
to authenticated
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'Admin'
  )
);
