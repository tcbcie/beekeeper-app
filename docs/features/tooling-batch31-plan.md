# Batch 31: Tooling (Lint Clean-up and Vitest 5)

**Status:** Implemented 23/10/2026, waiting for GitHub CI.
**Checklist:** `tasks/security-batch31-todo.html`
**Findings:** the tooling items left after batch 18 (B0-4/B0-5: "145 problems remain in tests, scripts and root files") and the Vitest upgrade deferred in security batch 12 (4 critical dev-only `npm audit` findings). This is Phase 2 fix batch 18, the last High-priority item. No app behaviour changes.

## A. Lint: 145 problems → 0

- **Stray files:**
  - `.codex-temp/` is a git-ignored scratch folder; it's now in the ESLint ignores and the tsconfig `exclude`.
  - `fix-remaining-hives-tests.mjs`, a dead one-off with a hard-coded path, was deleted.
  - `tests/setup.ts` was never loaded (Vitest uses `tests/setup-simple.ts`) and was deleted. It did hold the only `import '@testing-library/jest-dom/vitest'`, which gives the matcher types, so `setup-simple.ts` now uses that import in place of `matchers` + `expect.extend`. Runtime is the same.
  - `tests/README.md` is corrected.
- **Scripts:** unused `catch (error)` variables became `catch {`, an unused `fs` import was removed, and a variable named `module` (a Next.js rule) was renamed.
- **Tests:** typed fixes only:
  - `auth.test.ts`: `Session` and `AuthError` from `@supabase/supabase-js`, and `mockFrom as unknown as typeof supabase.from`. The strict query chain checks are kept.
  - `UpdateNotification.test.tsx`: `UpdateListener` and `Mock<(listener) => () => void>`.
  - `update-manager` and `pwa-update-flow` tests: local `MockWorker` / `MockRegistration` types, `() => void` listeners, and `asRegistration()`.
  - `VersionDisplay.test.tsx`: `vi.mocked()`.
  - Small local types elsewhere, and unused variables removed.
  - No test changes what it checks.
- **CI:** the lint step runs `npm run lint` (the whole project) instead of `lint:src`.

## B. Vitest 2.1.9 → 5.0.5

- **Installed:** `vitest`, `@vitest/coverage-v8` and `@vitest/ui` at 5.0.5, `vite@^7.3.7` (now a direct peer; 7 rather than 8, which brings a new bundler), `@vitejs/plugin-react@^5.2.0` and `@types/node@^22`.
- **npm quirk:** npm refused the in-place upgrade with an unhelpful ERESOLVE, because the packages pin each other's exact versions. The fix was to uninstall the three Vitest packages first, then install the new set.
- **Config:** `coverage.all` was removed in v4; `coverage.include: ['src/**']` still reports untested files.
- **Test fix:** `MapLocationPicker.test.tsx` mocks `new Map()` / `new Marker()` with normal functions. Since v4, an arrow-function implementation is not a constructor.
- **CI:** Node 20.x → 22.x in all three jobs. Vitest 5 needs `^22.12 || ^24 || >=26`.
- **Results:**
  - Type-check passes, so the jest-dom types still resolve.
  - 818 passed and 23 skipped, three runs in a row.
  - Coverage runs.
  - `eslint .` reports 0.
- **`npm audit`:** 17 → 9, and all 4 critical findings are gone. The remaining 9 were already present: braces/micromatch/fast-glob through eslint-config-next, postcss through next, and uuid through exceljs.

## Notes

- **Vercel:** no `engines` or `.nvmrc`, so Vercel uses the project's Node setting. The API wouldn't return it, so the owner should confirm 22.x or 24.x (Vercel deprecates Node 20 on 01/10/2026). Vercel doesn't run tests; with Vitest's Node requirement, an older Node would only give an `EBADENGINE` warning on install.
- **Running tools locally (npx is broken in this shell):** `"/c/Program Files/nodejs/node.exe" node_modules/vitest/vitest.mjs run`, `.../eslint/bin/eslint.js .`, `.../typescript/bin/tsc --noEmit`, and npm via `.../nodejs/node_modules/npm/bin/npm-cli.js`.
- **`npm run test:ui`:** in v5 it opens with a `?token=` link printed in the terminal.

## Rules

- Lint the whole project; tests and scripts follow the same no-`any` rule (typed mocks: `vi.mocked`, `Mock<…>`, `as unknown as T`).
- A Vitest mock used with `new` needs a `function` implementation, not an arrow.
- Upgrade the Vitest packages together; if npm says ERESOLVE, uninstall them first.
