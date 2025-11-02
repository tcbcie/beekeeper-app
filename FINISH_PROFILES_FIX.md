# Complete Fix for user_profiles Issue

## Problem
The table is called `user_profiles` (not `profiles`) and has columns `first_name`, `last_name` (not `full_name`, `email`).

## What's Been Done
✅ Fixed SQL migration: `sql/add_foreign_keys_for_profiles.sql` - now uses `user_profiles`
✅ Fixed inspections page completely
✅ Partially fixed other pages (queries updated via sed)

## What Still Needs to Be Done

For each of these files, update the TypeScript interfaces and display code:
1. `src/app/dashboard/varroa-treatment/page.tsx`
2. `src/app/dashboard/varroa-check/page.tsx`
3. `src/app/dashboard/feeding/page.tsx`
4. `src/app/dashboard/harvest/page.tsx`

### Changes Needed in Each File:

#### 1. Update Interface
Change:
```typescript
profiles?: {
  full_name: string
  email: string
}
```

To:
```typescript
user_profiles?: {
  first_name: string
  last_name: string
}
```

#### 2. Update Fallback Check
Change:
```typescript
if (data[0] && !data[0].profiles) {
```

To:
```typescript
if (data[0] && !data[0].user_profiles) {
```

#### 3. Update Assignment
Change:
```typescript
treatment.profiles = {
  full_name: profile.full_name,
  email: profile.email
}
```

To:
```typescript
treatment.user_profiles = {
  first_name: profile.first_name,
  last_name: profile.last_name
}
```

#### 4. Update Display
Change:
```typescript
{treatment.profiles && (
  <p className="text-xs text-gray-500 mt-1">
    Recorded by: <span className="font-medium text-gray-700">
      {treatment.profiles.full_name || treatment.profiles.email}
    </span>
  </p>
)}
```

To:
```typescript
{treatment.user_profiles && (
  <p className="text-xs text-gray-500 mt-1">
    Recorded by: <span className="font-medium text-gray-700">
      {`${treatment.user_profiles.first_name || ''} ${treatment.user_profiles.last_name || ''}`.trim() || 'User'}
    </span>
  </p>
)}
```

## After Code Changes

1. Run this SQL in Supabase: `sql/add_foreign_keys_for_profiles.sql`
2. Run this SQL in Supabase: `sql/add_rls_policies_for_team_inspections.sql`
3. Refresh the app and check browser console for logs
4. "Recorded by" should now show for all users!
