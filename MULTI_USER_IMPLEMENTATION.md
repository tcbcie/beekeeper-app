# Multi-User Implementation Guide

## Overview
This document describes the multi-user security implementation for the Beekeeper application to ensure proper data isolation between users.

## Changes Made

### 1. Database Schema ([sql/add_user_id_multi_user_support.sql](sql/add_user_id_multi_user_support.sql))
- Added `user_id UUID` column to all user-specific tables:
  - apiaries
  - hives (already had it, but wasn't being used)
  - queens
  - inspections
  - varroa_checks
  - varroa_treatments
  - feedings
  - harvests
  - rearing_batches

- Created indexes on all `user_id` columns for performance
- Enabled Row Level Security (RLS) on all tables
- Created RLS policies for SELECT, INSERT, UPDATE, DELETE operations
- All policies check that `auth.uid() = user_id`

### 2. Authentication Utility ([src/lib/auth.ts](src/lib/auth.ts))
Created helper functions:
- `getCurrentUserId()` - Returns current user ID or null
- `requireUserId()` - Returns user ID or throws error
- `isAuthenticated()` - Checks if user is logged in

### 3. Pages Fixed

#### ✅ [src/app/dashboard/apiaries/page.tsx](src/app/dashboard/apiaries/page.tsx)
- Added userId state and router
- Get user ID on mount, redirect to login if not authenticated
- Filter all SELECT queries with `.eq('user_id', userId)`
- Add `user_id` to all INSERT operations
- Add `user_id` filter to all UPDATE and DELETE operations

#### ✅ [src/app/dashboard/hives/page.tsx](src/app/dashboard/hives/page.tsx)
- Added userId state and router
- Get user ID on mount
- Filter all hives, apiaries, queens queries with user_id
- Filter inspection queries in helper functions (getLastQueenAndEggsInfo, calculateInspectionAverages)
- Add user_id to INSERT and UPDATE operations

#### 🔄 Remaining Pages to Fix:
- [src/app/dashboard/queens/page.tsx](src/app/dashboard/queens/page.tsx)
- [src/app/dashboard/inspections/page.tsx](src/app/dashboard/inspections/page.tsx)
- [src/app/dashboard/varroa-check/page.tsx](src/app/dashboard/varroa-check/page.tsx)
- [src/app/dashboard/varroa-treatment/page.tsx](src/app/dashboard/varroa-treatment/page.tsx)
- [src/app/dashboard/feeding/page.tsx](src/app/dashboard/feeding/page.tsx)
- [src/app/dashboard/harvest/page.tsx](src/app/dashboard/harvest/page.tsx)
- [src/app/dashboard/batches/page.tsx](src/app/dashboard/batches/page.tsx)
- [src/app/dashboard/page.tsx](src/app/dashboard/page.tsx) - Dashboard stats

## Pattern for Fixing Pages

For each page, apply these changes:

### 1. Add imports
```typescript
import { getCurrentUserId } from '@/lib/auth'
import { useRouter } from 'next/navigation'
```

### 2. Add state
```typescript
const [userId, setUserId] = useState<string | null>(null)
const router = useRouter()
```

### 3. Initialize user on mount
```typescript
useEffect(() => {
  const initUser = async () => {
    const id = await getCurrentUserId()
    if (!id) {
      router.push('/login')
      return
    }
    setUserId(id)
    // Call your fetch functions with the user ID
    fetchData(id)
  }
  initUser()
}, [])
```

### 4. Update all database queries

**SELECT queries** - Add user filter:
```typescript
// Before
.from('table_name').select('*')

// After
.from('table_name').select('*').eq('user_id', userId)
```

**INSERT queries** - Add user_id:
```typescript
// Before
.insert([formData])

// After
.insert([{ ...formData, user_id: userId }])
```

**UPDATE queries** - Add user filter:
```typescript
// Before
.update(data).eq('id', id)

// After
.update(data).eq('id', id).eq('user_id', userId)
```

**DELETE queries** - Add user filter:
```typescript
// Before
.delete().eq('id', id)

// After
.delete().eq('id', id).eq('user_id', userId)
```

## Running the Migration

To apply the database changes, run the SQL migration in your Supabase dashboard:

1. Go to Supabase Dashboard → SQL Editor
2. Open [sql/add_user_id_multi_user_support.sql](sql/add_user_id_multi_user_support.sql)
3. Execute the entire script

## Testing

After implementation, test multi-user isolation:

1. Create two user accounts
2. Login as User A and create some data (hives, queens, inspections, etc.)
3. Logout and login as User B
4. Verify User B cannot see User A's data
5. Create some data as User B
6. Switch back to User A
7. Verify User A still sees only their own data

## Security Notes

- Row Level Security (RLS) enforces data isolation at the database level
- Even if frontend code is bypassed, RLS prevents unauthorized data access
- The `auth.uid()` function in PostgreSQL returns the current authenticated user's ID
- All policies use `auth.uid() = user_id` to ensure users can only access their own data

## Shared Tables

These tables remain shared across all users (no user_id):
- `dropdown_categories` - System-wide dropdown configuration
- `dropdown_values` - System-wide dropdown values

These are intentionally shared for consistent data entry across the application.
