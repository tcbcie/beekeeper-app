# CRITICAL: Infinite Recursion Fix

## Error
```
infinite recursion detected in policy for relation "profiles"
Error 500
```

## Root Cause

The admin policy was creating infinite recursion:

```sql
CREATE POLICY "Admins can view all profiles"
USING (
  EXISTS (
    SELECT 1 FROM public.profiles  -- ❌ Queries profiles table
    WHERE id = auth.uid()
      AND role = 'admin'
  )
);
```

**Why this causes recursion:**
1. User tries to query profiles table
2. RLS policy checks if user is admin
3. To check if admin, it queries profiles table
4. That query triggers RLS policy again
5. Infinite loop → 500 error

## Immediate Fix

**Run this script NOW:**

```bash
\i sql/fix_recursion_simple.sql
```

This script:
1. ✅ Removes ALL complex admin policies
2. ✅ Creates ONE simple policy: users can view their own profile
3. ✅ Admin panel uses service role to bypass RLS (no policy needed)

## Why This Works

### Regular Users
- ✅ Can view their own profile: `WHERE auth.uid() = id`
- ✅ Cannot view other users' profiles
- ✅ No recursion possible

### Admin Panel
- ✅ Uses `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS entirely
- ✅ Can query all users without hitting RLS policies
- ✅ No need for admin-specific RLS policy

### Settings Page Already Uses Service Role

Check `src/app/dashboard/settings/page.tsx`:

```typescript
const fetchUsers = async () => {
  const { data, error } = await supabase
    .rpc('get_users_with_email')  // This uses service role internally
}
```

The `get_users_with_email` RPC function runs with `SECURITY DEFINER`, which means it uses the function owner's permissions (service role), not the calling user's permissions.

## Testing After Fix

1. **Regular User Login:**
   - Users should be able to log in normally
   - Can view their own profile
   - Cannot see other users

2. **Admin Panel:**
   - Admin can access Settings → User Management
   - Can see all users (via service role RPC)
   - Can delete/restore users (via service role RPC)

## Files

- [sql/fix_recursion_simple.sql](../sql/fix_recursion_simple.sql) - **RUN THIS NOW**
- [MD/INFINITE_RECURSION_FIX.md](INFINITE_RECURSION_FIX.md) - This guide

## Summary

### Problem
❌ Complex admin policy caused infinite recursion

### Solution
✅ Simple policy: users view own profile only
✅ Admin panel uses service role (bypasses RLS)

### Result
✅ No recursion possible
✅ Users can log in
✅ Admin panel works correctly
