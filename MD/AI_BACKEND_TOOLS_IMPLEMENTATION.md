# AI Backend Tools Implementation

## Overview
Implemented 20 structured backend tools for the AI assistant, providing secure, well-defined query capabilities as an alternative to dynamic SQL generation.

## Tasks

- [x] Create tool directory structure and index.ts
- [x] Create shared utilities (team-aware queries, Supabase client)
- [x] Implement hives.ts tools (getApiaryStats, getHiveOverview, getHiveTimeline)
- [x] Implement inspections.ts tools (getLastInspection, getInspectionHistory, getHivesNeedingInspection, getQueenStatus, getDiseaseAlerts, getSwarmRiskHives)
- [x] Implement varroa.ts tools (getLatestVarroaCounts, getVarroaTrend, getHivesAboveThreshold, getTreatmentHistory, getHivesNeedingTreatment)
- [x] Implement feeding.ts tools (getFeedingHistory, getHarvestSummary, getHivesNeedingFeeding)
- [x] Implement queens.ts tools (getQueenInventory, getActiveBatches, getBatchDetails, getUpcomingBatchEvents, getQueenLineage)
- [x] Implement tasks.ts tools (getUpcomingTasks, getOverdueTasks, getTasksForHive)
- [x] Implement analysis.ts tools (compareHives, getBestPerformingHives, getRecentActivitySummary)
- [x] Update rag.ts with tool routing logic
- [x] Test tools integration (TypeScript compilation)

---

## Review

### Summary
Created a comprehensive AI backend tools system with 20 tools organized into 7 categories. The tools follow strict tenancy isolation (filtering by user_id from context), return human-readable outputs, use Zod schema validation, and support team-shared data access.

### Files Created

| File | Description |
|------|-------------|
| `src/lib/ai/tools/index.ts` | Tool registry, types, and execution logic |
| `src/lib/ai/tools/utils.ts` | Shared utilities: Supabase client, team-aware queries, finders |
| `src/lib/ai/tools/hives.ts` | 3 tools: getApiaryStats, getHiveOverview, getHiveTimeline |
| `src/lib/ai/tools/inspections.ts` | 6 tools: getLastInspection, getInspectionHistory, getHivesNeedingInspection, getQueenStatus, getDiseaseAlerts, getSwarmRiskHives |
| `src/lib/ai/tools/varroa.ts` | 5 tools: getLatestVarroaCounts, getVarroaTrend, getHivesAboveThreshold, getTreatmentHistory, getHivesNeedingTreatment |
| `src/lib/ai/tools/feeding.ts` | 3 tools: getFeedingHistory, getHarvestSummary, getHivesNeedingFeeding |
| `src/lib/ai/tools/queens.ts` | 5 tools: getQueenInventory, getActiveBatches, getBatchDetails, getUpcomingBatchEvents, getQueenLineage |
| `src/lib/ai/tools/tasks.ts` | 3 tools: getUpcomingTasks, getOverdueTasks, getTasksForHive |
| `src/lib/ai/tools/analysis.ts` | 3 tools: compareHives, getBestPerformingHives, getRecentActivitySummary |

### Files Modified

| File | Changes |
|------|---------|
| `src/lib/rag.ts` | Added tool routing: tries tools first, falls back to SQL generation |

### Tool Categories

1. **Hive Overview** - Apiary statistics, hive lists, timeline
2. **Inspections & Health** - Last inspection, history, queen status, disease alerts, swarm risk
3. **Varroa Management** - Mite counts, trends, threshold alerts, treatment history
4. **Feeding & Harvests** - Feeding history, harvest summary, low stores alerts
5. **Queen Rearing** - Queen inventory, active batches, batch details, lineage
6. **Tasks & Calendar** - Upcoming tasks, overdue tasks, hive-specific tasks
7. **Analysis** - Compare hives, best performers, activity summary

### How It Works

1. **Query Routing**: User query → LLM matches to tool → Tool executes → Response
2. **Fallback**: If no tool matches, falls back to dynamic SQL generation
3. **Security**: All tools filter by user_id from context (never from LLM)
4. **Team Data**: Tools use `getAccessibleApiaryIds()` to include team-shared apiaries

### Architecture

```
rag.ts
├── matchQueryToTool() → LLM selects tool + args
├── executeTool() → Validates args, runs tool
└── Falls back to generateSQLQuery() if no match

tools/
├── index.ts → Registry, types, executeTool()
├── utils.ts → getSupabase(), getAccessibleApiaryIds(), findHiveByName(), etc.
├── hives.ts
├── inspections.ts
├── varroa.ts
├── feeding.ts
├── queens.ts
├── tasks.ts
├── analysis.ts
└── knowledge.ts
```

---

## Knowledge Base Enhancement (Phase 2)

### Overview
Enhanced the knowledge base query flow to provide better source attribution when answering from literature/PDFs.

### Tasks
- [x] Enhance system prompt for source citations
- [x] Improve knowledge base context formatting with source/page attribution
- [x] Create knowledge base tool (searchBeekeepingKnowledge)
- [x] Register knowledge tool in index.ts

### Changes Made

**`src/lib/rag.ts`**:
- Enhanced `knowledge` case to format context with source attribution: `[Source 1: Book Name, page X]`
- Updated system prompt to instruct LLM to cite sources naturally
- Applied same formatting to `hybrid` case for consistency

**`src/lib/ai/tools/knowledge.ts`** (NEW):
- `searchBeekeepingKnowledge` tool for explicit knowledge base searches
- Returns formatted results with source, page number, and relevance score

### Query Flow

```
User: "What temperature is too cold to inspect?"
  │
  ▼
classifyQuery() → "knowledge"
  │
  ▼
searchKnowledgeBase(query)
  │
  ├─ generateEmbedding(query) → [0.12, -0.34, ...]
  ├─ Supabase RPC: match_knowledge_base()
  │
  ▼
Format context with sources:
[Source 1: The Hive Manual, page 42]
Content here...
---
[Source 2: Beekeeping Guide, page 18]
More content...
  │
  ▼
LLM generates response citing sources:
"According to The Hive Manual (page 42), you should not inspect..."
```

### Tool Count: 21 Total
- Hive tools: 3
- Inspection tools: 6
- Varroa tools: 5
- Feeding tools: 3
- Queen tools: 5
- Task tools: 3
- Analysis tools: 3
- Knowledge tools: 1

---

## Bulk Document Ingestion (Phase 3)

### Overview
Created a bulk ingestion script and backend infrastructure to manage knowledge base sources with duplicate detection.

### Tasks
- [x] Create `knowledge_sources` table migration
- [x] Create bulk ingestion script with duplicate detection
- [x] Update admin API for source management

### Database Schema

**New table: `knowledge_sources`**
```sql
CREATE TABLE knowledge_sources (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,           -- Document title
  author TEXT,                  -- Author name
  published_date DATE,          -- Publication date
  file_path TEXT,               -- Original file path
  file_hash TEXT UNIQUE,        -- SHA-256 for duplicate detection
  chunks_count INTEGER,         -- Number of chunks created
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

**Modified: `knowledge_base` table**
- Added `source_id` column with CASCADE delete

### Files Created

| File | Description |
|------|-------------|
| `sql/migrations/20241220_create_knowledge_sources.sql` | Creates source tracking table |
| `scripts/ingest-documents.mjs` | Bulk PDF ingestion script |

### Files Modified

| File | Changes |
|------|---------|
| `src/app/api/admin/knowledge-base/route.ts` | Added source listing and deletion |

### Script Usage

```bash
# Ingest all PDFs from a directory
node scripts/ingest-documents.mjs ./books

# List all ingested sources
node scripts/ingest-documents.mjs --list

# Delete a source and all its chunks
node scripts/ingest-documents.mjs --delete <source-id>
```

### Filename Convention for Metadata
```
"Book Title - Author Name (2023).pdf"
  └─ name    └─ author       └─ published_date
```

### API Endpoints

**GET `/api/admin/knowledge-base?view=sources`**
- Lists all ingested sources with name, author, published date, chunk count

**DELETE `/api/admin/knowledge-base?source_id=<id>`**
- Deletes source and all its chunks (CASCADE)

### Duplicate Detection
- Files are hashed using SHA-256
- Duplicate files are skipped during ingestion
- Hash stored in `file_hash` column for fast lookup
