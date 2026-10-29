import { AsyncLocalStorage } from 'node:async_hooks'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { BEEKEEPER_TIME_ZONE, toDublinDate, todayInDublin, addDaysISO } from '@/lib/dublin-date'

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

// The AI writes the search text, so treat it as data: cap its length and escape LIKE wildcards
// (%, _ and backslash) so a bare '%' can't match every row.
export function escapeLike(value: string): string {
  return value.slice(0, 100).replace(/[\\%_]/g, (ch) => '\\' + ch)
}

// The phrase every failed tool lookup carries. The chat handler spots it and answers "couldn't
// look that up" itself, instead of handing the failure to the model as if it were the user's data.
export const TOOL_DB_ERROR = 'a database error occurred'

// Log a tool's database error on the server and give the AI only a generic phrase, so raw
// database text never reaches the model (or, through it, the user).
export function logToolError(error: unknown): string {
  console.error('AI tool database error:', error)
  return TOOL_DB_ERROR
}

// A whole number the model may pass as a count or a look-back period: 1 to `max`, and a number
// written as text ("30") is accepted. Stops negative, zero, decimal or huge values.
export function boundedInt(max: number) {
  return z.coerce.number().int().min(1).max(max)
}

// Thrown by resolveByLabel; executeTool turns these into a question or a failed-lookup answer,
// so no tool needs its own handling.
export class AmbiguousMatchError extends Error {}
export class ToolLookupError extends Error {}

type LabelQuery<T> = (pattern: string, limit: number) => PromiseLike<{ data: T[] | null; error: unknown }>

// Find one record by the label the user typed (hive number, queen number, batch name...).
// An exact case-insensitive match wins; otherwise a partial match only counts when it is the only
// one. "1" must never quietly become Hive 12, so several candidates raise a "which one?" question.
// `run` builds the query for a LIKE pattern and a row limit (it should sort by the label).
export async function resolveByLabel<T>(
  kind: string,
  label: string,
  run: LabelQuery<T>,
  describe: (row: T) => string
): Promise<T | null> {
  const text = escapeLike(label.trim())
  if (!text) return null

  const exact = await run(text, 6)
  if (exact.error) {
    logToolError(exact.error)
    throw new ToolLookupError(`${kind} lookup failed`)
  }
  let rows = exact.data ?? []
  if (rows.length === 0) {
    const partial = await run(`%${text}%`, 6)
    if (partial.error) {
      logToolError(partial.error)
      throw new ToolLookupError(`${kind} lookup failed`)
    }
    rows = partial.data ?? []
  }

  if (rows.length === 0) return null
  if (rows.length === 1) return rows[0]
  const options = rows.slice(0, 5).map(describe).join(', ')
  throw new AmbiguousMatchError(
    `More than one ${kind} matches "${label.trim().slice(0, 100)}": ${options}. Ask the user which one they mean.`
  )
}

// Secret-key client that bypasses RLS. Only for data users may not read through RLS but a tool
// legitimately needs for the CALLER themselves (their own BEEP/Wolf token). Never use it for a
// query whose rows depend on tool arguments. One shared instance with the API routes.
export { getServiceSupabase } from '@/lib/server/api-auth'

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

// Find a hive in the user's own or team apiaries by its number (see resolveByLabel)
export async function findHiveByName(userId: string, hiveName: string): Promise<{
  id: string
  hive_number: string
  apiary_name: string
} | null> {
  const apiaryIds = await getAccessibleApiaryIds(userId)
  if (apiaryIds.length === 0) return null

  const supabase = getSupabase()
  // Handle Supabase join result which could be object or null
  const apiaryOf = (row: { apiaries: unknown }) =>
    row.apiaries && typeof row.apiaries === 'object' && 'name' in row.apiaries
      ? (row.apiaries as { name: string }).name
      : 'Unknown'

  const data = await resolveByLabel(
    'hive',
    hiveName,
    (pattern, limit) => supabase
      .from('hives')
      .select('id, hive_number, apiaries(name)')
      .in('apiary_id', apiaryIds)
      .ilike('hive_number', pattern)
      .order('hive_number')
      .limit(limit),
    (row) => `Hive ${row.hive_number} (${apiaryOf(row)})`
  )
  if (!data) return null

  return {
    id: data.id,
    hive_number: data.hive_number,
    apiary_name: apiaryOf(data)
  }
}

// Find one of the user's queens by number (see resolveByLabel)
export async function findQueenByNumber(userId: string, queenNumber: string): Promise<{
  id: string
  queen_number: string
} | null> {
  const supabase = getSupabase()
  return resolveByLabel(
    'queen',
    queenNumber,
    (pattern, limit) => supabase
      .from('queens')
      .select('id, queen_number')
      .eq('user_id', userId)
      .ilike('queen_number', pattern)
      .order('queen_number')
      .limit(limit),
    (row) => `Queen ${row.queen_number}`
  )
}

// Find one of the user's rearing batches by name (see resolveByLabel)
export async function findBatchByName(userId: string, batchName: string): Promise<{
  id: string
  batch_name: string
} | null> {
  const supabase = getSupabase()
  return resolveByLabel(
    'batch',
    batchName,
    (pattern, limit) => supabase
      .from('rearing_batches')
      .select('id, batch_name')
      .eq('user_id', userId)
      .ilike('batch_name', pattern)
      .order('batch_name')
      .limit(limit),
    (row) => row.batch_name
  )
}

// The tools run on the server (UTC), but "today" and day counts must follow the beekeeper's
// calendar in Ireland. The helpers live in src/lib/dublin-date.ts (shared with the API routes)
// and are re-exported here so the tools keep importing them from './utils'.
export { toDublinDate, todayInDublin, addDaysISO }

// A stored value as an Irish calendar date: date columns pass through, timestamps convert
function toCalendarDay(value: string): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : toDublinDate(new Date(value))
}

// Whole calendar days from `from` to `to`
function calendarDaysBetween(from: string, to: string): number {
  return Math.round((Date.parse(toCalendarDay(to)) - Date.parse(toCalendarDay(from))) / 86_400_000)
}

// Format date for display
export function formatDate(date: string | null): string {
  if (!date) return 'N/A'
  return new Date(date).toLocaleDateString('en-IE', {
    timeZone: BEEKEEPER_TIME_ZONE,
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

// Calendar days since a date (0 = today)
export function daysSince(date: string | null): number | null {
  if (!date) return null
  return calendarDaysBetween(date, todayInDublin())
}

// Calendar days until a date (0 = today, 1 = tomorrow)
export function daysUntil(date: string | null): number | null {
  if (!date) return null
  return calendarDaysBetween(todayInDublin(), date)
}
