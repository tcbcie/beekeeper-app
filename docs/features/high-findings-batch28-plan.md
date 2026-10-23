# Batch 28: Remaining High Findings (Data Correctness)

**Status:** Implemented 23/10/2026, waiting for the owner's test.
**Checklist:** `tasks/security-batch28-todo.html`
**Migration:** `supabase/migrations/20261023140000_rearing_group_transfer_batch28.sql`, applied through MCP.
**Findings:** C3-01, C3-02, C4-02, C6-01, C6-02, C6-03, C9a-03, C2-01 (with C2-04), C7b-03, C8a-03 and C2-02. This is Phase 2 fix batch 15. Three agents confirmed each was still open. Still to come: the sign-in redirects (C1-01 to C1-03), the community map (C7a-01, C7a-05), the small tap targets (C5a-04/05, C7b-05) and the tooling.

## A. Hive list and records

- **C3-01 (`useHivesList`):** the cards' history queries now read every row. These are inspections, treatments, checks, feedings and harvests for all listed hives, and before this they used one request each.
  - **The problem:** Supabase stops at 1,000 rows. Today's heaviest account sees 560 inspections; past about 85 hives, the oldest hives' cards would show "Never" and lose queen, eggs and super data. The `.in()` list of every hive id would also break the URL past about 100 hives.
  - **The fix:** `historyForHives()` reads each one through `fetchInChunks` (100 hives) and the new `fetchAllPages` in `src/lib/supabase-chunk.ts` (1,000 rows a page, ordered by date then `id`).
  - **Order kept:** a hive's rows all sit in one chunk, newest first, so the "first row per hive" loops are unchanged.
  - **Other lists:** QR tags and open tasks use `fetchInChunks` too.
- **C3-02:**
  - **Hives page:** the ownership filter no longer calls `fetchHives` itself; the hook's effect refetches. The manual call used the old filter.
  - **`fetchHives`:** it takes a sequence number (`fetchSeqRef`), and only the newest call may set state.
- **C4-02 (`useRecordsData.fetchAllData`):** the "already loading" guard now remembers the latest request with different arguments (`pendingFetchRef`) and runs it straight after the current one.
  - **Before:** opening a team-mate's hive from a link switched the filter to "all" mid-load, and that load was dropped.
  - **Repeats:** a repeat of the running request is still dropped.
  - **Structure:** the body moved into `loadAllData`.

## B. Teams and admin

- **C6-01 (`apiary-team`):** delete team, remove member and leave team now call `clearTeamAccessCache()`, as share and unshare already did.
- **C6-02:**
  - **Refresh:** remove member and unshare apiary take the row's own `team_id` and refresh that team. Before, they refreshed `selectedTeam`, the last team opened for a dialog, sometimes another team.
  - **Repeat presses:** the deletes use `.select('id')`; a delete that removed nothing says "already removed".
- **C6-03:** a new RPC, `transfer_rearing_group_ownership(p_group_id, p_new_owner_id)`.
  - **Security:** SECURITY DEFINER, `search_path` public, checks `auth.uid()` is the owner, takes a `FOR UPDATE` row lock, and requires the new owner to be a member.
  - **Order:** both roles, then `owner_id`, in one transaction. The role updates run while the caller is still owner, so `guard_membership_columns` allows them.
  - **Permissions:** EXECUTE for authenticated only.
  - **Tested live, rolled back:** an owner's transfer moves the owner and swaps the roles; a non-owner is refused.
  - **Page:** the rearing-team page makes one call.
- **C9a-03 (`UserManagement`):** `setImpersonationData` runs only after `verifyOtp` succeeds. A failed sign-in no longer leaves a false banner and the admin's refresh token in `localStorage`.

## C. Reminders, research, knowledge base

- **C2-01 (`task-event-reminders`, v15):** due reminders are read once per frequency (2 today) instead of once per user. Each is still marked sent after its e-mail.
- **C2-04, owner's decision: remove.** The shared-hive branch read `team_hive_access` and `hives.is_shared`, and neither exists (checked live), so it never ran; only creators were ever reminded. It's removed with no change in behaviour. Team reminders would be a new feature.
- **C7b-03 (`ForagingHoursTab`):** the effect's "nothing to load" branch clears the spinner, so deselecting the last year during a load no longer leaves it running.
- **C8a-03 (`VarroaWeather`):**
  - The data load depends on `userId` only, and the first apiary is chosen with a functional update. Before, every apiary change reloaded and unmounted the tool.
  - The forecast takes an `AbortSignal` from its effect, so a slower forecast for the previous apiary can't replace the new one.
- **C2-02 (admin knowledge-base and news uploads):**
  - **Batching:** the new `generateEmbeddings(texts)` in `src/lib/openai.ts` makes one OpenAI request per 100 chunks, in order. Chunks are saved 100 rows per insert.
  - **All or nothing:** a failure deletes the chunks and the source, instead of leaving a half-loaded source with a count of 0.
  - **Time limit:** both routes now have `export const maxDuration = 300`.

## Verification

- `tsc --noEmit`: 0 errors.
- `eslint` on the changed files: clean.
- Tests: 818 passed, 23 skipped.
- Security advisors: the only new entry is `transfer_rearing_group_ownership`, signed-in users only, as intended. Anonymous visitors still have 14 SECURITY DEFINER functions they can run, unchanged.
- The batch 27 reminder version's first run returned 200 (`net._http_response`).
- qa-engineer: no Critical or High issues.

## Rules

- A list that grows with the account reads through `fetchAllPages` (paging) and `fetchInChunks` (URL length), never one request.
- A data hook that can be called again while loading keeps only the newest result: a sequence number, or a queue of the latest request.
- Multi-step ownership changes go in one database function, never several browser updates.
- After any team membership or sharing change, call `clearTeamAccessCache()`.
