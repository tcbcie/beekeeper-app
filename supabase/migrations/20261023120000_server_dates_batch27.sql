-- Batch 27: Irish dates on the server (Phase 2 fix batch 14)
-- When the app sends no date, these filled in "today" with the database's UTC date, so between
-- midnight and 1 am Irish summer time they recorded yesterday. They now use the Europe/Dublin
-- date, the same expression get_dashboard_overview uses since batch 26.

-- Column defaults
ALTER TABLE public.crm_orders ALTER COLUMN order_date SET DEFAULT ((now() AT TIME ZONE 'Europe/Dublin')::date);
ALTER TABLE public.dca_confirmations ALTER COLUMN observation_date SET DEFAULT ((now() AT TIME ZONE 'Europe/Dublin')::date);
ALTER TABLE public.graft_distributions ALTER COLUMN distribution_date SET DEFAULT ((now() AT TIME ZONE 'Europe/Dublin')::date);
ALTER TABLE public.mating_nuc_inspections ALTER COLUMN inspection_date SET DEFAULT ((now() AT TIME ZONE 'Europe/Dublin')::date);
ALTER TABLE public.queen_weights ALTER COLUMN weighed_at SET DEFAULT ((now() AT TIME ZONE 'Europe/Dublin')::date);
ALTER TABLE public.wild_colonies ALTER COLUMN observation_date SET DEFAULT ((now() AT TIME ZONE 'Europe/Dublin')::date);

-- Functions: several exist only in the live database (no SQL file), so each is re-created from
-- its own live definition with only the word current_date replaced. CREATE OR REPLACE keeps the
-- signature, owner, grants, SECURITY DEFINER and search_path.
DO $migration$
DECLARE
  fn regprocedure;
  def text;
BEGIN
  FOR fn IN
    SELECT p.oid::regprocedure
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.prokind = 'f'
      AND p.proname IN (
        '_crm_apply_payment_state',
        'archive_hive_cascade',
        'create_mating_nuc_bulk',
        'create_queen_for_distribution',
        'crm_create_order',
        'ensure_nuc_reared_queen',
        'log_colony_movement',
        'promote_distributed_queen_on_mating'
      )
  LOOP
    def := regexp_replace(
      pg_get_functiondef(fn),
      '\mcurrent_date\M',
      '(now() AT TIME ZONE ''Europe/Dublin'')::date',
      'gi'
    );
    EXECUTE def;
  END LOOP;
END
$migration$;
