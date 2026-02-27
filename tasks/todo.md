# Task: Mating Nuc Default Status and Location Input Upgrade
**Date:** 27/02/2026
**Status:** Completed

## 1. Objective
Set the default status in the single mating nuc create form to `Cell Introduced`, and change `Mating Location` to an optional apiary-backed dropdown that includes owned/shared apiaries while still supporting manual entry.

## 2. Impact Analysis
* **Files to Modify:**
  * `src/components/batches/MatingNucsTab.tsx`
  * `docs/features/mating-nuc-status-location-input-plan.md`
  * `tasks/todo.md`
* **Simplicity Check:** Keep all changes inside the existing `MatingNucsTab` flow by reusing current query patterns for shared apiaries and preserving the existing `mating_location` storage as plain text.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Change single-create default status and reset values from `setup` to `cell_introduced`.
- [x] **Step 2:** Add local state and fetch logic for user-accessible apiaries (owned + shared), using existing team membership query pattern.
- [x] **Step 3:** Replace `Mating Location` text input with a dropdown/manual-entry control that remains optional and writes a single text value.
- [x] **Step 4:** Update documentation in `docs/features/mating-nuc-status-location-input-plan.md`.
- [x] **Step 5:** Prompt user to test the build.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The create form still defaulted to `setup` and `mating_location` only accepted free text, so users could not quickly pick existing apiaries and had inconsistent entry patterns.
* **Summary of Changes:** Updated single-create mating nuc defaults to `cell_introduced`; added owned/shared apiary loading via `team_members` and `team_apiaries`; replaced `Mating Location` with an optional apiary dropdown plus manual text input fallback while preserving plain-text storage.
* **Notes for User:** Build/tests were not run locally (per project instruction). Please test the build and verify the create-form behaviour in UI.
