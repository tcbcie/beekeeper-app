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

## Admin export security (batch 7, 17/10/2026)

- **Password re-check:** "Export Complete Database (All Users)" requires the admin to re-enter their password. The server checks it with a throwaway sign-in that doesn't affect any session.
- **Sign-in secrets are left out by default:** `auth.users` password hashes and sign-in, recovery and confirmation tokens are blanked, as are `profiles.beep_api_token` / `wolf_api_token`. The "Include sign-in secrets" tick box puts them back, which is only needed for a full restore. Without them, users reset their passwords and reconnect scales after a restore, and the file header says so.
- Every admin export is recorded in `admin_audit_log` (`database_export`, with the mode and whether secrets were included). No record, no export.
- The error response no longer includes internal error text.
