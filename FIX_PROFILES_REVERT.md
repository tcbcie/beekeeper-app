# Revert Changes - Use full_name from profiles table

The actual `profiles` table structure is:
- id
- email
- full_name (NOT first_name/last_name)
- role
- created_at

Need to revert all 5 pages to use `full_name` instead of `first_name` and `last_name`.

## Changes needed in each file:

### Interface:
```typescript
profiles?: {
  full_name: string | null
  email: string
}
```

### Assignment in fallback:
```typescript
inspection.profiles = {
  full_name: profile.full_name,
  email: profile.email
}
```

### Display logic:
```typescript
{inspection.profiles.full_name || inspection.profiles.email}
```

## Files to update:
1. src/app/dashboard/inspections/page.tsx
2. src/app/dashboard/varroa-treatment/page.tsx
3. src/app/dashboard/varroa-check/page.tsx
4. src/app/dashboard/feeding/page.tsx
5. src/app/dashboard/harvest/page.tsx
