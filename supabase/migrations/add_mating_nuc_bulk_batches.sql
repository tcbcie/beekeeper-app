-- Bulk mating nuc creation support

CREATE TABLE IF NOT EXISTS public.mating_nuc_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_rearing_batch_id uuid REFERENCES public.rearing_batches(id) ON DELETE SET NULL,
  mode text NOT NULL CHECK (mode IN ('numbered', 'unnumbered')),
  requested_count integer NOT NULL DEFAULT 0 CHECK (requested_count >= 0),
  created_count integer NOT NULL DEFAULT 0 CHECK (created_count >= 0),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mating_nucs
  ADD COLUMN IF NOT EXISTS creation_batch_id uuid REFERENCES public.mating_nuc_batches(id) ON DELETE SET NULL;

ALTER TABLE public.mating_nucs
  ADD COLUMN IF NOT EXISTS reference_code text;

CREATE INDEX IF NOT EXISTS idx_mating_nuc_batches_user_created
  ON public.mating_nuc_batches(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mating_nucs_creation_batch_id
  ON public.mating_nucs(creation_batch_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mating_nucs_reference_code_per_user
  ON public.mating_nucs(user_id, reference_code)
  WHERE reference_code IS NOT NULL;

ALTER TABLE public.mating_nuc_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own mating nuc batches" ON public.mating_nuc_batches;
CREATE POLICY "Users can view own mating nuc batches"
  ON public.mating_nuc_batches
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own mating nuc batches" ON public.mating_nuc_batches;
CREATE POLICY "Users can insert own mating nuc batches"
  ON public.mating_nuc_batches
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own mating nuc batches" ON public.mating_nuc_batches;
CREATE POLICY "Users can update own mating nuc batches"
  ON public.mating_nuc_batches
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own mating nuc batches" ON public.mating_nuc_batches;
CREATE POLICY "Users can delete own mating nuc batches"
  ON public.mating_nuc_batches
  FOR DELETE
  USING (auth.uid() = user_id);
