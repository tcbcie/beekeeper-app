import { supabase } from './supabase'

/**
 * Team-access lookup shared by every page that needs to know which apiaries
 * the signed-in user can see beyond their own. Replaces the copy-pasted
 * team_members -> team_apiaries -> apiaries waterfall (2-3 serial requests,
 * previously repeated up to three times per page load) with one RPC round
 * trip, memoised for a short window so parallel fetchers on the same page
 * share a single request.
 */
export interface TeamAccess {
  /** Teams the user belongs to (owners are members via trigger). */
  teamIds: string[]
  /** Apiaries shared with the user through those teams. */
  sharedApiaryIds: string[]
  /** Owners of those shared apiaries (never includes the user). */
  sharedOwnerIds: string[]
  /** Convenience flag: the user belongs to at least one team. */
  isTeamMember: boolean
}

const EMPTY: TeamAccess = {
  teamIds: [],
  sharedApiaryIds: [],
  sharedOwnerIds: [],
  isTeamMember: false,
}

// Keyed by userId so a signed-in account switch can never reuse another
// account's result. Short TTL: long enough for the parallel fetchers of one
// page load, short enough that sharing changes show up on the next navigation.
const TTL_MS = 30_000
const cache = new Map<string, { promise: Promise<TeamAccess>; at: number }>()

/** Drop the memoised result (call after changing team membership/sharing). */
export function clearTeamAccessCache(): void {
  cache.clear()
}

export function getTeamAccess(userId: string): Promise<TeamAccess> {
  const entry = cache.get(userId)
  if (entry && Date.now() - entry.at < TTL_MS) {
    return entry.promise
  }
  const promise = fetchTeamAccess(userId)
  cache.set(userId, { promise, at: Date.now() })
  return promise
}

async function fetchTeamAccess(userId: string): Promise<TeamAccess> {
  const { data, error } = await supabase.rpc('get_accessible_apiary_ids')
  if (error || !data) {
    // Match the previous call sites' behaviour (missing data treated as "no
    // shared access") but do not cache the failure, so the next call retries.
    console.error('Error fetching team access:', error)
    cache.delete(userId)
    return EMPTY
  }
  const teamIds: string[] = data.team_ids ?? []
  return {
    teamIds,
    sharedApiaryIds: data.shared_apiary_ids ?? [],
    sharedOwnerIds: data.shared_owner_ids ?? [],
    isTeamMember: teamIds.length > 0,
  }
}
