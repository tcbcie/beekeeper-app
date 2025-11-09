# Subscription Code Types: Individual & Association

**Date:** November 8, 2025
**Feature:** Two-tier subscription code system

## Overview

The subscription system now supports two types of codes:

1. **Individual Codes** - Direct user subscriptions (existing functionality)
2. **Association Codes** - For beekeeping association members (new)

### Key Benefits

- **Associations can provide bulk codes** to their members
- **Automatic association membership** when users activate association codes
- **Centralized management** of association member subscriptions
- **Clear distinction** between individual and association subscriptions in the UI

---

## Database Changes

### Migration Script
**File:** `migrations/add_subscription_code_types.sql`

### New Enum Type
```sql
CREATE TYPE subscription_code_type AS ENUM ('individual', 'association');
```

### Changes to `registration_codes` table:

| Column | Type | Description |
|--------|------|-------------|
| `code_type` | subscription_code_type | Type of code (individual/association) |
| `association_id` | UUID (nullable) | Links to beekeeping_associations table |

**Constraint:**
- Individual codes MUST have `association_id = NULL`
- Association codes MUST have `association_id` set

### Changes to `profiles` table:

| Column | Type | Description |
|--------|------|-------------|
| `association_id` | UUID (nullable) | Beekeeping association user belongs to |
| `is_association_member` | BOOLEAN | Quick flag for association membership |

### New Function
`activate_association_subscription_code(p_user_id UUID, p_code TEXT)`
- Activates association code
- Links user to the association
- Sets `is_association_member = true`
- Adds to subscription history

---

## UI Changes

### Code Creation Form

**New Fields:**

1. **Code Type Selector** (Radio buttons)
   - Individual (default)
   - Association Member

2. **Association Dropdown** (Conditional - only shown for association codes)
   - Lists all active beekeeping associations
   - Sortedby name
   - Shows jurisdiction (NI/ROI)
   - Required for association codes

### Code List Table

**New Column:** "Type / Association"
- Individual codes: Blue badge "Individual"
- Association codes: Purple badge "Association" + association name below

### Visual Design

```
Individual Code:
┌──────────────┐
│ Individual   │  <- Blue badge
└──────────────┘

Association Code:
┌──────────────┐
│ Association  │  <- Purple badge
│ FIBKA        │  <- Association name
└──────────────┘
```

---

## User Flow

### Creating an Individual Code (Admin)

1. Go to Settings → Subscription Codes
2. Click "Create Code"
3. Select "Individual" type
4. Enter code details
5. Set expiration date
6. Save

**Result:** Standard subscription code for any user

### Creating an Association Code (Admin)

1. Go to Settings → Subscription Codes
2. Click "Create Code"
3. Select "Association Member" type
4. Select association from dropdown
5. Enter code details (e.g., "FIBKA2025")
6. Set expiration date (e.g., end of membership year)
7. Save

**Result:** Subscription code that:
- Links users to the association
- Marks them as association members
- Expires on the same date for all members

### Activating an Association Code (User)

1. User goes to Profile page
2. Enters association code (e.g., "FIBKA2025")
3. Clicks "Activate Code"

**What Happens:**
- Subscription activated with fixed expiration date
- User linked to the association
- `is_association_member` flag set to `true`
- Association shown in user profile
- Subscription history updated

---

## Example Use Cases

### Use Case 1: Annual Association Membership

**Federation of Irish Beekeepers' Associations (FIBKA)**
- Purchases 100 codes for 2025 membership
- All codes expire: 31 December 2025
- All codes linked to FIBKA association

```sql
Code: FIBKA2025
Type: Association
Association: Federation of Irish Beekeepers' Associations
Expires: 31 Dec 2025
Max Uses: 100
```

**Benefits:**
- All members get same expiration date
- Easy to track FIBKA members in database
- Bulk renewal process for 2026

### Use Case 2: Regional Association

**Galway Beekeepers Association**
- Creates code for spring intake
- Linked to Galway Beekeepers
- Expires: 30 June 2025

```sql
Code: GALWAY-SPRING
Type: Association
Association: Galway Beekeepers Association
Expires: 30 Jun 2025
Max Uses: 50
```

### Use Case 3: Individual Subscription

**Direct User Purchase**
- Not linked to any association
- Personal subscription

```sql
Code: SUMMER2025
Type: Individual
Association: None
Expires: 31 Aug 2025
Max Uses: unlimited
```

---

## Technical Implementation

### Frontend Changes

**File:** `src/app/dashboard/settings/page.tsx`

#### Updated Interface
```typescript
interface RegistrationCode {
  // ... existing fields
  code_type: 'individual' | 'association'
  association_id: string | null
  association?: {
    name: string
    jurisdiction: string
    county_area: string | null
  }
}
```

#### New State
```typescript
const [associations, setAssociations] = useState<Association[]>([])
const [newCodeData, setNewCodeData] = useState({
  code: '',
  description: '',
  max_uses: '',
  subscription_expires_at: '...',
  code_type: 'individual',  // New
  association_id: '',        // New
})
```

#### New Function
```typescript
const fetchAssociations = async () => {
  // Fetches all active associations for dropdown
}
```

### Backend Function

**Database Function:** `activate_association_subscription_code`

```sql
CREATE OR REPLACE FUNCTION activate_association_subscription_code(
  p_user_id UUID,
  p_code TEXT
)
RETURNS TABLE (
  success BOOLEAN,
  message TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  association_name TEXT
)
```

**Features:**
- Validates code is association type
- Checks code is active and not maxed out
- Links user to association
- Sets `is_association_member = true`
- Updates usage count
- Adds to subscription history

---

## Database Queries

### Get All Association Members
```sql
SELECT
  p.id,
  p.email,
  p.full_name,
  ba.name as association,
  ba.jurisdiction,
  p.subscription_expires_at
FROM profiles p
JOIN beekeeping_associations ba ON ba.id = p.association_id
WHERE p.is_association_member = true
  AND p.subscription_expires_at > NOW()
ORDER BY ba.name, p.full_name;
```

### Get Association Code Usage
```sql
SELECT
  rc.code,
  ba.name as association,
  rc.current_uses,
  rc.max_uses,
  rc.subscription_expires_at,
  COUNT(sh.id) as total_activations
FROM registration_codes rc
JOIN beekeeping_associations ba ON ba.id = rc.association_id
LEFT JOIN subscription_history sh ON sh.code_id = rc.id
WHERE rc.code_type = 'association'
GROUP BY rc.id, ba.name
ORDER BY ba.name;
```

### Get Members by Association
```sql
SELECT
  ba.name,
  COUNT(p.id) as member_count,
  COUNT(p.id) FILTER (WHERE p.subscription_expires_at > NOW()) as active_members
FROM beekeeping_associations ba
LEFT JOIN profiles p ON p.association_id = ba.id
GROUP BY ba.id, ba.name
ORDER BY member_count DESC;
```

---

## Migration Steps

1. **Run database migration:**
   ```sql
   -- In Supabase SQL Editor:
   migrations/add_subscription_code_types.sql
   ```

2. **Verify migration:**
   ```sql
   -- Check enum created
   SELECT unnest(enum_range(NULL::subscription_code_type));

   -- Check columns added
   SELECT column_name, data_type
   FROM information_schema.columns
   WHERE table_name = 'registration_codes'
     AND column_name IN ('code_type', 'association_id');
   ```

3. **Test code creation:**
   - Create test individual code
   - Create test association code
   - Verify validation works (association code requires association)

4. **Test code activation:**
   - Activate association code as user
   - Verify association link created
   - Check `is_association_member` flag set

---

## Benefits Summary

### For Administrators
- ✅ Easy bulk code management for associations
- ✅ Clear distinction between code types
- ✅ Track association membership automatically
- ✅ Association-specific reporting capabilities

### For Associations
- ✅ Provide codes to all members
- ✅ All members expire on same date (renewal cycle)
- ✅ Track member count easily
- ✅ Bulk renewal process

### For Users
- ✅ Automatic association membership
- ✅ Clear indication of association affiliation
- ✅ Same benefits as individual subscriptions
- ✅ Association shown in profile

---

## Future Enhancements

Potential future features:

1. **Association Admin Role**
   - Allow association admins to create their own codes
   - View their own member list
   - Generate reports

2. **Association-Specific Features**
   - Association-only content/resources
   - Member directory
   - Association events calendar

3. **Bulk Operations**
   - Bulk code generation for associations
   - Bulk expiration updates
   - Mass email to association members

4. **Analytics**
   - Association membership trends
   - Code usage statistics
   - Geographic distribution of members

---

## Testing Checklist

- [ ] Run database migration successfully
- [ ] Create individual code via UI
- [ ] Create association code via UI
- [ ] Verify association dropdown loads
- [ ] Verify validation (association code requires association)
- [ ] Activate individual code as user
- [ ] Activate association code as user
- [ ] Verify association link created in profile
- [ ] Verify `is_association_member` flag set
- [ ] View code list - check badges display correctly
- [ ] Export database - verify new columns included

---

## Support

### Common Issues

**Q: Association dropdown is empty**
A: Check that beekeeping_associations table has active associations (`is_active = true`)

**Q: Can't create association code**
A: Ensure an association is selected from the dropdown

**Q: User not showing as association member after activation**
A: Check that `activate_association_subscription_code` function executed successfully

**Q: Old codes don't show type**
A: Run migration - existing codes default to 'individual' type

---

## Summary

The dual subscription code system provides:
- Clear separation between individual and association codes
- Automatic association membership management
- Improved tracking and reporting capabilities
- Foundation for association-specific features

All existing functionality is preserved - this is purely additive!
