# Batch 32: Exports and Saves

**Status:** Implemented 23/10/2026, waiting for the owner's test.
**Checklist:** `tasks/security-batch32-todo.html`
**Findings:** C9a-02 (the last open High), C9a-19, C8a-11, C8a-12, the Chunk 6 CSV item, and C4-07. C3-06 and C9a-11 were checked and left, with notes below. This is Phase 2 fix batch 19 and the first batch of Medium findings. Three agents checked each finding against the code and the live policies.

## A. Personal data export (Settings → Export): C9a-02

- **Before:** the non-admin SQL export read all 72 tables in `DATABASE_EXPORT_TABLES` with no owner filter, so RLS decided what came back. That meant:
  - reference data (knowledge base, news, dropdowns, associations);
  - other people's rows (team-mates' hives and records, shared GDD records, all conservation areas, and wild colonies for power users);
  - never the user's own `profiles` row, because `select('*')` is refused by the column grants.
  A failed table only appeared as a comment at the end of the file, under a "success" toast.
- **Now** (`src/components/settings/ProfileExport.tsx`):
  - It reads the `USER_EXPORT_TABLES` list, each table filtered on `user_id` through `fetchAllRows`, which still pages past 1,000 rows (batch 25). This is the same list the Profile page export uses.
  - The user's profile row is read with `PROFILE_COLUMNS` and `.eq('id', userId)`.
  - A failed table stops the export with an error, matching `fetchUserExportData`.
  - The "visibility depends on your row-level security permissions" header line is gone.
- **Unchanged:** the admin export runs on the server.
- **Known gap (both personal exports):** owned tables with no `user_id` column are left out. These are `batch_containers`, `batch_jars`, `batch_feedback` and `container_harvests` (owner-only through their parent), and the teams and rearing groups the user owns (`owner_id`).

## B. CSV exports: C9a-19, C8a-11, C8a-12, Chunk 6

- **The shared helper** (`src/lib/csv.ts`, previously used only by the CRM exports) now:
  - exports `escapeCsvField`;
  - takes any value: lists and objects are written as JSON, dates as ISO, and an invalid date becomes an empty cell;
  - leaves plain numbers alone (`-8.12`, `"-5.00"`, `1e-7`) and the `-` placeholder. The formula guard would otherwise turn Irish longitudes and sub-zero temperatures into text.
  - Formula guard, quoting, CRLF line endings and the UTF-8 BOM are as before.
- **Writers switched over:**
  - `exportToCSV` in `src/lib/export-utils.ts`, which covers the 7 reports and the 2 nuc report buttons;
  - Profit & Loss (`src/components/tools/ProfitLoss/index.tsx`);
  - the queens list (`src/app/dashboard/queens/page.tsx`). It includes team-mates' queens, so their notes were the realistic formula risk. "Marking Color" is now "Marking Colour".
  - the Profile page CSV backup (`src/app/dashboard/profile/page.tsx`). Its quoting was broken: quotes weren't doubled, and line breaks and lists split rows. Headers now cover every column in the table, not only the first row's.
- No CSV is read back by the app, so the format change breaks nothing.
- Tests: `tests/lib/csv.test.ts`.

## C. Record edits and deletes that reported success: C4-07

- **The cause:** RLS lets team-mates *see* records on a shared hive (`can_access_hive`), but `UPDATE` and `DELETE` are limited to `user_id = auth.uid()`. A blocked update or delete returns no error.
- **Fix in `src/app/dashboard/records/page.tsx`:** feeding edit and delete, harvest edit and delete, varroa check edit and delete, and treatment delete now add `.select('id')`. When no row comes back they show "Only the beekeeper who recorded this … can change/delete it." The varroa check edit also removes a photo it has just uploaded. Inspection edit and delete, and treatment edit, already did this.
- **Cards:** the five record cards (`src/components/records/cards/`) show Edit and Delete only when `record.user_id === userId`.
- **Error messages:** the records page catch blocks read `.message` from the plain Supabase error object instead of showing "Unknown error". This covers the inspection, treatment, check, feeding and harvest saves and the hive archive.

## D. Checked, not changed

- **C3-06 (hive edits):** the live `hives_update_policy` uses the same rule as viewing (owner, or access to the apiary). An edit can't be silently blocked in normal use. The wrong comment in `HiveFormSection.tsx`, which said owner-only, is corrected.
- **C9a-11 (admin screens):** the client role checks match the admin-only policies, so a write is only blocked if the role is removed mid-session. Left as low priority.

## Rules

- **Updates and deletes on tables team-mates can see but not change:** add `.select('id')` and treat 0 rows as "not allowed". RLS returns no error.
- **CSV:** always use `toCsv`/`downloadCsv`/`escapeCsvField` from `src/lib/csv.ts`; never hand-roll CSV.
- **Personal exports:** filter by owner. RLS visibility is wider than ownership.
