# Batch 40: Teams, Queens and Tools

**Status:** Implemented 24/10/2026, waiting for the owner's test.
**Checklist:** `tasks/security-batch40-todo.html`
**Database:** no change.
**Findings:**
- **Fixed:** C6-10, C6-16, C6-17 to C6-19, C8a-05, C8a-06, C8a-07 and C8a-13.
- **Left as it is:** C8a-16.

This is Phase 2 fix batch 27.

## A. Team and group details: C6-10

- **The bug:** the apiary-team page and `useRearingGroups` keep one page-wide set of member, invitation and apiary lists. A slow answer for the team opened before could fill the one on screen. That team's Remove buttons act on `member.team_id`, so a tap could remove someone from the other team.
- **Now, on the apiary-team page:**
  - **Numbered loads:** `fetchTeamDetails` and `fetchRearingGroupDetails` number each load and act only on the latest.
  - **Clear first:** they clear the previous lists before loading, and own the loading spinner (callers no longer set it).
  - **Team apiaries:** `fetchTeamApiaries` only updates the list for the team whose details are open (`detailTeamRef`).
  - **Invite window:** it shows "Loading members…" while loading. Closing it no longer empties the lists; it reloads the open panel's team instead.
- **Now, on the rearing-group page:** sending an invite or completing a transfer reloads the open panel's group. Closing Invite or Transfer without doing anything does the same.

## B. Failed loads: C6-16

A failed load now says it couldn't load, instead of showing the "nothing here" state:
- **Queens list (`useQueensList.loadError`):** a failed queens or hives lookup keeps the list and shows an alert with Try again. Without the hive lookup, every queen showed "N/A" and matched the Unassigned filter.
- **Assignment history (`useQueenAssignments.loadError`):** shows an error line with Try again.
- **Lineage page:** shows "Couldn't load your queens' lineage" with Try again.
- **Rearing report (`useRearingGroupReport.reportError`):** shows an error instead of "No rearing data". Report loads are also numbered, so quick month changes can't show the wrong month.
- **Rearing groups (`rearingGroupsError`, `rgDetailsError`):** the list shows an alert with Try again. The panels and the Transfer window show an error line.
- **Apiary teams (`teamsError`, `detailsError`):** the same pattern. Error toasts read `.message`, which Supabase errors carry because they are plain objects; before, they said "Unknown error".

## C. Sizes: C6-17 to C6-19

- **48px targets:** about 79 places in 12 files:
  - the team and group pages
  - the queens list and detail pages
  - lineage and compare
  - `QueenAssignmentHistory`, `QueenFormSection` and `QueenLineageTree`
  - `QueenReportTab`, `RearingGroupReport` and the NIHBS return
- **What changed:** fields gain `min-h-12` or `min-h-[48px]`. Icon buttons get a 48×48 area. The 44px, 40px and 32px caps are removed. Checkboxes sit in 48px labels. 16 fields go from `text-sm` to `text-base`; the NIHBS number boxes also widen to `w-24`.
- **Every tab row:** `NavTabButton` gains `min-h-12`, which the owner approved.

## D. Tools: C8a-05, C8a-06, C8a-07, C8a-13

- **C8a-05:** deleted 10 files, about 2,500 lines. Each was checked against static imports, dynamic imports and tests.
  - **Components:** `ApiaryLocationAnalyzer`, `AssociationFinder`, `HiveStrengthAnalyzer`, `HoneySuperCalculator`, `QueenProductivityTracker`, `SeasonalTaskGenerator`, `TreatmentSchedulePlanner` and `VarroaDropCalculator`.
  - **Libraries:** `src/lib/tool-calculations.ts` and `src/lib/external-data.ts`.
- **C8a-06:** `GDDTracker.calculateGDD` uses `fetchArchiveDaily`, which checks `ok`, has a 15-second timeout and a per-page cache, plus `calculateGDDFromDaily`. Its own copy of the formula is removed. The bloom date has `max = today`.
- **C8a-07:** GDD record delete and sharing toggle use `.select('id')` with a 0-row check, and show success and error toasts.
- **C8a-13:**
  - **Cleanup:** `qr-download.ts` removes the temporary link in `finally`, and revokes the SVG blob URL on failure too.
  - **Traceability:** `BatchesTab.downloadQrCode` uses `downloadQrPng` and shows a toast on failure. Before, it was a hand-rolled copy that failed silently.

## Rules

- When page-wide detail lists serve several teams or groups:
  - number the loads and clear the lists first;
  - only update a list for the item whose details are open;
  - restore the open panel's details after a modal for another item.
- A failed list load shows an error with a retry, never the empty state.
- Shared tab buttons are 48px tall.
