# Database Migrations

This directory contains SQL migration files for the Beekeeper App database schema.

## How to Run Migrations

### Using Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard at https://supabase.com/dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the contents of the migration file you want to run
5. Paste into the query editor
6. Click **Run** or press `Ctrl+Enter` / `Cmd+Enter`
7. Verify the tables were created in the **Table Editor**

### Using Supabase CLI

If you have the Supabase CLI installed:

```bash
# From the project root
supabase db reset  # WARNING: This resets the entire database

# Or apply a specific migration
supabase db execute < sql/create_teams_tables.sql
```

## Migration Files

### `create_teams_tables.sql` - Team Collaboration Feature ✨ NEW

**Required for**: Team management features in Profile and Dashboard

This migration creates the complete team collaboration system:

**Tables Created:**
- `teams` - Team information with owner
- `team_members` - Junction table for team membership (roles: owner, admin, member)
- `team_apiaries` - Links apiaries to teams for shared management
- `team_invitations` - Tracks pending invitations (7-day expiration)

**Features Included:**
- Row-Level Security (RLS) policies for all tables
- Indexes for optimized query performance
- Automatic triggers for:
  - Adding team owner as member when team is created
  - Updating `updated_at` timestamp on team changes
- Foreign key constraints with proper cascading deletes

**How to Verify:**
After running this migration, check that these tables exist in Supabase:
1. Go to **Table Editor**
2. Look for: `teams`, `team_members`, `team_apiaries`, `team_invitations`
3. Each table should have RLS enabled (green shield icon)

**Troubleshooting:**
- If you get "relation already exists" errors, the tables are already created
- If you get "permission denied" errors, ensure RLS policies are enabled
- If team features still don't work after migration, check browser console for specific errors
- **If you get "infinite recursion detected in policy for relation 'teams'" error**:
  - This means the RLS policies have circular dependencies
  - Run `reset_all_team_policies.sql` to fix this issue
  - See the "Fixing Infinite Recursion Error" section below for detailed steps

### `reset_all_team_policies.sql` - Fix Infinite Recursion Error

**Required when**: You see "infinite recursion detected in policy for relation 'teams'" error

This script completely resets ALL RLS policies on all 4 team-related tables to fix circular dependency issues.

**What it does:**
1. Shows all current policies (for debugging)
2. Drops ALL existing policies on teams, team_members, team_apiaries, team_invitations
3. Recreates all policies with non-recursive structure
4. Uses `EXISTS` instead of `IN` subqueries to prevent recursion
5. Splits the teams SELECT policy into two separate policies
6. Includes step-by-step progress messages
7. Verifies all policies were created successfully

**How to run:**
1. Go to Supabase Dashboard → **SQL Editor**
2. Click **New Query**
3. Copy the ENTIRE contents of `sql/reset_all_team_policies.sql`
4. Paste into the query editor
5. Click **Run** (or press Ctrl+Enter)
6. You should see multiple result sets with step messages:
   - "Current policies before drop:" (shows existing policies)
   - "All policies dropped successfully"
   - "Teams policies created"
   - "Team members policies created"
   - "Team apiaries policies created"
   - "Team invitations policies created"
   - "Final verification - all policies:" (shows all new policies)
   - "Policy reset complete!"
7. Refresh your browser and try creating a team again

**If it still doesn't work:**
- Check the "Final verification" output to ensure all policies are listed
- Each table should have multiple policies (SELECT, INSERT, UPDATE, DELETE)
- If any policies are missing, there may be a syntax error in the script

### Other Migration Files

Add documentation for other migration files as they are created.

## Migration Best Practices

1. **Always backup your database before running migrations** (especially in production)
2. Test migrations in a development environment first
3. Migrations should be idempotent (safe to run multiple times) - note the `IF NOT EXISTS` clauses
4. Never modify existing migration files - create new ones for changes
5. Document any manual steps required after running migrations

## Getting Help

If you encounter issues:
1. Check the browser console for specific error messages
2. Verify tables exist in Supabase Table Editor
3. Check RLS policies are enabled on all team-related tables
4. Review the error message for specific table names or permission issues

For more information on Supabase migrations, see:
https://supabase.com/docs/guides/database/overview
