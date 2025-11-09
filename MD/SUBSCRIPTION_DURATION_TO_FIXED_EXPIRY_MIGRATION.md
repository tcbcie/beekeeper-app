# Subscription System Redesign: Duration to Fixed Expiration Date

**Date:** November 8, 2025
**Migration:** Replaced `subscription_duration_days` with `subscription_expires_at`

## Overview

The subscription code system has been redesigned to use **fixed expiration dates** instead of durations. This simplifies the system and makes subscription management more predictable.

### Previous System (Duration-Based)
- Codes had a `subscription_duration_days` field (e.g., 365 days)
- When activated, duration was added to current date
- Different users activating the same code got different expiration dates
- Lifetime codes used `duration_days = 0` as a special value

### New System (Fixed Expiration)
- Codes have a `subscription_expires_at` field (e.g., 2026-12-31)
- ALL users activating a code get the SAME expiration date
- Simpler logic, more predictable for bulk codes
- Lifetime codes use a date 100 years in the future

---

## Database Changes

### Migration Script
**File:** `migrations/remove_subscription_duration_add_fixed_expiry.sql`

#### Changes to `registration_codes` table:
1. **Added:** `subscription_expires_at` TIMESTAMP WITH TIME ZONE
2. **Removed:** `subscription_duration_days` INTEGER
3. **Migration logic:**
   - Lifetime codes (duration = 0) → expires 100 years from now
   - Regular codes → expires `NOW() + duration_days`

#### Changes to `subscription_history` table:
1. **Removed:** `duration_days` INTEGER (redundant with `expires_at`)

### To Run Migration:
```sql
-- In Supabase SQL Editor
-- Run: migrations/remove_subscription_duration_add_fixed_expiry.sql
```

---

## Code Changes

### 1. TypeScript Types

**File:** `src/types/subscription.ts`

**Removed:**
```typescript
export interface SubscriptionHistoryItem {
  duration_days: number  // ❌ Removed
}

export interface ActivateSubscriptionResponse {
  duration_days?: number  // ❌ Removed
}
```

### 2. Settings Page (Admin UI)

**File:** `src/app/dashboard/settings/page.tsx`

#### Interface Update:
```typescript
interface RegistrationCode {
  // subscription_duration_days: number  // ❌ Removed
  subscription_expires_at: string        // ✅ Added
}
```

#### State Update:
```typescript
const [newCodeData, setNewCodeData] = useState({
  code: '',
  description: '',
  max_uses: '',
  // OLD: subscription_duration_days: '365'
  subscription_expires_at: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0]  // Default: 1 year from now
})
```

#### Code Creation:
```typescript
const subscriptionExpiryDate = new Date(newCodeData.subscription_expires_at)
subscriptionExpiryDate.setHours(23, 59, 59, 999)  // End of day

await supabase.from('registration_codes').insert([{
  code: newCodeData.code.toUpperCase().trim(),
  subscription_expires_at: subscriptionExpiryDate.toISOString(),  // ✅ New field
  // ... other fields
}])
```

#### Table Display:
- **Before:** Showed "365 days (1 year)"
- **After:** Shows actual expiration date "31 Dec 2026 (in 418 days)"
- Lifetime codes show "Lifetime (Never expires)"

#### Form UI:
**Replaced dropdown with date picker + quick buttons:**

```typescript
<input
  type="date"
  value={newCodeData.subscription_expires_at}
  min={new Date().toISOString().split('T')[0]}
  // ... handlers
/>

// Quick action buttons:
<button onClick={() => /* +1 month */}>+1 month</button>
<button onClick={() => /* +6 months */}>+6 months</button>
<button onClick={() => /* +1 year */}>+1 year</button>
<button onClick={() => /* +100 years */}>Lifetime</button>
```

### 3. RenewSubscriptionModal

**File:** `src/components/RenewSubscriptionModal.tsx`

**Removed display of duration:**
```typescript
// ❌ Removed:
<div className="flex justify-between text-sm">
  <span>Duration added:</span>
  <span>{success.duration_days} days</span>
</div>
```

### 4. SubscriptionHistoryTable

**File:** `src/components/SubscriptionHistoryTable.tsx`

**Removed "Duration" column:**
- Table now shows: Code | Activated | Expires | Status
- Removed: Duration column (redundant with expiration date)

---

## Benefits of Fixed Expiration

### 1. Simplified Association Codes
When an association purchases codes for their members:
- **Before:** Members activating at different times got different expiration dates
- **After:** ALL members get the same expiration date (e.g., end of membership year)

Example:
```
Association buys 100 codes for 2025 membership year
Code expires: 31 December 2025

Member 1 activates: 1 January 2025  → expires 31 Dec 2025
Member 2 activates: 15 June 2025    → expires 31 Dec 2025  ✅ Same!
Member 3 activates: 20 December 2025 → expires 31 Dec 2025
```

### 2. Easier Bulk Management
- Create codes that expire on specific dates (e.g., end of year, end of season)
- Easier to track and manage code batches
- More predictable for billing and renewals

### 3. Clearer Communication
- Users know exact date their subscription expires
- No confusion about "how many days from activation"
- Transparent and straightforward

---

## Admin Workflow

### Creating a Subscription Code

1. Go to Settings → Subscription Codes
2. Click "Create Code"
3. Fill in:
   - **Code:** e.g., "SPRING2026"
   - **Description:** e.g., "Spring 2026 Member Codes"
   - **Max Uses:** 50 (or leave empty for unlimited)
   - **Expiration Date:** Select date or use quick buttons
     - +1 month
     - +6 months
     - +1 year
     - Lifetime (100 years)
4. Click "Create Code"

### Example Code Configurations

#### Annual Membership (Calendar Year):
- Expiration: 31 December 2025
- Description: "2025 Annual Membership"
- All members get subscription until end of year

#### Event Access (Fixed Duration):
- Expiration: 30 June 2025
- Description: "Spring Conference Attendees"
- All attendees get access for event period

#### Lifetime Access:
- Expiration: 2125-01-01 (100 years from now)
- Description: "Lifetime Members"
- Effectively never expires

---

## Migration Checklist

- [x] Create database migration script
- [x] Update TypeScript interfaces
- [x] Update Settings page UI (form and table)
- [x] Update RenewSubscriptionModal
- [x] Update SubscriptionHistoryTable
- [x] Update export functions to handle new schema
- [ ] **Run database migration** (in Supabase SQL Editor)
- [ ] Test code creation with new UI
- [ ] Test code activation
- [ ] Verify existing codes migrated correctly

---

## Testing

### After Running Migration:

1. **Verify existing codes:**
```sql
SELECT
  code,
  description,
  subscription_expires_at,
  CASE
    WHEN subscription_expires_at > NOW() + INTERVAL '50 years' THEN 'Lifetime'
    ELSE TO_CHAR(subscription_expires_at, 'YYYY-MM-DD')
  END as expiry_type
FROM registration_codes
ORDER BY subscription_expires_at DESC;
```

2. **Create test code:**
   - Go to Settings → Subscription Codes
   - Create code with expiration 1 month from now
   - Verify it appears correctly in table

3. **Activate test code:**
   - Use code in Profile page
   - Verify expiration date matches code's `subscription_expires_at`
   - Check subscription history shows correct expiration

---

## Rollback Plan

If issues arise, rollback is possible:

1. **Database rollback:**
```sql
-- Re-add duration_days column
ALTER TABLE registration_codes ADD COLUMN subscription_duration_days INTEGER DEFAULT 365;

-- Calculate duration from expiration
UPDATE registration_codes
SET subscription_duration_days = EXTRACT(DAY FROM (subscription_expires_at - NOW()));

-- Remove new column
ALTER TABLE registration_codes DROP COLUMN subscription_expires_at;
```

2. **Code rollback:** Revert commits for the UI changes

However, **forward migration is recommended** as the new system is simpler and more flexible.

---

## Notes

- Existing subscription_history records maintain their `expires_at` dates (unchanged)
- Code expiration (`expires_at`) vs subscription expiration (`subscription_expires_at`) are different:
  - `expires_at`: When the CODE itself expires (can't be used)
  - `subscription_expires_at`: When subscriptions activated with this code will expire
- Lifetime codes use year 2125 as a practical "never expires" marker
- The migration preserves all existing data and converts durations to fixed dates

---

## Support

If you encounter issues after migration:

1. Check migration script output for errors
2. Verify all existing codes have `subscription_expires_at` set
3. Test code creation and activation in staging first
4. Contact development team if database inconsistencies occur
