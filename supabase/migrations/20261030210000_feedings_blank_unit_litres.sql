-- Feeding records saved with a blank unit while the form showed "Liters (L)" (30 October 2026): the owner
-- confirmed litres for syrup and HiveAlive. Other blank rows are left alone; they have no quantity.
UPDATE public.feedings
SET unit = 'L'
WHERE unit = ''
  AND (feed_type ILIKE '%syrup%' OR feed_type = 'HiveAlive');
