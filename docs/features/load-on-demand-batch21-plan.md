# Batch 21: Load Heavy Panels on Demand

**Status:** Done 22/10/2026. The owner tested it; committed and pushed.
**Checklist:** `tasks/security-batch21-todo.html`
**Findings:** C8a-04, C5a-21, C5b-17, C9a-22, C7b-19, C3-17, C7a-17. This is Phase 2 fix batch 9; request waterfalls are batch 22.

## What changed

Pages that show one panel at a time used to import every panel statically, so chart.js, QR codes and thousands of lines of tabs were in the first download. Each panel now uses `next/dynamic`:

```tsx
const TBRPlanner = dynamic(() => import('@/components/tools/TBRPlanner'), {
  loading: () => <LoadingSpinner text="Loading TBR planner..." />,
  ssr: false,
})
```

The JSX and props are unchanged. A panel's code downloads the first time it's opened.

| Page | Loads on demand | Kept static |
|---|---|---|
| Tools (`tools/page.tsx`) | all 8 panels: GDD, TBR (chart.js), varroa, cells, diagnosis, P&amp;L, traceability (QR codes), purchases | the landing card grid and inline feeding/fondant |
| Queen rearing (`batches/page.tsx`) | Mating Nucs, Manage Nucs, Queen Tracker, Planning and Reports tabs; `BatchFormSection` (opens with New Batch or Edit) | the Grafting tab, which is part of the page |
| Settings (`settings/page.tsx`) | 12 managers (mostly admin-only) | `ProfileExport`, the default tab |
| Research (`research/page.tsx`) | all 5 tabs, including GDD and foraging (chart.js plus 3 plugins) | GDD stays the default tab (owner's decision) |
| Hive detail (`hives/[id]/page.tsx`) | BEEP chart, Wolf scale panel, QR code modal | everything else |
| Community map (`community-map/page.tsx`) | `mapbox-gl` via `import('mapbox-gl')` in the map setup effect; the module is kept in `mapboxRef` for the marker effect. `import type` keeps the type annotations. A failed load is logged. | the CSS import |

These were already on demand and are unchanged: the map picker, the 3D apiary view, Excel export (`await import('exceljs')`), and the invoice PDF (server only).

**Rule:** a tab, modal or collapsed section that pulls in a heavy library (charts, maps, QR codes, 3D) or a large component uses `dynamic(() => import(...))`, with `ssr: false` when it touches the DOM.

## Verification

- `tsc --noEmit` shows 0 errors, `eslint src` is clean, and the test suite gives 818 passed and 23 skipped.
- qa-engineer found no issues.
