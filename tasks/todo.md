# Distribution List — Queen Details & Readable Layout

## Plan

### 1. `src/components/batches/BatchGraftsSection.tsx`

- [x] 1a. For each distribution, look up the matching graft from `grafts` state (by `dist.graft_id`) to get `queen_marked` and `queen_number`
- [x] 1b. Restructure the distribution card text into clearly labelled lines:
  - **Line 1** (unchanged): Cell # badge + type badge
  - **Line 2**: "Distributed to [name]" — if both name and email are present, show name with email in parentheses
  - **Line 3**: "to [Apiary Name][, Hive N] on [date]" — or just "on [date]" if no apiary
  - **Line 4** (location, only if present): labelled — e.g. `Grid: A1B2 • Elev: 45m • 52.1234°, -6.5678°`
  - **Line 5** (queen info, only if set): e.g. `Queen marked • Queen #123` — shown in tertiary text
  - **Line 6** (mating, unchanged): "Mated: DD/MM/YYYY" in green

### 2. Update docs
- [x] 2. Update `docs/features/batch-distributions.md` — Distribution List section

---

## Review

### Summary of Changes

**`src/components/batches/BatchGraftsSection.tsx`:**
- Each distribution card now looks up its matching graft from the already-loaded `grafts` state (no extra query) to read `queen_marked` and `queen_number`
- Distribution card restructured into labelled lines:
  - "Distributed to [name] ([email])" — email shown in brackets only when a named recipient also has an email
  - "to [Apiary Name][, Hive N] on DD/MM/YYYY" — or "on DD/MM/YYYY" if no apiary
  - Location line with explicit labels: `Grid: X • Elev: Nm • 52.1234°, -6.5678°`
  - Queen info line: `Queen marked • Queen #123` (only when queen_marked or queen_number is set)

**`docs/features/batch-distributions.md`:** Distribution List section updated to reflect new card layout.

**No DB changes required.**
