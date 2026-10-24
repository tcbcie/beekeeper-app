-- Batch 38 (24/10/2026), C5b-13: single-breeder cells record their breeder.
--
-- docs/features/multi-breeder-queens-per-batch.md says a single-breeder batch's cells carry
-- breeder_queen_id = the batch's mother_queen_id. Cell generation never set it, so older cells
-- have none (every reader falls back to the batch mother, so nothing was wrong on screen). New
-- cells are stamped by the app from this batch on, and the breeder picker is locked once cells
-- exist, so this one-off backfill brings the older cells into line.
--
-- Only batches with no batch_breeder_queens rows (single-breeder) and a mother set; cells that
-- already have a breeder are left alone. 871 cells on 24/10/2026.

UPDATE public.batch_grafts g
SET breeder_queen_id = rb.mother_queen_id
FROM public.rearing_batches rb
WHERE rb.id = g.batch_id
  AND rb.mother_queen_id IS NOT NULL
  AND g.breeder_queen_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.batch_breeder_queens x WHERE x.batch_id = rb.id
  );
