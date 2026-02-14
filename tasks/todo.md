# FIBKA Applied Skills Logbook - Implementation Todo

## Tasks

- [x] 1. **Database migration** - Create `logbook_entries` table with RLS policies via Supabase MCP
- [x] 2. **Types** - Create `src/types/logbook.ts` with logbook entry types
- [x] 3. **Skill constants** - Create `src/lib/logbook-skills.ts` with Stage 2 FIBKA skill definitions (7 categories, 75 skills)
- [x] 4. **Custom hook** - Create `src/hooks/useLogbook.ts` for fetching/saving/deleting entries
- [x] 5. **Logbook page** - Create `src/app/dashboard/logbook/page.tsx` with accordion categories, progress tracking, and inline completion form
- [x] 6. **Navigation** - Add Logbook entry to `src/lib/navigation.ts` under 'activity' group
- [x] 7. **Feature docs** - Create `docs/features/logbook.md`
- [x] 8. **Stage 3 skills** - Add Stage 3 (116 skills across 10 categories) to `src/lib/logbook-skills.ts`
- [x] 9. **Stage selector** - Add dropdown to logbook page for switching between Stage 2 and Stage 3
- [x] 10. **Update docs** - Update `docs/features/logbook.md` with Stage 3 categories

## Review

### Summary of Changes

**Database:**
- Created `logbook_entries` table with columns: id, user_id, skill_id, assessor_name, assessor_fibka_number, completed_date, notes, timestamps
- UNIQUE constraint on (user_id, skill_id) to prevent duplicate entries
- RLS policies for full user-scoped CRUD

**New Files Created:**
| File | Purpose |
|------|---------|
| `src/types/logbook.ts` | Types for entries, form data, skills, categories, stages |
| `src/lib/logbook-skills.ts` | Stage 2 & 3 constants - 191 total skills with unique IDs |
| `src/hooks/useLogbook.ts` | Hook with fetch/save (upsert)/delete, entries keyed by skill_id |
| `src/app/dashboard/logbook/page.tsx` | Full page with accordion UI, stage selector, progress bar, inline forms |
| `docs/features/logbook.md` | Feature documentation |

**Modified Files:**
| File | Change |
|------|--------|
| `src/lib/navigation.ts` | Added BookOpen import + Logbook nav item under 'activity' group |

### Design Decisions
- Skill definitions as frontend constants (not DB) - FIBKA skills are standardised
- Single `logbook_entries` table with `skill_id` TEXT field matching constant IDs
- Upsert on save (user_id + skill_id) so re-saving updates rather than duplicates
- Entries stored in a `Record<string, LogbookEntry>` map for O(1) lookup by skill_id
- Inline form (not modal) for quick completion - keeps context visible
- Stage selector dropdown appears when more than 1 stage exists
