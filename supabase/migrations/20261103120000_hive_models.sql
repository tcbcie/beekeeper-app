-- Hive models: describe each kind of equipment once (system, make, material,
-- size, frames, photo) and pick it per hive. See docs/features/hive-model-plan.md.
-- Applied via the Supabase MCP server; this file is the record.

-- 1. Hive systems: global, admin-managed (same access model as frame_standards).
CREATE TABLE public.hive_systems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (length(trim(name)) BETWEEN 1 AND 60),
  brood_frame_standard_id uuid REFERENCES public.frame_standards(id) ON DELETE SET NULL,
  super_frame_standard_id uuid REFERENCES public.frame_standards(id) ON DELETE SET NULL,
  default_frames_full smallint CHECK (default_frames_full BETWEEN 1 AND 20),
  default_frames_nuc smallint CHECK (default_frames_nuc BETWEEN 1 AND 20),
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.hive_systems ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hive_systems FROM anon;

CREATE POLICY hive_systems_select ON public.hive_systems
  FOR SELECT TO authenticated USING (true);
CREATE POLICY hive_systems_admin_insert ON public.hive_systems
  FOR INSERT TO authenticated WITH CHECK ((SELECT public.is_current_user_admin()));
CREATE POLICY hive_systems_admin_update ON public.hive_systems
  FOR UPDATE TO authenticated
  USING ((SELECT public.is_current_user_admin()))
  WITH CHECK ((SELECT public.is_current_user_admin()));
CREATE POLICY hive_systems_admin_delete ON public.hive_systems
  FOR DELETE TO authenticated USING ((SELECT public.is_current_user_admin()));

INSERT INTO public.hive_systems
  (name, brood_frame_standard_id, super_frame_standard_id, default_frames_full, default_frames_nuc, display_order)
VALUES
  ('National',   (SELECT id FROM public.frame_standards WHERE label = 'British National Deep'),  (SELECT id FROM public.frame_standards WHERE label = 'British National Shallow'), 11, 5, 1),
  ('Commercial', (SELECT id FROM public.frame_standards WHERE label = 'Commercial'),             (SELECT id FROM public.frame_standards WHERE label = 'British National Shallow'), 11, 5, 2),
  ('Langstroth', (SELECT id FROM public.frame_standards WHERE label = 'Langstroth Deep'),        (SELECT id FROM public.frame_standards WHERE label = 'Langstroth Shallow'),       10, 5, 3),
  ('Dadant',     (SELECT id FROM public.frame_standards WHERE label = 'Dadant Modified Deep'),   (SELECT id FROM public.frame_standards WHERE label = 'Dadant Modified Shallow'),  10, 5, 4),
  ('Smith',      (SELECT id FROM public.frame_standards WHERE label = 'Smith'),                  NULL,                                                                             11, 5, 5),
  ('WBC',        (SELECT id FROM public.frame_standards WHERE label = 'British National Deep'),  (SELECT id FROM public.frame_standards WHERE label = 'British National Shallow'), 10, 5, 6),
  ('Warré',      NULL, NULL, NULL, NULL, 7),
  ('Top bar',    NULL, NULL, NULL, NULL, 8),
  ('Other',      NULL, NULL, NULL, NULL, 9);

-- 2. Hive models: one row per kind of equipment a user owns.
CREATE TABLE public.hive_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 80),
  hive_system_id uuid REFERENCES public.hive_systems(id) ON DELETE SET NULL,
  hive_size text NOT NULL DEFAULT 'full' CHECK (hive_size IN ('full', 'nuc')),
  manufacturer text CHECK (manufacturer IS NULL OR length(manufacturer) <= 80),
  material text CHECK (material IN ('cedar', 'pine', 'poly', 'plywood', 'other')),
  frames_per_box smallint CHECK (frames_per_box BETWEEN 1 AND 20),
  image_url text,
  notes text CHECK (notes IS NULL OR length(notes) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX hive_models_user_name_key ON public.hive_models (user_id, lower(trim(name)));
CREATE INDEX hive_models_hive_system_id_idx ON public.hive_models (hive_system_id);

ALTER TABLE public.hive_models ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.hive_models FROM anon;

-- 3. Hives: the chosen model and an optional photo of the hive itself.
-- (Added before the select policy below, which refers to hives.hive_model_id.)
ALTER TABLE public.hives
  ADD COLUMN hive_model_id uuid REFERENCES public.hive_models(id) ON DELETE SET NULL,
  ADD COLUMN image_url text;

CREATE INDEX hives_hive_model_id_idx ON public.hives (hive_model_id) WHERE hive_model_id IS NOT NULL;

-- Own models, plus models on any hive the user can see (team-mates on shared hives).
CREATE POLICY hive_models_select ON public.hive_models
  FOR SELECT TO authenticated
  USING (
    user_id = (SELECT auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.hives h
      WHERE h.hive_model_id = hive_models.id
        AND public.can_access_hive(h.id, (SELECT auth.uid()))
    )
  );
CREATE POLICY hive_models_insert ON public.hive_models
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY hive_models_update ON public.hive_models
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY hive_models_delete ON public.hive_models
  FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));

CREATE TRIGGER update_hive_models_updated_at
  BEFORE UPDATE ON public.hive_models
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- A hive may only use a model owned by the hive's owner. Fires only when the
-- model is set or changed, so an apiary ownership transfer (user_id only) keeps
-- the old model on show until the new owner picks one of their own.
CREATE FUNCTION public.guard_hive_model_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.hive_model_id IS NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.hive_model_id IS NOT DISTINCT FROM OLD.hive_model_id THEN
    RETURN NEW;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.hive_models m
    WHERE m.id = NEW.hive_model_id AND m.user_id = NEW.user_id
  ) THEN
    RAISE EXCEPTION 'A hive can only use a hive model owned by the hive''s owner'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_hive_model_owner() FROM PUBLIC, anon, authenticated;

-- Runs after set_hives_user_id (alphabetical order of BEFORE triggers), so
-- NEW.user_id is already filled in on insert.
CREATE TRIGGER trg_guard_hive_model_owner
  BEFORE INSERT OR UPDATE OF hive_model_id ON public.hives
  FOR EACH ROW EXECUTE FUNCTION public.guard_hive_model_owner();

-- 4. Storage cleanup: queue replaced or deleted photos, and protect photos in use.
CREATE TRIGGER queue_orphaned_images_update
  AFTER UPDATE ON public.hive_models
  FOR EACH ROW WHEN (OLD.image_url IS DISTINCT FROM NEW.image_url)
  EXECUTE FUNCTION public.queue_orphaned_storage_objects('image_url');
CREATE TRIGGER queue_orphaned_images_delete
  AFTER DELETE ON public.hive_models
  FOR EACH ROW EXECUTE FUNCTION public.queue_orphaned_storage_objects('image_url');

CREATE TRIGGER queue_orphaned_images_update
  AFTER UPDATE ON public.hives
  FOR EACH ROW WHEN (OLD.image_url IS DISTINCT FROM NEW.image_url)
  EXECUTE FUNCTION public.queue_orphaned_storage_objects('image_url');
CREATE TRIGGER queue_orphaned_images_delete
  AFTER DELETE ON public.hives
  FOR EACH ROW EXECUTE FUNCTION public.queue_orphaned_storage_objects('image_url');

CREATE OR REPLACE FUNCTION public.is_storage_url_referenced(p_url text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.inspections            WHERE p_url = ANY(image_urls))
      OR EXISTS (SELECT 1 FROM public.varroa_checks          WHERE image_url = p_url)
      OR EXISTS (SELECT 1 FROM public.apiaries               WHERE image_url = p_url)
      OR EXISTS (SELECT 1 FROM public.wild_colonies          WHERE image_url = p_url OR image_url_location = p_url)
      OR EXISTS (SELECT 1 FROM public.wild_colony_inspections WHERE image_url = p_url)
      OR EXISTS (SELECT 1 FROM public.diagnosis_images       WHERE image_url = p_url)
      OR EXISTS (SELECT 1 FROM public.hive_models            WHERE image_url = p_url)
      OR EXISTS (SELECT 1 FROM public.hives                  WHERE image_url = p_url);
$function$;
