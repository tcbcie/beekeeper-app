# Fix: Add declined_at Column to team_invitations

## Problem
When declining a team invitation, the app throws an error:
```
Could not find the 'declined_at' column of 'team_invitations' in the schema cache
```

## Solution
Run the SQL migration to add the missing `declined_at` column.

## Steps to Fix

### Option 1: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Open the file: `sql/add_declined_at_to_team_invitations.sql`
4. Copy and paste the SQL into the SQL Editor
5. Click **Run** to execute

### Option 2: Supabase CLI
```bash
supabase db execute --file sql/add_declined_at_to_team_invitations.sql
```

### Option 3: psql
```bash
psql -h <your-host> -U postgres -d postgres -f sql/add_declined_at_to_team_invitations.sql
```

## What This Does
- Adds a `declined_at` TIMESTAMPTZ column to the `team_invitations` table
- Updates any existing declined invitations with their `updated_at` timestamp
- Uses a safe approach (checks if column exists before adding)

## After Running
1. Test the decline invitation flow again
2. The error should be resolved
3. Declined invitations will now properly track when they were declined

## Files Modified
- Created: `sql/add_declined_at_to_team_invitations.sql`
- No code changes needed - the app already uses this column correctly
