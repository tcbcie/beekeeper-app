import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * The shared subscription status (C9a-07): a failed check must not be remembered (it locked CRM,
 * the Apiary Map and Logbook for 5 minutes), and clearing the cache after a renewal must make the
 * next caller ask again.
 */

const rpc = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => rpc(...args),
    auth: { onAuthStateChange: vi.fn() },
  },
}))

import { resolveSubscriptionStatus, clearSubscriptionCache } from '@/hooks/useHasActiveSubscription'

describe('subscription status cache', () => {
  beforeEach(() => {
    rpc.mockReset()
    clearSubscriptionCache()
  })

  it('does not remember a failed check', async () => {
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'offline' } })
    rpc.mockResolvedValueOnce({ data: { status: 'active', is_active: true }, error: null })

    expect(await resolveSubscriptionStatus()).toBeNull()
    expect(await resolveSubscriptionStatus()).toEqual({ status: 'active', is_active: true })
    expect(rpc).toHaveBeenCalledTimes(2)
  })

  it('remembers a successful check until cleared', async () => {
    rpc.mockResolvedValue({ data: { status: 'expired', is_active: false }, error: null })
    await resolveSubscriptionStatus()
    await resolveSubscriptionStatus()
    expect(rpc).toHaveBeenCalledTimes(1)

    clearSubscriptionCache()
    rpc.mockResolvedValue({ data: { status: 'active', is_active: true }, error: null })
    expect(await resolveSubscriptionStatus()).toEqual({ status: 'active', is_active: true })
    expect(rpc).toHaveBeenCalledTimes(2)
  })

  it('ignores an answer that arrives after the cache was cleared', async () => {
    let resolveOld!: (v: unknown) => void
    rpc.mockReturnValueOnce(new Promise(r => { resolveOld = r }))
    const old = resolveSubscriptionStatus()
    clearSubscriptionCache()
    resolveOld({ data: { status: 'expired', is_active: false }, error: null })
    await old

    rpc.mockResolvedValueOnce({ data: { status: 'active', is_active: true }, error: null })
    expect(await resolveSubscriptionStatus()).toEqual({ status: 'active', is_active: true })
  })
})
