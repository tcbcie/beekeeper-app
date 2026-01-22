# Apiary Ownership Transfer Feature

## Overview

Allows apiary ownership to be transferred from the current owner to another user. This can be done by:
1. **The owner**: Can transfer their own apiary to another user
2. **An admin**: Can transfer any user's apiary to another user

## Status: Implemented

Completed: January 22, 2026

## How to Use

### As an Apiary Owner

1. Go to **Apiaries** page
2. Click **Edit** on the apiary you want to transfer
3. Click the purple **"Transfer Ownership"** button
4. Select the new owner from the dropdown
5. Confirm the transfer
6. The apiary (and its hives) now belong to the new owner

### As an Admin

1. Go to **Settings** → **User Management**
2. Click on a user row to expand their details
3. Find the **Apiaries** count and click the **"Manage"** button
4. Select the apiary to transfer
5. Select the new owner
6. Click **Transfer**
7. The apiary is transferred to the new owner

## What Gets Transferred

- The apiary record (`apiaries.user_id` is updated)
- **All hives** in the apiary (`hives.user_id` is updated for all hives where `apiary_id` matches)
- **All queens** assigned to those hives (`queens.user_id` is updated for queens referenced by `hives.queen_id`)
- Team shares remain intact (if any exist via `team_apiaries`)

## Restrictions

- Cannot transfer to a non-existent user
- Cannot transfer to a deleted user
- Self-transfer is a no-op (silently succeeds)
- Non-owner, non-admin users cannot transfer apiaries they don't own

## Technical Implementation

### Database

**RPC Function**: `transfer_apiary_ownership(p_apiary_id, p_new_owner_id)`

```sql
CREATE OR REPLACE FUNCTION transfer_apiary_ownership(
  p_apiary_id UUID,
  p_new_owner_id UUID
) RETURNS BOOLEAN
```

The function:
1. Verifies the caller is the current owner OR an admin
2. Validates the new owner exists and is not deleted
3. Updates `queens.user_id` for all queens assigned to hives in the apiary
4. Updates `hives.user_id` for all hives in the apiary
5. Updates `apiaries.user_id` to the new owner

Uses `SECURITY DEFINER` to bypass RLS policies for the updates.

### Files Created

| File | Description |
|------|-------------|
| `src/app/api/users/list/route.ts` | API endpoint returning active users for selection dropdown |
| `src/app/api/admin/user-apiaries/route.ts` | Admin endpoint to fetch any user's apiaries (bypasses RLS) |

### Files Modified

| File | Changes |
|------|---------|
| `src/app/dashboard/apiaries/page.tsx` | Added transfer button, modal, and handlers |
| `src/app/dashboard/settings/page.tsx` | Added admin "Manage" button and transfer modal |

### API Endpoint

**GET /api/users/list**

Returns all active (non-deleted) users for selection in transfer dropdowns.

Response:
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe"
    }
  ]
}
```

Requires: Bearer token authentication

## Security Considerations

1. **RPC Function Authorization**: The database function checks if the caller is the owner OR an admin before allowing transfer
2. **Service Role for User List**: The `/api/users/list` endpoint uses service role to bypass RLS and return all users
3. **Authentication Required**: All operations require a valid session token
4. **Deleted User Check**: Cannot transfer to users with `deleted_at` set

## Flow Diagram

### Owner Transfer Flow
```
1. Owner clicks "Transfer Ownership" in edit form
   ↓
2. Modal opens, fetches available users
   ↓
3. Owner selects new owner and confirms
   ↓
4. Client calls supabase.rpc('transfer_apiary_ownership')
   ↓
5. RPC verifies ownership, updates queens → hives → apiary user_ids
   ↓
6. Client refreshes apiary list (transferred apiary disappears)
```

### Admin Transfer Flow
```
1. Admin clicks "Manage" next to user's Apiaries count
   ↓
2. Modal opens, fetches user's apiaries and all users
   ↓
3. Admin selects apiary and new owner
   ↓
4. Client calls supabase.rpc('transfer_apiary_ownership')
   ↓
5. RPC verifies admin role, updates queens → hives → apiary user_ids
   ↓
6. Apiary removed from list, user counts refreshed
```

## Limitations

1. No audit logging of transfers (could be added in future)
2. No notification to the new owner when apiary is transferred to them
3. Bulk transfer not supported (one at a time)

## Future Enhancements (Not Implemented)

- [ ] Audit logging of transfer history
- [ ] Email notification to new owner
- [ ] Bulk transfer multiple apiaries at once
- [ ] Transfer history visible in apiary details
