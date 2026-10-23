-- Batch 33: queen rearing records.

-- C5b-09: deleting a graft silently deleted its distribution (ON DELETE CASCADE), taking the
-- Queen Tracker row, the NIHBS distribution and mated counts and the link to the recipient's
-- queen with it. A graft with a distribution now can't be deleted; the distribution has to be
-- removed first. NO ACTION (not RESTRICT) is checked at the end of the statement, so deleting a
-- whole batch still works: that statement also removes the batch's distributions through
-- graft_distributions_batch_id_fkey.
ALTER TABLE public.graft_distributions
  DROP CONSTRAINT graft_distributions_graft_id_fkey,
  ADD CONSTRAINT graft_distributions_graft_id_fkey
    FOREIGN KEY (graft_id) REFERENCES public.batch_grafts(id) ON DELETE NO ACTION;

-- C5b-08: correcting a distribution's mated date never reached the recipient's queen. The
-- promotion RPC only handles first confirmation (queens still 'cell'/'virgin'), so an 'active'
-- queen kept the wrong date for good. This copies a corrected date to the recipient's queen,
-- but only while the queen still has the old date, so a date the recipient set themselves is
-- left alone. First confirmations (old date NULL) and clears (new date NULL) are left to the
-- existing promotion and un-confirm flows.
CREATE OR REPLACE FUNCTION public.sync_distributed_queen_mated_date()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.recipient_user_id IS NULL
     OR NEW.mating_confirmed_date IS NULL
     OR OLD.mating_confirmed_date IS NULL THEN
    RETURN NEW;
  END IF;

  -- Graft-sourced queens key on the graft; registry-queen distributions key on the distribution.
  UPDATE queens
     SET mated_date = NEW.mating_confirmed_date
   WHERE user_id = NEW.recipient_user_id
     AND status = 'active'
     AND mated_date IS NOT DISTINCT FROM OLD.mating_confirmed_date
     AND (
       (NEW.graft_id IS NOT NULL AND source_graft_id = NEW.graft_id)
       OR (NEW.graft_id IS NULL AND source_distribution_id = NEW.id)
     );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_sync_distributed_queen_mated_date
  AFTER UPDATE OF mating_confirmed_date ON public.graft_distributions
  FOR EACH ROW
  WHEN (OLD.mating_confirmed_date IS DISTINCT FROM NEW.mating_confirmed_date)
  EXECUTE FUNCTION public.sync_distributed_queen_mated_date();

-- Trigger-only function: no client may call it as an RPC.
REVOKE EXECUTE ON FUNCTION public.sync_distributed_queen_mated_date() FROM PUBLIC, anon, authenticated;
