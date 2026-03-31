# Task: Queen Tracker Hardening Audit
**Date:** 31/03/2026
**Status:** Completed

## 1. Objective
Harden the `Queen Tracker` implementation against permission drift, silent update failure, and concurrent mutation races so the tracker behaves safely under real Supabase RLS constraints and adverse user interaction.

## 2. Impact Analysis
* **Files to Modify:** * `src/hooks/useQueenTracker.ts`
  * `src/components/batches/QueenTrackerTab.tsx`
  * `docs/features/queen-tracker.md`
  * `docs/features/queen-tracker-hardening-audit-plan.md`
* **Simplicity Check:** Keep the hardening local to the tracker hook and tab. Reuse the existing date utilities and existing rearing-group ownership source instead of introducing parallel logic or broad refactors.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Align tracker visibility and ownership resolution with the canonical `rearing_groups.owner_id` model so group-owner access does not depend on a separate membership-role assumption.
- [x] **Step 2:** Harden mutation paths in `useQueenTracker.ts` so overwintering and hybridisation updates only report success when a row was actually updated, with clear handling for permission-denied or stale-row cases.
- [x] **Step 3:** Close the remaining concurrent-write gap around hybridisation date edits and tighten related defensive checks, including local-date handling and null-safe derived formatting.
- [x] **Step 4:** Update documentation in `docs/features/queen-tracker.md`
- [x] **Step 5:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The tracker mixed client-side ownership assumptions with stricter database permissions, and the update helpers treated zero-row writes as success while the hybridisation date path still bypassed the in-flight guard.
* **Summary of Changes:** Reworked tracker ownership resolution to use `rearing_groups.owner_id`, marked non-owned rows as read-only, verified update success by selecting the updated row, and locked the hybridisation date path behind the same per-row mutation guard as the toggles.
* **Notes for User:** The live Supabase policies were checked through the MCP connection. Build tests were not run per repository instruction.
