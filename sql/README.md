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

### `fix_teams_rls_final.sql` - DEFINITIVE Fix for Infinite Recursion Error ⭐

**Required when**: You see "infinite recursion detected in policy for relation 'teams'" error

**USE THIS SCRIPT** - This is the most recent and correct version that eliminates ALL circular references.

**What it does:**
1. Shows all current policies (for debugging)
2. **Uses PL/pgSQL to dynamically drop ALL policies** (guarantees clean slate)
3. Recreates policies with **ZERO circular references**:
   - Teams table: Only checks `owner_id = auth.uid()` (no cross-table queries)
   - Other tables: Only query UP to teams table (never back down)
4. **Simplified permissions** (for now):
   - Only team OWNERS can create/manage teams
   - Team members can view but not manage (admin roles disabled temporarily)
5. Includes step-by-step progress messages
6. Verifies all policies were created successfully

**Why this version is different:**
- Previous scripts still had `team_members` querying `team_members` (causing recursion)
- This version ensures policies only flow ONE direction: members → teams (never back)
- Simplified to owner-only permissions until basic functionality is proven to work

**How to run:**
1. Go to Supabase Dashboard → **SQL Editor**
2. Click **New Query**
3. Copy the ENTIRE contents of `sql/fix_teams_rls_final.sql` ⭐
4. Paste into the query editor
5. Click **Run** (or press Ctrl+Enter)
6. You should see multiple result sets with step messages:
   - "Current policies:" (shows what's currently there)
   - "All policies dropped"
   - "Teams policies created (owner only)"
   - "Team members policies created"
   - "Team apiaries policies created"
   - "Team invitations policies created"
   - "Final policy list:" (shows all new simplified policies)
   - "COMPLETE!" message
7. **Refresh your browser** and try creating a team again

**If it still doesn't work:**
- Check the "Final policy list" output to ensure all policies are listed
- Each table should have multiple policies (SELECT, INSERT, UPDATE, DELETE)
- If any policies are missing, there may be a syntax error in the script

### `fix_recursion_alternative.sql` - Fix Recursion with Security Definer Function ⭐⭐

**IMPORTANT**: Run this AFTER `fix_teams_rls_final.sql` to add admin/member support

**Why needed**: Direct policies between `teams` and `team_members` create recursion. This script uses a PostgreSQL **SECURITY DEFINER function** to break the circular dependency.

**The Problem:**
```
teams policy: "if you're in team_members, you can see team"
  ↓ queries team_members
team_members policy: "if you own the team, you can see members"
  ↓ queries teams
= INFINITE RECURSION! ❌
```

**The Solution:**
```
teams policy: "if id IN user_team_ids(), you can see team"
  ↓ calls function
user_team_ids() function: SECURITY DEFINER (bypasses RLS)
  ↓ direct query (no policies)
team_members table
= NO RECURSION! ✅
```

**What it does:**
1. Drops problematic recursive policies
2. Creates `user_team_ids()` function that bypasses RLS (runs with elevated privileges)
3. Creates safe policies using the function
4. Adds full admin/member permissions for apiaries and invitations

**How to run:**
1. Go to Supabase Dashboard → **SQL Editor**
2. Click **New Query**
3. Copy the ENTIRE contents of `sql/fix_recursion_alternative.sql`
4. Paste and run
5. Look for success messages:
   - "Dropped potentially recursive policies"
   - "Created helper function: user_team_ids()"
   - "Created safe policy for members to view teams"
   - "Created safe policy for members to view each other"
   - "COMPLETE!"

**Permissions after this:**
- **Owners**: Full control (create/update/delete teams, manage everything)
- **Admins**: Manage members (add/update/remove), manage apiaries, manage invitations
- **Members**: View teams they belong to, view other members, view team apiaries (read-only)

**Technical Details:**
- `SECURITY DEFINER` = function runs as its creator (with elevated privileges)
- This breaks the circular dependency: policies → function (bypasses RLS) → direct table access
- Function is marked `STABLE` for query optimization

### `add_admin_member_permissions.sql` - ⚠️ DO NOT USE (Causes Recursion)

**Status**: DEPRECATED - This script causes infinite recursion

**Why it fails**: Creates policies where `teams` queries `team_members` and `team_members` queries `teams` (circular dependency)

**Use instead**: `fix_recursion_alternative.sql` which adds the same permissions safely using a SECURITY DEFINER function

### `add_team_hive_visibility.sql` - Allow Team Members to See Shared Data ⭐

**IMPORTANT**: Run this AFTER `fix_recursion_alternative.sql` to complete team collaboration setup

**What it does:**
Adds RLS policies so team members can VIEW data in shared apiaries:
- Apiaries (shared apiaries)
- Hives (in shared apiaries)
- Queens (in shared hives)
- Inspections (in shared hives)
- Varroa Checks (in shared hives)
- Varroa Treatments (in shared hives)

**How to run:**
1. Go to Supabase Dashboard → **SQL Editor**
2. Click **New Query**
3. Copy the ENTIRE contents of `sql/add_team_hive_visibility.sql`
4. Paste and run
5. Look for success messages for each table:
   - "Added: Team members can view shared apiaries"
   - "Added: Team members can view hives in shared apiaries"
   - "Added: Team members can view queens in shared hives"
   - "Added: Team members can view inspections in shared hives"
   - "Added: Team members can view varroa checks in shared hives"
   - "Added: Team members can view varroa treatments in shared hives"
   - "COMPLETE!"

**Permissions:**
- **READ-ONLY**: Team members can VIEW all data in shared apiaries
- **NO WRITE**: Only team owners and admins can modify shared data (to be added later)

**Safety:**
- Uses the safe `user_team_ids()` function (no recursion risk)
- Consistent with other team policies

### `debug_team_membership.sql` - Diagnostic Tool

**Purpose**: Debug tool to check team membership, invitations, and permissions

**When to use**: When troubleshooting team visibility issues

**What it shows:**
- All teams in the database
- All team members and their roles
- All invitations (pending/accepted/declined)
- Team apiaries (shared apiaries)
- Current user's expected team visibility
- Raw data for debugging RLS issues

**How to run:**
1. Go to Supabase Dashboard → **SQL Editor**
2. Copy and run `sql/debug_team_membership.sql`
3. Review the output to diagnose issues

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
