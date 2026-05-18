# Printable Labels Across HiveCraic

## Goal

Provide a consistent way to print physical labels for the entities that a beekeeper handles in the apiary — hives, mating nucs, queens, rearing batches and (optionally) individual cell grafts. Labels must work both on dedicated thermal label printers (Brother QL / DYMO) and on common sheet label paper (Avery 5160 / L7160) so beekeepers without a dedicated printer can still print on a standard inkjet/laser at home.

## Why this approach (browser print, not server PDF)

The codebase already has a working print pattern: `qrcode.react` for QR rendering, `window.print()` for output, `@media print` rules in `globals.css`, and `.no-print` to hide chrome. Two label flows already use it — `src/app/dashboard/qr-tags/page.tsx` for bulk QR tag sheets, and `src/components/hive/HiveQRCode.tsx` / `src/components/mating-nucs/NucQRCode.tsx` for single tags.

No PDF library is installed. Adding one (e.g. `@react-pdf/renderer`) for label printing is heavy for the data shape involved (a few text fields, a small QR, maybe a colour dot) and would create two divergent rendering paths. **Reuse the existing browser-print pattern.** When a beekeeper wants a real PDF, the browser's "Print to PDF" already produces one — without us adding a build-time dependency or a server route.

Trade-off: browser-print quality is good enough for thermal and sheet labels; the user picks the destination printer in the standard print dialog. Direct USB/Bluetooth-to-printer (which would skip the print dialog) is out of scope — it requires WebUSB/Web Bluetooth, which is not supported on iOS, the platform many beekeepers use in the field.

## Target printers and label sizes

| Preset id | Size | Use case |
|---|---|---|
| `brother_ql_62_29` | 62 × 29 mm | Standard hive / nuc / queen label on a Brother QL continuous or die-cut roll |
| `brother_ql_62_100` | 62 × 100 mm | Larger hive label with apiary context, lineage, last inspection date |
| `brother_ql_29_90` | 29 × 90 mm | Slim batch / graft labels |
| `dymo_lw_89_36` | 89 × 36 mm | DYMO LabelWriter address label |
| `avery_l7160_a4` | A4 sheet, 21 labels per page (63.5 × 38.1 mm) | Sheet-printer fallback for users without a label printer |
| `avery_5160_letter` | US Letter sheet, 30 labels per page (66.7 × 25.4 mm) | US sheet-printer fallback |

Each preset is implemented as a CSS `@page` rule + a grid layout matching the cells. Label content is the same; only the page sizing and label count differ.

## What goes on a label (by entity)

| Entity | Required | Optional |
|---|---|---|
| **Hive** | hive number, apiary name, QR (to `/dashboard/hive-scan/tag/<code>`) | queen number, year colour dot, last inspection date |
| **Mating nuc** | nuc number, batch name (if assigned), QR | graft date, breeder queen number |
| **Queen** | queen number, year colour dot | breeder/lineage, marking colour, mated/clipped flags |
| **Rearing batch** | batch name, graft date | cell count, breeder queens, group name |
| **Batch graft (per cell)** | batch name, cell number, status | breeder queen number, status date |
| **Apiary** | apiary name | grid reference, eircode, number of hives |

QR codes default to the entity's existing scan URL (already implemented for hives and nucs via `qr_tags`). For queens / batches / grafts, the QR is optional and toggleable.

## Architecture

### Single shared component

```
src/components/labels/
├─ LabelSheet.tsx          # the print surface — applies preset, lays out a list of labels
├─ presets.ts              # PRESET_DEFS = Record<PresetId, { widthMm, heightMm, cols, rows, padMm }>
├─ Label.tsx               # one label cell — title, subtitle, fields, optional QR, optional colour dot
└─ types.ts                # LabelDatum, PresetId
```

`LabelSheet` takes:
- `items: LabelDatum[]` — anything from one to many labels
- `preset: PresetId`
- `qrSize?: number` — defaults to a sensible size for the preset

It renders inside a `<div className="print-only">` parent. The page's existing controls live in a `<div className="no-print">` sibling.

### Per-entity entry points

Lightweight buttons inside the existing list/detail pages, each opening a print preview that mounts `LabelSheet` with the chosen preset and the labels for the current selection:

- `src/app/dashboard/hives/page.tsx` — bulk button on the list, scoped to the active filter
- `src/app/dashboard/hives/[id]/page.tsx` — single-hive button
- `src/components/batches/ManageNucsTab.tsx` — bulk + single nuc print
- `src/app/dashboard/queens/page.tsx` — bulk + single queen print
- `src/app/dashboard/batches/page.tsx` — bulk batch labels + per-cell graft labels (from BatchGraftsSection)
- `src/app/dashboard/apiaries/page.tsx` — apiary signage print

Each entry point opens a small modal (preset + QR-on/off + content options), then a "Print" button that calls `window.print()` after the layout has rendered. Same UX as the existing `qr-tags` page.

### Data flow

No new tables, no new RPCs. Each entry point uses the hook that already loads the data:

- `useHiveDetail` / list query already in `dashboard/hives/page.tsx`
- `useBatchGrafts` for batch + cell graft labels
- `useMatingNucBulk` for nucs
- A small helper to load queen labels (the queens list page already queries them)
- The existing `qr_tags` lookup for hives and nucs

## Out of scope (v1)

- **Direct printer comms (WebUSB / Web Bluetooth).** Needs platform-specific drivers; iOS not supported.
- **Custom templates / drag-and-drop designer.** Six presets cover the typical use cases; user requests can drive more.
- **Server-side PDF generation.** Browser "Print to PDF" already produces a PDF on every platform.
- **Print queue / history.** Stateless; print on demand.
- **Multi-language labels.** v1 uses British English to match the rest of the app.

## Future extension hooks

- Adding more presets is a one-line addition in `presets.ts`.
- Adding new entity types means a new `LabelDatum` mapper + an entry-point button.
- If a user later wants a real PDF API (e.g. for a webhook to send labels to a print shop), the `LabelSheet` can be rendered server-side via Puppeteer without changing any consumer.

## Confirmation needed before implementation

1. **v1 set of label-enabled sections.** Suggest: Hives, Mating Nucs, Queens (this is the 80%).
2. **Default preset.** Suggest: `brother_ql_62_29`.
3. **Default QR on/off.** Suggest: ON for Hives & Nucs (the existing scan target), OFF for Queens & Batches.
4. **Where does the bulk button live on each list page?** Suggest: next to the existing filter row, behind a `Plus`-icon split button or a small toolbar.
