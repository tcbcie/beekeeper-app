# Community Map — All Registered Apiaries Layer

**Status:** Complete
**Date:** 27/03/2026
**Audience:** Power Users and Admins only

## Overview

Adds a new toggleable layer to the Community Apiary Map that shows **all registered apiaries** in the system, not just those where the owner has enabled `share_location`. This gives privileged users a complete picture of apiary density across the platform.

## Implementation

### Database

New RPC function: `get_all_apiaries_obfuscated()`

- `SECURITY DEFINER` — bypasses the `apiaries` table RLS to read all rows
- Internally calls `is_power_user_or_admin()` — returns an empty result set for regular users
- Applies the same deterministic 5km coordinate obfuscation as `shared_apiaries_obfuscated`
- Excludes the calling user's own apiaries (already visible as green markers)
- Returns: `id, city, latitude, longitude, created_at, hive_count`

### Frontend (`src/app/dashboard/community-map/page.tsx`)

| Change | Detail |
|---|---|
| `AllRegisteredApiary` interface | Same shape as `SharedApiary` |
| `allApiaries` state | Populated from RPC on load (power users only) |
| `showAllApiaries` state | Defaults to `false` (hidden) |
| Markers | Indigo (#6366f1), 18px circle, same popup style as shared apiaries |
| Toggle | "All apiaries" button in visibility filters panel, power users only |
| Stats badge | Indigo dot + count, shown when `allApiaries.length > 0` |
| Legend | Indigo circle entry, shown for power users |

## Privacy

All coordinates are obfuscated to ~5km accuracy server-side before reaching the client. The exact location of any apiary is never exposed, regardless of whether the owner has enabled sharing.

**Security batch 4 (17/10/2026):**
- The obfuscation used to be seeded with the public apiary ID, and both helper functions could be called without logging in, so the offset could be recomputed and reversed to about 1 km.
- Every community-map source now seeds it with `coord_obfuscation_seed(id)`, which combines the ID with a secret in Vault (`coord_obfuscation_salt`) and can't be called by clients.
- The community map reads shared apiaries and wild colonies through the SECURITY DEFINER RPCs `get_shared_apiaries_obfuscated()` and `get_wild_colonies_obfuscated()` (power users only), instead of the old `shared_apiaries_obfuscated` and `wild_colonies_obfuscated` views. Those views have no anonymous access and will be dropped once the new app version is deployed.

## Notes

- When both "Shared apiaries" and "All apiaries" layers are active simultaneously, apiaries with `share_location = true` will appear under both layers. Their obfuscated positions are deterministic (seed = apiary ID), so they coincide at the same map point.
- The layer is hidden by default, consistent with the existing pattern for privileged overlays (wild colonies, conservation areas).
