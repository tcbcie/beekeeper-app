# Correct Approach: RLS and Admin Functions

## Summary
This document explains the correct architecture for Row Level Security (RLS) and admin functions in PostgreSQL/Supabase.

## The Problem We Encountered

When we added the transaction ID feature, we:
1. Dropped and recreated `get_users_with_email()` function
2. Changed the return type (added `latest_transaction_id` column)
3. Lost permissions and RLS configuration
4. Created circular dependency issues with admin policies

## The Complete and Correct Approach

### 1. Database Function Design

**File:** `sql/simplify_get_users_function.sql`

**Key Principles:**
- Use `LANGUAGE sql` instead of `LANGUAGE plpgsql` for simpler queries
- Use `SECURITY DEFINER` to allow the function to access auth.users table
- Grant execute permissions to all necessary roles
- Return all columns needed by the frontend

**Why `LANGUAGE sql`?**
- Simpler execution model
- PostgreSQL can optimize better
- Less chance of security issues
- Works better with SECURITY DEFINER

**Function Structure:**
```sql
CREATE OR REPLACE FUNCTION public.get_users_with_email()
RETURNS TABLE (...)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT ...
  FROM public.profiles p
  LEFT JOIN auth.users au ON p.id = au.id
  ...
$$;
```

### 2. Row Level Security (RLS) Policies

**File:** `sql/re_enable_rls_properly.sql`

**Key Principles:**
- Keep policies simple to avoid circular dependencies
- Use `LIMIT 1` in subqueries to optimize performance
- Separate policies for different operations (SELECT, UPDATE, etc.)
- Admin checks should use simple subqueries

**Policy Structure:**

#### Policy 1: Users View Own Profile
```sql
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);
```
**Why:** Every user needs to see their own profile first.

#### Policy 2: Admins View All Profiles
```sql
CREATE POLICY "Admins can view all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1) = 'Admin'
  );
```
**Why:**
- Uses LIMIT 1 for performance
- Simple subquery that PostgreSQL can optimize
- No circular dependency because Policy 1 already allows seeing own profile

#### Policy 3: Users Update Own Profile (Not Role)
```sql
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );
```
**Why:** Prevents users from changing their own role.

#### Policy 4: Admins Update Any Profile
```sql
CREATE POLICY "Admins can update any profile"
  ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1) = 'Admin'
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = auth.uid() LIMIT 1) = 'Admin'
  );
```
**Why:** Allows admins to change any user's profile including roles.

### 3. Permissions and Grants

**Key Principles:**
- Grant EXECUTE on functions to all necessary roles
- Set function OWNER to postgres
- Grant USAGE on auth schema if needed

**Grants:**
```sql
GRANT EXECUTE ON FUNCTION public.get_users_with_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_users_with_email() TO service_role;
ALTER FUNCTION public.get_users_with_email() OWNER TO postgres;
```

### 4. Security Architecture

**How It All Works Together:**

1. **User logs in** → Gets auth.uid()
2. **Frontend calls** `supabase.rpc('get_users_with_email')`
3. **Function executes** with SECURITY DEFINER → Can access auth.users
4. **RLS policies check:**
   - Is user viewing their own profile? ✅ Allow
   - Is user an admin? ✅ Allow all profiles
5. **Function returns** data to frontend
6. **Frontend displays** user management table

**Why SECURITY DEFINER?**
- Function runs with the permissions of the function owner (postgres)
- Can access auth.users table which regular users cannot
- Still respects RLS policies for additional security
- Allows admin functions to work without giving users direct database access

### 5. What NOT To Do

❌ **Don't use EXISTS subqueries in policy USING clauses that reference the same table**
```sql
-- BAD - Circular dependency
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'Admin'
  )
)
```

❌ **Don't use complex OR logic in single policies**
```sql
-- BAD - Hard to debug and optimize
USING (
  auth.uid() = id
  OR
  (SELECT role FROM ...) = 'Admin'
)
```

❌ **Don't use LANGUAGE plpgsql for simple queries**
```sql
-- UNNECESSARY
LANGUAGE plpgsql
BEGIN
  RETURN QUERY SELECT ...;
END;
```

❌ **Don't forget to grant permissions after recreating functions**
```sql
-- REQUIRED after DROP FUNCTION
GRANT EXECUTE ON FUNCTION ... TO authenticated;
```

### 6. Troubleshooting Guide

#### Problem: "Failed to fetch users"
**Cause:** Function doesn't have EXECUTE permissions
**Fix:** Run grants script
```sql
GRANT EXECUTE ON FUNCTION public.get_users_with_email() TO authenticated;
```

#### Problem: "Account has been deactivated"
**Cause:** RLS policy has circular dependency
**Fix:** Temporarily disable RLS, then re-enable with simple policies
```sql
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;
-- Fix policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
```

#### Problem: "Column does not exist"
**Cause:** Function return type doesn't match actual table columns
**Fix:** Check table schema and adjust function
```sql
-- If column doesn't exist, use an alias
SELECT created_at AS updated_at
```

#### Problem: Admin can't change user roles
**Cause:** Missing or incorrect UPDATE policy for admins
**Fix:** Create admin UPDATE policy with both USING and WITH CHECK

### 7. Testing Checklist

After applying RLS and function changes:

- [ ] Can log in as admin
- [ ] Can access dashboard
- [ ] User management page loads
- [ ] Can see list of users
- [ ] Can change user roles (as admin)
- [ ] Cannot change own role (as admin)
- [ ] Regular users can only see their own profile
- [ ] Transaction IDs display for credit card users
- [ ] Subscription history tab works

### 8. Migration Path

If you need to update the function in the future:

1. **Create new script** with DROP and CREATE
2. **Include all grants** in the same script
3. **Test in development** first
4. **Run during low-traffic** time
5. **Have rollback script** ready

**Example:**
```sql
-- Migration script
DROP FUNCTION IF EXISTS public.get_users_with_email();
CREATE OR REPLACE FUNCTION public.get_users_with_email() ...;
GRANT EXECUTE ON FUNCTION public.get_users_with_email() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_users_with_email() TO service_role;
ALTER FUNCTION public.get_users_with_email() OWNER TO postgres;
```

### 9. Files Created

**SQL Scripts (Run in order):**
1. `sql/fix_admin_update_user_role.sql` - Fixes role change permissions
2. `sql/simplify_get_users_function.sql` - Creates working function with transaction ID
3. `sql/re_enable_rls_properly.sql` - Re-enables RLS with proper policies

**Documentation:**
1. `TRANSACTION_ID_AND_HISTORY_FEATURES.md` - Feature documentation
2. `CORRECT_APPROACH_RLS_AND_ADMIN_FUNCTIONS.md` - This file

**Diagnostic Tools:**
1. `sql/diagnose_get_users_issue.sql` - Check function and permissions
2. `sql/check_your_account.sql` - View account details

**Emergency Fixes (if needed):**
1. `sql/temporarily_disable_rls.sql` - Emergency access restore
2. `sql/emergency_fix_admin_access.sql` - Reset policies

### 10. Production Deployment

**Before deployment:**
1. Test all SQL scripts in development
2. Backup production database
3. Document current RLS policies
4. Prepare rollback scripts

**Deployment steps:**
1. Run `sql/simplify_get_users_function.sql`
2. Test user management page
3. If working, run `sql/re_enable_rls_properly.sql` (if RLS was disabled)
4. Test again
5. Monitor for errors

**Rollback plan:**
If issues occur, you have two options:
- Quick: Run `sql/temporarily_disable_rls.sql` to restore access
- Proper: Restore from backup

### 11. Key Takeaways

✅ **Use LANGUAGE sql for simple query functions**
✅ **Use SECURITY DEFINER to access auth.users**
✅ **Keep RLS policies simple with LIMIT 1**
✅ **Separate policies for different operations**
✅ **Always grant permissions after creating functions**
✅ **Test thoroughly before deploying**

❌ **Avoid circular dependencies in RLS policies**
❌ **Don't use complex subqueries in USING clauses**
❌ **Don't forget to set function owner**
❌ **Don't skip testing with actual user accounts**

## Summary

The correct approach combines:
1. Simple `LANGUAGE sql` functions with `SECURITY DEFINER`
2. Multiple simple RLS policies instead of complex ones
3. Proper permissions and ownership
4. Thorough testing and rollback plans

This architecture provides:
- **Security**: RLS enforces access control
- **Functionality**: Admins can manage users
- **Performance**: Simple policies optimize better
- **Maintainability**: Easy to understand and modify
