# Feature: Admin Export Empty Database Option
**Date:** 04/03/2026
**Status:** Implemented

## 1. Overview
Add a second admin export option in the Settings export panel that outputs a restore-ready SQL file containing schema recreation and only one admin account, with no other user or operational data. This enables quick bootstrap of a clean environment.

## 2. Scope & Simplicity
* **In Scope:** Admin-only UI option, request mode parameter, and server-side SQL generation branch for `schema_admin_only`.
* **Out of Scope:** Replacing the current full export flow, changing non-admin export flow, and introducing a new account-creation subsystem.
* **Existing Code Impact:** `src/components/settings/ProfileExport.tsx` and `src/app/api/admin/export-all-data/route.ts` only.

## 3. Technical Design
### Architecture
Keep one admin export endpoint with two explicit modes:
1. `complete`: existing behaviour (schema + all users/data).
2. `schema_admin_only`: schema recreation plus one login-capable admin seed (exporting admin account), with all public table data exports skipped except the exporting admin profile row.

The UI will present two admin actions and pass the selected mode in the POST body.

### Database Connections (MCP Server)
No schema migration is needed. The route continues using the existing service-role Supabase client and safe metadata queries. Data reads remain direct runtime queries; no `.sql` parsing is introduced.

## 4. Edge Cases & Risks
* Ensure the existing complete export output and file naming remain unchanged.
* Ensure `schema_admin_only` never includes non-admin auth rows or other table data rows.
* Ensure the admin seed remains login-capable and role-consistent (`Admin`) after restore.
* Ensure missing `auth` objects in target environments continue to fail gracefully with existing guarded notices.

## 5. Implementation Phases
1. Phase 1: Add mode-aware admin export trigger in Settings UI.
2. Phase 2: Implement mode branching in admin export SQL generation with admin-only seed filtering.
3. Phase 3: Update feature documentation and hand off for user build verification.

## 6. Implementation Notes
* Added a second admin export action in Settings: `Export Empty Database (Schema + Admin)`.
* Admin export requests now send an explicit `mode` payload to `/api/admin/export-all-data`.
* The admin export API now supports:
  * `complete` (unchanged existing behaviour).
  * `schema_admin_only` (schema recreation + one login-capable admin seed).
* In `schema_admin_only` mode:
  * `auth.users` seed rows are filtered to the exporting admin user only.
  * `auth.identities` seed rows are filtered to identities for that admin user only.
  * Public table data export is skipped for all tables except `profiles`, where only the exporting admin profile row is included.
* SQL output now includes mode metadata in the export summary and mode-specific file naming for downloads.
