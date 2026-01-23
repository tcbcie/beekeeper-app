# Story Templates Feature

Add pre-written story templates for the public honey batch trace page that users can select and customize.

## Overview

Currently, the public story is auto-generated from harvest data. This feature adds 4 curated "canned" story templates that users can choose from, with placeholders auto-filled from batch data. Users can further customize the text after selecting a template.

## Story Templates

### Template 1: "The Floral Forager" (Taste & Nature Focus)
**Best for:** Highlighting specific tasting notes and nectar sources.

```
This golden jar is a snapshot of the [Season] bloom in [Location]. Our bees at [Apiary Name] foraged across miles of local hedgerows, visiting primarily [Floral Source 1] and [Floral Source 2]. This unique floral mix creates a [Taste Profile] honey that captures the true essence of the local landscape.
```

### Template 2: "The Purist" (Raw & Process Focus)
**Best for:** Emphasizing quality, raw status, and health benefits.

```
Straight from the hive to your home. Harvested by [Beekeeper Name] on [Harvest Date], this honey is 100% raw and cold-extracted. We never pasteurize or fine-filter our honey, ensuring it retains all the natural pollen, enzymes, and delicate aromas of the [Location] countryside. Pure, unadulterated, and exactly as the bees intended.
```

### Template 3: "The Terroir" (Location Focus)
**Best for:** Locally sold honey where the customer knows the area.

```
A true taste of [Location]. This batch was produced by our hives situated in [Apiary Name], just a stone's throw from [Local Landmark]. The bees gathered nectar during the [Weather Condition] days of [Month], resulting in a honey that is strictly local and fully traceable back to this single apiary.
```

### Template 4: "The Seasonal Snapshot" (Time & Weather Focus)
**Best for:** Connecting the consumer to the specific moment in time.

```
Honey is the memory of summer. This specific jar (Batch [Batch Code]) was harvested during the [Season] season of [Year]. While the weather was [Weather Description], the bees were hard at work on [Floral Source], creating a honey with a distinct [Color] hue. Bottled with care in [Bottling Location].
```

## Implementation Plan

### Phase 1: Add Story Template Selection UI

**File:** `src/components/tools/TraceabilityTool.tsx`

1. Add a template selector dropdown/buttons above the story textarea
2. When a template is selected:
   - Replace placeholders with actual data where available
   - Use sensible defaults or "[placeholder]" for missing data
   - Populate the `public_story` field
3. User can then edit the populated text freely

### Phase 2: Placeholder Replacement Logic

Create a helper function to replace placeholders with actual data:

| Placeholder | Source |
|-------------|--------|
| `[Season]` | Derived from batch_date month |
| `[Month]` | Batch date month name |
| `[Year]` | Batch date year |
| `[Location]` | First origin city/county |
| `[Apiary Name]` | First origin apiary name |
| `[Floral Source 1]` | First floral source |
| `[Floral Source 2]` | Second floral source (or first if only one) |
| `[Floral Source]` | Primary floral source |
| `[Beekeeper Name]` | From preview data |
| `[Harvest Date]` | Earliest harvest date from linked containers |
| `[Batch Code]` | Current batch code |
| `[Taste Profile]` | User input - leave as placeholder |
| `[Weather Condition]` | User input - leave as placeholder |
| `[Weather Description]` | User input - leave as placeholder |
| `[Local Landmark]` | User input - leave as placeholder |
| `[Color]` | User input - leave as placeholder |
| `[Bottling Location]` | User input - leave as placeholder |

### Phase 3: UI Design

```
┌─────────────────────────────────────────────────────────────┐
│ Story Template                                              │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ○ Custom (current)                                      │ │
│ │ ○ Floral Forager - Taste & Nature Focus                 │ │
│ │ ○ The Purist - Raw & Process Focus                      │ │
│ │ ○ The Terroir - Location Focus                          │ │
│ │ ○ Seasonal Snapshot - Time & Weather Focus              │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Story                                                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ This golden jar is a snapshot of the summer bloom in    │ │
│ │ Meath. Our bees at River Boyne Apiary foraged across    │ │
│ │ miles of local hedgerows, visiting primarily clover     │ │
│ │ and wildflower. This unique floral mix creates a        │ │
│ │ [Taste Profile] honey that captures the true essence... │ │
│ └─────────────────────────────────────────────────────────┘ │
│ ⚠️ Replace [bracketed] placeholders with your own text     │
└─────────────────────────────────────────────────────────────┘
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/tools/TraceabilityTool.tsx` | Add template selector and replacement logic |
| `src/lib/story-templates.ts` | New file with template definitions and placeholder replacement |
| `docs/features/honey-traceability.md` | Update with story templates documentation |

## Data Available for Placeholders

From `publicPreview` state:
- `beekeeperName` - Beekeeper's name
- `floralSources` - Array of floral sources
- `origins` - Array of `{ name, city, percentage }`

From `batchForm`:
- `batch_date` - Bottling date
- Batch code (from `editingBatch` or generated)

Derived:
- Season from month (Spring: Mar-May, Summer: Jun-Aug, Autumn: Sep-Nov, Winter: Dec-Feb)
- Month name from batch_date
- Year from batch_date

## Acceptance Criteria

1. User can select from 4 story templates + "Custom" option
2. Selecting a template populates the story textarea with placeholder-replaced text
3. Available data is auto-filled, unknown placeholders remain as `[Placeholder]`
4. User sees hint to replace remaining placeholders
5. User can freely edit the text after template selection
6. Switching templates overwrites current story (with confirmation if edited)
7. "Custom" option preserves current text or uses auto-generated default

## Changelog

### January 23, 2026
- Added 4 story templates for public batch display
- Templates auto-populate with batch data where available
- Created `src/lib/story-templates.ts` with template definitions
- Added template selector UI in TraceabilityTool.tsx
