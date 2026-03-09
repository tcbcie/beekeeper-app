# Profile Page Data Export

## Overview
The Profile page provides JSON and CSV export of the user's personal beekeeping data. This is a lighter, user-facing backup separate from the full Settings SQL export.

## Export Formats
- **JSON** — structured data with export metadata, downloaded as `hivecraic-backup-{timestamp}.json`
- **CSV** — table-by-table format, downloaded as `hivecraic-backup-{timestamp}.csv`

## Tables Exported (35 user-owned tables)

### Core
- apiaries, hives, queens, colonies, colony_movements

### Records
- inspections, varroa_checks, varroa_treatments, feedings, harvests, gdd_records

### Queen Rearing
- rearing_batches, batch_grafts, graft_distributions, mating_nucs, mating_nuc_inspections, mating_nuc_batches

### Wild Colonies
- wild_colonies, wild_colony_inspections

### Diagnosis
- diagnosis_images, diagnosis_image_comments

### Financial & Honey
- financial_records, bulk_containers, purchase_items, batch_runs

### Tools & Misc
- tasks_events, qr_tags, logbook_entries, conservation_areas

### Account & System
- push_subscriptions, support_tickets, reactivation_requests, subscription_history, rearing_group_members, team_members

## Tables NOT Included
The following tables lack a `user_id` column and are linked via parent tables. They are covered by the full Settings SQL export:
- hive_configuration_history (uses `changed_by`)
- batch_containers (linked via batch_runs)
- batch_feedback (linked via batch_runs)
- container_harvests (linked via bulk_containers)
- nihbs_monthly_returns (uses `updated_by`)

## Access
Profile page > "Export My Data" section (requires active subscription).

## File
`src/app/dashboard/profile/page.tsx` — `exportMyDataAsJSON()` and `exportMyDataAsCSV()` functions.
