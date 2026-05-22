# Printable Labels

## Overview

Optional thermal-label printing for two record types:

- **Balkani** (bulk honey containers) — printed from the Traceability tool's Containers tab.
- **Queens** — printed from the Queens list and the Queens detail page.

The feature targets a single hardware setup: **Brother QL-820NWB** with the **DK-22251** continuous roll (62 mm wide, black / red thermal tape). All label layouts are 62 mm wide; cut length is set per label type (32 mm for queens, 22 mm for balkani in v1).

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
- **Roll:** Brother DK-22251 — continuous, 62 mm × 15.24 m, two-colour (black + red)
- Print is driven through the OS print dialog via `window.print()` — no direct printer SDK / USB / Bluetooth.

The DK-22251's red-ink capability only works through Brother's P-touch driver, not reliably via browser printing. Layouts use red CSS where appropriate but the feature does **not** depend on red ink rendering — everything reads correctly in black-only.

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
| `src/components/labels/presets.ts` | Two presets: `brother_dk22251_queen` (62 × 32 mm), `brother_dk22251_balkani` (62 × 22 mm) |
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

### Queen label (62 × 32 mm)

```
┌─┬─────────────────────────────────────────────┐
│█│  Q-A0142                                    │  ← full-height year-colour stripe + code
│█│  ─────────────────────                      │
│█│  ♀ Q-A0091   ♂ Q-X07                        │  ← ♀ ♂ symbols in red
│█│  MATED 14 Apr 2026                          │  ← uppercase tracked muted
│█│  A41 X4P5                                   │  ← Eircode muted
└─┴─────────────────────────────────────────────┘
```

- The full-height 5 mm left stripe carries the international year-colour code (White / Yellow / Red / Green / Blue), derived from `getQueenColorFromYear(birth_date)`. A 0.2 mm grey edge separates the white stripe variant from the white label body. When `birth_date` is missing or maps to "None", the stripe falls back to a neutral grey so the layout still reads as deliberate.
- `LabelDatum.queenExtras` carries structured per-field values (`motherNumber`, `fatherNumber`, `matedDate`, `eircode`) so the renderer can apply distinct typography per row:
  - Lineage row at 9pt with `♀` and `♂` symbols in `#b91c1c` (red on a P-touch driver, black on others).
  - "Mated DD MMM YYYY" at 7pt uppercase with 0.5pt letter-spacing in `#4b5563`.
  - Eircode at 8pt regular in `#4b5563`.
- Each row is conditional — empty fields drop entirely and the layout reflows.

### Balkani label (62 × 22 mm)

```
┌────────────────────────────────────────────┐
│▓▓ HIVECRAIC · TRACEABLE HONEY ▓▓▓▓▓▓▓▓▓▓▓▓│  ← solid red band, white tracked caps
│ Bucket01-05-26                   13.9 kg   │  ← code (bold black) + weight (bold red)
│ EXTRACTED 16 May 2026                      │  ← caption muted tracked
└────────────────────────────────────────────┘
```

- A solid `#b91c1c` band runs the full width at the top — "HiveCraic · Traceable Honey" in 6pt white uppercase with 0.8pt letter-spacing. On a Brother P-touch driver configured for DK-22251's two-colour track this prints in red; on standard drivers it degrades cleanly to a solid black masthead.
- Body: container code (12pt bold) as the headline on the left, weight (12pt bold, `#b91c1c`) as the co-headline on the right of the same row. Below sits `EXTRACTED DD MMM YYYY` as a 6.5pt tracked muted caption.
- An earlier draft used a red-bordered chip around the weight, which forced the cut up to 35 mm and ellipsised longer container codes; the chip was dropped because the same emphasis can be achieved with weight + colour alone, freeing the full row width for the headline.
- Weight is omitted from the row when `total_weight_kg` is null; the caption is omitted when `extraction_date` is missing or invalid.
- `print-color-adjust: exact` is set on the print document so browsers preserve the red band instead of stripping it for "ink-saving" print defaults.
- At 22 mm cut length, a single DK-22251 roll yields roughly 690 balkani labels.

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
