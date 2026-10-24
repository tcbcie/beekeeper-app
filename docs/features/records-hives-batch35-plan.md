# Batch 35: Records and Hives

**Status:** Implemented 23/10/2026, waiting for the owner's test.
**Checklist:** `tasks/security-batch35-todo.html`
**Migration:** `supabase/migrations/20261023200000_records_hives_batch35.sql`, applied through MCP.
**Findings:** C4-08, C4-09, C4-12, C4-20, C3-05, C3-11 and C3-13 fixed; C4-16 closed as not real. This is Phase 2 fix batch 22. Two agents checked each finding against the code and the live database.

## A. Varroa treatment task: C4-08

- **Before:** `handleCheckSubmit` (`records/page.tsx`) inserted the task with `category: 'Treatment'`. The `tasks_events_category_check` constraint only accepts lowercase values, and the insert result wasn't checked, so the task was never created. 30 checks had passed the threshold, and 0 tasks existed.
- **Now:**
  - **The task row:** `category: 'treatment'` and `all_day: true`, with no `start_time` or `reminder_minutes_before`. It is a team task on a shared hive, as inspection follow-ups and treatment reminders are.
  - **Errors:** a failed insert shows a warning.
  - **When it is created:** a new check over the threshold, or an edit that newly reaches it (the saved check was below).
  - **Description:** says "Daily mite drop: N mites/day" for Natural Mite Drop and Screening Board, "Infestation rate: N%" for other methods, and leaves the reading out when there is none.
- **Not done:** the 30 missed tasks are not created after the fact; they would all be overdue at once. The task has no link to its check, so deleting the check leaves the task, which can still be valid on its own.

## B. Tasks list: C4-09

- **Before:** `fetchTasks` loaded `start_date >= 12 months ago`, oldest first, limited to 1000. Unfinished tasks older than a year vanished (124 overdue tasks would start dropping off from late November 2026), and at the cap the newest tasks were cut.
- **Now:**
  - **Filter:** `.or('completed.eq.false,start_date.gte.<cutoff>')`.
  - **Paging:** pages of 1000 via `.range()`, ordered by `start_date, id`, until a short page.
  - **Live:** the busiest account has 275 tasks.

## C. Forms: C4-12, C4-20

- **C4-12, resets:**
  - **Deep links:** `records/page.tsx` keeps `handledLinkRef`, so each link is acted on once. Before, a shared-hive link changed the ownership filter, `hives` reloaded before the URL was cleared, and the new record opened again, wiping staged photos.
  - **Preselected hive:** `InspectionForm` and `VarroaCheckForm` apply the page's hive/apiary filter once per filter value (`appliedFilterRef`, reset per record opened). Before, every hive-list reload put the filter's hive back over the one picked in the form, and in the inspection form that also cleared the brood, right-sized frames and super values.
  - **Days:** `VarroaCheckForm` keeps a Days value typed by hand (`daysTypedRef`). Before, a reload of existing checks overwrote it.
- **C4-20, false "unsaved" prompts:**
  - **The cause:** the forms' own fill-ins counted as user edits. Those are the preselected hive, carried-over right-sized frames and super fullness, brood-box reconcile and scale weight in `InspectionForm`, and the weather in `VarroaTreatmentForm`.
  - **The fix:** each fill-in now flags itself, and only inside an updater that really changes the state, so the flag can't linger onto a user edit. On an untouched form the dirty check takes the filled state as the new baseline. Once the user has changed anything, fill-ins count as changes.
  - **Where the flag lives:** `InspectionForm` has its own `autoFillRef`/`isDirtyRef`. `useFormDirtyState` exposes a stable `noteAutoFill()`.
  - **Tests:** two in `inspection-dirty-state.test.tsx`; the first fails without the fix.

## D. Hives and scales: C3-05, C3-11, C3-13

- **C3-05:**
  - **The cause:** `JSON.stringify(editingHive.configuration) !== JSON.stringify(formData.configuration)` was always true, because jsonb key order and the form's defaulted keys differ. So every hive save set `configuration_changed_at/_by`, and 98 hives had a stamp newer than their last history row.
  - **The fix:** `isConfigurationChanged` (exported from `HiveFormSection.tsx`) compares field by field against `formDataFromHive(hive).configuration`. A test covers it.
  - **The trigger:** `track_hive_configuration_changes` is an AFTER trigger, so its `NEW.configuration_changed_* :=` lines never had any effect; the migration removes them. The history rows were always correct.
- **C3-11:**
  - **The cause:** assigning a BEEP or Wolf scale only updated the target hive.
  - **The fix:** `releaseScaleFromOtherHives` (`hives/[id]/page.tsx`) first clears the scale from the owner's other hives, so it moves.
  - **Database guard:** unique partial indexes `hives_user_beep_device_uniq` and `hives_user_wolf_scale_uniq` on `(user_id, scale)`. They are per account, because the demo copy account shares scale IDs with the original.
  - **Errors:** 23505 becomes "This scale is still on another of your hives". The scale modals read `.message`, because Supabase errors aren't `Error` instances.
- **C3-13:**
  - **Not affected:** the scale, weather and GDD caches already stored only successes.
  - **The fix:** the bloom caches in `ApiaryWeatherRow.fetchGDDAndBloom` cached failures. Now a vegetation-info error or community RPC error throws before caching, and the confirmed blooms (1 h) are cached only if the user's own records and the community records both answered.

## E. C4-16, closed

Treatment reminders are `tasks_events` rows with `treatment_id`, and `tasks_events_treatment_id_fkey` is `ON DELETE CASCADE`. Live: 0 reminders left over from deleted treatments. The audit read only the client delete.

## Rules

- Task categories are lowercase (`tasks_events_category_check`). Always check the result of an auto-created task insert.
- A form's own fill-ins mark themselves inside the updater (`autoFillRef` / `noteAutoFill`), so an untouched form stays clean.
- Page filters preselect a form once per filter value; list reloads must not re-apply them.
- A scale sits on one hive per account; assigning moves it.
