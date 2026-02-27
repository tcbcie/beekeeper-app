# Feature: Mating Nuc Bulk Creation and Cell Allocation
**Date:** 27/02/2026
**Status:** Implemented

## 1. Overview
Add a bulk creation workflow for mating nucs that supports two modes: numbered nucs (user-provided identifiers) and unnumbered nucs (created directly from selected sealed cells). Each nuc must still be stored as an individual `mating_nucs` record, while also being grouped under a bulk creation batch for visibility and auditing.

## 2. Scope & Simplicity
* **In Scope:** Bulk create form, per-nuc row creation, grouped batch metadata table, sealed-cell-only allocation flow, result table for created nucs, and minimal edits to existing single-nuc flow.
* **Out of Scope:** Major redesign of the full Mating Nucs page layout, advanced scheduling/optimisation logic for cell allocation, and historical backfill for existing nucs.
* **Existing Code Impact:** `src/components/batches/MatingNucsTab.tsx`, new focused helper/hook files for bulk operations, `src/types/*` for batch metadata typing, Supabase migration(s), and mating nuc documentation.

## 3. Technical Design
### Architecture
Implement a dedicated bulk section in the Mating Nucs tab with two creation modes:
1. **Numbered mode:** paste/enter multiple nuc numbers; optionally auto-map selected sealed cells in sorted order.
2. **Unnumbered mode:** select sealed cells only; system generates per-nuc reference codes.

Every created nuc is inserted as a normal row in `mating_nucs`. A new `mating_nuc_batches` record stores bulk-run metadata and links to created nucs via `mating_nucs.creation_batch_id`. A new batch table in the UI lists recent bulk runs and provides drill-down to created nuc rows.

### Database Connections (MCP Server)
Use direct database interactions via Supabase runtime queries and migration scripts (no `.sql` parsing workflows).

Planned schema changes:
* New table `mating_nuc_batches`:
  * `id`, `user_id`, `source_rearing_batch_id`, `mode` (`numbered`/`unnumbered`), `requested_count`, `created_count`, `created_at`, `notes`
* Extend `mating_nucs`:
  * `creation_batch_id` nullable FK to `mating_nuc_batches`
  * `reference_code` text (system-generated for unnumbered mode; may also be used for numbered mode)
  * relax `nuc_number` requirement to nullable for unnumbered entries

Allocation query rules for selectable cells:
* `batch_grafts.batch_id = selected batch`
* `batch_grafts.status = 'sealed'`
* exclude cells already linked to active nucs (`mating_nucs.graft_id`, `retired_at IS NULL`)

Recommended transactional write path:
* one server-side RPC (or equivalent atomic operation) to validate input, reserve cells, create `mating_nuc_batches`, insert all `mating_nucs`, and return created/skipped rows.

## 4. Edge Cases & Risks
* Duplicate nuc numbers in numbered mode (within request and against active nucs).
* Race conditions where two users/processes attempt to allocate the same sealed cell.
* Selected cells becoming invalid between preview and submit.
* Unnumbered mode discoverability if users expect a visible identifier: mitigate with `reference_code`.
* Backward compatibility for existing screens expecting `nuc_number` to be present.

## 5. Implementation Phases
1. Phase 1: Add schema support (`mating_nuc_batches`, `creation_batch_id`, `reference_code`, nullable `nuc_number`) and typed interfaces.
2. Phase 2: Implement bulk creation service/RPC with validation, atomic inserts, and sealed-cell allocation rules.
3. Phase 3: Add Mating Nucs bulk UI (mode selector, number input, cell picker, preview, submit, result table).
4. Phase 4: Add bulk batches table and link-out to created nuc records.
5. Phase 5: Update feature documentation and verify create/edit/list flows still work for both numbered and unnumbered nucs.
