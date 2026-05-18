# Unique batch names

## Rule (agreed with user)

- **Group batches** (`rearing_group_id IS NOT NULL`) — `batch_name` is unique **within the group** (case-insensitive).
- **Solo batches** (`rearing_group_id IS NULL`) — `batch_name` is unique **per user** (case-insensitive).
- Different users may still pick the same name for their own solo batches.

## Approach

1. **DB** — two partial unique indexes on `rearing_batches`:
   - `UNIQUE (user_id, lower(batch_name)) WHERE rearing_group_id IS NULL`
   - `UNIQUE (rearing_group_id, lower(batch_name)) WHERE rearing_group_id IS NOT NULL`
2. **Client** — in `src/app/dashboard/batches/page.tsx` `handleSubmit`:
   - Pre-check for an existing batch with the same name in scope (exclude current id in edit mode). Toast a friendly message if found and abort.
   - Map Postgres unique-violation (`code === '23505'`) in the catch to the same friendly message — covers the race between pre-check and insert.
3. **Docs** — one-liner in `docs/features/queen-rearing.md`.

## Todos

- [x] **1. Migration** — `unique_batch_name_scoped` applied via Supabase MCP: two partial unique indexes (`rearing_batches_unique_solo_name`, `rearing_batches_unique_group_name`).
- [x] **2. Client pre-check + error mapping** in `handleSubmit` — case-insensitive `.ilike` lookup with LIKE-wildcards escaped, scoped to group or user, excludes current id in edit mode; pre-check errors fall through to the DB unique index (authoritative). Catch maps Postgres `23505` to a friendly toast.
- [x] **3. Doc note** — `docs/features/queen-rearing.md` updated with the rule and index names.
- [ ] **4. User verification** — try creating a duplicate within a group and a duplicate solo name → both rejected with the friendly toast.

## Review

### What changed

- **DB** — migration `unique_batch_name_scoped`: two partial unique indexes on `rearing_batches` (`lower(batch_name)`), one scoped per `user_id` for solo batches, one scoped per `rearing_group_id` for group batches.
- **Client** — `src/app/dashboard/batches/page.tsx` `handleSubmit`:
  - Added a pre-check (case-insensitive `.ilike`, LIKE-wildcards escaped) that toasts a scope-aware message and aborts the submit when a duplicate is found.
  - Excluded the current batch id in edit mode so renaming back to your own name doesn't false-positive.
  - Pre-check errors are logged but fall through to the insert/update — the DB index is the authoritative check.
  - Catch block maps Postgres `23505` to the same friendly message, covering the race between pre-check and insert.
- **Docs** — `docs/features/queen-rearing.md` documents the rule and both index names.

### Behaviour

- A user creating a solo batch named "Spring 2026" cannot create another solo batch named "Spring 2026" or "spring 2026". Two different users can both have their own "Spring 2026" solo batch.
- Within a rearing group, no two members can have a batch named "Spring 2026"/"SPRING 2026"/etc.
- Edit mode lets the user save the same batch with its existing name (no false positive).
- DB constraint is the safety net if two users race the pre-check.

### Caveats

- Names differing only in whitespace ("Batch 1" vs "Batch 1 ") are treated as distinct — we don't trim. If that becomes a UX issue, a small `.trim()` on `batch_name` before submit handles it.
- `ilike` with our wildcard escaping treats user input as a literal. The escape regex covers `\`, `%`, `_`.
- The pre-check runs only against rows visible under RLS. The DB index is the catch-all if a member can't see another member's group batch for some reason (current group RLS does allow SELECT, so this is theoretical).

## Verified pre-conditions

No existing duplicates under the chosen scope (`SELECT ... HAVING count(*) > 1` against `rearing_batches` returned 0 rows).
