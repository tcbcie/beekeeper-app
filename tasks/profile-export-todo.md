# Task: Add Missing User Tables to Profile Page Export
**Date:** 09/03/2026
**Status:** In Progress

## 1. Problem
The Profile page JSON/CSV export only includes 13 tables, but there are 22 additional user-owned tables (with `user_id` column) that are missing.

## 2. Impact Analysis
* **Files to Modify:**
  * `src/app/dashboard/profile/page.tsx` — add 22 tables to both `exportMyDataAsJSON` and `exportMyDataAsCSV` functions
  * `docs/features/profile-export.md` — document the complete export coverage
  * `tasks/profile-export-todo.md`
* **Simplicity Check:** Same pattern as existing code — `supabase.from(table).select('*').eq('user_id', userId)`. No new logic, just extending the existing Promise.all arrays and data objects.

## 3. Tables to Add (22, all have `user_id`)
1. financial_records
2. batch_grafts
3. graft_distributions
4. mating_nucs
5. mating_nuc_inspections
6. mating_nuc_batches
7. wild_colonies
8. wild_colony_inspections
9. diagnosis_images
10. diagnosis_image_comments
11. qr_tags
12. logbook_entries
13. conservation_areas
14. bulk_containers
15. purchase_items
16. batch_runs
17. push_subscriptions
18. support_tickets
19. reactivation_requests
20. subscription_history
21. rearing_group_members
22. team_members

## 4. Tables NOT added (no `user_id`, linked via parent)
- hive_configuration_history (uses `changed_by`)
- batch_containers (linked via batch_id → batch_runs)
- batch_feedback (linked via batch_id → batch_runs)
- container_harvests (linked via container_id → bulk_containers)
- nihbs_monthly_returns (uses `updated_by`)

These are still covered by the full Settings SQL export.

## 5. Execution Plan
- [x] **Step 1:** Add 22 tables to `exportMyDataAsJSON` function
- [x] **Step 2:** Add 22 tables to `exportMyDataAsCSV` function
- [x] **Step 3:** Update feature documentation
- [ ] **Step 4:** Prompt user to test the build

## 6. Post-Task Review
* **Summary of Changes:**
  * `src/app/dashboard/profile/page.tsx` — Added 22 missing user-owned tables to both `exportMyDataAsJSON` and `exportMyDataAsCSV` functions, bringing total from 13 to 35 tables
  * `docs/features/profile-export.md` — Created feature documentation listing all exported tables
* **Notes for User:** Please test both JSON and CSV exports from the Profile page and verify the downloaded files contain all 35 table sections.
