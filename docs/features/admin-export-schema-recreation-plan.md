# Feature: Admin Export Full Schema Recreation
**Date:** 28/02/2026
**Status:** Implemented

## 1. Overview
Upgrade the admin-only complete export so the generated SQL can recreate `public` schema objects before data restore. The export should include `CREATE TABLE` statements and constraint/index recreation in a restore-safe order, with guarded handling for dependencies on `auth.users`.

## 2. Scope & Simplicity
* **In Scope:** Admin export route only; runtime schema introspection via SQL metadata queries; SQL output ordering for schema-first restore; guarded foreign-key creation for `auth.users` dependencies.
* **Out of Scope:** Changing personal export behaviour, exporting non-`public` schema DDL beyond guarded foreign-key references, or replacing the export with `pg_dump`.
* **Existing Code Impact:** `src/app/api/admin/export-all-data/route.ts`, plus a small helper module if required for metadata row typing or SQL assembly.

## 3. Technical Design
### Architecture
1. Use existing `public.execute_safe_query` RPC to fetch schema metadata from `pg_catalog`/`information_schema`.
2. Build SQL in three phases:
   1. Schema bootstrap (`CREATE TABLE`, defaults, non-FK constraints, non-constraint indexes, comments/sequences where required).
   2. Data inserts (existing logic).
   3. Foreign keys and post-data sequence alignment.
3. Keep output idempotent where practical (`IF NOT EXISTS` / guarded `DO` blocks).

### Database Connections (MCP Server)
Metadata and dependency verification use direct MCP queries for:
* Column definitions and defaults (including generated/identity handling).
* Constraint definitions split into non-FK and FK groups.
* Index definitions excluding those backing constraints.
* Cross-schema foreign keys (`public -> auth.users`) for guarded emission.

## 4. Edge Cases & Risks
* Some default expressions (for example sequence-backed defaults) need explicit sequence creation or normalisation.
* Constraint/index recreation may fail on repeated restores if statements are not idempotent.
* `auth.users` may not exist in the target environment; FK creation must be conditional and non-fatal.
* Output SQL size will increase and needs clear sectioning for readability and troubleshooting.

## 5. Implementation Phases
1. Phase 1: Add metadata query + schema SQL generation helpers in admin export.
2. Phase 2: Emit ordered schema DDL (tables, non-FK constraints/indexes), then data inserts, then guarded FK creation.
3. Phase 3: Verify coverage and restore-order behaviour using MCP dependency queries; document final limitations.

## 6. Implementation Notes
* The admin export route now uses metadata queries via `execute_safe_query` to assemble schema SQL for all exported `public` tables.
* Metadata/auth queries were adjusted to avoid `execute_safe_query` guard regex false-positives from query text substrings (for example `DROP` inside `dropdown_*` and `CREATE` inside `created_at`), preventing admin export 500 failures.
* Export output now includes:
  * Extension guards (`uuid-ossp`, `pgcrypto`).
  * Sequence creation and ownership statements.
  * `CREATE TABLE IF NOT EXISTS` statements with defaults, generated, identity, and not-null metadata.
  * Non-foreign-key constraints and secondary indexes with idempotent guards.
  * Data insert section.
  * Post-data foreign-key section with guarded handling for `auth.users` dependencies.
  * Post-data sequence alignment using `setval`.
  * Guarded `auth.users` seed data section using **ID-only** idempotent inserts (`ON CONFLICT (id) DO NOTHING`), so local Supabase restores can satisfy user-linked foreign keys without writing generated/auth-managed columns.
* MCP verification confirms:
  * `public` tables: 60
  * non-FK constraints: 141
  * FK constraints: 133
  * FK dependencies to `auth.users`: 37
  * owned sequences for `public` tables: 1
* Remaining prerequisite: target environment still needs compatible Supabase/auth infrastructure if `auth`-related objects are expected; guarded FK blocks intentionally skip unavailable `auth.users`.
* Compatibility note: changed from full-row auth seeding to ID-only seeding after restore failure on generated `auth.users` columns (for example `confirmed_at`) in local environments.

## 7. Local Restore Flow
1. Start a local Supabase/Postgres Docker environment with `auth` schema available.
2. Run the exported SQL file once.
3. If your target does not include `auth.users`, run the export anyway to restore `public` schema/data; `auth` seeding and `auth`-dependent FK creation will be skipped with `NOTICE` messages.
