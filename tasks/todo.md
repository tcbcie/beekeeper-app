# Add Skill Level for Owner + Member Self-Declaration

## Tasks

- [x] **Hook**: Add `membership_id` and `experience_level` to the `RearingGroup` interface, and include `id` + `experience_level` in the member groups fetch query
- [x] **Hook**: Map `membership_id` and `experience_level` onto `memberRearingGroups` items; expose `setMemberRearingGroups`
- [x] **Owner view**: Show experience level dropdown for the owner row too (keep Remove button hidden for owner)
- [x] **Member view**: Add experience level dropdown + info icon in the "Groups I'm In" card so members can self-declare
- [x] **Info tooltip**: Add `HelpCircle` icon with a pop-up explaining the three skill levels (shown in both owner and member views)
- [x] **Docs**: Update `docs/features/queen-rearing-groups.md`

## Review

### Summary of Changes

**Hook (`useRearingGroups.ts`):** Added `membership_id` and `experience_level` fields to the `RearingGroup` interface. Updated the member groups query to also select `id` and `experience_level` from `rearing_group_members`. Built a lookup map to pass these through to each `memberRearingGroups` entry. Exposed `setMemberRearingGroups` from the hook return.

**Owner view (`rearing-team/page.tsx`):** Moved the experience level `<select>` outside the `member.role !== 'owner'` guard so it now renders for all members including the owner. The Remove button remains owner-only hidden.

**Member self-declaration (`rearing-team/page.tsx`):** Added a new `handleUpdateOwnExperienceLevel` handler that updates the member's own `rearing_group_members` row and syncs local state. Added an experience level dropdown with label in the "Groups I'm In" card.

**Info tooltip:** Added `HelpCircle` icon next to both the "Group Members" heading (owner view) and the member's dropdown. Clicking it toggles a pop-up explaining the three levels.

### Files Changed

| File | Change |
|------|--------|
| `src/hooks/useRearingGroups.ts` | Added `membership_id` + `experience_level` to `RearingGroup` interface; updated query; exposed setter |
| `src/app/dashboard/rearing-team/page.tsx` | Added `HelpCircle` import, `showSkillLevelInfo` state, `handleUpdateOwnExperienceLevel` handler, owner dropdown, member self-declaration UI, info tooltips |
| `docs/features/queen-rearing-groups.md` | Added Experience Level section |
