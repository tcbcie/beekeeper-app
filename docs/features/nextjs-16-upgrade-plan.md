# Next.js 16 upgrade — plan

**Status:** approved 15/11/2026 and built; committed straight to `main` (owner decision, no preview branch) · **Date:** 15 November 2026 · **From:** batch 4 of the technology stack review (`tasks/todo.html`, V2/V3)

## Why

- Next.js 15.5 is one major version behind (16.4.6 is current).
- The remaining high-severity audit finding (PostCSS inside Next.js) is fixed only in Next 16.
- It unlocks the planned View Transitions work (`mobile-native-feel-review-plan.md`, Phase F). That work is **not** part of this batch.

Nothing changes for the beekeeper. Success means the app behaves exactly as it does today.

## Target versions

| Package | Now | Target | Why |
|---|---|---|---|
| `next` | 15.5.28 | **16.4.6** | Latest 16 |
| `react`, `react-dom` | 19.1.0 (pinned) | **19.2.9** (pinned) | Next 16 needs React 19.2. 19.3 would also force a 3D library upgrade (`@react-three/fiber` 9.6.1 accepts `<19.3`), so 19.2 is the smaller change. |
| `@types/react`, `@types/react-dom` | 19.2.2 | latest 19.2 | Match React |
| `eslint-config-next` | 15.5.28 | **16.4.6** | Must match Next |
| `@supabase/ssr` | 0.7.0 | **0.12.7** | Stack review V3. Same `getAll`/`setAll` cookie API we already use; no code change needed (checked against its changelog) |
| `@sentry/nextjs` | 11.12.0 | unchanged | Already accepts `next ^16` |

## How the app is affected (checked 15/11/2026)

The app is well placed:

- **Already async:** every page that takes `params`/`searchParams` (3 pages) and the one `cookies()` call already use the Next 15 async style. Next 16 removes the sync style, so nothing to change.
- **Not used:** no middleware, no edge runtime, no AMP, no `next/legacy/image`, no parallel routes, no caching APIs (`revalidateTag` etc.), no runtime config.
- **Lint script:** already plain `eslint .`, so the removal of `next lint` doesn't matter.

What does need changing:

| # | Change | Where | Why |
|---|---|---|---|
| 1 | **Keep webpack.** `next dev --webpack` and `next build --webpack` | `package.json` scripts **and** `vercel.json` `buildCommand` | Next 16 builds with Turbopack by default and **fails** when a webpack config is present. Sentry's wrapper adds one. `vercel.json` overrides the npm script, so it must change too. Moving to Turbopack is a separate, later decision. |
| 2 | **Images:** `qualities: [75, 85]` | `next.config.ts` | Next 16 allows only quality 75 by default. The apiary photo uses 85 and would silently drop to 75. |
| 3 | **Images:** `dangerouslyAllowLocalIP` in development only | `next.config.ts` | Next 16 refuses to optimise images from local addresses. The local Supabase (`127.0.0.1:54321`) would break photos in local development. Production is unaffected. |
| 4 | **Scrolling:** `data-scroll-behavior="smooth"` on `<html>` | `src/app/layout.tsx` | The app uses smooth scrolling. Next 15 switched it off during page changes, so a new page started at the top instantly. Next 16 no longer does, and every page change would animate a scroll. The attribute keeps today's behaviour. |
| 5 | **ESLint:** use `eslint-config-next`'s own flat configs instead of the `FlatCompat` bridge | `eslint.config.mjs`, drop `@eslint/eslintrc` | `eslint-config-next` 16 is flat-config native. **Risk:** it brings newer React hooks rules that may flag existing code. See risks. |
| 6 | `tsconfig.json` `jsx` becomes `react-jsx` | `tsconfig.json` | Next 16 rewrites this itself on first run; the change is committed as is. |
| 7 | Feature docs and stack review updated | `docs/features` | |

## Steps

1. ~~Branch `next-16`~~: owner chose to commit straight to `main`, so the Vercel production build is the first build.
2. Update the packages (table above). `npm install` with the versions pinned.
3. Changes 1 to 6.
4. Run typecheck and the whole-project lint (as CI does). Fix or decide on any new lint findings (see risks).
5. QA audit.
6. Push the branch. **You:** run the test suite, check the Vercel preview build, then click through the preview on a phone (checklist below).
7. On your approval, merge to `main` (production).

## Your check on the preview

- Sign in, sign out, and sign in with Google (the `@supabase/ssr` update touches the sign-in return page)
- Dashboard, a hive, an apiary (photo sharp), records, tasks
- Save an inspection, including one with no signal (airplane mode), then signal back
- Apiary map and 3D view, a chart page (GDD or scale)
- Page changes start at the top without an animated scroll
- Public trace page from a jar label, and the TCBC embed page
- Push: reminders switch still shows "on"
- Then trigger one browser error (the console line) and check it arrives in Sentry with readable code

## Risks

- **New lint rules.** `eslint-config-next` 16 likely brings stricter React hooks rules, written for the React Compiler. With about 290 component files they may report many findings, and CI blocks on lint. Plan: if the count is small, fix them; if large, switch only the new rules to warnings and list them for a later batch. Turning them off would hide real faults, so that is not on the table. I'll report the number before deciding.
- **The build itself.** I don't run builds (your rule), and CI has no build step, so the Vercel preview is the first real build.
- **Service worker.** Next 16 fetches page data in smaller pieces. The worker already skips those requests (`RSC` header / `_rsc`), so it should hold. The offline check above confirms it.
- **Sentry.** It stays on webpack, so source maps and the tree-shaking options work as now.
- **Rollback:** don't merge the branch. Once merged, revert the merge commit.

## Lint clean-up for a later batch

`eslint-config-next` 16 brought six React Compiler hook rules. On 15/11/2026 the existing code had 207 findings. They are set to warnings in `eslint.config.mjs`, so CI passes and new findings stay visible. Nothing in the app's behaviour changed.

- **`set-state-in-effect`:** 169 findings in 108 files. Mostly the effect-based loading pattern (`setLoading(true)` at the start of a loading effect). A style rule for the React Compiler, not a fault in itself.
- **The other 38, worth reviewing first** (they can hide real faults such as values changed during render or components created inside components):

| Rule | Where |
|---|---|
| `purity` | `src/app/dashboard/apiaries/[id]/page.tsx:102` |
| `refs` | `src/app/dashboard/page.tsx:128` |
| `purity` | `src/app/dashboard/queens/[id]/page.tsx:297` |
| `immutability` | `src/app/dashboard/queens/page.tsx:262` |
| `purity` | `src/app/dashboard/queens/page.tsx:488` |
| `purity` | `src/app/dashboard/queens/page.tsx:724` |
| `purity` | `src/app/dashboard/queens/page.tsx:881` |
| `purity` | `src/app/dashboard/records/page.tsx:863` |
| `refs` | `src/app/dashboard/records/page.tsx:1675` |
| `purity` | `src/app/dashboard/tools/page.tsx:293` |
| `immutability` | `src/components/RenewSubscriptionModal.tsx:49` |
| `immutability` | `src/components/SubscriptionHistoryTable.tsx:12` |
| `immutability` | `src/components/SubscriptionStatusCard.tsx:17` |
| `immutability` | `src/components/SubscriptionWarningBanner.tsx:16` |
| `immutability` | `src/components/apiaries/Hive3D.tsx:104` |
| `static-components` | `src/components/batches/DistributionList.tsx:157` |
| `static-components` | `src/components/batches/DistributionList.tsx:163` |
| `preserve-manual-memoization` | `src/components/embed/PublicGDDTab.tsx:523` |
| `preserve-manual-memoization` | `src/components/records/forms/InspectionForm.tsx:605` |
| `preserve-manual-memoization` | `src/components/records/forms/InspectionForm.tsx:605` |
| `preserve-manual-memoization` | `src/components/records/forms/InspectionForm.tsx:1260` |
| `preserve-manual-memoization` | `src/components/records/forms/InspectionForm.tsx:1260` |
| `preserve-manual-memoization` | `src/components/research/GDDDataTab.tsx:761` |
| `static-components` | `src/components/settings/AssociationManagement.tsx:465` |
| `static-components` | `src/components/settings/AssociationManagement.tsx:474` |
| `static-components` | `src/components/settings/AssociationManagement.tsx:483` |
| `immutability` | `src/components/settings/DropdownManagement.tsx:57` |
| `immutability` | `src/components/settings/FrameStandardsManager.tsx:42` |
| `immutability` | `src/components/settings/TerminologyTable.tsx:43` |
| `static-components` | `src/components/tools/GDDTracker.tsx:628` |
| `static-components` | `src/components/tools/GDDTracker.tsx:636` |
| `static-components` | `src/components/tools/GDDTracker.tsx:643` |
| `refs` | `src/hooks/useBatchGrafts.ts:51` |
| `refs` | `src/hooks/useFormDirtyState.ts:67` |
| `refs` | `src/hooks/usePersistentState.ts:88` |
| `refs` | `src/hooks/usePersistentState.ts:90` |
| `refs` | `src/hooks/useRecordFilters.ts:184` |
| `refs` | `src/hooks/useRecordFilters.ts:186` |

## Not in this batch

- Moving to Turbopack.
- React 19.3 (needs `@react-three/fiber` 9.8.2).
- View Transitions (Phase F).
- Replacing `priority` on 3 images with the new `preload` (still works).
- The `startprod.cmd` script runs `npm run dev` after building instead of `npm start` (unrelated small bug; tell me if you want it fixed separately).
