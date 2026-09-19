# Feature: Tasks Apiary and Hive Filters
**Date:** 18/09/2026
**Status:** Implemented; awaiting user build and browser verification

## 1. Overview
On Tasks & Events, selecting an apiary now restricts the Hive dropdown to that apiary. Previously the dropdown rendered the entire accessible hive collection even though the task list already filtered by apiary.

## 2. Scope & Simplicity
* **In Scope:** Scope Hive options to the selected apiary and prevent incompatible hive selections from remaining active.
* **Out of Scope:** Layout changes, task association editing, Visit Checklist changes and changes to other dashboard pages.
* **Existing Code Impact:** Keep application changes in the Tasks & Events page and reuse existing hive association data.

## 3. Technical Design
### Architecture
Derive the available hive options from the existing hives array using each hive's apiary_id. All Apiaries retains the full accessible collection. Keep shared selections using the existing empty-string convention and the page's all sentinel.

When the user changes apiary, clear a selected hive whose loaded apiary_id conflicts with the new scope. Apply the same check to restored selections. Derive the effective Hive filter immediately so its displayed value, task filtering and counts agree while the shared selection is being cleared.

Missing hive IDs are preserved: an initial empty array, a failed shared-access request or an archived hive must not be treated as proof of a mismatch. This retains existing archived-hive link behaviour. A hive link without an explicit apiary selects All Apiaries, so tasks remain visible when their stored apiary is empty or differs from the hive's current apiary. Incoming links with a known hive/apiary conflict discard the hive selection before writing shared state. Existing task links still highlight their target.

### Database Connections (MCP Server)
No database access or schema change is needed for this fix. Existing application queries already retrieve apiary_id for owned and shared hives. No saved SQL files will be parsed.

## 4. Edge Cases & Risks
* All Apiaries must show every accessible hive, including hives without an apiary.
* An apiary with no accessible hives must show only All Hives.
* Switching apiaries must not leave an invisible hive filter active.
* Saved selections and direct links must remain consistent after asynchronous loading.
* Owned and shared hives must follow the same filtering rules.
* Association-loading failures must not cause premature deletion of saved selections. Only a loaded hive can establish an apiary mismatch; unavailable or archived hive IDs retain their existing behaviour.
* A hive's current apiary and a task's stored apiary are independent. Hive-only links must not impose an additional apiary restriction.
* Direct-link effects must not restore the same incompatible hive selection after the reconciliation effect has cleared it.

## 5. Implementation Phases
1. Phase 1: Scope Hive options and reconcile incompatible selections locally.
2. Phase 2: Review the filter interactions and direct-link behaviour, update documentation, and request user build and browser verification.

### Verification
Source review covers owned/shared options, empty apiaries, unassigned hives under All Apiaries, compatible and incompatible saved selections, failed shared-access lookups, archived-hive links and hive/apiary/task direct links. Targeted ESLint and whitespace checks are run without a build.

### QA audit
The QA engineer audit found no Critical or High issues.

* **Medium, fixed:** Hive-only links selected the hive's current apiary and therefore excluded tasks with no apiary or an older apiary. These links now clear the apiary restriction while retaining the hive.
* **Low, fixed:** A conflicting incoming link could restore the same invalid hive immediately after reconciliation cleared it. Because the mismatch boolean stayed true, reconciliation did not rerun. Hive and task link writes now reject known conflicts before storing selections.

The audit uses source review, TypeScript and ESLint only; no test code or build is added or run.

Final verification: targeted ESLint and whitespace checks passed. TypeScript reported 97 diagnostics in existing test files and none outside tests, including none in the changed Tasks page. The independent follow-up review found no further issues in the corrections. Browser and build verification remain with the user.

User verification:
1. Select an apiary and confirm the Hive dropdown lists only its hives.
2. Select a hive, switch apiaries and confirm the selection resets to All Hives and task counts follow the new scope.
3. Select All Apiaries and confirm the full hive list returns; an apiary with no hives should offer only All Hives.
4. Reload or navigate from another page with saved filters, and check hive/task links still open the intended scope.
5. Run the application build.
