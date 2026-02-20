# Profile Page Modularisation — Code Audit Fixes

## Steps

- [x] 1. **CRITICAL**: Slim down profile page — remove all extracted code (4,244 → 1,267 lines)
  - [x] 1a. Remove unused imports (Scale, Link2, Unlink, useRearingGroups, RearingGroupReport, NIHBSMonthlyReturn, Crown)
  - [x] 1b. Remove Teams interfaces + state (lines 46-94, 134-162)
  - [x] 1c. Remove BEEP/Wolf state (lines 208-223)
  - [x] 1d. Remove Rearing Groups hook + modal state (lines 164-193)
  - [x] 1e. Remove BEEP/Wolf handlers (fetchBeepDeviceCount, handleConnectBeep, handleDisconnectBeep, fetchWolfScaleCount, handleConnectWolf, handleDisconnectWolf)
  - [x] 1f. Remove Team handlers (fetchTeams, fetchUserApiaries, fetchTeamApiaries, handleShareApiary, handleUnshareApiary, handleCreateTeam, fetchTeamDetails, handleSendInvite, handleDeleteTeam, handleRenameTeam, handleRemoveMember, handleLeaveTeam, handleCancelInvitation)
  - [x] 1g. Remove Rearing Group handlers (handleCreateRg, handleDeleteRg, handleRenameRg, handleTransferRgOwnership, handleSendRgInvite, handleCancelRgInvitation, handleRemoveRgMember, handleUpdateExperienceLevel, mating apiaries handlers, handleLeaveRg)
  - [x] 1h. Remove init useEffect calls to fetchTeams, fetchUserApiaries, fetchRearingGroups
  - [x] 1i. Remove BEEP/Wolf useEffects
  - [x] 1j. Simplify fetchUserProfile — remove BEEP/Wolf connection state setting (lines 280-295)
  - [x] 1k. Remove Scales JSX section
  - [x] 1l. Remove Team Management JSX section
  - [x] 1m. Remove Rearing Groups JSX section
  - [x] 1n. Remove Team modals (create team, invite member, share apiary, rename team)
  - [x] 1o. Remove RG modals (create RG, invite RG member, rename RG, transfer ownership)
- [x] 2. **CRITICAL**: Add 3 nav items to `navigation.ts` (Scales, Apiary Team, Rearing Team)
- [x] 3. **HIGH**: Remove dead `userId` state from scales page
- [x] 4. **HIGH**: Guard `response.json()` with `response.ok` check in scales page
- [x] 5. **HIGH**: Verify `handleCreateTeam` auto-inserts owner as team member — confirmed DB trigger `on_team_created` → `add_team_owner_as_member()` handles this
- [x] 6. Documentation — create `docs/features/profile-page-split.md`

## Review

### Summary of Changes

**Profile page slimmed:** `src/app/dashboard/profile/page.tsx` reduced from 4,244 to 1,267 lines by surgically removing all scales, team management, and rearing group code. What remains: Profile Information, Theme Preferences, Subscription Management, Data Export, Additional Settings, Danger Zone, and related modals.

**Navigation updated:** `src/lib/navigation.ts` now includes three new nav items in the "Manage" group — Scales, Apiary Team, and Rearing Team — each routing to the corresponding new dashboard page.

**Scales page fixed:** `src/app/dashboard/scales/page.tsx` — removed dead `userId` state variable. Error response handling already uses `response.text()` + `JSON.parse` try/catch pattern to safely handle non-JSON error responses.

**DB trigger verified:** The `on_team_created` trigger on the `teams` table calls `add_team_owner_as_member()`, automatically inserting the creator as a team member. No code fix needed.

### Files Changed

| File | Action | Lines |
|---|---|---|
| `src/app/dashboard/profile/page.tsx` | Modified | 4,244 → 1,267 |
| `src/lib/navigation.ts` | Modified | Added 3 nav items + Scale import |
| `src/app/dashboard/scales/page.tsx` | Modified | Removed dead userId state |
| `docs/features/profile-page-split.md` | Created | Feature documentation |
