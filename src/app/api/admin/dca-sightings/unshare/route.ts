import { NextRequest, NextResponse } from 'next/server'
import { MALFORMED_BODY, readJsonBody, requireAdmin } from '@/lib/server/api-auth'
import { logAdminAction } from '@/lib/admin-audit'

/**
 * Moderation for shared DCA sightings: an Admin takes one off the shared map.
 *
 * The sighting itself is kept. It goes back to being private to the beekeeper who recorded
 * it, and still counts towards their own predictions. Body: `{ id }`.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request)
  if ('response' in auth) return auth.response
  const { user, supabaseAdmin } = auth

  const body = await readJsonBody<{ id?: unknown }>(request)
  if (!body) return NextResponse.json({ error: MALFORMED_BODY }, { status: 400 })
  const id = body.id
  if (typeof id !== 'string' || !UUID.test(id)) {
    return NextResponse.json({ error: 'Missing or invalid sighting id' }, { status: 400 })
  }

  // Only a sighting that is shared right now is changed, so a repeat or a stale tap is a 404
  const { data, error } = await supabaseAdmin
    .from('dca_confirmations')
    .update({ is_shared: false })
    .eq('id', id)
    .eq('is_shared', true)
    .select('id, user_id')

  if (error) {
    console.error('Failed to unshare a DCA sighting:', error.message)
    return NextResponse.json({ error: 'Could not remove the sighting from the shared map' }, { status: 500 })
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'This sighting is no longer shared' }, { status: 404 })
  }

  await logAdminAction(supabaseAdmin, {
    adminId: user.id,
    action: 'dca_sighting_unshared',
    targetUserId: data[0].user_id as string,
    details: { sightingId: id },
  })

  return NextResponse.json({ ok: true })
}
