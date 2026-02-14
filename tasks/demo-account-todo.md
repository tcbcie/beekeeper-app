# Demo Account Creation - Todo

## Tasks

- [x] Step 1: Create the auth user (`demo@hivecraic.com`)
- [x] Step 2: Update the profile (role, subscription, active)
- [x] Step 3: Build UUID mapping tables for all source records
- [x] Step 4a: Copy Round 1 — apiaries, colonies, queens (mother_id NULL), bulk_containers, batch_runs
- [x] Step 4b: Copy Round 2 — hives (depends on apiaries, queens, colonies), fix queens.mother_id
- [x] Step 4c: Copy Round 3 — inspections, varroa_checks, varroa_treatments, harvests, colony_movements, tasks_events, gdd_records, financial_records, purchase_items, hive_configuration_history, container_harvests, batch_containers
- [x] Step 5: Clean up temp tables
- [x] Step 6: Verify record counts match source
- [x] Step 7: Create/update documentation in docs/features

## Review

### Summary
Created a demo account (`demo@hivecraic.com` / `HiveCraic2026!`) with a full copy of live data from the source account. All 18 tables were copied with correct FK remapping.

### Record Count Verification (source vs demo)

| Table | Source | Demo | Match |
|-------|--------|------|-------|
| apiaries | 3 | 3 | Yes |
| hives | 11 | 11 | Yes |
| queens | 11 | 11 | Yes |
| colonies | 11 | 11 | Yes |
| inspections | 44 | 44 | Yes |
| varroa_checks | 55 | 55 | Yes |
| varroa_treatments | 18 | 18 | Yes |
| harvests | 2 | 2 | Yes |
| colony_movements | 11 | 11 | Yes |
| tasks_events | 8 | 8 | Yes |
| gdd_records | 22 | 22 | Yes |
| financial_records | 11 | 11 | Yes |
| purchase_items | 1 | 1 | Yes |
| bulk_containers | 1 | 1 | Yes |
| batch_runs | 2 | 2 | Yes |
| hive_config_history | 11 | 10 | 1 orphan record (references deleted hive) |
| container_harvests | 1 | 1 | Yes |
| batch_containers | 2 | 2 | Yes |

### Notes
- Colony numbers suffixed with 'D' to avoid unique constraint conflicts (e.g. `COL-64-DA` → `COL-64-DAD`)
- Batch codes and trace codes suffixed with 'D' for same reason
- 1 hive_configuration_history record was orphaned (references a deleted hive) and was intentionally skipped
- Demo user ID: `10b5ecdd-d1f8-41a0-b756-73ac1f5c68d1`
- Subscription set to expire 2099-12-31
