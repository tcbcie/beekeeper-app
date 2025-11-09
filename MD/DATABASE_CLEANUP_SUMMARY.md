# Database Schema Cleanup - November 8, 2025

## Overview
This cleanup removed 6 unused columns from the `registration_codes` table to simplify the schema and eliminate confusion.

## Removed Columns

### 1. `code_expires_at` (timestamp)
- **Reason**: Not used in application code
- **Only reference**: Archived SQL file (`sql/Archive/create_time_based_subscription_system.sql`)
- **Impact**: None - column was never queried or updated

### 2. `issued_by_association_id` (UUID, foreign key)
- **Reason**: Superseded by `association_id` column
- **Only reference**: Archived SQL file
- **Impact**: None - newer `association_id` column serves this purpose
- **Also removed**: Foreign key constraint `registration_codes_issued_by_association_id_fkey`

### 3. `issued_by_name` (text)
- **Reason**: Not used in application code
- **Only reference**: Archived SQL file
- **Impact**: None - association name retrieved via join when needed

### 4. `price` (numeric)
- **Reason**: Pricing is hardcoded in Stripe API routes, not database-driven
- **Only reference**: Archived SQL file
- **Current pricing**:
  - Individual codes: Free (€0)
  - Card payment: €24
  - Association code: €12
- **Impact**: None - pricing logic remains in [api/stripe/checkout/route.ts](../src/app/api/stripe/checkout/route.ts)

### 5. `subscription_type` (text with check constraint)
- **Reason**: Column exists with constraint but not actively used in application
- **Only reference**: Test file (`api/stripe/test-activation/route.ts`)
- **Constraint removed**: `registration_codes_subscription_type_check`
- **Impact**: None - subscription type tracked via `code_type` enum instead

### 6. `expires_at` (timestamp)
- **Reason**: Redundant with `subscription_expires_at`
- **Usage pattern**: Always set to 100 years in future (effectively unused)
- **Impact**: None - `subscription_expires_at` is the actual expiry date used

## Remaining Schema

After cleanup, `registration_codes` retains these essential columns:

### Core Fields
- `id` (UUID, primary key)
- `code` (varchar, unique)
- `description` (text, nullable)

### Usage Tracking
- `is_active` (boolean)
- `max_uses` (integer, nullable)
- `current_uses` (integer)

### Subscription Information
- `subscription_expires_at` (timestamp) - When user's subscription expires

### Code Types & Association
- `code_type` (enum: 'individual' | 'association')
- `association_id` (UUID, foreign key to `beekeeping_associations`)

### Audit Trail
- `created_by` (UUID, foreign key to `auth.users`)
- `created_at` (timestamp)
- `updated_at` (timestamp)

## Code Changes

### TypeScript Interface Updated
**File**: [src/app/dashboard/settings/page.tsx](../src/app/dashboard/settings/page.tsx)

```typescript
interface RegistrationCode {
  id: string
  code: string
  description: string | null
  created_by: string | null
  created_at: string
  is_active: boolean
  max_uses: number | null
  current_uses: number
  updated_at: string
  subscription_expires_at: string
  code_type: 'individual' | 'association'
  association_id: string | null
  association?: {
    name: string
    jurisdiction: string
    county_area: string | null
  }
}
```

**Removed**: `expires_at` field

### Code Creation Updated
**Removed**: `expires_at` field from insert statement
**Removed**: `farFutureDate` calculation (100 years in future)

**Before**:
```typescript
const farFutureDate = new Date()
farFutureDate.setFullYear(farFutureDate.getFullYear() + 100)

const { error } = await supabase
  .from('registration_codes')
  .insert([{
    code: newCodeData.code.toUpperCase().trim(),
    expires_at: farFutureDate.toISOString(),  // REMOVED
    subscription_expires_at: subscriptionExpiryDate.toISOString(),
    // ...
  }])
```

**After**:
```typescript
const { error } = await supabase
  .from('registration_codes')
  .insert([{
    code: newCodeData.code.toUpperCase().trim(),
    subscription_expires_at: subscriptionExpiryDate.toISOString(),
    // ...
  }])
```

## Migration File

**Location**: [migrations/cleanup_unused_columns.sql](../migrations/cleanup_unused_columns.sql)

The migration includes:
- Idempotent column drops (checks if column exists first)
- Constraint removal before column drops
- Verification queries
- Detailed logging

## Testing

- TypeScript compilation: ✅ No errors
- Code creation flow: Uses correct columns
- Code editing flow: Uses correct columns
- Association code validation: Uses correct columns

## Benefits

1. **Simpler schema** - Easier to understand and maintain
2. **Less confusion** - Removed redundant/duplicate fields
3. **Cleaner queries** - No need to set unused fields
4. **Better documentation** - Remaining columns all have clear purposes
5. **Reduced storage** - Minor space savings per row

## Related Files

- Migration: [migrations/cleanup_unused_columns.sql](../migrations/cleanup_unused_columns.sql)
- Settings page: [src/app/dashboard/settings/page.tsx](../src/app/dashboard/settings/page.tsx)
- Stripe checkout: [src/app/api/stripe/checkout/route.ts](../src/app/api/stripe/checkout/route.ts)
- Subscription types: [src/types/subscription.ts](../src/types/subscription.ts)

## Notes

- All removed columns were either:
  - Never used in application code
  - Only referenced in archived SQL files
  - Redundant/duplicate functionality
- No data loss - columns were either empty or contained unused data
- No breaking changes - application doesn't reference these columns
- Foreign key constraints properly removed before column drops
