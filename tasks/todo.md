# Task: Make Mating Nuc Number Optional
**Date:** 27/02/2026
**Status:** Completed

## 1. Objective
Allow users to create and edit mating nuc records without entering a `Nuc Number`, while preserving duplicate checks for provided numbers.

## 2. Impact Analysis
* **Files to Modify:**
  * `src/components/batches/MatingNucsTab.tsx`
  * `docs/features/mating-nuc-number-optional-plan.md`
  * `tasks/todo.md`
* **Simplicity Check:** Apply a surgical change to existing form and submit logic only, without touching schema or unrelated mating nuc workflows.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Remove required UI constraint from the single-form `Nuc Number` input.
- [x] **Step 2:** Normalise `nuc_number` in submit flow; run duplicate validation only when a number is provided.
- [x] **Step 3:** Persist blank `nuc_number` values as `null` on create/update.
- [x] **Step 4:** Update documentation in `docs/features/mating-nuc-number-optional-plan.md`.
- [x] **Step 5:** Prompt user to test the build.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The form and submit flow always treated `nuc_number` as mandatory, so users could not save entries without a manual number.
* **Summary of Changes:** Made `Nuc Number` optional in the UI; updated submit logic to trim and validate duplicates only when a number exists; persisted blank numbers as `null`; and normalised edit form values to keep the input controlled.
* **Notes for User:** Build/tests were not run locally (per project instruction). Please test create/edit flows with and without a nuc number.
