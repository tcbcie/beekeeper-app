# Feature: Database Export Coverage and Restore Readiness
**Date:** 28/02/2026
**Status:** Implemented

## 1. Overview
Strengthen the Settings `Profile & Data Export` and admin `Export Complete Database` flows so every live `public` table is exported and the generated SQL can be used in a dependable restore workflow. The goal is to remove current table omissions and reduce restore failures caused by insert order and dependency constraints.

## 2. Scope & Simplicity
* **In Scope:** Align exported table coverage with the live `public` schema, centralise table lists to avoid drift, and emit restore-oriented SQL structure with deterministic table/data ordering and clear restore prerequisites.
* **Out of Scope:** Replacing this export with full `pg_dump` parity, exporting non-`public` schemas in full, or introducing large refactors outside the export paths.
* **Existing Code Impact:** Minimal changes confined to `src/app/api/admin/export-all-data/route.ts`, `src/components/settings/ProfileExport.tsx`, and a small shared export helper module if needed.

## 3. Technical Design
### Architecture
Use a single source of truth for export tables and a restore-safe ordering strategy. Both admin and personal export paths consume shared table metadata to prevent inconsistencies.

### Database Connections (MCP Server)
Use direct MCP database queries to:
1. Enumerate current `public` tables.
2. Verify foreign-key dependencies and ordering constraints.
3. Confirm no export-table omissions after changes.
No `.sql` file parsing is used as a source of truth.

## 4. Edge Cases & Risks
* New tables can be added later and silently missed if coverage checks are not centralised.
* Foreign-key dependencies can fail restore if child rows are inserted before parent rows.
* Many `public` tables reference `auth.users`; restore into a fresh project can still fail unless auth rows exist or constraints are handled explicitly.
* Data containing quotes or JSON must remain correctly escaped in generated SQL.

## 5. Implementation Phases
1. Phase 1: Consolidate and correct table coverage for both export paths using a shared definition.
2. Phase 2: Improve SQL export structure for restore readiness (deterministic order, transaction wrapper, and explicit restore notes/limitations).
3. Phase 3: Re-verify with MCP queries that coverage and dependency-order checks pass, then document outcomes.

## 6. Implementation Notes
* Added a shared export module (`src/lib/database-export.ts`) used by both admin and personal export paths.
* Expanded coverage to include all current `public` base tables (60/60).
* Removed reliance on missing `exec_sql` RPC in the admin export route and switched to shared table metadata.
* Added restore-oriented SQL framing (`BEGIN/COMMIT`) and best-effort trigger disable/enable blocks to reduce FK-order restore failures.
* Added explicit restore prerequisites and limitations in export headers, including `auth.users` dependency notes.
* Added per-table export summaries and error sections to both admin and personal exports for operational visibility.
