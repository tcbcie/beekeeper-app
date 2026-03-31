# Feature: Queen Tracker Hardening Audit
**Date:** 31/03/2026
**Status:** Implemented

## 1. Overview
Harden the `Queen Tracker` so it behaves predictably under real permission boundaries, failed writes, and overlapping user interactions. The goal is not to redesign the feature, but to remove the most fragile paths where the tracker can currently misreport success, diverge from the ownership model used elsewhere in the application, or allow stale writes to win.

## 2. Scope & Simplicity
* **In Scope:** Tighten tracker ownership resolution, mutation verification, concurrent-update handling, and small defensive formatting gaps; update the Queen Tracker documentation to reflect the hardened behaviour.
* **Out of Scope:** Reworking the broader queen-rearing flow, changing unrelated batch or nuc logic, or introducing a wider architectural refactor beyond the tracker hook and tab.
* **Existing Code Impact:** Keep the change focused on `src/hooks/useQueenTracker.ts`, `src/components/batches/QueenTrackerTab.tsx`, and the related Queen Tracker documentation.

## 3. Technical Design
### Architecture
The tracker stays as the existing `Queen Tracker` tab on `/dashboard/batches`. The hardening pass will keep the present layout and data shape, but will align access checks with the canonical rearing-group ownership source, make write outcomes explicit, and guard the remaining per-row mutation race.

### Database Connections (MCP Server)
The live schema and RLS policies were checked directly through the MCP connection. `graft_distributions` currently grants `SELECT` to group owners for member distributions, but grants `ALL` only to the distribution owner (`user_id = auth.uid()`). The app code therefore needs to stop assuming that every visible tracker row is editable, or else handle denied writes explicitly.

## 4. Edge Cases & Risks
* Group-owner visibility can drift from editability because the tracker currently infers ownership from membership rows while the wider rearing-group model treats `rearing_groups.owner_id` as canonical.
* Supabase updates that affect zero rows can currently surface as success, which is especially dangerous under RLS because the UI can claim a state change that never persisted.
* Hybridisation date edits still bypass the per-row in-flight guard, so overlapping writes can race and let an older value overwrite a newer one.
* Date-only fields currently rely on UTC `toISOString().split('T')[0]`, which can record the wrong calendar date around local midnight.

## 5. Implementation Phases
1. Phase 1: Correct tracker ownership and editability modelling so the UI and hook reflect the real access model.
2. Phase 2: Harden update verification and concurrent mutation handling, then document the resulting tracker behaviour.
