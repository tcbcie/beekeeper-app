# Task: All Registered Apiaries Layer on Community Map
**Date:** 27/03/2026
**Status:** Complete

## Objective
Add a new toggle/layer to the Community Map for Power Users and Admins that shows ALL registered apiaries (not only those with `share_location = true`). Uses the same 5km coordinate obfuscation as shared apiaries. Hidden by default.

## Plan

### 1. Database — Create RPC `get_all_apiaries_obfuscated`
- [x] Create a SECURITY DEFINER RPC that checks `is_power_user_or_admin()`
- [x] Returns all apiaries (excluding caller's own) with obfuscated coords, city, hive count
- [x] Returns empty set if caller is not power user/admin

### 2. Frontend — `src/app/dashboard/community-map/page.tsx`
- [x] Add `AllRegisteredApiary` interface (same shape as `SharedApiary`)
- [x] Add `allApiaries` state and `showAllApiaries` state (default: false)
- [x] Fetch via RPC in the power user branch (alongside wild colonies fetch)
- [x] Add marker rendering (indigo colour, distinct from shared apiaries)
- [x] Add visibility toggle in the controls panel (power user only)
- [x] Add to the legend (power user only)
- [x] Include in stats badge count (power user only)

### 3. Documentation
- [x] Create docs/features entry

## Files Affected
- `src/app/dashboard/community-map/page.tsx`
- New RPC via MCP (get_all_apiaries_obfuscated)

## Review
- New SECURITY DEFINER RPC `get_all_apiaries_obfuscated` returns all non-own apiaries with 5km obfuscation; returns empty for non-privileged users.
- Indigo (#6366f1) markers distinguish "all registered" from purple "shared" and green "own".
- Toggle defaults to off (hidden), consistent with other privileged layers.
- Stats badge shows total count; legend entry shown only for power users/admins.
