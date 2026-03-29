# Task: Fix NIHBS Report Missing Mating Apiary Details

**Date:** 29/03/2026
**Status:** Complete

## Objective
Fix the NIHBS monthly returns report showing empty mating apiary details (name, grid reference, altitude all blank, count = 0).

## Root Cause
The `can_access_apiary` RLS function only allowed access to apiaries the user owns or shares via teams. When the report queries apiary details for mating apiaries belonging to other group members, RLS blocked the result.

## Plan

- [x] 1. Update `can_access_apiary` function to allow access to mating apiaries used in the user's rearing group batches
- [x] 2. Update feature documentation

## Review

### Changes Made

- **`can_access_apiary` SQL function** — Added a fourth OR clause:
  - Allows SELECT access when the apiary is referenced as `mating_apiary_id` on a `rearing_batches` row linked to a `rearing_group` the user is a member of
  - Applied directly via Supabase MCP

- **`sql/can_access_apiary_add_rearing_group.sql`** — Migration file for the function update

- **`docs/features/nihbs-monthly-returns.md`** — Added RLS note for apiaries access via rearing group membership

### Notes
- No frontend code changes needed — the hook logic was correct, only RLS was blocking
- The fix is scoped: only mating apiaries referenced by group batches become visible, not all of a group member's apiaries
