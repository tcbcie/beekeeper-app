# Fix Missing Vegetation Info Data

## Root Cause
7 vegetation types in `dropdown_values` had no corresponding row in `vegetation_info`. The auto-populate trigger (`handle_new_vegetation_type` → edge function) likely wasn't active when these were added. The popup queries by `vegetation_type_id` and shows "No information available" when no row exists.

## Tasks
- [x] 1. Insert missing `vegetation_info` rows for all 7 types

## Review

### Summary
Inserted `vegetation_info` rows for the 7 vegetation types that were missing data:

| Vegetation | Scientific Name | Nectar | Pollen |
|---|---|---|---|
| Alder trees (Alnus glutinosa) | Alnus_glutinosa | 1 | 4 |
| Elderberry | Sambucus_nigra | 2 | 3 |
| Hellebore | Helleborus | 2 | 3 |
| Marsh-Marigold | Caltha_palustris | 2 | 3 |
| Thistle | Cirsium | 5 | 3 |
| Viburnum tinus | Viburnum_tinus | 2 | 2 |
| Winter Heliotrope | Petasites_fragrans | 3 | 2 |

### No code changes — data-only fix via direct SQL INSERT.

### Verification
- Click Hellebore, Viburnum tinus, Winter Heliotrope etc. in the GDD tracker — popup should now show full info with Wikipedia image.
