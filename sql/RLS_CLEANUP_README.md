# RLS Policy Cleanup Guide

This guide explains how to clean up duplicate RLS policies in your Supabase database.

## Background

The database currently has duplicate RLS policies from previous migrations. While these don't break functionality (PostgreSQL OR's them together), they add unnecessary overhead and make policy management harder.

## Current State

| Table              | Current Policies | Expected Policies |
|--------------------|------------------|-------------------|
| teams              | 9                | 4                 |
| team_members       | 15               | 4                 |
| team_invitations   | 19               | 5                 |
| team_apiaries      | 9                | 3                 |
| apiaries           | 9                | 4                 |
| hives              | 7                | 4                 |
| queens             | 7                | 4                 |
| inspections        | 9                | 4                 |
| varroa_treatments  | 4                | 4 ✅              |
| varroa_checks      | 9                | 4                 |
| feedings           | 5                | 4                 |
| harvests           | 5                | 4                 |
| rearing_batches    | 10               | 4                 |

## Cleanup Process

### Step 1: Diagnose (Optional but Recommended)

Run the diagnostic script to see exactly what policies exist:

```bash
# In Supabase Dashboard > SQL Editor
# Run: sql/diagnose_rls_policies.sql
```

This will show you all existing policies and their definitions.

### Step 2: Run Cleanup

**⚠️ IMPORTANT: This will temporarily drop all RLS policies before re-applying the correct ones.**

```bash
# In Supabase Dashboard > SQL Editor
# Run: sql/cleanup_duplicate_rls_policies.sql
```

The script will:
1. Drop ALL existing policies on team-related tables
2. Re-apply only the correct policies
3. Show verification results
4. Display expected vs actual counts

### Step 3: Verify

After running the cleanup, you should see these policy counts:

| Table              | SELECT | INSERT | UPDATE | DELETE | Total |
|--------------------|--------|--------|--------|--------|-------|
| teams              | 1      | 1      | 1      | 1      | 4     |
| team_members       | 1      | 1      | 1      | 1      | 4     |
| team_invitations   | 1      | 1      | 2      | 1      | 5*    |
| team_apiaries      | 1      | 1      | 0      | 1      | 3     |
| apiaries           | 1      | 1      | 1      | 1      | 4     |
| hives              | 1      | 1      | 1      | 1      | 4     |
| queens             | 1      | 1      | 1      | 1      | 4     |
| inspections        | 1      | 1      | 1      | 1      | 4     |
| varroa_treatments  | 1      | 1      | 1      | 1      | 4     |
| varroa_checks      | 1      | 1      | 1      | 1      | 4     |
| feedings           | 1      | 1      | 1      | 1      | 4     |
| harvests           | 1      | 1      | 1      | 1      | 4     |
| rearing_batches    | 1      | 1      | 1      | 1      | 4     |

\* *team_invitations has 5 policies because it has 2 UPDATE policies (one for team owners, one for invitees)*

## Safety Notes

- **RLS remains enabled** throughout the process
- The cleanup script re-applies policies immediately after dropping them
- There's a brief moment where policies are dropped, but this shouldn't affect production if no requests are in flight
- All policies are recreated exactly as defined in `enable_team_rls_policies.sql`

## If Something Goes Wrong

If you need to restore RLS policies, simply re-run:

```bash
# In Supabase Dashboard > SQL Editor
# Run: sql/enable_team_rls_policies.sql
```

This will recreate all necessary policies (though it may create duplicates again if old ones still exist).

## Files

- `diagnose_rls_policies.sql` - Shows all existing policies
- `cleanup_duplicate_rls_policies.sql` - Removes duplicates and re-applies correct policies
- `enable_team_rls_policies.sql` - Original comprehensive RLS policy file

## After Cleanup

Once cleanup is complete, you can safely delete the diagnostic and cleanup scripts if desired. The only file you need to keep is `enable_team_rls_policies.sql` for reference or future database resets.
