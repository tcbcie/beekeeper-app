import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Hoist mocks before imports
const { mockAuth, mockFrom, mockSupabaseClient } = vi.hoisted(() => {
  const mockAuth = {
    getSession: vi.fn()
  }
  const mockFrom = vi.fn()
  const mockSupabaseClient = {
    auth: mockAuth,
    from: mockFrom
  }
  return { mockAuth, mockFrom, mockSupabaseClient }
})

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabaseClient
}))

// Import after mocks are set up
import { isAccountActive, clearAccountActiveCache } from '@/lib/auth'

describe('isAccountActive', () => {
  let testCounter = 0

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
    clearAccountActiveCache()
    testCounter++
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // Helper to get unique user ID for each test
  const getMockUserId = () => `test-user-${testCounter}`

  describe('Active Account Cases', () => {
    it('should return true for active account with is_active=true and deleted_at=null', async () => {
      const userId = getMockUserId()
      
      mockAuth.getSession.mockResolvedValue({
        data: { session: { user: { id: userId } } },
        error: null
      })

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { is_active: true, deleted_at: null },
              error: null
            })
          })
        })
      })

      const result = await isAccountActive()
      expect(result).toBe(true)
    })

    it('should return true when is_active is null and deleted_at is null (defaults to active)', async () => {
      const userId = getMockUserId()
      
      mockAuth.getSession.mockResolvedValue({
        data: { session: { user: { id: userId } } },
        error: null
      })

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { is_active: null, deleted_at: null },
              error: null
            })
          })
        })
      })

      const result = await isAccountActive()
      expect(result).toBe(true)
    })

    it('should return true when is_active is undefined and deleted_at is null', async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: { user: { id: getMockUserId() } } },
        error: null
      })

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { is_active: undefined, deleted_at: null },
              error: null
            })
          })
        })
      })

      const result = await isAccountActive()
      expect(result).toBe(true)
    })
  })

  describe('Deactivated Account Cases', () => {
    it('should return false when is_active=false', async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: { user: { id: getMockUserId() } } },
        error: null
      })

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { is_active: false, deleted_at: null },
              error: null
            })
          })
        })
      })

      const result = await isAccountActive()
      expect(result).toBe(false)
    })

    it('should return false when deleted_at is set (soft deleted)', async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: { user: { id: getMockUserId() } } },
        error: null
      })

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                is_active: true,
                deleted_at: '2025-11-20T10:00:00Z'
              },
              error: null
            })
          })
        })
      })

      const result = await isAccountActive()
      expect(result).toBe(false)
    })

    it('should return false when both is_active=false and deleted_at is set', async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: { user: { id: getMockUserId() } } },
        error: null
      })

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                is_active: false,
                deleted_at: '2025-11-20T10:00:00Z'
              },
              error: null
            })
          })
        })
      })

      const result = await isAccountActive()
      expect(result).toBe(false)
    })
  })

  describe('Error Handling - Fail Open Strategy', () => {
    it('should return true on database error (network issue)', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockAuth.getSession.mockResolvedValue({
        data: { session: { user: { id: getMockUserId() } } },
        error: null
      })

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Network error', code: 'NETWORK_ERROR' }
            })
          })
        })
      })

      const result = await isAccountActive()
      expect(result).toBe(true)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error fetching account status:',
        expect.objectContaining({ message: 'Network error' })
      )

      consoleErrorSpy.mockRestore()
    })

    it('should return true on RLS policy error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockAuth.getSession.mockResolvedValue({
        data: { session: { user: { id: getMockUserId() } } },
        error: null
      })

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'RLS policy violation', code: '42501' }
            })
          })
        })
      })

      const result = await isAccountActive()
      expect(result).toBe(true)
      expect(consoleErrorSpy).toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
    })

    it('should return true on timeout error', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockAuth.getSession.mockResolvedValue({
        data: { session: { user: { id: getMockUserId() } } },
        error: null
      })

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Query timeout', code: 'TIMEOUT' }
            })
          })
        })
      })

      const result = await isAccountActive()
      expect(result).toBe(true)
      expect(consoleErrorSpy).toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
    })

    it('should return false when no profile data exists (user not found)', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockAuth.getSession.mockResolvedValue({
        data: { session: { user: { id: getMockUserId() } } },
        error: null
      })

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        })
      })

      const result = await isAccountActive()
      expect(result).toBe(false)
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'No profile data found for user:',
        getMockUserId()
      )

      consoleErrorSpy.mockRestore()
    })
  })

  describe('No User Session', () => {
    it('should return false when no user is logged in', async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: null
      })

      const result = await isAccountActive()
      expect(result).toBe(false)
    })

    it('should return false when session error occurs', async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: null },
        error: { message: 'Session error' }
      })

      const result = await isAccountActive()
      expect(result).toBe(false)
    })
  })

  describe('Caching Behavior', () => {
    it('should cache active status for 5 seconds', async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: { user: { id: getMockUserId() } } },
        error: null
      })

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { is_active: true, deleted_at: null },
            error: null
          })
        })
      })

      mockFrom.mockReturnValue({ select: mockSelect })

      // First call
      await isAccountActive()
      expect(mockSelect).toHaveBeenCalledTimes(1)

      // Second call within 5 seconds - should use cache
      vi.advanceTimersByTime(3000) // 3 seconds
      await isAccountActive()
      expect(mockSelect).toHaveBeenCalledTimes(1) // Still only 1 call

      // Third call after 5 seconds - should query DB again
      vi.advanceTimersByTime(3000) // Total 6 seconds
      await isAccountActive()
      expect(mockSelect).toHaveBeenCalledTimes(2) // Second DB call
    })

    it('should cache inactive status for 5 seconds', async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: { user: { id: getMockUserId() } } },
        error: null
      })

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { is_active: false, deleted_at: null },
            error: null
          })
        })
      })

      mockFrom.mockReturnValue({ select: mockSelect })

      // First call
      const result1 = await isAccountActive()
      expect(result1).toBe(false)
      expect(mockSelect).toHaveBeenCalledTimes(1)

      // Second call within cache TTL
      vi.advanceTimersByTime(4000)
      const result2 = await isAccountActive()
      expect(result2).toBe(false)
      expect(mockSelect).toHaveBeenCalledTimes(1) // Cached
    })
  })

  describe('Edge Cases', () => {
    it('should handle is_active=0 as false (falsy but not boolean false)', async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: { user: { id: getMockUserId() } } },
        error: null
      })

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { is_active: 0, deleted_at: null },
              error: null
            })
          })
        })
      })

      const result = await isAccountActive()
      // is_active: 0 !== false is true, so account is considered active
      expect(result).toBe(true)
    })

    it('should handle deleted_at as empty string (edge case)', async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: { user: { id: getMockUserId() } } },
        error: null
      })

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { is_active: true, deleted_at: '' },
              error: null
            })
          })
        })
      })

      const result = await isAccountActive()
      // Empty string is falsy, so !'' is true, treated as not deleted
      // This edge case is unlikely (DB should store null, not empty string)
      expect(result).toBe(true)
    })

    it('should handle missing fields gracefully', async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: { user: { id: getMockUserId() } } },
        error: null
      })

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {}, // Missing both fields
              error: null
            })
          })
        })
      })

      const result = await isAccountActive()
      // undefined !== false is true, !undefined is true (falsy check)
      // So account is considered active when both fields are missing
      expect(result).toBe(true)
    })
  })

  describe('Real-world Scenarios', () => {
    it('should not lock out active user during temporary network issues', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockAuth.getSession.mockResolvedValue({
        data: { session: { user: { id: getMockUserId() } } },
        error: null
      })

      // Simulate network error on first call
      mockFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'fetch failed', code: 'FETCH_ERROR' }
            })
          })
        })
      })

      const result = await isAccountActive()
      expect(result).toBe(true) // Fail open - allow access
      expect(consoleErrorSpy).toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
    })

    it('should correctly identify soft-deleted user even if is_active field is missing', async () => {
      mockAuth.getSession.mockResolvedValue({
        data: { session: { user: { id: getMockUserId() } } },
        error: null
      })

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                deleted_at: '2025-11-24T10:00:00Z'
                // is_active field missing
              },
              error: null
            })
          })
        })
      })

      const result = await isAccountActive()
      expect(result).toBe(false) // Deleted accounts are inactive
    })
  })
})
