# Task: Community Map Privileged Defaults
**Date:** 27/03/2026
**Status:** Completed

## 1. Objective
Change the Community Map so Power Users and Admins do not have the privileged community overlays selected by default on first load. This will make wild colonies start hidden, and will treat conservation areas as hidden by default for those privileged users.

## 2. Impact Analysis
* **Files to Modify:** * `src/app/dashboard/community-map/page.tsx`
  * `docs/features/community-map-privileged-defaults-plan.md`
* **Simplicity Check:** Keep the change limited to the Community Map page's initial UI state and its supporting feature note. Do not alter data fetching, permissions, or the Settings page, which already defaults to the `Profile` section rather than `Conservation Areas`.

## 3. Execution Plan
*(Agent: STOP and wait for user verification before beginning execution)*
- [x] **Step 1:** Update the Community Map state initialisation so Power Users and Admins start with wild colonies hidden by default, while keeping the existing toggle behaviour unchanged.
- [x] **Step 2:** Update the Community Map state initialisation so Power Users and Admins start with conservation areas hidden by default, without affecting the underlying conservation-area data load.
- [x] **Step 3:** Review the surrounding map summary and control behaviour to ensure the default-off state does not break counts, toggles, or later layer rendering.
- [x] **Step 4:** Update documentation in `docs/features/community-map-privileged-defaults-plan.md`
- [x] **Step 5:** Prompt user to test the build

## 4. Post-Task Review
*(Agent: Fill this out ONLY after all checklist items are complete)*
* **Root Cause Found (if applicable):** The Community Map was initialising privileged overlays with the same visible-by-default behaviour as general layers, so Power Users and Admins landed on a busier first view than intended.
* **Summary of Changes:** Updated the Community Map bootstrap so Power Users and Admins start with wild colonies and conservation areas hidden by default, and documented the behaviour in the feature note.
* **Notes for User:** I verified during planning that the Settings page already defaults to `Profile`, so this request was implemented as a Community Map default-selection change rather than a Settings-tab change.

## Review
* **Scope Covered:** Community Map privileged default visibility only.
* **Summary of Changes:** Power User/Admin sessions now flip `Wild colonies` and `Conservation areas` off during the authenticated map initialisation flow before the map is shown, while leaving data loading and manual toggles unchanged.
* **Notes for User:** Please test the Community Map as a Power User or Admin and confirm the two layers start hidden and can still be enabled normally.
