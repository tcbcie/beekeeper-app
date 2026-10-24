-- Batch 35: hives and scales.
--
-- 1. One scale per hive within an account (C3-11). Assigning a scale never cleared it from
--    the hive it was on, so it could end up on two hives. The guard is per account, not
--    global: the demo copy account intentionally holds the same scales as the original.
-- 2. track_hive_configuration_changes runs AFTER UPDATE, so its assignments to
--    NEW.configuration_changed_at / _by were thrown away. They are removed so nobody relies
--    on them; the client sets those columns when the configuration really changes (C3-05).
--    CREATE OR REPLACE keeps the function's existing grants.

CREATE UNIQUE INDEX IF NOT EXISTS hives_user_beep_device_uniq
  ON public.hives (user_id, beep_device_id)
  WHERE beep_device_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS hives_user_wolf_scale_uniq
  ON public.hives (user_id, wolf_scale_id)
  WHERE wolf_scale_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.track_hive_configuration_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  -- Only insert if configuration, location, OR queen info has actually changed
  IF (
    NEW.configuration IS DISTINCT FROM OLD.configuration OR
    NEW.apiary_id IS DISTINCT FROM OLD.apiary_id OR
    NEW.row_in_apiary IS DISTINCT FROM OLD.row_in_apiary OR
    NEW.order_in_apiary IS DISTINCT FROM OLD.order_in_apiary OR
    NEW.queen_id IS DISTINCT FROM OLD.queen_id OR
    NEW.queen_marked IS DISTINCT FROM OLD.queen_marked OR
    NEW.queen_marking_color IS DISTINCT FROM OLD.queen_marking_color OR
    NEW.queen_mated IS DISTINCT FROM OLD.queen_mated OR
    NEW.queen_clipped IS DISTINCT FROM OLD.queen_clipped
  ) THEN
    INSERT INTO hive_configuration_history (
      hive_id,
      changed_at,
      changed_by,
      configuration,
      apiary_id,
      row_in_apiary,
      order_in_apiary,
      queen_id,
      queen_marked,
      queen_marking_color,
      queen_mated,
      queen_clipped
    ) VALUES (
      NEW.id,
      NOW(),
      COALESCE(auth.uid(), NEW.user_id), -- Use hive owner if no auth session
      NEW.configuration,
      NEW.apiary_id,
      NEW.row_in_apiary,
      NEW.order_in_apiary,
      NEW.queen_id,
      NEW.queen_marked,
      NEW.queen_marking_color,
      NEW.queen_mated,
      NEW.queen_clipped
    );
  END IF;

  -- AFTER trigger: the return value is ignored and NEW can't be changed here.
  RETURN NEW;
END;
$function$;
