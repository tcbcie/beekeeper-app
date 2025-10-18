# Quick Start: Fix "Cannot Save Record" Issue

If you're getting an error when trying to save varroa records, follow these steps:

## Step 1: Check if Tables Exist

Go to Supabase Dashboard → Table Editor and check if these tables exist:
- `varroa_treatments`
- `varroa_checks`

**If they DON'T exist:**
→ Run `sql/create_varroa_tables.sql` in Supabase SQL Editor

## Step 2: Disable RLS (Temporary - For Testing)

If the tables exist but you still can't save, RLS might be blocking you.

**Quick Fix (Development Only):**
→ Run `sql/disable_rls_for_testing.sql` in Supabase SQL Editor

This will let you save records immediately while you set up proper security.

## Step 3: Verify It Works

Try saving a varroa check or treatment record. It should work now!

## Step 4: Enable RLS (Production Setup)

Once you've confirmed it works, set up proper security:

### 4a. Find Your User ID
Run this in Supabase SQL Editor:
```sql
SELECT id, email FROM auth.users;
```
Copy your user UUID.

### 4b. Update Hives
Replace `YOUR-USER-UUID-HERE` with your actual UUID and run:
```sql
UPDATE hives SET user_id = 'YOUR-USER-UUID-HERE' WHERE user_id IS NULL;
```

### 4c. Enable RLS
Run `sql/enable_rls_for_varroa.sql` in Supabase SQL Editor

### 4d. Test Again
Try saving a record - it should still work, but now with security!

---

## Troubleshooting

### Error: "relation does not exist"
→ The tables aren't created yet. Run `sql/create_varroa_tables.sql`

### Error: "row-level security policy"
→ RLS is enabled but hives don't have user_id. Run Step 4b above.

### Error: "column user_id does not exist"
→ Run `sql/enable_rls_for_varroa.sql` which will add the column

### Still having issues?
1. Check browser console (F12) for detailed error logs
2. Check Supabase logs: Dashboard → Logs → Postgres Logs
3. Make sure you're logged in to your app

---

## Summary of Files

- **create_varroa_tables.sql** - Creates the tables (run first)
- **disable_rls_for_testing.sql** - Quick fix to test without security
- **enable_rls_for_varroa.sql** - Sets up proper security
- **assign_hives_to_user.sql** - Helper to assign hives to users
- **README.md** - Full documentation
- **QUICKSTART.md** - This file (quick fixes)
