# Batch 42: Research Screens

**Status:** Implemented 25/10/2026, waiting for the owner's test.
**Checklist:** `tasks/security-batch42-todo.html`
**Database:** no change.
**Findings:** C7b-23, C7b-24 and C7b-25 are fixed, which closes chunk 7b. This is Phase 2 fix batch 29. The element list comes from the batch 41 agent survey.

## A. Tap targets and fields: C7b-23

- **Icon-only `Button`s:** these are already 48px tall through `.fj-btn`, so they gain `min-w-12`:
  - wild colony expand and edit (with `aria-label`s)
  - diagnosis view, download, delete, the grid/list toggle, refresh, the modal controls and comment delete
- **Links and raw buttons:** these gain `min-h-12` (and `min-w-12` where narrow):
  - the scale card's "view hive" link (16px icon, `aria-label`)
  - map, email and phone links
  - the "Add Records" links
  - the embed's year, period, month, temperature and accumulation chips, and its Chart/Table, Accumulation/Phenology and Reset controls
- **Vegetation name link-buttons:** they drop `!min-h-0` on the GDD tab and gain `min-h-12` in the embed.
- **Other targets:**
  - the month chips gain `min-w-12`;
  - the remove-photo buttons go from 44px to 48px;
  - photo thumbnails are 48px.
- **Diagnosis Send:** gains `aria-label="Send comment"`.
- **Fields:** the GDD, Foraging, Key Events, Diagnosis comment and Wild Colony form fields are `min-h-12` with 16px text.

## B. Text and charts: C7b-24

- **Text:** readable 12px text goes to 14px:
  - scale card weather, sensor and weight-change values (icons go from 10px to 14px)
  - diagnosis type and comment text
  - wild colony table cells, contact details and latitude/longitude labels
  - chip labels, "Years:" and the mini-chart captions
- **Left at 12px:** badges, table headers, "-" placeholders and footnote captions.
- **Charts, through `src/lib/chart-theme.ts`:**
  - **The helper:** `themeChartOptions(options, isDark)` sets 14px text and theme colours (ink `#374151` / `#d1d5db`, grid `#e5e7eb` / `#374151`). It covers the legend, title, value labels and every axis's ticks, title and grid, and keeps any colour or larger size the chart sets itself.
  - **Where it's used:** the GDD phenology, accumulation and mini temperature charts; the Foraging accumulation and monthly charts; and the embed's three charts.
  - **Light/dark switching:** the options' `useMemo` lists include `isDarkMode()`, so colours update on the next render, as the scale and TBR charts do.
- **Other chart changes:**
  - the hard-coded 9–10px sizes and light greys are removed;
  - the mini charts go from `h-32` to `h-40`;
  - phenology value labels use `display: 'auto'` and `clamp: true` (QA fix);
  - Key Events annotation labels are 14px, spaced with `xAdjust` of 20px per event;
  - the Foraging "Current" label is 14px.

## C. Wild-colonies tables: C7b-25

- **All Colonies (12 columns):**
  - Submitted By, Size, Description and the two photo columns are `hidden md:table-cell`; Type is `hidden sm:table-cell`. Edit still shows all of them.
  - The opened inspection panel sits in `sticky left-0 max-w-[calc(100vw-4rem)] md:max-w-none`, as in batch 38's tracker.
- **Pending (9 columns):** Size, Description and both photo columns are hidden below `md`.

## Rules

- Chart.js options in research go through `themeChartOptions`. New charts elsewhere should too, so their text is 14px and follows dark mode.
- On phones, wide tables hide low-value columns, and opened row panels stay within the screen.
