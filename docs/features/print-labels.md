# Printable Labels

## Overview

Optional thermal-label printing for two record types:

- **Balkani** (bulk honey containers) — printed from the Traceability tool's Containers tab.
- **Queens** — printed from the Queens list and the Queens detail page.

The feature targets a single printer (**Brother QL-820NWB**) with two roll sizes — one per label type:

- **Queen labels — DK-1201** (29 × 90 mm die-cut, landscape). Compact, inventory/cage labels.
- **Balkani wholesale labels — 62 mm continuous roll** (DK-22251 or DK-22205), cut at 75 mm per label. Wholesale-grade — sales name, locality-tight origin (city + Ireland), net weight, lot, dates, producer block. Deliberately omits the consumer-protection text (storage hint + infant warning) because these buckets move via wholesale channels, not to end consumers. If a wholesale buyer re-packs and retails the honey, *they* apply the EU retail label on the consumer pack.

Label printing is **opt-in**. A user must enable it on their profile before any print buttons appear in the UI.

## Routes & UI entry points

| Where | Trigger | Output |
|-------|---------|--------|
| `/dashboard/profile` → Additional Settings | "Enable label printing" toggle | Persists `profiles.enable_label_printing` |
| `/dashboard/tools` → Traceability → Containers | Per-card Printer icon | One balkani label |
| `/dashboard/tools` → Traceability → Containers | Per-card checkbox + "Print selected (N)" toolbar button | N balkani labels |
| `/dashboard/queens` | Per-row Printer icon | One queen label |
| `/dashboard/queens` | Per-row checkbox + "Print (N)" toolbar button (reuses the existing Compare selection) | N queen labels |
| `/dashboard/queens/[id]` | Header Printer icon | One queen label |

When the profile flag is off, none of these UI elements are rendered.

## Hardware

- **Printer:** Brother QL-820NWB
- **Queen label roll:** Brother DK-1201 — standard address labels, 29 × 90 mm die-cut, monochrome
- **Balkani label roll:** 62 mm continuous — DK-22251 (black/red) or DK-22205 (monochrome). The label design is monochrome, so either roll works; the red track on DK-22251 just goes unused.
- Print is driven through the OS print dialog via `window.print()` — no direct printer SDK / USB / Bluetooth.

The 62 mm continuous slot was originally specced for DK-22251 to exploit the two-colour track, but browser printing through Chrome / Edge doesn't reliably honour the red track unless the user has Brother's P-touch driver configured for it. The design was rebuilt as monochrome so it prints identically regardless of which 62 mm roll is loaded. A previous iteration targeted DK-11202 (62 × 100 mm die-cut) for a fully EU-retail-compliant label including consumer-protection text; this was scaled back to a wholesale label on the continuous roll once it became clear the buckets move B2B rather than B2C.

## Database

Two columns on `profiles`:

```sql
ALTER TABLE profiles
ADD COLUMN enable_label_printing boolean NOT NULL DEFAULT false;

ALTER TABLE profiles
ADD COLUMN producer_address text;
```

- `enable_label_printing` — the opt-in feature flag (default off). New users see no print UI until they enable it.
- `producer_address` — free-text postal address for EU-compliant retail balkani labels (e.g. `"Mossfield Apiary, Athenry, Co. Galway"`). Nullable — if the user only ever prints labels for personal inventory it can stay blank.

Both applied via Supabase MCP migrations (`add_enable_label_printing_to_profiles`, `add_producer_address_to_profiles`).

Label content is otherwise derived from existing `bulk_containers`, `container_harvests` (with `harvests.floral_source` joined for the sales-name aggregation), and `queens` records at print time. Best-before date is computed in the mapping helper as `extraction_date + 2 years` — honey's standard EU shelf-life convention — and never persisted, so editing extraction date on a container updates the BBD on the next print.

## Architecture

```
profiles.enable_label_printing  ◀── useLabelPrinting() hook ──┐
                                                              │
[Traceability Containers tab]   [Queens list page]            │  flag false ⇒ hooks return enabled=false
        │                              │                      │             ⇒ no UI rendered
        │  pick rows                   │  pick rows           │
        ▼                              ▼                      │
   ┌──────────────────┐         ┌──────────────────┐
   │ PrintLabelsModal │         │ PrintLabelsModal │
   │ (balkani preset) │         │ (queen preset)   │
   └─────────┬────────┘         └────────┬─────────┘
             │                           │
             └────────────┬──────────────┘
                          ▼
                ┌──────────────────┐    @page size: 62mm × <length>
                │   printHtml.ts   │ ──▶ window.open() ──▶ window.print()
                └──────────────────┘    (self-contained HTML doc)
```

### Files

| File | Role |
|------|------|
| `src/hooks/useLabelPrinting.ts` | Reads `profiles.enable_label_printing` for the current user |
| `src/components/labels/types.ts` | `LabelDatum`, `LabelPresetId`, `LabelPreset`, `QueenYearColour`, year-colour hex map |
| `src/components/labels/presets.ts` | Two presets with different dimensions per label type: `queen_label` (90 × 29 mm DK-1201 landscape), `balkani_label` (62 × 75 mm, 62 mm continuous portrait — DK-22251 or DK-22205). IDs are hardware-agnostic so a future roll change does not ripple through call sites. |
| `src/components/labels/Label.tsx` | Single-cell preview component (mm-sized so on-screen matches printed) |
| `src/components/labels/LabelSheet.tsx` | Wraps a list of `Label`s for the modal preview |
| `src/components/labels/printHtml.ts` | Builds the self-contained HTML document for the isolated print window |
| `src/components/labels/PrintLabelsModal.tsx` | `ModalShell` with preview + Print button |
| `src/components/labels/queenMapping.ts` | `queenToLabelDatum(queen)` — shared between Queens list and detail |

The container mapping (`containerToLabelDatum`) lives inline in `TraceabilityTool.tsx` since it's only used there.

### Why an isolated print window?

The same pattern as the existing `/dashboard/qr-tags` page: `window.open('', '_blank')` opens a blank document, `printHtml.buildPrintDocument()` writes a self-contained `<html>` with the right `@page { size: <w>mm <h>mm; margin: 0 }` rule and inline styles, and an `onload → window.print()` hook fires the OS print dialog.

This avoids polluting `globals.css` with print-only rules and means each print job runs in a clean environment — no risk of bleeding into other parts of the app.

## Label content

### Queen label (90 × 29 mm landscape)

```
┌─┬─────────────────────────────────────────────────────────────────┐
│█│  Q-A0142             ♀ Q-A0091   ♂ Q-X07                        │  ← stripe + code + lineage same row
│█│  ───────────────────────────────────────────                    │
│█│  MATED 14 Apr 2026                              A41 X4P5        │  ← mated (left) + Eircode (right)
└─┴─────────────────────────────────────────────────────────────────┘
```

- The full-height 5 mm left stripe carries the international year-colour code (White / Yellow / Red / Green / Blue), derived from `getQueenColorFromYear(birth_date)`. A 0.2 mm grey edge separates the white stripe variant from the white label body. When `birth_date` is missing or maps to "None", the stripe falls back to a neutral grey so the layout still reads as deliberate.
- The landscape format puts the queen number and the lineage on the SAME row, separated by 4 mm, with the Mated and Eircode lines on a justified bottom row. DK-1201 is monochrome so `♀ ♂` symbols are now bold black rather than red — emphasis through weight, not colour.
- `LabelDatum.queenExtras` carries structured per-field values (`motherNumber`, `fatherNumber`, `matedDate`, `eircode`) so the renderer can apply distinct typography per row:
  - Code at 13pt bold; lineage at 10pt with bold `♀ ♂` symbols.
  - "Mated DD MMM YYYY" at 7pt uppercase with 0.5pt letter-spacing in `#374151`.
  - Eircode at 8pt regular in `#374151`, right-aligned via `justify-content: space-between`.
- Each row is conditional — empty fields drop entirely and the layout reflows.

### Balkani wholesale label (62 × 75 mm portrait, 62 mm continuous roll)

```
┌────────────────────────────────────┐
│ HIVECRAIC · TRACEABLE HONEY        │  ← masthead 7pt bold tracked uppercase
│ ────────────────────────────────── │  ← 0.3 mm rule
│                                    │
│ IRISH HONEY                        │  ← Sales name 16pt bold uppercase
│ Wildflower                         │  ← Floral source 9.5pt italic (if available)
│                                    │
│ NET WEIGHT             13.9 kg     │  ← Weight stat row
│                                    │
│ ────────────────────────────────── │  ← 0.2 mm separator rule
│                                    │
│ LOT          Bucket01-05-26        │  ← Two-column grid: 25 mm label
│ EXTRACTED    16 May 2026           │     + 1fr value
│ BEST BEFORE  16 May 2028           │
│ ORIGIN       Athenry, Ireland      │  ← derived from linked apiary cities
│                                    │
│ ────────────────────────────────── │  ← 0.2 mm separator rule
│                                    │
│ Rico Zmarzly                       │  ← Producer name 9.5pt bold
│ Mossfield Apiary, Co. Galway       │  ← Producer address 8.5pt muted
└────────────────────────────────────┘
```

**Content — wholesale-grade fields:**

| Field | Source | Notes |
|---|---|---|
| Sales name | hardcoded `"Irish Honey"` | per business policy |
| Net quantity | `bulk_containers.total_weight_kg` | row omitted if null |
| Best-before date | `extraction_date + 2 years` | computed in `addYears()` helper |
| Lot identification | `bulk_containers.container_code` | falls back to `"—"` |
| Origin | aggregated apiary cities (see below) | replaces the previous hardcoded `"Ireland"` |
| Producer name | `profiles.first_name + last_name` | joined with a space; block omitted if both blank |
| Producer address | `profiles.producer_address` | nullable; row omitted if blank |
| Floral source (optional) | aggregated from `harvests.floral_source` via `container_harvests` join, case-insensitive dedupe | single distinct value → that name; multiple → `"Wildflower"`; none → no subtitle |

**Why no storage / infant warning?** Buckets are wholesale-only — they pass to packagers and re-sellers who apply their own EU-compliant consumer label when the honey is bottled. The wholesale label is for traceability and packer-to-packer identification, not end-consumer protection.

**Locality-tight origin (`aggregateOrigin`):**

```
1 distinct apiary city  → "Athenry, Ireland"
2 distinct apiary cities → "Athenry & Loughrea, Ireland"
3+ or no city data       → "Ireland"
```

The aggregator walks `container → container_harvests → harvests → hives → apiaries.city`, deduping case-insensitively. PostgREST joins are normalised to single objects (array projection guards inside the loop). The fallback is the truthful country-only string when locality can't be substantiated from the data — never asserting a proximity claim we don't own.

**Layout:**

- Padding 4 mm on all sides; structure is flex column.
- Three visual zones separated by `0.2 mm` rules (`#9ca3af`):
  1. **Hero** — masthead + sales name + (optional) floral source + net weight row
  2. **Traceability grid** — CSS grid `25mm 1fr` so the four LOT/EXTRACTED/BBD/ORIGIN labels line up regardless of value length; cells have `min-width: 0` + `text-overflow: ellipsis` so long values clip rather than wrap
  3. **Producer** — name + address, pinned to the bottom of the label via `margin-top: auto`
- Print pipeline: same `window.open` → write self-contained doc → `window.print()` as queens. `print-color-adjust: exact` retained as defence-in-depth.

## Edge cases & limits

- **Pop-up blockers** — `window.open('', '_blank')` may be blocked. The Print button has no fallback today; users must allow pop-ups for the site. (Same constraint as `/dashboard/qr-tags`.)
- **Print scaling** — browsers can scale the document before sending it to the printer. The modal carries a one-line tip: set scale to 100 % and disable "fit to page" in the dialog.
- **Red ink** — only renders if Brother's P-touch driver is configured for two-colour DK-22251 recognition. Layouts work in black-only.
- **Flag toggled off mid-session** — `useLabelPrinting` reads on mount; users may need to refresh affected pages to see UI disappear/appear after toggling.

## Out of scope

- Hives, Mating Nucs, Rearing Batches, Grafts, Apiaries — deferred to a follow-up.
- QR codes on labels (the `LabelDatum` shape leaves room for this; not shipped in v1).
- DYMO / Avery sheet presets (preset map is data-driven so they can be added without refactoring).
- A drag-and-drop label designer.
- Direct USB / Bluetooth / WebUSB printer control.
- Server-rendered PDFs (use the browser's "Save as PDF" if needed).

## Related docs

- [honey-traceability.md](./honey-traceability.md) — Where balkani containers come from.
- [queen-rearing.md](./queen-rearing.md) — The Queens registry that drives queen labels.
