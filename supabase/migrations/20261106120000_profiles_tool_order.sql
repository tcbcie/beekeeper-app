-- Tools card order (6 November 2026): each beekeeper can arrange the cards on the Tools page.
-- tool_order holds a JSON array of tool ids in the chosen order; NULL means the standard order.
-- jsonb rather than text[]: the profile data export writes lists as JSON text, which restores
-- into jsonb but not into a Postgres array.
-- profiles has column-level SELECT (scale tokens excluded), so the new column needs its own grant.
-- UPDATE on profiles is table-level and limited to the user's own row by RLS, so no change there.
-- Not a privileged column: the protect_profile_privileged_columns trigger is untouched.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tool_order jsonb;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_tool_order_shape;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_tool_order_shape
  CHECK (tool_order IS NULL OR (jsonb_typeof(tool_order) = 'array' AND jsonb_array_length(tool_order) <= 50));

GRANT SELECT (tool_order) ON public.profiles TO anon, authenticated;
