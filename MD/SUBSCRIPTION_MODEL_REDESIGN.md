# Subscription Model Redesign - v1.0.36

## Overview

Redesigning the subscription system to support two distinct subscription models:

### Model 1: Credit Card Subscriptions (Direct Payment)
- **Duration**: Fixed 12 months
- **Payment**: Paid in advance via credit card
- **Pricing**:
  - €12/year for members of Irish Beekeeping associations
  - €24/year for non-members
- **Expiry**: Calculated from activation date + 12 months

### Model 2: Association Code-Based Subscriptions (Time-Limited Codes)
- **Duration**: Variable, based on club membership period
- **Payment**: Code issued by beekeeping clubs/associations (external)
- **Expiry**: Codes have their own expiration date (set when created)
- **Behavior**: When user activates code, their subscription expires when the CODE expires (not activation date + duration)
- **Use Case**: Linked to club membership subscriptions (typically 1 year)

---

## Current System Issues

### Problems with Current Implementation:

1. **Duration-Based Logic**:
   ```sql
   -- Current: Adds duration to activation date
   subscription_expires_at = NOW() + duration_days
   ```
   ❌ Doesn't work for association codes that have fixed expiration dates

2. **No Code Expiration**:
   - Codes themselves don't expire
   - Only track `subscription_duration_days`
   - Cannot represent "this code expires on 31 Dec 2025"

3. **No Subscription Type Tracking**:
   - Cannot distinguish between credit card vs code-based subscriptions
   - Cannot apply different pricing logic

---

## New Schema Design

### 1. Update `registration_codes` Table

Add fields to support time-based expiration:

```sql
ALTER TABLE public.registration_codes
ADD COLUMN code_expires_at TIMESTAMPTZ,
ADD COLUMN subscription_type TEXT DEFAULT 'code' CHECK (subscription_type IN ('code', 'credit_card')),
ADD COLUMN issued_by TEXT,  -- Association/club name
ADD COLUMN association_id UUID REFERENCES associations(id);  -- If we have associations table

-- For backwards compatibility:
-- - If code_expires_at IS NULL: use old duration-based logic
-- - If code_expires_at IS NOT NULL: use time-based logic
```

### 2. Update `profiles` Table

Add subscription type tracking:

```sql
ALTER TABLE public.profiles
ADD COLUMN subscription_type TEXT CHECK (subscription_type IN ('code', 'credit_card', 'none')),
ADD COLUMN subscription_price NUMERIC(10,2),  -- Track what they paid
ADD COLUMN is_association_member BOOLEAN DEFAULT false;  -- For pricing
```

### 3. Update `subscription_history` Table

Track subscription type and pricing:

```sql
ALTER TABLE public.subscription_history
ADD COLUMN subscription_type TEXT,
ADD COLUMN price_paid NUMERIC(10,2),
ADD COLUMN code_expires_at TIMESTAMPTZ;  -- For time-based codes
```

---

## Code Types Comparison

| Feature | Duration-Based Codes (Old) | Time-Based Codes (New) |
|---------|---------------------------|------------------------|
| **Created By** | Admin | Beekeeping Associations |
| **Expiration Logic** | `activated_at + duration_days` | `code.code_expires_at` |
| **Duration Field** | `subscription_duration_days` | Not used (NULL) |
| **Expiry Field** | Not used (NULL) | `code_expires_at` |
| **Use Case** | Individual purchases | Club memberships |
| **Example** | "365 days from activation" | "Valid until 31 Dec 2025" |

---

## Implementation Plan

### Phase 1: Database Schema Updates

**File**: `sql/add_time_based_subscriptions.sql`

```sql
-- Add new columns to registration_codes
ALTER TABLE public.registration_codes
ADD COLUMN IF NOT EXISTS code_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS subscription_type TEXT DEFAULT 'code',
ADD COLUMN IF NOT EXISTS issued_by TEXT;

-- Add constraint for subscription_type
ALTER TABLE public.registration_codes
ADD CONSTRAINT registration_codes_subscription_type_check
CHECK (subscription_type IN ('code', 'credit_card'));

-- Add new columns to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS subscription_type TEXT,
ADD COLUMN IF NOT EXISTS subscription_price NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS is_association_member BOOLEAN DEFAULT false;

-- Add new columns to subscription_history
ALTER TABLE public.subscription_history
ADD COLUMN IF NOT EXISTS subscription_type TEXT,
ADD COLUMN IF NOT EXISTS price_paid NUMERIC(10,2),
ADD COLUMN IF NOT EXISTS code_expires_at TIMESTAMPTZ;
```

### Phase 2: Update Activation Logic

**File**: `sql/update_activate_subscription_time_based.sql`

```sql
CREATE OR REPLACE FUNCTION public.activate_subscription(sub_code TEXT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  code_record RECORD;
  current_user_id UUID;
  current_expiry TIMESTAMPTZ;
  new_expiry TIMESTAMPTZ;
BEGIN
  -- Get current user
  current_user_id := auth.uid();

  -- Validate and get code
  SELECT * INTO code_record
  FROM public.registration_codes
  WHERE code = sub_code
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Invalid or inactive code');
  END IF;

  -- Check if code itself has expired (for time-based codes)
  IF code_record.code_expires_at IS NOT NULL
     AND code_record.code_expires_at < NOW() THEN
    RETURN json_build_object(
      'success', false,
      'message', 'This code has expired on ' || to_char(code_record.code_expires_at, 'DD Mon YYYY')
    );
  END IF;

  -- Check max uses
  IF code_record.max_uses IS NOT NULL
     AND code_record.current_uses >= code_record.max_uses THEN
    RETURN json_build_object('success', false, 'message', 'Code has reached maximum uses');
  END IF;

  -- Get current expiry
  SELECT subscription_expires_at INTO current_expiry
  FROM public.profiles
  WHERE id = current_user_id;

  -- Calculate new expiry based on code type
  IF code_record.code_expires_at IS NOT NULL THEN
    -- TIME-BASED CODE: Use code's expiration date
    new_expiry := code_record.code_expires_at;

  ELSIF code_record.subscription_duration_days = 0 THEN
    -- LIFETIME CODE: 100 years from now
    new_expiry := NOW() + INTERVAL '100 years';

  ELSE
    -- DURATION-BASED CODE: Add duration to current or now
    IF current_expiry IS NOT NULL AND current_expiry > NOW() THEN
      new_expiry := current_expiry + (code_record.subscription_duration_days || ' days')::INTERVAL;
    ELSE
      new_expiry := NOW() + (code_record.subscription_duration_days || ' days')::INTERVAL;
    END IF;
  END IF;

  -- Update user profile
  UPDATE public.profiles
  SET
    subscription_expires_at = new_expiry,
    current_subscription_code_id = code_record.id,
    subscription_type = code_record.subscription_type,
    updated_at = NOW()
  WHERE id = current_user_id;

  -- Increment code usage
  UPDATE public.registration_codes
  SET current_uses = current_uses + 1
  WHERE id = code_record.id;

  -- Log subscription history
  INSERT INTO public.subscription_history (
    user_id,
    code_id,
    code,
    activated_at,
    expires_at,
    duration_days,
    subscription_type,
    code_expires_at
  ) VALUES (
    current_user_id,
    code_record.id,
    code_record.code,
    NOW(),
    new_expiry,
    code_record.subscription_duration_days,
    code_record.subscription_type,
    code_record.code_expires_at
  );

  -- Return success with expiry info
  RETURN json_build_object(
    'success', true,
    'message', CASE
      WHEN code_record.code_expires_at IS NOT NULL THEN
        'Subscription activated! Valid until ' || to_char(new_expiry, 'DD Mon YYYY')
      WHEN code_record.subscription_duration_days = 0 THEN
        'Lifetime subscription activated!'
      ELSE
        'Subscription activated for ' || code_record.subscription_duration_days || ' days!'
    END,
    'expires_at', new_expiry,
    'subscription_type', code_record.subscription_type,
    'is_time_based', code_record.code_expires_at IS NOT NULL
  );
END;
$$;
```

### Phase 3: Update Admin UI

**Create Code Form Changes**:

```typescript
interface CodeFormData {
  code: string
  description: string
  subscription_type: 'code' | 'credit_card'

  // For duration-based codes
  subscription_duration_days?: number

  // For time-based codes
  code_expires_at?: string
  issued_by?: string

  max_uses?: number
  is_active: boolean
}

// Conditional fields based on subscription_type
{subscriptionType === 'code' && (
  <>
    <label>Code Type</label>
    <select onChange={(e) => setCodeExpiryType(e.target.value)}>
      <option value="duration">Duration-Based (days from activation)</option>
      <option value="time">Time-Based (fixed expiry date)</option>
    </select>

    {codeExpiryType === 'duration' && (
      <select name="subscription_duration_days">
        <option value="30">30 days</option>
        <option value="365">365 days</option>
        <option value="0">Lifetime</option>
      </select>
    )}

    {codeExpiryType === 'time' && (
      <>
        <input
          type="date"
          name="code_expires_at"
          min={new Date().toISOString().split('T')[0]}
        />
        <input
          type="text"
          name="issued_by"
          placeholder="Beekeeping Association Name"
        />
      </>
    )}
  </>
)}
```

### Phase 4: Credit Card Integration

**Stripe Integration** (recommended):

```typescript
// Pricing constants
const PRICING = {
  member: 1200, // €12 in cents
  nonMember: 2400 // €24 in cents
}

// Create Stripe checkout session
async function createCheckoutSession(isAssociationMember: boolean) {
  const price = isAssociationMember ? PRICING.member : PRICING.nonMember

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{
      price_data: {
        currency: 'eur',
        product_data: {
          name: 'HiveCraic Annual Subscription',
          description: isAssociationMember
            ? 'Irish Beekeeping Association Member Rate'
            : 'Standard Rate'
        },
        unit_amount: price,
      },
      quantity: 1,
    }],
    mode: 'payment',
    success_url: `${YOUR_DOMAIN}/dashboard/profile?payment=success`,
    cancel_url: `${YOUR_DOMAIN}/dashboard/profile?payment=cancelled`,
    metadata: {
      user_id: userId,
      is_association_member: isAssociationMember,
      subscription_type: 'credit_card'
    }
  })

  return session.url
}

// Webhook handler for successful payment
async function handleSuccessfulPayment(session) {
  const { user_id, is_association_member, subscription_type } = session.metadata

  // Calculate expiry (12 months from now)
  const expiresAt = new Date()
  expiresAt.setFullYear(expiresAt.getFullYear() + 1)

  // Update user subscription
  await supabase
    .from('profiles')
    .update({
      subscription_expires_at: expiresAt.toISOString(),
      subscription_type: 'credit_card',
      subscription_price: session.amount_total / 100,
      is_association_member: is_association_member === 'true',
      current_subscription_code_id: null // Credit card subs don't use codes
    })
    .eq('id', user_id)

  // Log to subscription_history
  await supabase
    .from('subscription_history')
    .insert({
      user_id,
      activated_at: new Date().toISOString(),
      expires_at: expiresAt.toISOString(),
      subscription_type: 'credit_card',
      price_paid: session.amount_total / 100,
      duration_days: 365
    })
}
```

---

## Migration Strategy

### Backwards Compatibility

**Existing codes** (duration-based) will continue to work:
- If `code_expires_at` is NULL → use old duration logic
- If `subscription_duration_days` exists → use duration logic

**Existing subscriptions** remain unchanged:
- Current `subscription_expires_at` values preserved
- Can still renew with either code type

### Migration Steps

1. ✅ Run schema updates (add new columns)
2. ✅ Update `activate_subscription` function
3. ✅ Update admin UI to support time-based codes
4. ✅ Test code activation with both types
5. ✅ Implement credit card flow
6. ✅ Update user-facing subscription management UI

---

## Testing Checklist

- [ ] Create duration-based code (old style) - still works
- [ ] Create time-based code with future expiry date
- [ ] Create time-based code with past expiry date - should reject
- [ ] Activate time-based code - user expiry matches code expiry
- [ ] Activate duration-based code - user expiry is activation + duration
- [ ] Credit card purchase (member rate) - €12, 12 months
- [ ] Credit card purchase (non-member rate) - €24, 12 months
- [ ] Renew expired subscription with time-based code
- [ ] Admin panel shows both code types correctly
- [ ] User management shows subscription type

---

## Files to Create/Modify

### SQL Migrations:
- `sql/add_time_based_subscriptions.sql` - Schema updates
- `sql/update_activate_subscription_time_based.sql` - New activation logic

### Frontend:
- `src/app/dashboard/settings/page.tsx` - Admin code creation
- `src/components/RenewSubscriptionModal.tsx` - Add credit card option
- `src/app/api/stripe/checkout/route.ts` - Stripe checkout (new)
- `src/app/api/stripe/webhook/route.ts` - Stripe webhook (new)

### Documentation:
- `TIME_BASED_SUBSCRIPTIONS.md` - This document
- Update `SUBSCRIPTION_SYSTEM_IMPLEMENTATION.md`

---

## Next Steps

1. Review and approve this design
2. Create SQL migration scripts
3. Update activation function
4. Update admin UI
5. Implement Stripe integration
6. Test thoroughly
7. Deploy

---

## Questions to Confirm

1. **Credit Card Integration**: Use Stripe? (recommended for EU)
2. **Association Verification**: How do users prove they're association members?
   - Upload membership card?
   - Association code lookup?
   - Honor system?
3. **Renewal Logic**: Can credit card subscribers renew with codes? Vice versa?
4. **Code Naming**: Keep "registration_codes" or rename to "subscription_codes"?
5. **Association Management**: Need a full associations table for tracking clubs?
