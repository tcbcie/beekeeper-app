# Team Sharing Analysis - Apiaries vs Hives

## Summary
**Finding**: The team collaboration system is **correctly implemented** using apiary-level sharing, not hive-level sharing. All components are consistent with this model.

---

## Database Schema ✅ CORRECT

### Tables Structure
1. **`teams`** - Team definitions with owner
2. **`team_members`** - Junction table for team membership (owner/admin/member roles)
3. **`team_apiaries`** - **Links APIARIES to teams** (not hives)
4. **`team_invitations`** - Pending invitations to join teams

### Key Points
- Sharing happens at the **apiary level**
- When an apiary is shared with a team (`team_apiaries` table), ALL hives in that apiary become visible
- No `team_hives` table exists - this is intentional and correct

---

## RLS Policies ✅ CORRECT

### Policy Chain (from `add_team_hive_visibility_v2.sql`)

1. **Apiaries**: Team members can see shared apiaries
   ```sql
   WHERE id IN (SELECT apiary_id FROM team_apiaries WHERE team_id IN (...))
   ```

2. **Hives**: Team members can see hives in shared apiaries
   ```sql
   WHERE apiary_id IN (SELECT apiary_id FROM team_apiaries WHERE team_id IN (...))
   ```

3. **Queens**: Team members can see queens in shared hives
   ```sql
   WHERE id IN (SELECT queen_id FROM hives WHERE apiary_id IN (...))
   ```

4. **Inspections/Varroa**: Team members can see data for shared hives
   ```sql
   WHERE hive_id IN (SELECT id FROM hives WHERE apiary_id IN (...))
   ```

### Access Model
- **Apiary is shared** → User can see the apiary
- **Apiary is shared** → User can see ALL hives in that apiary
- **Apiary is shared** → User can see ALL queens in those hives
- **Apiary is shared** → User can see ALL inspections/varroa data for those hives

**READ-ONLY**: Team members can view but NOT modify shared data

---

## Dashboard Team Stats ✅ CORRECT

### Fetch Logic (`src/app/dashboard/page.tsx`)

```javascript
// 1. Get team memberships
const teamIds = await team_members.select(team_id).eq(user_id)

// 2. Get shared apiaries for those teams
const apiaryIds = await team_apiaries.select(apiary_id).in(team_id, teamIds)

// 3. Get ALL hives in shared apiaries
const teamHives = await hives.select().in(apiary_id, apiaryIds)

// 4. Count queens, inspections, etc. from those hives
```

### Result
- Correctly uses `team_apiaries` to find shared apiaries
- Then fetches all hives within those apiaries
- Calculates team stats from that data

---

## Hives Page Ownership Filter ⚠️ PRAGMATIC BUT CONCEPTUALLY UNCLEAR

### Current Implementation (`src/app/dashboard/hives/page.tsx`)

```javascript
if (ownershipFilter === 'my') {
  query = query.eq('user_id', currentUserId)  // My hives only
} else if (ownershipFilter === 'team') {
  query = query.neq('user_id', currentUserId) // NOT my hives
}
// 'all' = no filter (RLS handles visibility)
```

### Analysis

**What "team" filter actually shows:**
- Any hive the user can see (via RLS) that they DON'T own
- This COULD include:
  - Hives in team-shared apiaries (correct)
  - Hypothetically any other hive RLS allows them to see (if other policies exist)

**Why it works:**
- RLS policies ensure users can ONLY see:
  1. Their own hives (`user_id = auth.uid()`)
  2. Hives in shared apiaries (via `team_apiaries`)
- Therefore `neq('user_id')` will only show team hives in practice

**Conceptual Issue:**
- The filter relies on RLS for security/correctness
- It doesn't explicitly query `team_apiaries` to determine "team" hives
- This is pragmatic but not semantically clear

### Better Approach (Optional)

```javascript
if (ownershipFilter === 'team') {
  // Explicitly query for hives in shared apiaries
  const { data: sharedApiaries } = await supabase
    .from('team_apiaries')
    .select('apiary_id')
    .in('team_id', userTeamIds)

  const apiaryIds = sharedApiaries.map(ta => ta.apiary_id)
  query = query.in('apiary_id', apiaryIds).neq('user_id', currentUserId)
}
```

This explicitly filters by shared apiaries rather than relying on RLS.

---

## Inspections Page Ownership Filter ⚠️ SAME AS HIVES

### Current Implementation (`src/app/dashboard/inspections/page.tsx`)

```javascript
if (ownershipFilter === 'my') {
  query = query.eq('user_id', currentUserId)
} else if (ownershipFilter === 'team') {
  query = query.neq('user_id', currentUserId)
}
```

### Analysis
- Same pattern as Hives page
- Works correctly due to RLS
- Not semantically explicit about apiary-level sharing

---

## Missing Feature: Apiary Sharing UI 🔴 CRITICAL

### Current State
- Database supports sharing apiaries (`team_apiaries` table)
- RLS policies are in place for team access
- **NO UI EXISTS** to actually share apiaries with teams

### What's Needed
A UI component that allows team owners/admins to:
1. Select an apiary they own
2. Select one of their teams
3. Create a record in `team_apiaries` table
4. Remove apiaries from teams (unshare)

### Suggested Locations
- **Option 1**: Hives/Apiaries page - Add "Share with Team" button next to each apiary
- **Option 2**: Profile page - Add "Shared Apiaries" section under Team Management
- **Option 3**: Dedicated "Team Apiaries" page under dashboard

---

## Recommendations

### 1. ✅ Keep Current Architecture
The apiary-level sharing model is correct and well-designed. Do NOT change to hive-level sharing.

### 2. ⚠️ Clarify Ownership Filters (Low Priority)
Consider making the "team" filters explicitly query `team_apiaries` instead of using `neq('user_id')`:
- More semantically clear
- Self-documenting code
- Doesn't rely on RLS for filter logic

**However**: Current approach works fine and is more performant. This is optional.

### 3. 🔴 Build Apiary Sharing UI (HIGH PRIORITY)
**CRITICAL**: Without a UI to share apiaries, the team collaboration feature is incomplete:
- Users can create teams ✅
- Users can invite members ✅
- Teams can be managed ✅
- **Users CANNOT share apiaries** ❌
- Therefore team members see no shared data ❌

### 4. 📝 Update Documentation
Clarify in CLAUDE.md and user-facing docs that:
- Teams share **entire apiaries**, not individual hives
- When an apiary is shared, ALL hives within it become visible to team members
- Team members have READ-ONLY access

---

## Next Steps

1. **Build Apiary Sharing UI** (highest priority)
2. Test end-to-end team collaboration workflow
3. Add write permissions for team admins (future enhancement)
4. Consider adding team activity feed (future enhancement)

---

## Conclusion

The team sharing system is **architecturally sound** and uses apiary-level sharing correctly throughout:
- ✅ Database schema uses `team_apiaries`
- ✅ RLS policies grant access via shared apiaries
- ✅ Dashboard stats fetch via shared apiaries
- ⚠️ Ownership filters work but could be more explicit
- ❌ **Missing UI to actually share apiaries**

**Main Issue**: Need to build the UI for sharing apiaries with teams!
