-- Tools favourites (6 November 2026): each beekeeper can star tools, which then sit in a
-- Favourites section at the top of the Tools page. tool_favourites holds the starred tool ids
-- in their Favourites order; NULL means no favourites. tool_order still holds the order
-- within the standard sections.
-- profiles has column-level SELECT (scale tokens excluded), so the new column needs its own grant.
-- UPDATE on profiles is table-level and limited to the user's own row by RLS, so no change there.
-- Not a privileged column: the protect_profile_privileged_columns trigger is untouched.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS tool_favourites jsonb;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_tool_favourites_shape;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_tool_favourites_shape
  CHECK (tool_favourites IS NULL OR (jsonb_typeof(tool_favourites) = 'array' AND jsonb_array_length(tool_favourites) <= 50));

GRANT SELECT (tool_favourites) ON public.profiles TO anon, authenticated;
