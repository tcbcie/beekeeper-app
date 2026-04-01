# Feature: Queen Ledger Batch Join Type Fix
**Date:** 01/04/2026
**Status:** Implemented

## 1. Overview
This fix corrects a TypeScript regression in the Queen Ledger hook by matching the typed `rearing_batches` nested join shape to the raw Supabase response. The goal is to restore a clean build without changing the ledger’s data flow or behaviour.

## 2. Scope & Simplicity
* **In Scope:** Correcting the nested join type shape for `rearing_batches` and preserving the current join normalisation path.
* **Out of Scope:** Query refactors, UI changes, schema changes, or behaviour changes.
* **Existing Code Impact:** The fix is limited to the ledger hook and the tracker feature note.

## 3. Technical Design
### Architecture
The existing hook already normalises nested joins with `firstJoinedRecord(...)`. This fix keeps that pattern and only corrects the intermediate TypeScript shape so it matches the Supabase payload before normalisation.

### Database Connections (MCP Server)
No database change is required. The query itself remains unchanged; only the TypeScript representation of the nested join payload is being corrected.

## 4. Edge Cases & Risks
* The current cast is too narrow for the raw join payload and fails the build.
* A cast-through-`unknown` would silence the error but would not fix the underlying shape mismatch.
* The fix should preserve the current runtime handling of optional nested records.

## 5. Implementation Phases
1. Phase 1: Correct the `rearing_batches` nested join type shape in the Queen Ledger hook.
2. Phase 2: Confirm the existing join normalisation path remains intact and update the tracker documentation.

## 6. Implementation Notes
The Queen Ledger hook now models the raw `rearing_batches` nested join with array-capable nested relation types for `profiles`, `apiaries`, and `queens`. The existing `firstJoinedRecord(...)` normalisation path stays unchanged, but the invalid cast that broke the build is now removed at the type-shape level.
