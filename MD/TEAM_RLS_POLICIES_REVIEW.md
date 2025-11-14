# Team Feature RLS Policies - Complete Review and Implementation

## Executive Summary

This document provides a comprehensive review of the Team collaboration feature's Row Level Security (RLS) policies. The RLS policies have been thoroughly analyzed, redesigned, and consolidated into a single comprehensive SQL file ready for deployment.

**Current Status**: RLS is currently DISABLED. This document provides the complete solution to enable and verify RLS policies.

---

## Table of Contents

1. [Team Feature Architecture](#team-feature-architecture)
2. [RLS Policy Design](#rls-policy-design)
3. [Implementation File](#implementation-file)
4. [Verification Steps](#verification-steps)
5. [Test Scenarios](#test-scenarios)
6. [Security Guarantees](#security-guarantees)
7. [Known Issues and Limitations](#known-issues-and-limitations)

---

## Team Feature Architecture

### Core Concept

The team collaboration system uses **apiary-level sharing**:
- Teams are created by owners who can invite members
- **Apiaries are shared**, not individual hives
- When an apiary is shared with a team (via `team_apiaries`), ALL hives in that apiary become visible to team members
- Team members have **READ** access to shared data
- Only the original data owner can **WRITE/UPDATE/DELETE** their records

### Database Schema

#### Team Management Tables
1. **`teams`** - Team definitions
   - `id` (uuid, pk)
   - `owner_id` (uuid, references auth.users)
   - `name` (text)
   - `created_at` (timestamptz)

2. **`team_members`** - Team membership
   - `id` (uuid, pk)
   - `team_id` (uuid, references teams)
   - `user_id` (uuid, references auth.users)
   - `role` (text: 'owner', 'admin', 'member')
   - `joined_at` (timestamptz)

3. **`team_invitations`** - Pending invitations
   - `id` (uuid, pk)
   - `team_id` (uuid, references teams)
   - `invitee_email` (text)
   - `invited_by` (uuid, references auth.users)
   - `status` (text: 'pending', 'accepted', 'declined')
   - `created_at` (timestamptz)
   - `accepted_at` (timestamptz, nullable)
   - `declined_at` (timestamptz, nullable)

4. **`team_apiaries`** - Apiary sharing (THE KEY TABLE)
   - `id` (uuid, pk)
   - `team_id` (uuid, references teams)
   - `apiary_id` (uuid, references apiaries)
   - `shared_at` (timestamptz)

### Data Access Flow

```
User → Team Member → Team → Team Apiary → Apiary → Hives → Queens/Inspections/etc.
```

1. User is a member of a team (via `team_members`)
2. Team has shared apiaries (via `team_apiaries`)
3. User can VIEW all hives in shared apiaries
4. User can VIEW all data (queens, inspections, etc.) for shared hives
5. User can ONLY MODIFY their own data (user_id = auth.uid())

---

## RLS Policy Design

### Design Principles

1. **Separation of Concerns**
   - Team management (teams, members, invitations) - managed by team owners
   - Data access (apiaries, hives, etc.) - based on ownership + team sharing

2. **Read vs Write Permissions**
   - READ: Owner OR team member can view shared data
   - WRITE: ONLY owner can create/update/delete

3. **Helper Functions**
   - Use SECURITY DEFINER functions to prevent infinite recursion
   - Functions check access rights without triggering RLS on internal queries

### Helper Functions

#### 1. `is_team_member(team_uuid, user_uuid)`
Checks if a user is a member of a specific team.

```sql
CREATE OR REPLACE FUNCTION is_team_member(team_uuid uuid, user_uuid uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM team_members
    WHERE team_id = team_uuid AND user_id = user_uuid
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

#### 2. `is_team_owner(team_uuid, user_uuid)`
Checks if a user owns a specific team.

```sql
CREATE OR REPLACE FUNCTION is_team_owner(team_uuid uuid, user_uuid uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM teams
    WHERE id = team_uuid AND owner_id = user_uuid
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

#### 3. `can_access_hive(hive_uuid, user_uuid)`
Checks if a user can access a hive (owns it OR it's in a shared apiary).

```sql
CREATE OR REPLACE FUNCTION can_access_hive(hive_uuid uuid, user_uuid uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    -- User owns the hive directly
    SELECT 1 FROM hives WHERE id = hive_uuid AND user_id = user_uuid
  ) OR EXISTS (
    -- Hive is in an apiary shared with a team the user is a member of
    SELECT 1 FROM hives h
    INNER JOIN team_apiaries ta ON h.apiary_id = ta.apiary_id
    INNER JOIN team_members tm ON ta.team_id = tm.team_id
    WHERE h.id = hive_uuid AND tm.user_id = user_uuid
  ) OR EXISTS (
    -- Hive is in an apiary shared via a team the user owns
    SELECT 1 FROM hives h
    INNER JOIN team_apiaries ta ON h.apiary_id = ta.apiary_id
    INNER JOIN teams t ON ta.team_id = t.id
    WHERE h.id = hive_uuid AND t.owner_id = user_uuid
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

#### 4. `can_access_apiary(apiary_uuid, user_uuid)`
Checks if a user can access an apiary (owns it OR it's shared with their team).

#### 5. `can_access_queen(queen_uuid, user_uuid)`
Checks if a user can access a queen (owns it OR it's in a shared hive).

### Policy Pattern

All data tables follow this pattern:

**SELECT** - User can view if they own it OR have team access:
```sql
CREATE POLICY "Users can view accessible [table]"
ON [table] FOR SELECT
TO authenticated
USING (can_access_[entity](id, auth.uid()));
```

**INSERT** - User must own the record AND have access to parent entities:
```sql
CREATE POLICY "Users can insert [table] for accessible entities"
ON [table] FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND can_access_[parent](parent_id, auth.uid())
);
```

**UPDATE/DELETE** - User can ONLY modify their own records:
```sql
CREATE POLICY "Users can update their own [table]"
ON [table] FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());
```

---

## Implementation File

**File**: [`sql/enable_team_rls_policies.sql`](../sql/enable_team_rls_policies.sql)

This file contains:
1. All 5 helper functions
2. Complete RLS policies for 13 tables:
   - `teams`
   - `team_members`
   - `team_invitations`
   - `team_apiaries`
   - `apiaries`
   - `hives`
   - `queens`
   - `inspections`
   - `varroa_treatments`
   - `varroa_checks`
   - `feedings`
   - `harvests`
   - `rearing_batches`
3. Verification queries
4. Summary output

### How to Apply

1. Open Supabase Dashboard
2. Navigate to SQL Editor
3. Copy the contents of `sql/enable_team_rls_policies.sql`
4. Execute the script
5. Review the verification output

---

## Verification Steps

### 1. Check RLS Status

After running the script, verify RLS is enabled:

```sql
SELECT
  tablename,
  CASE WHEN rowsecurity THEN '✓ ENABLED' ELSE '✗ DISABLED' END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'teams', 'team_members', 'team_apiaries', 'team_invitations',
    'apiaries', 'hives', 'queens', 'inspections',
    'varroa_checks', 'varroa_treatments', 'feedings', 'harvests',
    'rearing_batches'
  )
ORDER BY tablename;
```

Expected: All tables should show `✓ ENABLED`.

### 2. Count Policies

Verify all tables have policies:

```sql
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
    'teams', 'team_members', 'team_apiaries', 'team_invitations',
    'apiaries', 'hives', 'queens', 'inspections',
    'varroa_checks', 'varroa_treatments', 'feedings', 'harvests',
    'rearing_batches'
  )
GROUP BY tablename
ORDER BY tablename;
```

Expected policy counts:
- `apiaries`: 4 (SELECT, INSERT, UPDATE, DELETE)
- `feedings`: 4
- `harvests`: 4
- `hives`: 4
- `inspections`: 4
- `queens`: 4
- `rearing_batches`: 4
- `team_apiaries`: 3 (SELECT, INSERT, DELETE)
- `team_invitations`: 5 (SELECT, INSERT, 2x UPDATE, DELETE)
- `team_members`: 4 (SELECT, INSERT, UPDATE, DELETE)
- `teams`: 4 (SELECT, INSERT, UPDATE, DELETE)
- `varroa_checks`: 4
- `varroa_treatments`: 4

### 3. Test Helper Functions

Test the helper functions with actual data:

```sql
-- Replace these UUIDs with actual values from your database
-- Get a team_id from teams table
-- Get a user_id from auth.users
-- Get a hive_id from hives table

SELECT
  is_team_member('[team_id]'::uuid, '[user_id]'::uuid) as is_member,
  is_team_owner('[team_id]'::uuid, '[user_id]'::uuid) as is_owner,
  can_access_hive('[hive_id]'::uuid, '[user_id]'::uuid) as can_access;
```

---

## Test Scenarios

### Scenario 1: Team Owner Creates Team and Invites Member

**Setup**:
1. User A (owner) creates a team "Bee Squad"
2. User A creates an apiary "North Yard" with 3 hives
3. User A shares "North Yard" with "Bee Squad" (inserts into `team_apiaries`)
4. User A invites User B (member) to "Bee Squad"
5. User B accepts invitation

**Expected Results**:
- ✓ User A can see their team "Bee Squad"
- ✓ User A can see all 3 hives in "North Yard"
- ✓ User A can create/update/delete their hives
- ✓ User B can see team "Bee Squad" (via `team_members`)
- ✓ User B can see "North Yard" apiary
- ✓ User B can see all 3 hives in "North Yard"
- ✓ User B can create inspections for shared hives
- ✗ User B CANNOT update/delete User A's hives
- ✗ User B CANNOT update/delete User A's inspections

**SQL Tests**:

```sql
-- As User A (owner_id)
SET LOCAL role authenticated;
SET LOCAL request.jwt.claim.sub = '[user_a_id]';

-- Should return 1 row
SELECT * FROM teams WHERE name = 'Bee Squad';

-- Should return 3 rows
SELECT * FROM hives WHERE apiary_id = '[north_yard_id]';

-- As User B (member)
SET LOCAL request.jwt.claim.sub = '[user_b_id]';

-- Should return 1 row (member can see team via team_members)
SELECT * FROM teams WHERE name = 'Bee Squad';

-- Should return 3 rows (member can see shared hives)
SELECT * FROM hives WHERE apiary_id = '[north_yard_id]';

-- Should SUCCEED (member can add inspection to accessible hive)
INSERT INTO inspections (hive_id, user_id, inspection_date, ...)
VALUES ('[hive_id]', '[user_b_id]', NOW(), ...);

-- Should FAIL (member cannot update owner's hive)
UPDATE hives SET name = 'Modified' WHERE id = '[hive_id]';
-- Error: new row violates row-level security policy
```

### Scenario 2: User Without Team Access

**Setup**:
1. User C is NOT a member of "Bee Squad"
2. User C has their own apiary "South Yard"

**Expected Results**:
- ✗ User C CANNOT see team "Bee Squad"
- ✗ User C CANNOT see "North Yard" apiary
- ✗ User C CANNOT see any hives in "North Yard"
- ✓ User C CAN see their own "South Yard" apiary
- ✓ User C CAN see their own hives

**SQL Tests**:

```sql
-- As User C (no team membership)
SET LOCAL request.jwt.claim.sub = '[user_c_id]';

-- Should return 0 rows
SELECT * FROM teams WHERE name = 'Bee Squad';

-- Should return 0 rows
SELECT * FROM hives WHERE apiary_id = '[north_yard_id]';

-- Should return their own data
SELECT * FROM apiaries WHERE user_id = '[user_c_id]';
```

### Scenario 3: Team Member Removes Themselves

**Setup**:
1. User B (member) removes themselves from "Bee Squad"

**Expected Results**:
- ✗ User B can NO LONGER see team "Bee Squad"
- ✗ User B can NO LONGER see "North Yard" apiary
- ✗ User B can NO LONGER see hives in "North Yard"
- ✓ User B can STILL see their own inspections they created
- ✓ User B's old inspection records remain in database

**SQL Tests**:

```sql
-- User B removes themselves
DELETE FROM team_members WHERE team_id = '[bee_squad_id]' AND user_id = '[user_b_id]';

-- As User B (former member)
SET LOCAL request.jwt.claim.sub = '[user_b_id]';

-- Should return 0 rows (no longer a member)
SELECT * FROM teams WHERE name = 'Bee Squad';

-- Should return 0 rows (no longer has access)
SELECT * FROM hives WHERE apiary_id = '[north_yard_id]';

-- Should still return User B's own inspections
SELECT * FROM inspections WHERE user_id = '[user_b_id]';
```

### Scenario 4: Team Owner Unshares Apiary

**Setup**:
1. User A (owner) removes "North Yard" from "Bee Squad"
2. User B is still a member of "Bee Squad"

**Expected Results**:
- ✓ User B can STILL see team "Bee Squad"
- ✗ User B can NO LONGER see "North Yard" apiary
- ✗ User B can NO LONGER see hives in "North Yard"

**SQL Tests**:

```sql
-- User A unshares the apiary
DELETE FROM team_apiaries WHERE team_id = '[bee_squad_id]' AND apiary_id = '[north_yard_id]';

-- As User B (still a member)
SET LOCAL request.jwt.claim.sub = '[user_b_id]';

-- Should return 1 row (still a member)
SELECT * FROM teams WHERE name = 'Bee Squad';

-- Should return 0 rows (apiary no longer shared)
SELECT * FROM hives WHERE apiary_id = '[north_yard_id]';
```

---

## Security Guarantees

### What RLS Prevents

1. **Unauthorized Data Access**
   - Users cannot see teams they don't own or aren't members of
   - Users cannot see apiaries that aren't shared with them
   - Users cannot see hives in unshared apiaries
   - Even with direct SQL queries or API manipulation

2. **Unauthorized Data Modification**
   - Team members CANNOT modify data they don't own
   - Only the record owner (user_id) can UPDATE/DELETE
   - Team owners CANNOT modify members' data just because it's in a shared apiary

3. **Unauthorized Team Management**
   - Only team owners can add/remove members
   - Only team owners can share/unshare apiaries
   - Only team owners can delete teams

### What RLS Does NOT Prevent

1. **Data Owner Actions**
   - Data owners can always modify/delete their own data
   - Apiary owners can always unshare their apiaries
   - Team owners can always remove members

2. **Admin Overrides**
   - Supabase service_role can bypass RLS
   - PostgreSQL superusers can bypass RLS
   - This is by design for admin operations

---

## Known Issues and Limitations

### 1. Performance Considerations

**Issue**: The `can_access_*` helper functions perform JOINs which can be slow for large datasets.

**Impact**: Queries on tables with many records may be slower.

**Mitigation**:
- Functions are marked `STABLE` for query optimization
- Indexes exist on foreign keys (team_id, apiary_id, hive_id, user_id)
- Consider adding materialized views for very large installations

### 2. No Write Access for Team Members

**Issue**: Team members have READ-ONLY access to shared data.

**Impact**: Team members cannot add inspections, feedings, etc. to shared hives.

**Status**: This is BY DESIGN for v1 of the feature.

**Future Enhancement**: Could add role-based write permissions:
- Team "admins" could have write access
- Configurable per-apiary permissions
- Owner approval workflow for member changes

**Workaround**: The INSERT policies allow team members to create records for accessible hives:
```sql
WITH CHECK (
  user_id = auth.uid()
  AND can_access_hive(hive_id, auth.uid())
);
```

This means members CAN create inspections/feedings/etc. for shared hives, but they will own those records (user_id = their id).

### 3. Deleted Team Members Retain Their Data

**Issue**: When a user is removed from a team, their contributed data (inspections, etc.) remains in the database.

**Impact**: Historical data is preserved but may be confusing.

**Status**: This is BY DESIGN.

**Rationale**:
- Inspection data is valuable historical record
- Deleting data could break referential integrity
- Data owner should retain ownership

**Future Enhancement**: Could add soft-delete flags or data transfer mechanisms.

### 4. No Granular Permissions

**Issue**: All team members have the same access level (except owners).

**Impact**: Cannot restrict certain members to specific apiaries or operations.

**Status**: Not implemented in v1.

**Future Enhancement**: Could add:
- Role-based permissions (viewer, contributor, admin)
- Per-apiary access levels
- Feature-specific permissions (can inspect but not treat)

### 5. Invitation Email Visibility

**Issue**: The RLS policy allows anyone to view invitations sent to their email address, but Supabase auth.users.email is not directly accessible in RLS.

**Workaround**: Current policy uses:
```sql
invitee_email = (SELECT email FROM auth.users WHERE id = auth.uid())
```

This works but requires a subquery on each policy check.

**Future Enhancement**: Could add a trigger to set `invitee_user_id` when invitation is created if user already exists.

---

## Next Steps

### Immediate (Before Enabling RLS)

1. ✅ Review this document thoroughly
2. ⬜ Back up database (Supabase Dashboard → Database → Backups)
3. ⬜ Run `sql/enable_team_rls_policies.sql` in SQL Editor
4. ⬜ Verify RLS is enabled on all tables
5. ⬜ Run test scenarios with multiple users
6. ⬜ Check application functionality for any breakage

### Short Term (After Enabling RLS)

1. ⬜ Monitor performance with real users
2. ⬜ Add application logging for RLS policy violations
3. ⬜ Document user-facing behavior of team sharing
4. ⬜ Create admin guide for troubleshooting access issues

### Long Term (Future Enhancements)

1. ⬜ Implement role-based write permissions for team members
2. ⬜ Add granular per-apiary permissions
3. ⬜ Create audit log for team access changes
4. ⬜ Optimize helper functions with materialized views if needed
5. ⬜ Add UI for managing shared apiary visibility

---

## Appendix A: Policy Summary Table

| Table | SELECT | INSERT | UPDATE | DELETE | Notes |
|-------|--------|--------|--------|--------|-------|
| teams | Owner OR Member | Owner | Owner | Owner | Members can view via team_members |
| team_members | Owner OR Self OR Member | Owner | Owner | Owner OR Self | Members can leave |
| team_invitations | Invitee OR Owner | Owner | Owner OR Invitee | Owner | Invitee can accept/decline |
| team_apiaries | Owner OR Member OR Apiary Owner | Apiary Owner + Team Owner | - | Team Owner OR Apiary Owner | Link table |
| apiaries | Owner OR Shared | Owner | Owner | Owner | Shared via team_apiaries |
| hives | Owner OR Shared | Owner | Owner | Owner | Shared if apiary shared |
| queens | Owner OR Shared | Owner | Owner | Owner | Shared if in shared hive |
| inspections | Owner OR Shared | Self + Access | Self | Self | Can create for shared hives |
| varroa_treatments | Owner OR Shared | Self + Access | Self | Self | Can create for shared hives |
| varroa_checks | Owner OR Shared | Self + Access | Self | Self | Can create for shared hives |
| feedings | Owner OR Shared | Self + Access | Self | Self | Can create for shared hives |
| harvests | Owner OR Shared | Self + Access | Self | Self | Can create for shared hives |
| rearing_batches | Owner | Owner | Owner | Owner | Not shared with teams |

**Legend**:
- **Owner**: User owns the record (user_id = auth.uid())
- **Shared**: User has access via team sharing
- **Member**: User is a team member
- **Self**: User's own record
- **Access**: User has access to parent entity (hive/apiary)

---

## Appendix B: Architecture Diagrams

### Team Access Flow

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │ is member of
       ▼
┌─────────────┐
│    Team     │
└──────┬──────┘
       │ has shared
       ▼
┌─────────────┐
│team_apiaries│
└──────┬──────┘
       │ references
       ▼
┌─────────────┐
│   Apiary    │
└──────┬──────┘
       │ contains
       ▼
┌─────────────┐
│    Hives    │
└──────┬──────┘
       │ have
       ▼
┌─────────────────────────────────┐
│ Queens, Inspections, Varroa,    │
│ Feedings, Harvests              │
└─────────────────────────────────┘
```

### RLS Decision Tree for SELECT

```
SELECT query on data table (e.g., hives)
  │
  ├─ Is user_id = auth.uid()?
  │    └─ YES → ✓ ALLOW (owns the record)
  │
  └─ Is record in a shared apiary?
       │
       ├─ Check team_apiaries for apiary_id
       │    └─ Found apiary shared with team(s)
       │         │
       │         └─ Is user member of any of those teams?
       │              └─ YES → ✓ ALLOW (has team access)
       │
       └─ NO → ✗ DENY (no access)
```

### RLS Decision Tree for INSERT/UPDATE/DELETE

```
WRITE query on data table
  │
  └─ Is user_id = auth.uid()?
       │
       ├─ YES → ✓ ALLOW (owns the record)
       │
       └─ NO → ✗ DENY (cannot modify others' data)
```

---

## Document Changelog

| Date | Version | Changes | Author |
|------|---------|---------|--------|
| 2025-11-14 | 1.0 | Initial comprehensive review | Claude |

---

## Contact & Support

For questions about RLS policies or team feature:
1. Review this document first
2. Check `sql/enable_team_rls_policies.sql` for implementation details
3. Review `MD/TEAM_SHARING_ANALYSIS.md` for feature analysis
4. Check Supabase logs for RLS policy violations

---

**End of Document**
