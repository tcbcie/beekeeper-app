-- Monthly apiary tasks editable by admins from Settings (30 October 2026). Everyone else keeps read-only
-- access. updated_at drives the panel's review date. The month and position constraint becomes deferrable
-- so that one statement can swap two items' positions when reordering.
ALTER TABLE public.monthly_apiary_tasks
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
  ADD CONSTRAINT monthly_apiary_tasks_task_length CHECK (length(task) <= 300);

ALTER TABLE public.monthly_apiary_tasks
  DROP CONSTRAINT monthly_apiary_tasks_month_position_key,
  ADD CONSTRAINT monthly_apiary_tasks_month_position_key UNIQUE (month, position) DEFERRABLE INITIALLY IMMEDIATE;

CREATE FUNCTION public.update_monthly_apiary_tasks_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

REVOKE ALL ON FUNCTION public.update_monthly_apiary_tasks_updated_at() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER monthly_apiary_tasks_updated_at
  BEFORE UPDATE ON public.monthly_apiary_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_monthly_apiary_tasks_updated_at();

GRANT INSERT, UPDATE, DELETE ON public.monthly_apiary_tasks TO authenticated;

CREATE POLICY "Admins can add monthly apiary tasks"
  ON public.monthly_apiary_tasks FOR INSERT TO authenticated
  WITH CHECK ((SELECT is_current_user_admin()));

CREATE POLICY "Admins can update monthly apiary tasks"
  ON public.monthly_apiary_tasks FOR UPDATE TO authenticated
  USING ((SELECT is_current_user_admin()))
  WITH CHECK ((SELECT is_current_user_admin()));

CREATE POLICY "Admins can delete monthly apiary tasks"
  ON public.monthly_apiary_tasks FOR DELETE TO authenticated
  USING ((SELECT is_current_user_admin()));
