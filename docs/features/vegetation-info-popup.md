# Vegetation Info Popup Feature

## Summary

A popup/modal that displays detailed information about a vegetation type when a beekeeper clicks on a vegetation name in the Research (GDD Data tab) or Tools (GDD Tracker) sections. Shows a **plant photograph** fetched live from the Wikipedia REST API alongside beekeeping-relevant data such as nectar/pollen ratings, bloom periods, honey characteristics, and GDD ranges.

## Status

**Implemented** - All components complete and wired up.

## How It Works

1. Beekeeper clicks a vegetation name (displayed as a clickable link) in GDD Data or GDD Tracker
2. A modal opens showing:
   - Hero photograph fetched live from the Wikipedia REST API using the scientific name
   - Common name and scientific name
   - Nectar rating (1-5 stars) and pollen rating (1-5 stars)
   - Bloom period and typical GDD range
   - Honey characteristics
   - Description of beekeeping relevance
3. Images are **not stored locally** - fetched at runtime from `https://en.wikipedia.org/api/rest_v1/page/summary/{scientific_name}`
4. If the Wikipedia image fails to load, the modal gracefully shows the text content without an image

## Database Schema

### Table: `vegetation_info`

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | UUID | No | Primary key (default gen_random_uuid()) |
| `vegetation_type_id` | UUID | No | FK to `dropdown_values.id` (unique) |
| `scientific_name` | varchar | No | Wikipedia article title, e.g. `Trifolium_repens` |
| `bloom_period` | varchar | Yes | Typical bloom window, e.g. "June-September" |
| `nectar_value` | integer | Yes | Rating 1-5 (1 = poor, 5 = excellent) |
| `pollen_value` | integer | Yes | Rating 1-5 (1 = poor, 5 = excellent) |
| `honey_characteristics` | text | Yes | Colour, flavour, crystallisation notes |
| `typical_gdd_range` | varchar | Yes | Expected GDD at bloom, e.g. "400-800" |
| `description` | text | Yes | Beekeeping-relevant description |
| `created_at` | timestamptz | No | Default CURRENT_TIMESTAMP |
| `updated_at` | timestamptz | No | Default CURRENT_TIMESTAMP |

**RLS Policy:** SELECT only for authenticated users.

## Seeded Vegetation Types (29 entries)

| Vegetation | Scientific Name (Wikipedia) | Nectar | Pollen |
|-----------|---------------------------|--------|--------|
| Gorse (Ulex) | Ulex_europaeus | 3 | 3 |
| Oil Seed Rape (Canola) | Brassica_napus | 5 | 4 |
| Clover (White) | Trifolium_repens | 5 | 3 |
| Clover (Red) | Trifolium_pratense | 3 | 4 |
| Hawthorn | Crataegus_monogyna | 4 | 4 |
| Blackberry | Rubus_fruticosus | 4 | 3 |
| Heather | Calluna_vulgaris | 5 | 3 |
| Ivy | Hedera_helix | 4 | 5 |
| Dandelion | Taraxacum_officinale | 3 | 4 |
| Apple Blossom | Malus_domestica | 3 | 4 |
| Cherry Blossom | Prunus_avium | 3 | 4 |
| Lime (Linden) | Tilia_europaea | 5 | 2 |
| Willow | Salix_caprea | 3 | 5 |
| Sycamore | Acer_pseudoplatanus | 4 | 3 |
| Horse Chestnut | Aesculus_hippocastanum | 3 | 4 |
| Field Bean | Vicia_faba | 4 | 3 |
| Borage | Borago_officinalis | 5 | 3 |
| Snowdrops | Galanthus_nivalis | 2 | 3 |
| Hazel | Corylus_avellana | 1 | 5 |
| Daffodils | Narcissus_(plant) | 2 | 3 |
| Cherry Plum | Prunus_cerasifera | 3 | 4 |
| Sloe (Blackthorn) | Prunus_spinosa | 3 | 4 |
| Forsythia | Forsythia | 2 | 2 |
| Chestnut | Castanea_sativa | 4 | 4 |
| Apple | Malus | 3 | 4 |
| Hawthorn (Crataegus) | Crataegus | 4 | 4 |
| Daisies | Bellis_perennis | 1 | 2 |
| Mahonia | Mahonia_aquifolium | 3 | 3 |
| Erica (Heather & Heath) | Erica_(plant) | 4 | 3 |

## Files

| File | Type | Description |
|------|------|-------------|
| `src/components/shared/VegetationInfoModal.tsx` | New | Reusable modal component (~150 lines) |
| `src/components/research/GDDDataTab.tsx` | Modified | 6 clickable vegetation names + modal render |
| `src/components/tools/GDDTracker.tsx` | Modified | 1 clickable vegetation name + modal render |

## Trigger Points

| Location | View | Record Type |
|----------|------|-------------|
| Research > GDD Data | Desktop table | User records |
| Research > GDD Data | Desktop table | Community records |
| Research > GDD Data | Mobile cards | User records |
| Research > GDD Data | Mobile cards | Community records |
| Research > GDD Data | Community-only desktop table | Community records |
| Research > GDD Data | Community-only mobile cards | Community records |
| Tools > GDD Tracker | Desktop table | User records |

## Dependencies

- No new packages
- Uses existing Supabase client (`@/lib/supabase`)
- Uses existing Tailwind CSS utilities and theme tokens
- Uses Lucide React icons (Flower2, Droplets, CircleDot, X, Loader2)
- Follows existing modal pattern from `ScaleSelectionModal.tsx`

## Access Control

- Vegetation info is **read-only** for all authenticated users
- No user-specific data - shared reference information
- RLS policy: `SELECT` allowed for all `authenticated` users

## Auto-Population of New Vegetation Types

When an admin creates a new vegetation type via **Settings > Dropdown Management**, a `vegetation_info` row is automatically generated using OpenAI.

### How It Works

1. Admin inserts a new `dropdown_values` row with `category_key = 'vegetation_type'`
2. A PL/pgSQL trigger (`on_new_vegetation_type`) fires on `dropdown_values` INSERT
3. The trigger checks if the new row belongs to the `vegetation_type` category
4. If yes, it calls the `generate-vegetation-info` Edge Function via `pg_net`
5. The Edge Function calls **OpenAI gpt-4o-mini** with a structured prompt
6. OpenAI returns: scientific name (Wikipedia format), bloom period (Ireland/UK), nectar/pollen ratings (1-5), honey characteristics, GDD range, and description
7. The Edge Function inserts the generated data into `vegetation_info` using the service role client
8. The new vegetation type immediately shows populated data in the VegetationInfoModal

### Cascade Deletion

The FK `vegetation_info_vegetation_type_id_fkey` has `ON DELETE CASCADE`. Deleting a vegetation type dropdown value automatically removes its `vegetation_info` row.

### Edge Function: `generate-vegetation-info`

- **Trigger:** Database trigger via `pg_net` HTTP POST
- **Auth:** `verify_jwt: true` — service role key sent as Bearer token
- **AI Model:** OpenAI `gpt-4o-mini` (temperature 0.3, JSON mode)
- **Secrets Required:** `OPENAI_API_KEY` must be set as a Supabase secret

### Database Objects

| Object | Type | Description |
|--------|------|-------------|
| `handle_new_vegetation_type()` | PL/pgSQL function | Filters for vegetation_type category, calls Edge Function |
| `on_new_vegetation_type` | Trigger | AFTER INSERT on `dropdown_values` |

## Future Enhancements

- Allow users to submit their own photographs for review
- Add seasonal availability calendar visual
- Link vegetation info to nearby foraging radius maps
- Add multiple images per plant (flower, leaf, full plant)
- Integrate with GDD predictions to show "blooming soon" indicators
