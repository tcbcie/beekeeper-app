# Printable Labels

## Overview

Optional thermal-label printing for two record types:

- **Balkani** (bulk honey containers) — printed from the Traceability tool's Containers tab.
- **Queens** — printed from the Queens list and the Queens detail page.

The feature targets a single hardware setup: **Brother QL-820NWB** with the **DK-1201** standard address roll — 29 × 90 mm die-cut, monochrome thermal tape. Both label types print at 90 mm wide × 29 mm tall (landscape orientation). An earlier draft used the two-colour DK-22251 (62 mm continuous) but the red track was unreliable through browser print and the format was working against the content; DK-1201 is cheaper, simpler, and the wider landscape format suits both label types better.

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
- **Roll:** Brother DK-1201 — standard address labels, 29 × 90 mm die-cut, monochrome
- Print is driven through the OS print dialog via `window.print()` — no direct printer SDK / USB / Bluetooth.

DK-1201 is monochrome only; the two-colour DK-22251 was tried in earlier iterations but red rendering through Chrome / Edge was inconsistent and the per-label cost was significantly higher. Switching to DK-1201 also unlocked the wider 90 mm landscape format that suits both inventory and queen labels.

## Database

Single column on `profiles`:

```sql
ALTER TABLE profiles
ADD COLUMN enable_label_printing boolean NOT NULL DEFAULT false;
```

Applied via Supabase MCP migration `add_enable_label_printing_to_profiles`. New users default to off.

No other tables are involved; label content is derived from existing `bulk_containers` and `queens` records at print time.

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
| `src/components/labels/presets.ts` | Two presets, both at 90 × 29 mm (DK-1201 landscape): `queen_label`, `balkani_label`. IDs are hardware-agnostic so a future roll change does not ripple through call sites. |
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

### Balkani label (90 × 29 mm landscape)

```
┌──────────────────────────────────────────────────────────────────┐
│ HIVECRAIC · TRACEABLE HONEY                                      │  ← masthead wordmark, tracked caps
│ ──────────────────────────────────────────────────────────────── │  ← 0.3 mm rule
│ Bucket01-05-26                                       13.9 kg     │  ← code + weight as co-headlines
│ EXTRACTED 16 May 2026                                            │  ← caption tracked muted
└──────────────────────────────────────────────────────────────────┘
```

- Top masthead: "HiveCraic · Traceable Honey" in 7pt bold uppercase with 1.1pt letter-spacing, separated from the body by a 0.3 mm black rule. Reads like a magazine column head, not a sticker.
- Body: container code (14pt bold) and weight (14pt bold) as co-headlines on the same row, separated by a 3 mm gap. The 90 mm width comfortably fits a 14-char code + 7-char weight side-by-side at hero typography without truncation.
- Caption row: `EXTRACTED DD MMM YYYY` at 7pt with 0.5pt letter-spacing in `#374151`.
- Weight is omitted from the row when `total_weight_kg` is null; the caption is omitted when `extraction_date` is missing or invalid.
- `print-color-adjust: exact` is still set on the print document — not strictly required for the monochrome design, but kept as defence-in-depth in case future iterations re-introduce any background colour.
- DK-1201 is sold as die-cut so each label has the 29 × 90 mm dimensions stamped at manufacture; no cut-length tuning is needed.

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
