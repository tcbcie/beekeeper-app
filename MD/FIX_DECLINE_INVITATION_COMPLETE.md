# Complete Fix: Decline Team Invitation Error

## Error Messages You're Seeing

1. First error:
   ```
   Could not find the 'declined_at' column of 'team_invitations' in the schema cache
   ```

2. Second error (after adding column):
   ```
   406 (Not Acceptable)
   ```

## Root Cause
The `team_invitations` table is missing the `declined_at` column, and after adding it, Supabase's PostgREST schema cache needs to be refreshed.

## Complete Fix (3 Steps)

### Step 1: Add the Missing Column

Run this SQL in your **Supabase SQL Editor**:

```sql
-- Add declined_at column to team_invitations table
ALTER TABLE public.team_invitations
ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ;

-- Update any existing declined invitations
UPDATE public.team_invitations
SET declined_at = NOW()
WHERE status = 'declined'
  AND declined_at IS NULL;
```

### Step 2: Reload the Schema Cache

**IMPORTANT:** After adding the column, you MUST reload Supabase's schema cache.

Run this SQL in your **Supabase SQL Editor**:

```sql
-- Reload the PostgREST schema cache
NOTIFY pgrst, 'reload schema';
```

### Step 3: Verify the Fix

Check that the column was added:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'team_invitations'
ORDER BY ordinal_position;
```

You should see:
- `declined_at` | `timestamp with time zone` | `YES`

## Alternative: Restart PostgREST (if NOTIFY doesn't work)

If the `NOTIFY` command doesn't work, you can force a schema reload by:

1. Go to **Supabase Dashboard** → **Settings** → **API**
2. Scroll to **PostgREST Configuration**
3. Click **Restart PostgREST server** (or wait 24 hours for automatic cache refresh)

## Test the Fix

1. Clear your browser cache (or use incognito mode)
2. Try declining a team invitation again
3. The error should be gone

## What This Does

The fix adds the `declined_at` column to match the same pattern as `accepted_at`:
- When someone accepts → `accepted_at` is set
- When someone declines → `declined_at` is set (was missing!)

## Files Affected
- Database: `team_invitations` table
- Code: `src/app/decline-invitation/page.tsx` (line 73)
