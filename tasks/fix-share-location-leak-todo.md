# Fix: can_access_apiary share_location Data Leak

## Execution Plan

- [x] **Step 1:** Remove the `share_location` clause from `can_access_apiary()` — this is a single `OR EXISTS` block removal. The community map uses `shared_apiaries_obfuscated` view, so it is unaffected.
- [x] **Step 2:** Update UpcomingEvents component to join `apiaries` in its query so apiary names display instead of "Unknown".
- [x] **Step 3:** Update documentation.
- [ ] **Step 4:** Prompt user to test the build.

## Post-Task Review
* **Root Cause Found:** `can_access_apiary()` had a clause granting access to any apiary with `share_location = true`, meaning all 19 shared apiaries' tasks/inspections/hives were visible to every authenticated user.
* **Summary of Changes:**
  - **Database:** Removed `share_location` clause from `can_access_apiary()`. Added `SET search_path = public` for security hardening.
  - **UpcomingEvents:** Added `apiaries(name)` join to the query and display the apiary name on task cards.
* **Notes for User:** The community map is unaffected — it uses `shared_apiaries_obfuscated` view. Team-based sharing continues to work as before.
