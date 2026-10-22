import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockQuery } from '../utils/supabase-mock'

// requireUser / requireAdmin guard every signed-in API route, so each refusal path is pinned.
const { mockGetUser, mockFrom } = vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL ??= 'https://test.supabase.co'
  process.env.SUPABASE_SERVICE_ROLE_KEY ??= 'test-service-role-key'
  return { mockGetUser: vi.fn(), mockFrom: vi.fn() }
})

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({ auth: { getUser: mockGetUser }, from: mockFrom })),
}))

import { requireUser, requireAdmin } from '@/lib/server/api-auth'

const USER = { id: 'user-1', email: 'user@example.com' }

function request(authorization?: string) {
  return new Request('http://localhost/api/test', {
    headers: authorization ? { Authorization: authorization } : {},
  })
}

function profile(data: Record<string, unknown> | null) {
  mockFrom.mockReturnValue(mockQuery({ data, error: data ? null : { message: 'No rows' } }))
}

async function status(result: Awaited<ReturnType<typeof requireUser>>) {
  if (!('response' in result)) return { status: 200, error: undefined }
  return { status: result.response.status, error: (await result.response.json()).error }
}

describe('requireUser', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: USER }, error: null })
  })

  it('refuses a request with no Authorization header', async () => {
    expect(await status(await requireUser(request()))).toEqual({ status: 401, error: 'Unauthorised' })
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('refuses a header that is not a Bearer token', async () => {
    expect((await status(await requireUser(request('Basic abc123')))).status).toBe(401)
    expect((await status(await requireUser(request('abc123')))).status).toBe(401)
    expect(mockGetUser).not.toHaveBeenCalled()
  })

  it('refuses an invalid token', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'invalid JWT' } })
    expect((await status(await requireUser(request('Bearer bad-token')))).status).toBe(401)
    expect(mockGetUser).toHaveBeenCalledWith('bad-token')
  })

  it('refuses a deactivated account when requireActive is set', async () => {
    profile({ is_active: false })
    expect(await status(await requireUser(request('Bearer good-token'), { requireActive: true })))
      .toEqual({ status: 403, error: 'Account is not active' })
  })

  it('returns the user, client and token on success', async () => {
    profile({ is_active: true })
    const result = await requireUser(request('Bearer good-token'), { requireActive: true })
    expect('response' in result).toBe(false)
    if (!('response' in result)) {
      expect(result.user.id).toBe('user-1')
      expect(result.token).toBe('good-token')
      expect(result.supabaseAdmin).toBeDefined()
    }
  })
})

describe('requireAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: USER }, error: null })
  })

  it('refuses a signed-in user who is not an Admin', async () => {
    profile({ role: 'User', is_active: true })
    expect(await status(await requireAdmin(request('Bearer good-token'))))
      .toEqual({ status: 403, error: 'Admin access required' })
  })

  it('refuses a deactivated Admin', async () => {
    profile({ role: 'Admin', is_active: false })
    expect((await status(await requireAdmin(request('Bearer good-token')))).status).toBe(403)
  })

  it('refuses when the profile cannot be read', async () => {
    profile(null)
    expect((await status(await requireAdmin(request('Bearer good-token')))).status).toBe(403)
  })

  it('passes through the 401 from requireUser', async () => {
    expect((await status(await requireAdmin(request()))).status).toBe(401)
  })

  it('allows an active Admin', async () => {
    profile({ role: 'Admin', is_active: true })
    const result = await requireAdmin(request('Bearer good-token'))
    expect('response' in result).toBe(false)
  })
})
