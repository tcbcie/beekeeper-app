# Fix: Prevent Multiple QR Tags Assigned to Same Hive

## Problem
The QR Tags assign modal shows all hives in the dropdown, including hives that already have a tag assigned. This allows multiple tags to be assigned to the same hive, which is undesirable.

## Plan

- [x] **1. Filter hive dropdown** — In the assign modal, exclude hives that already have a tag assigned (except if the current tag is already assigned to that hive, so reassignment still works)
- [x] **2. Add DB unique constraint** — Add a partial unique index on `qr_tags(hive_id)` WHERE `hive_id IS NOT NULL` to enforce one-tag-per-hive at the database level
- [x] **3. Update feature docs** — Note the one-tag-per-hive constraint in `docs/feature/qr-tags.md`

## Review

### Changes Made

| File / Resource | Change |
|-----------------|--------|
| `src/app/dashboard/qr-tags/page.tsx` | Added `.filter()` on hive dropdown to exclude hives already assigned to another tag |
| `qr_tags` table (migration) | Added partial unique index `idx_qr_tags_one_per_hive` on `hive_id WHERE hive_id IS NOT NULL` |
| `docs/feature/qr-tags.md` | Documented the one-tag-per-hive constraint |

### How It Works
- **UI layer**: The assign modal dropdown now only shows hives that don't already have a tag, unless the current tag is the one assigned to that hive (allowing reassignment of the same tag)
- **DB layer**: The partial unique index prevents duplicate `hive_id` values at the database level as a safety net
