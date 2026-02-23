# Distribution Records — Richer Recipient & Apiary Details

## Plan

### 1. `src/hooks/useGraftDistributions.ts`
- [x] 1a. Profiles join: add `first_name, last_name` alongside `full_name, email`
- [x] 1b. Apiaries join: add `latitude, longitude, elevation, grid_reference` alongside `name`
- [x] 1c–1f. Add 4 new apiary fields to `GraftDistribution` interface
- [x] 1g. Compute `recipient_name` as: `full_name → first_name+last_name → email → null`
- [x] 1h. Map the four new apiary fields

### 2. `src/components/batches/BatchGraftsSection.tsx`
- [x] 2. Show secondary apiary location line: grid reference • elevation • lat, lon

### 3. Update docs
- [x] 3. Updated `docs/features/batch-distributions.md`

---

## Review

### Summary of Changes

**`src/hooks/useGraftDistributions.ts`:**
- `GraftDistribution` interface: added `recipient_apiary_latitude`, `recipient_apiary_longitude`, `recipient_apiary_elevation`, `recipient_apiary_grid_reference`
- Query now fetches `first_name, last_name` from profiles and `latitude, longitude, elevation, grid_reference` from apiaries
- `recipient_name` computed as: `full_name → first_name+last_name → email → null` (no more 'Unknown' for registered users)

**`src/components/batches/BatchGraftsSection.tsx`:**
- Distribution list: secondary grey line shown when apiary has location data — `{grid_ref} • {elevation}m • {lat}, {lon}` (each part only shown if present)

**No DB changes required.**
