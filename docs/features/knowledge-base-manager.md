# AI Knowledge Base Manager

## Overview
Admin-only interface for managing beekeeping knowledge sources that feed into the AI chat system. Located under **Settings > AI Knowledge Base**.

## Features

### Source Management
- **Add content** via PDF upload, URL scraping, or manual text
- **Edit metadata** inline (name, author, year, filename, URL)
- **Import citations** from RIS files (academic citation format)
- **Delete sources** with cascading chunk removal

### Filtering & Sorting
- **Text search** across name and author fields
- **Year filter** dropdown (populated from source data)
- **Type filter**: All, Documents (PDFs), News/URLs
- **Missing info filter**: All, Any Missing Info, Missing Author, Missing Year, Missing URL
- **Sort dropdown**: Name, Author, Year, Chunks, Recently Added, Recently Edited
- **Sort direction toggle** (ascending/descending)

### Visual Indicators
- Missing fields (author, year, URL) are highlighted in **amber** so incomplete entries are visible at a glance
- Pagination with 15 items per page

## Key Files
- `src/components/admin/KnowledgeBaseManager.tsx` — Main component
- `src/app/api/admin/knowledge-base/route.ts` — API endpoint (GET, POST, PATCH, DELETE)
- `scripts/ingest/` — Batch PDF ingestion pipeline

## Database Tables
- `knowledge_sources` — Source metadata (name, author, date, URL, chunks count)
- `knowledge_base` — Text chunks with OpenAI embeddings for semantic search
