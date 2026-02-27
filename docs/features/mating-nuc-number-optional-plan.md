# Feature: Optional Mating Nuc Number
**Date:** 27/02/2026
**Status:** Implemented

## 1. Overview
This change makes the `Nuc Number` field optional in the single mating nuc create/edit form. Users can save a nuc without assigning a manual number, which supports workflows where numbering happens later.

## 2. Scope & Simplicity
* **In Scope:**
  * Remove required validation from `Nuc Number` in the single form.
  * Update submit logic so blank values are stored as `null`.
  * Skip duplicate number validation when no number is provided.
* **Out of Scope:**
  * Database schema changes.
  * Changes to bulk creation behaviour.
  * Changes to status, graft, or location logic.
* **Existing Code Impact:**
  * `src/components/batches/MatingNucsTab.tsx`
  * `tasks/todo.md`

## 3. Technical Design
### Architecture
Keep the change local to `handleSubmit` and the `Nuc Number` input in `MatingNucsTab`:
1. Normalise `formData.nuc_number` with `trim()`.
2. Only run uniqueness check if a normalised number exists.
3. Persist `nuc_number` as `null` when the field is blank.
4. Remove HTML `required` from the input.

### Database Connections (MCP Server)
No new queries or schema changes. Existing `mating_nucs` select/insert/update queries are reused with conditional duplicate-check filtering.

## 4. Edge Cases & Risks
* Existing blank/legacy placeholder values like `n/a` should continue to save unchanged when explicitly entered.
* Duplicate validation must still run for non-empty numbers.
* Edit mode must keep working when an existing record has no `nuc_number`.

## 5. Implementation Phases
1. Phase 1: Update UI field constraints for optional `Nuc Number`.
2. Phase 2: Update submit flow to conditionally validate and save `null` for blank values.
3. Phase 3: Update task documentation and prompt user to test build.

Implementation completed in `src/components/batches/MatingNucsTab.tsx` with no schema changes.
