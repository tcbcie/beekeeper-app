# Troubleshooting: 406 Not Acceptable Error

## Current Situation
You're getting a `406 Not Acceptable` error when trying to fetch team invitation details.

Error occurs at:
```
GET /rest/v1/team_invitations?select=*,teams(name)&id=eq.80303d46...
```

## Possible Causes & Solutions

### Solution 1: Restart PostgREST Server (RECOMMENDED)

The `NOTIFY pgrst, 'reload schema'` command might not work in all Supabase environments.

**Manual restart (guaranteed to work):**

1. Go to **Supabase Dashboard**
2. Navigate to **Project Settings** → **API**
3. Scroll down to find **PostgREST** section
4. Look for a **"Restart"** or **"Reload Schema"** button
5. Click it and wait 30 seconds

**OR via Supabase CLI (if you have it installed):**
```bash
supabase db reset --db-url "your-connection-string"
```

### Solution 2: Check if Column Was Actually Added

Run this in SQL Editor to verify:
```sql
-- Check if declined_at exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'team_invitations'
ORDER BY ordinal_position;
```

You should see these columns:
- id
- team_id
- email
- invited_by
- status
- invited_at
- expires_at
- accepted_at
- **declined_at** ← This should be here!

If `declined_at` is missing, run:
```sql
ALTER TABLE public.team_invitations
ADD COLUMN declined_at TIMESTAMPTZ;
```

### Solution 3: Check Foreign Key Relationship

The 406 error might be related to the `teams(name)` join. Verify:

```sql
-- Check foreign key exists
SELECT
  tc.constraint_name,
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.table_name = 'team_invitations'
  AND tc.constraint_type = 'FOREIGN KEY';
```

### Solution 4: Test Without the Join

To isolate the issue, temporarily test if the query works without the join:

```sql
-- Simple query without join
SELECT * FROM team_invitations
WHERE id = '80303d46-a8fa-4d49-b2cd-771ed12e17e2';
```

If this works but `SELECT *, teams(name)` doesn't, the issue is with the foreign key or RLS policies on the `teams` table.

### Solution 5: Check RLS Policies

The 406 could be an RLS policy issue. Check teams table policies:

```sql
-- View RLS policies on teams table
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'teams';
```

### Solution 6: Clear Browser Cache & Cookies

Sometimes the Supabase JS client caches schema information:

1. **Hard refresh:** `Ctrl+Shift+R` (or `Cmd+Shift+R` on Mac)
2. **Clear site data:**
   - Open DevTools → Application → Clear Storage
   - Click "Clear site data"
3. **Or use Incognito mode** to test with a fresh session

### Solution 7: Force Schema Refresh (Alternative Methods)

If NOTIFY doesn't work, try these alternatives:

```sql
-- Method 1: Reload config
SELECT pg_reload_conf();

-- Method 2: Terminate existing connections (USE WITH CAUTION)
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = current_database()
  AND pid <> pg_backend_pid()
  AND application_name LIKE 'PostgREST%';

-- Then reload
NOTIFY pgrst, 'reload schema';
```

## Quick Test After Fix

Run this in SQL Editor to simulate what the app does:

```sql
-- Test the exact query the app is making
SELECT *, teams.name as team_name
FROM team_invitations
LEFT JOIN teams ON team_invitations.team_id = teams.id
WHERE team_invitations.id = '80303d46-a8fa-4d49-b2cd-771ed12e17e2';
```

If this returns data, the issue is fixed!

## If Nothing Works

As a last resort, wait 10-15 minutes and try again. Sometimes schema cache updates can take time to propagate in Supabase's infrastructure.
