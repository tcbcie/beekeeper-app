# Batch 18: Tooling and Green CI

**Status:** Done 22/10/2026. Committed and pushed; the proof is the GitHub Actions run.
**Checklist:** `tasks/security-batch18-todo.html`
**Findings:** B0-1 to B0-8 and B0-18 (Phase 2, Batch 0). This is Phase 2 fix batch 6.

## Before and after

| Check | Before | After |
|---|---|---|
| Tests | 137 of 834 failing | 808 pass, 23 skipped, 0 failing |
| `tsc --noEmit` | 98 errors (all in `tests/`) | 0 (now includes `vitest.config.mts`) |
| `eslint src` | clean | clean, and blocking in CI |
| `eslint .` | over 10 minutes, ~21.8k problems from folders that aren't ours | about 24 s; 145 problems left in tests, scripts and root files |
| CI | tests run twice, PostCSS juggling, fake "All tests passed!" PR comment, no lint or typecheck | one coverage run plus a "Lint & typecheck" job |

## Test helpers (use these for new tests)

- **`tests/utils/render.tsx`:** `renderWithProviders(ui)` wraps the screen in `ToastProvider` > `ConfirmProvider` > `SelectionProvider`, the same as the real layouts. Don't add partial `vi.mock('@/components/ui/Toast')` mocks: they remove `ToastProvider` from the module.
- **`tests/utils/supabase-mock.ts`:** `mockQuery(result, spies)` stands in for any PostgREST chain (every method returns itself, and awaiting it gives `result`). Pass `{ insert: mockInsert }` to record calls. Tests then don't break when a page adds a filter.
- Mock `@/lib/team-access` (`getTeamAccess`) rather than `supabase.rpc`. It's memoised across calls, which leaks between tests.
- Call `localStorage.clear()` in `beforeEach` (the Selection and update-manager state is persisted).

## What the failures were

- **Missing providers (90):** fixed by the helper. Exposing those tests uncovered stale page tests. `apiaries.test.tsx` and `hives.test.tsx` were rebuilt around the current behaviour: in-app confirm dialog, "Set on map", geocoding, client-generated IDs, and team access by RPC.
- **Stale assertions (deliberate app changes):**
  - design tokens and en-GB dates (changelog);
  - the over-50 type floor (version badge);
  - 5.4mm cells and exact option queries (frame calculator);
  - GDD helper text, and the Varroa Weather title and guidance note;
  - fixture expiry dates that had passed (subscription history, moved to 2099);
  - fail-closed sign-in: a database error means "not active", and a network failure gives `'unreachable'`;
  - the removed `requireActiveAccount`;
  - the update-manager singleton not being reset between tests;
  - env stubs for the admin role route, whose mocks were rebuilt for the target lookup, the last-admin guard and the audit log (a test for the 409 guard was added).
- **Removed:** `StatCard` (unused, and its tests never passed); `hive-team-sharing.test.tsx` (the "Shared with team" badge is now on the hive detail page, not the list); the skipped obsolete RLS tests in `hives.test.tsx`; `postcss.test.config.mjs` and `restore-postcss.cmd`.

## App fixes found along the way

- **Ingest duplicate chunk:** `scripts/ingest/utils.mjs` kept looping after a window reached the end of the text and added a duplicate tail chunk (about 200 characters) to every document. It now stops at the end. A new test checks there's no duplicate tail; it fails without the fix.
- **Apiaries header "Cancel":** it only hid the form. When editing apiary A, the next "Add Apiary" reopened A in edit mode. It now calls `resetForm()`, the same as the form's own Cancel button.
- **Terminology count:** an empty list read "Showing 1-0 of 0 terms"; it now reads "0-0".
- **Map picker:** the close button had no accessible name; it is now `aria-label="Close map"`.
- **`updateManager.destroy()`** also resets the registration, waiting worker, state and pending reload, so the singleton can be initialised again cleanly. The app doesn't call it today.

## Config

- `package.json`: `lint` = `eslint .`; new `lint:src` = `eslint src` and `typecheck` = `tsc --noEmit`.
- `eslint.config.mjs`: also ignores `coverage/`, `varroa-detector/`, `public/` (except `service-worker.js`) and `supabase/`.
- `tsconfig.json`: includes `**/*.mts`; excludes `varroa-detector` and `coverage`.
- `vitest.config.mts`: the misplaced 80% coverage keys are removed. Thresholds go under `coverage.thresholds` once CI reports a baseline.
- `.github/workflows/test.yml`: a new `static-checks` job (typecheck plus `lint:src`, same pinned SHAs, read-only permissions). The test job runs `test:coverage` once. The PostCSS steps, the fake PR comment and `pull-requests: write` are removed.

## Still to do

- The 145 lint problems in `tests/`, `scripts/` and root files, after which CI lints everything.
- Coverage thresholds from the first CI baseline.
- Generated Supabase types, migration naming, the stale `.claude/CLAUDE.md` facts, and dead files (`RatingButtons` and others). Vitest 2 → 5 is a separate task.
