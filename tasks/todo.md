# Task: Admin Export Hardening Review Fixes
**Date:** 04/03/2026
**Status:** Completed

## 1. Objective
Harden the admin export and settings export flows against malformed payload fallback, sensitive over-fetching, row-limit truncation, and weak network error handling.

## 2. Impact Analysis
* **Files to Modify:** * `src/app/api/admin/export-all-data/route.ts`
  * `src/components/settings/ProfileExport.tsx`
  * `docs/features/admin-export-hardening-review-fixes-plan.md`
* **Simplicity Check:** Keep business behaviour unchanged while adding defensive guards, strict mode parsing, targeted auth fetches, paged table export reads, and resilient frontend request handling.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Harden admin export mode parsing and remove unsafe fallback to full export on malformed request payloads.
- [x] **Step 2:** Scope auth seed queries by mode and add paged public-table export retrieval to avoid over-fetching and row-limit truncation.
- [x] **Step 3:** Update documentation in `docs/features/admin-export-hardening-review-fixes-plan.md`
- [x] **Step 4:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The export path had permissive parsing and retrieval patterns that could silently downgrade malformed mode requests to full exports, over-fetch sensitive auth rows, and risk row-limit truncation in large table exports.
* **Summary of Changes:** Hardened mode parsing, scoped auth queries at source for schema-admin-only mode, introduced paged table export retrieval with deterministic ordering when key columns are available, and buffered table SQL to avoid partial table output on read errors. Hardened frontend export flow with timeout, duplicate-submit guard, and robust error parsing.
* **Notes for User:** Storage bucket and storage policy export remains included. Build/tests were not run (per project instruction). Please verify both admin export modes from Settings.
