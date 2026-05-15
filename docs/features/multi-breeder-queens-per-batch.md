# Multi-Breeder-Queen Batches

## Goal

Allow a single rearing batch to graft from **more than one breeder queen**, and assign each cell on the grafting frame to its specific breeder queen. Today a batch is locked to a single `rearing_batches.mother_queen_id`, which is incorrect for larger batches where the user grafts from two or more queens onto the same frame.

## User flow

### 1. Creating a new batch

In the **Add Batch** dialog (`src/app/dashboard/batches/page.tsx`):

- A new checkbox is added under the breeder queen field: **"Graft from multiple breeder queens"**.
- Unchecked (default): existing single **Breeder Queen** dropdown shows. Saved to `rearing_batches.mother_queen_id` as today.
- Checked: the single dropdown is hidden; a multi-select list of the user's active queens shows instead. On submit:
  - `rearing_batches.mother_queen_id` is set to `NULL`
  - One row per selected queen is inserted into the new `batch_breeder_queens` junction table.

The same toggle is also available in the **Edit Batch** dialog. Switching between single and multi modes is allowed only while **no cells have been generated** for the batch (server-side check via row count on `batch_grafts`). Once cells exist, the breeder set is locked at the batch level — the user can still edit per-cell breeder assignments (within the existing set).

### 2. Generating cells on the grafting frame

Triggered from `BatchGraftsSection` → "Generate Cell Records" button (calls `useBatchGrafts.generateGrafts`):

**Single-breeder batch (no change to existing UX)**
- All cells are inserted with `batch_grafts.breeder_queen_id = rearing_batches.mother_queen_id`.

**Multi-breeder batch (new modal)**
A range-assignment modal opens before the insert. The modal:

- Lists each selected breeder queen with two integer inputs: **start cell** and **end cell**.
- Pre-populates with sensible defaults: ranges divided evenly across the batch's `cell_count`, in the order the queens were selected. The user can edit freely.
- Validates on confirm:
  - Each range is a valid `start ≤ end` pair within `[1, cell_count]` (or for "add more cells" mode, the next number to next + new count − 1).
  - Ranges together cover **every cell number with no gaps and no overlaps**.
- On confirm, inserts cells with `breeder_queen_id` set per the range.
- On cancel, no cells are created.

This mirrors the physical layout of a grafting frame: queens are typically grafted in consecutive rows, so a range-per-queen matches how the beekeeper laid out the frame.

### 3. Cell frame display & editing

In `CellFrame` (and the cell-edit dialog if one exists):

- Each cell shows a small **breeder queen number** label/badge (only when the batch is multi-breeder; suppressed in single-breeder mode to keep the existing visual density).
- The cell-edit dialog gains a breeder queen field — a dropdown constrained to the batch's selected breeders. This lets the user fix per-cell mistakes (e.g. mis-allocated a row) without redoing the whole batch.

## Data model

### New table: `batch_breeder_queens`

Junction linking a batch to its set of breeder queens.

```sql
CREATE TABLE batch_breeder_queens (
  batch_id   uuid NOT NULL REFERENCES rearing_batches(id) ON DELETE CASCADE,
  queen_id   uuid NOT NULL REFERENCES queens(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (batch_id, queen_id)
);

CREATE INDEX idx_batch_breeder_queens_batch_id ON batch_breeder_queens(batch_id);
CREATE INDEX idx_batch_breeder_queens_queen_id ON batch_breeder_queens(queen_id);

ALTER TABLE batch_breeder_queens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own batch breeder queens"
  ON batch_breeder_queens FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own batch breeder queens"
  ON batch_breeder_queens FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own batch breeder queens"
  ON batch_breeder_queens FOR DELETE USING (user_id = auth.uid());
```

### New column on `batch_grafts`

```sql
ALTER TABLE batch_grafts
  ADD COLUMN breeder_queen_id uuid REFERENCES queens(id) ON DELETE SET NULL;

CREATE INDEX idx_batch_grafts_breeder_queen_id ON batch_grafts(breeder_queen_id);
```

`ON DELETE SET NULL` is intentional: if a queen record is later deleted, we keep the cell's identity history but lose the breeder pointer. The batch will still show the cell number and emerged queen.

### Existing column: `rearing_batches.mother_queen_id`

Kept for **backward compatibility** and for single-breeder batches. Semantics:

- `mother_queen_id IS NOT NULL` AND no rows in `batch_breeder_queens` → single-breeder batch, all cells share that queen.
- `mother_queen_id IS NULL` AND `batch_breeder_queens` has rows → multi-breeder batch, each cell carries its own `breeder_queen_id`.

No data migration is needed — every existing batch falls into the first case.

## Files to touch

| File | Change |
|---|---|
| `src/sql/2026/...-add-multi-breeder.sql` | New SQL migration (table + column + indexes + RLS). Applied via Supabase MCP. |
| `src/app/dashboard/batches/page.tsx` | Add "multiple breeders" checkbox + multi-select to Add/Edit dialogs. Save `batch_breeder_queens` rows on submit. |
| `src/hooks/useBatchGrafts.ts` | Load `batch_breeder_queens` for the batch. Rework `generateGrafts` to accept per-range breeder assignments. Add `updateGraftBreederQueen`. |
| `src/components/batches/CellFrame.tsx` | Show breeder queen number badge per cell (multi-breeder only). |
| `src/components/batches/BatchGraftsSection.tsx` | Wire up the new range-assignment modal. |
| `src/components/batches/BreederRangeModal.tsx` *(new)* | The range-assignment modal. |
| `src/components/batches/graftConstants.ts` | Add `breeder_queen_id` to `Graft` interface. |
| `docs/features/queen-rearing.md` | Cross-reference this new doc. |
| `docs/features/nihbs-monthly-returns.md` | Note that multi-breeder batches are unaffected (NIHBS counters are per-batch, not per-breeder). |

## Out of scope (for this iteration)

- **Per-breeder NIHBS reporting** — the monthly return is at batch level; splitting "queens hatched per breeder" would change report semantics and is a separate piece.
- **Queen lineage view** — showing "queens reared from breeder X" across all batches. The data will be there (via `batch_grafts.breeder_queen_id`) but no new lineage UI is built here.
- **Bulk re-assignment** — no UI for "move cells 5–8 from Queen A to Queen B" after generation. Per-cell edit suffices.
- **Group-owner read access** to other members' `batch_breeder_queens`. RLS is owner-only; can be extended later if a rearing-group view needs it.

## Caveats

- Switching a batch from single → multi (or vice versa) after cells exist is **disabled** to avoid orphaning per-cell assignments. The Edit dialog will gate the checkbox accordingly.
- The range-assignment modal handles only contiguous ranges per queen. A non-contiguous layout (e.g. Queen A in cells 1, 3, 5) is not supported; the user can achieve that via per-cell edits after generation.
- `breeder_queen_id` is `NULL` for legacy cells generated before this feature. The UI treats `NULL` as "inherits from batch's `mother_queen_id`" so existing batches read correctly.
