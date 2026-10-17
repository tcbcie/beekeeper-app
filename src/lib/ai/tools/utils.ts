import { AsyncLocalStorage } from 'node:async_hooks'
import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Fail-fast at module init. Returns a non-nullable string so the values can
// be used inside any closure without TS narrowing surprises.
function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`ai/tools: ${name} must be set.`)
  }
  return value
}
const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL')
const supabasePublicKey = requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
const supabaseServiceKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY')

// The signed-in user's client for the current chat request (see runWithUserSupabase).
const requestSupabase = new AsyncLocalStorage<SupabaseClient>()

/** A client that acts as the signed-in user, so the database's RLS rules apply to every query. */
export function createUserSupabase(accessToken: string): SupabaseClient {
  return createClient(supabaseUrl, supabasePublicKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

/** Run one chat request with `client` as the client every tool's getSupabase() returns. */
export function runWithUserSupabase<T>(client: SupabaseClient, fn: () => Promise<T>): Promise<T> {
  return requestSupabase.run(client, fn)
}

// The tools' database client: the signed-in user's own, so RLS applies on top of each tool's
// own user_id / accessible-apiary filters (keep those: RLS alone is wider than "my apiaries",
// e.g. it also shows distribution recipients' apiaries). There is deliberately no fallback to
// the secret key: a tool called outside runWithUserSupabase fails instead of bypassing RLS.
export function getSupabase(): SupabaseClient {
  const client = requestSupabase.getStore()
  if (!client) {
    throw new Error('AI tools must run inside runWithUserSupabase (no user-scoped client)')
  }
  return client
}

let serviceInstance: SupabaseClient | null = null

// Secret-key client that bypasses RLS. Only for data users may not read through RLS but a tool
// legitimately needs for the CALLER themselves (their own BEEP/Wolf token). Never use it for a
// query whose rows depend on tool arguments.
export function getServiceSupabase(): SupabaseClient {
  if (!serviceInstance) {
    serviceInstance = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return serviceInstance
}

// Get list of apiary IDs owned by user only (excludes shared)
export async function getOwnApiaryIds(userId: string): Promise<string[]> {
  const supabase = getSupabase()

  const { data: ownApiaries } = await supabase
    .from('apiaries')
    .select('id')
    .eq('user_id', userId)

  return ownApiaries?.map(a => a.id) || []
}

// Get list of apiary IDs accessible to user (own + team-shared)
export async function getAccessibleApiaryIds(userId: string): Promise<string[]> {
  const supabase = getSupabase()

  // Get user's own apiaries
  const ownIds = await getOwnApiaryIds(userId)

  // Get team-shared apiaries (via teams -> team_members)
  const { data: teamApiaries } = await supabase
    .from('team_apiaries')
    .select('apiary_id, teams!inner(team_members!inner(user_id))')
    .eq('teams.team_members.user_id', userId)

  const teamIds = teamApiaries?.map(a => a.apiary_id) || []

  return [...new Set([...ownIds, ...teamIds])]
}

// Get list of hive IDs accessible to user (own + team-shared)
export async function getAccessibleHiveIds(userId: string): Promise<string[]> {
  const apiaryIds = await getAccessibleApiaryIds(userId)
  if (apiaryIds.length === 0) return []

  const supabase = getSupabase()
  const { data } = await supabase
    .from('hives')
    .select('id')
    .in('apiary_id', apiaryIds)

  return data?.map(h => h.id) || []
}

// Find hive by name/number (case-insensitive, partial match)
export async function findHiveByName(userId: string, hiveName: string): Promise<{
  id: string
  hive_number: string
  apiary_name: string
} | null> {
  const apiaryIds = await getAccessibleApiaryIds(userId)
  if (apiaryIds.length === 0) return null

  const supabase = getSupabase()
  const { data } = await supabase
    .from('hives')
    .select('id, hive_number, apiaries(name)')
    .in('apiary_id', apiaryIds)
    .ilike('hive_number', `%${hiveName}%`)
    .limit(1)
    .single()

  if (!data) return null

  // Handle Supabase join result which could be object or null
  let apiaryName = 'Unknown'
  if (data.apiaries && typeof data.apiaries === 'object' && 'name' in data.apiaries) {
    apiaryName = (data.apiaries as { name: string }).name
  }

  return {
    id: data.id,
    hive_number: data.hive_number,
    apiary_name: apiaryName
  }
}

// Find queen by number (case-insensitive, partial match)
export async function findQueenByNumber(userId: string, queenNumber: string): Promise<{
  id: string
  queen_number: string
} | null> {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('queens')
    .select('id, queen_number')
    .eq('user_id', userId)
    .ilike('queen_number', `%${queenNumber}%`)
    .limit(1)
    .single()

  return data
}

// Find batch by name (case-insensitive, partial match)
export async function findBatchByName(userId: string, batchName: string): Promise<{
  id: string
  batch_name: string
} | null> {
  const supabase = getSupabase()
  const { data } = await supabase
    .from('rearing_batches')
    .select('id, batch_name')
    .eq('user_id', userId)
    .ilike('batch_name', `%${batchName}%`)
    .limit(1)
    .single()

  return data
}

// Format date for display
export function formatDate(date: string | null): string {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('en-IE', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Calculate days since a date
export function daysSince(date: string | null): number | null {
  if (!date) return null
  const then = new Date(date)
  const now = new Date()
  const diffTime = now.getTime() - then.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

// Calculate days until a date
export function daysUntil(date: string | null): number | null {
  if (!date) return null
  const then = new Date(date)
  const now = new Date()
  const diffTime = then.getTime() - now.getTime()
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}
