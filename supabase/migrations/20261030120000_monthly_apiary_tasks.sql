-- Monthly apiary tasks for the dashboard (30 October 2026). Reference content, the same for every user:
-- signed-in users read it, nobody writes through the API (edit through the Supabase dashboard).
-- At most 5 items a month: position is 1-5 and unique within the month.
-- Written in our own words from Irish and UK association calendars; sources in
-- docs/features/monthly-apiary-tasks.md.
CREATE TABLE public.monthly_apiary_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month smallint NOT NULL CHECK (month BETWEEN 1 AND 12),
  position smallint NOT NULL CHECK (position BETWEEN 1 AND 5),
  task text NOT NULL CHECK (length(trim(task)) > 0),
  UNIQUE (month, position)
);

ALTER TABLE public.monthly_apiary_tasks ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.monthly_apiary_tasks FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.monthly_apiary_tasks TO authenticated;

CREATE POLICY "Signed-in users can read monthly apiary tasks"
  ON public.monthly_apiary_tasks FOR SELECT TO authenticated USING (true);

INSERT INTO public.monthly_apiary_tasks (month, position, task) VALUES
(1, 1, 'After storms, check roofs and straps and that no hive has been knocked.'),
(1, 2, 'Keep entrances clear of dead bees, snow and leaves.'),
(1, 3, 'Heft each hive; if it feels light, put fondant over the cluster, not syrup.'),
(1, 4, 'If not done in December, use a licensed oxalic acid treatment while there is no brood.'),
(1, 5, 'Go through last year''s records and plan any requeening.'),
(2, 1, 'Heft more often: stores go faster now that brood rearing has started, especially in mild spells.'),
(2, 2, 'Top up fondant on any hive that feels light.'),
(2, 3, 'Keep entrances clear and watch for pollen going in on fine days.'),
(2, 4, 'Give the bees a water source in a sunny, sheltered spot.'),
(2, 5, 'Clean equipment and order frames and foundation for the season.'),
(3, 1, 'Watch stores closely: this is the month colonies are most likely to starve.'),
(3, 2, 'Feed a light hive with 1:1 syrup over the cluster once bees are flying.'),
(3, 3, 'Open a hive only on a calm day at about 15°C and keep it brief; otherwise wait for April.'),
(3, 4, 'Look for signs of dysentery and disease, and check the varroa drop.'),
(3, 5, 'Close up any dead colony and try to work out the cause.'),
(4, 1, 'First full inspection on a warm, still day at 15°C or more: queen, eggs, brood pattern, disease and stores.'),
(4, 2, 'Mark any unmarked queens while colonies are still small.'),
(4, 3, 'Move old dark combs to the outside to remove when empty, replacing about a third each year.'),
(4, 4, 'Take off mouse guards, keep entrances small, and add a super once bees cover the frames.'),
(4, 5, 'Get spare hive parts ready and start looking for queen cells late in the month.'),
(5, 1, 'Swarm season: inspect every 7 days for queen cells.'),
(5, 2, 'Choose your swarm control method and keep a spare hive ready.'),
(5, 3, 'Add supers before the colony runs short of space.'),
(5, 4, 'Monitor varroa, but this is not the time to treat.'),
(5, 5, 'Put out a bait hive and consider raising queens from your best colonies.'),
(6, 1, 'Keep up weekly inspections while colonies still want to swarm.'),
(6, 2, 'Watch stores in the June gap; feed a light hive with 1:1 syrup, but not with supers on.'),
(6, 3, 'Take off sealed spring honey before it sets in the comb.'),
(6, 4, 'Add supers ahead of need and check new queens are mated and laying.'),
(6, 5, 'Keep monitoring varroa.'),
(7, 1, 'Keep up weekly inspections; swarming usually eases by the end of the month.'),
(7, 2, 'Add supers for the clover, bramble and lime flow.'),
(7, 3, 'Take off supers once full and capped, leaving the bees enough stores.'),
(7, 4, 'Watch for wasps and narrow the entrances of weaker colonies.'),
(7, 5, 'Count varroa and plan a treatment for after the harvest.'),
(8, 1, 'Take off the remaining supers, checking the brood box keeps enough stores.'),
(8, 2, 'Extract honey while it is still warm from the hive.'),
(8, 3, 'Start a licensed varroa treatment once the supers are off.'),
(8, 4, 'Reduce entrances and keep hives bee-tight against wasps and robbing.'),
(8, 5, 'Feed thick 2:1 syrup in the evening, all hives together, to avoid robbing.'),
(9, 1, 'Feed thick syrup to bring stores up to about 18 kg; ivy and late flowers will help.'),
(9, 2, 'Finish varroa treatment so the winter bees are raised with few mites.'),
(9, 3, 'Check each colony has a queen, and unite weak but healthy colonies.'),
(9, 4, 'Keep entrances small against robbing and wasps.'),
(9, 5, 'Remove queen excluders from hives going into winter.'),
(10, 1, 'Heft each hive for about 18 kg of stores; finish syrup and use fondant if still light.'),
(10, 2, 'Fit mouse guards before the first frosts.'),
(10, 3, 'Strap hives and weigh down roofs against winter storms.'),
(10, 4, 'Add insulation above the crown board and keep entrances reduced.'),
(10, 5, 'Watch from the outside rather than opening hives, and clean spare equipment.'),
(11, 1, 'Leave the bees alone and check them from the outside.'),
(11, 2, 'After storms, check that roofs and straps are secure and hives are dry.'),
(11, 3, 'Heft each hive and add fondant only if it feels light.'),
(11, 4, 'Check mouse guards are in place and entrances are clear.'),
(11, 5, 'Clean and repair spare equipment and build for next season.'),
(12, 1, 'Use a licensed oxalic acid treatment in the broodless spell.'),
(12, 2, 'Heft each hive and add fondant if it feels light.'),
(12, 3, 'After storms, check hives from the outside and keep entrances clear.'),
(12, 4, 'Repair spare equipment and permanently mark hives in case of theft.'),
(12, 5, 'Review the season and plan for next year.');
