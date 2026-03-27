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

## Notes

- When both "Shared apiaries" and "All apiaries" layers are active simultaneously, apiaries with `share_location = true` will appear under both layers. Their obfuscated positions are deterministic (seed = apiary ID), so they coincide at the same map point.
- The layer is hidden by default, consistent with the existing pattern for privileged overlays (wild colonies, conservation areas).
