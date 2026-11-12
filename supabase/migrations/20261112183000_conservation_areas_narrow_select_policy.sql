-- Community map batch 4.1, step 2 of 2: the table is readable only by a row's owner and by
-- Power Users/Admins. Everyone else reads get_conservation_areas(), which returns no owner
-- or apiary id. Previous policy: "Authenticated users can view conservation areas",
-- FOR SELECT USING ((SELECT auth.uid()) IS NOT NULL).

DROP POLICY "Authenticated users can view conservation areas" ON public.conservation_areas;

CREATE POLICY "Owners and power users can view conservation areas" ON public.conservation_areas
  FOR SELECT USING (user_id = (SELECT auth.uid()) OR (SELECT is_power_user_or_admin()));
