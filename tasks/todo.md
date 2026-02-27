# Task: GDD Average Temperature Indicator Fix
**Date:** 27/02/2026
**Status:** Completed

## 1. Objective
Fix the accumulation chart average temperature indicator so it updates correctly across months and clearly reflects how the displayed value is calculated.

## 2. Impact Analysis
* **Files to Modify:**
  * `src/components/research/GDDDataTab.tsx`
  * `docs/features/gdd-avg-temperature-indicator-fix-plan.md`
  * `docs/features/gdd-data.md` (or update existing GDD feature documentation file used by the project)
  * `tasks/todo.md`
* **Simplicity Check:** The fix will be limited to the chart dataset mapping logic and related documentation, avoiding any broader redesign of the GDD page.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Refactor accumulation chart temperature plotting in `src/components/research/GDDDataTab.tsx` so monthly average temperature points are mapped deterministically (not dependent on sparse 7-day sampling hitting days 14-16).
- [x] **Step 2:** Ensure the plotted temperature values align with the existing monthly calculation logic and remain correctly bound to the right-hand `y1` axis and tooltip units.
- [x] **Step 3:** Update documentation in `docs/features/gdd-data.md` (or the existing GDD feature documentation file).
- [x] **Step 4:** Prompt user to test the build.

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The temperature series was only rendered when a 7-day sampled x-point happened to land on day 14-16 of a month, which skipped multiple months and made the indicator appear static.
* **Summary of Changes:** Updated `src/components/research/GDDDataTab.tsx` to store missing monthly temperatures as `null`, map one deterministic temperature point per month to the nearest sampled mid-month x-position, and keep the auxiliary monthly temperature chart aligned with `null` semantics.
* **Notes for User:** Build/tests were not run (per project instruction). Please test the GDD accumulation chart in dark mode/light mode and confirm the monthly `Avg Temp` points now advance month-by-month.
