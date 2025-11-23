import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getCurrentUserId,
  requireUserId,
  isAuthenticated,
  getUserRole,
  getUserProfile,
  isAdmin,
  requireAdmin,
  isAccountActive,
  requireActiveAccount,
  hasActiveSubscription,
  type UserRole,
  type UserProfile
} from '@/lib/auth'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      signOut: vi.fn()
    },
    from: vi.fn()
  }
}))

// Import the mocked supabase
import { supabase } from '@/lib/supabase'

describe('Authentication Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Clear console.error mock
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('getCurrentUserId', () => {
    it('should return user ID when authenticated', async () => {
      const mockUserId = 'user-123'
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            user: { id: mockUserId } as any
          } as any
        },
        error: null
      })

      const result = await getCurrentUserId()
      expect(result).toBe(mockUserId)
    })

    it('should return null when not authenticated', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null
      })

      const result = await getCurrentUserId()
      expect(result).toBeNull()
    })

    it('should return null on error', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: new Error('Session error') as any
      })

      const result = await getCurrentUserId()
      expect(result).toBeNull()
      expect(console.error).toHaveBeenCalled()
    })

    it('should handle missing session user gracefully', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: {} as any },
        error: null
      })

      const result = await getCurrentUserId()
      expect(result).toBeNull()
    })
  })

  describe('requireUserId', () => {
    it('should return user ID when authenticated', async () => {
      const mockUserId = 'user-456'
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            user: { id: mockUserId } as any
          } as any
        },
        error: null
      })

      const result = await requireUserId()
      expect(result).toBe(mockUserId)
    })

    it('should throw error when not authenticated', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null
      })

      await expect(requireUserId()).rejects.toThrow('User must be authenticated')
    })
  })

  describe('isAuthenticated', () => {
    it('should return true when user is authenticated', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            user: { id: 'user-789' } as any
          } as any
        },
        error: null
      })

      const result = await isAuthenticated()
      expect(result).toBe(true)
    })

    it('should return false when user is not authenticated', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null
      })

      const result = await isAuthenticated()
      expect(result).toBe(false)
    })
  })

  describe('getUserRole', () => {
    it('should return Admin role for admin user', async () => {
      const mockUserId = 'admin-123'
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            user: { id: mockUserId } as any
          } as any
        },
        error: null
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'Admin' },
              error: null
            })
          })
        })
      })
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const result = await getUserRole()
      expect(result).toBe('Admin')
    })

    it('should return User role for regular user', async () => {
      const mockUserId = 'user-123'
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            user: { id: mockUserId } as any
          } as any
        },
        error: null
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'User' },
              error: null
            })
          })
        })
      })
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const result = await getUserRole()
      expect(result).toBe('User')
    })

    it('should return User as default when not authenticated', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null
      })

      const result = await getUserRole()
      expect(result).toBe('User')
    })

    it('should return User on database error', async () => {
      const mockUserId = 'user-123'
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            user: { id: mockUserId } as any
          } as any
        },
        error: null
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Database error')
            })
          })
        })
      })
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const result = await getUserRole()
      expect(result).toBe('User')
      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('getUserProfile', () => {
    it('should return user profile when authenticated', async () => {
      const mockUserId = 'user-123'
      const mockProfile: UserProfile = {
        id: mockUserId,
        role: 'User',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-15T00:00:00Z'
      }

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            user: { id: mockUserId } as any
          } as any
        },
        error: null
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: mockProfile,
              error: null
            })
          })
        })
      })
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const result = await getUserProfile()
      expect(result).toEqual(mockProfile)
    })

    it('should return null when not authenticated', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null
      })

      const result = await getUserProfile()
      expect(result).toBeNull()
    })

    it('should return null on database error', async () => {
      const mockUserId = 'user-123'
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            user: { id: mockUserId } as any
          } as any
        },
        error: null
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: new Error('Profile not found')
            })
          })
        })
      })
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const result = await getUserProfile()
      expect(result).toBeNull()
      expect(console.error).toHaveBeenCalled()
    })
  })

  describe('isAdmin', () => {
    it('should return true for admin user', async () => {
      const mockUserId = 'admin-123'
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            user: { id: mockUserId } as any
          } as any
        },
        error: null
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'Admin' },
              error: null
            })
          })
        })
      })
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const result = await isAdmin()
      expect(result).toBe(true)
    })

    it('should return false for regular user', async () => {
      const mockUserId = 'user-123'
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            user: { id: mockUserId } as any
          } as any
        },
        error: null
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'User' },
              error: null
            })
          })
        })
      })
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const result = await isAdmin()
      expect(result).toBe(false)
    })
  })

  describe('requireAdmin', () => {
    it('should not throw for admin user', async () => {
      const mockUserId = 'admin-123'
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            user: { id: mockUserId } as any
          } as any
        },
        error: null
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'Admin' },
              error: null
            })
          })
        })
      })
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      await expect(requireAdmin()).resolves.toBeUndefined()
    })

    it('should throw for regular user', async () => {
      const mockUserId = 'user-123'
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            user: { id: mockUserId } as any
          } as any
        },
        error: null
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { role: 'User' },
              error: null
            })
          })
        })
      })
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      await expect(requireAdmin()).rejects.toThrow('Admin access required')
    })
  })

  describe('isAccountActive', () => {
    it('should return true for active account', async () => {
      const mockUserId = 'user-active-123'
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            user: { id: mockUserId } as any
          } as any
        },
        error: null
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { is_active: true },
              error: null
            })
          })
        })
      })
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const result = await isAccountActive()
      expect(result).toBe(true)
    })

    it('should return false for disabled account', async () => {
      const mockUserId = 'user-disabled-456'
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            user: { id: mockUserId } as any
          } as any
        },
        error: null
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { is_active: false },
              error: null
            })
          })
        })
      })
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const result = await isAccountActive()
      expect(result).toBe(false)
    })

    it('should return true when is_active is null (defaults to active)', async () => {
      const mockUserId = 'user-123'
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            user: { id: mockUserId } as any
          } as any
        },
        error: null
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { is_active: null },
              error: null
            })
          })
        })
      })
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const result = await isAccountActive()
      expect(result).toBe(true)
    })

    it('should return false when not authenticated', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null
      })

      const result = await isAccountActive()
      expect(result).toBe(false)
    })
  })

  describe('requireActiveAccount', () => {
    it('should not throw for active account', async () => {
      const mockUserId = 'user-123'
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            user: { id: mockUserId } as any
          } as any
        },
        error: null
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { is_active: true },
              error: null
            })
          })
        })
      })
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      await expect(requireActiveAccount()).resolves.toBeUndefined()
    })

    it('should throw and sign out for disabled account', async () => {
      const mockUserId = 'user-disabled-require-789'
      const mockSignOut = vi.fn().mockResolvedValue({})

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            user: { id: mockUserId } as any
          } as any
        },
        error: null
      })
      vi.mocked(supabase.auth.signOut).mockImplementation(mockSignOut)

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { is_active: false },
              error: null
            })
          })
        })
      })
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      await expect(requireActiveAccount()).rejects.toThrow('Your account has been disabled')
      expect(mockSignOut).toHaveBeenCalled()
    })
  })

  describe('hasActiveSubscription', () => {
    it('should return true for active subscription', async () => {
      const mockUserId = 'user-123'
      const futureDate = new Date()
      futureDate.setFullYear(futureDate.getFullYear() + 1)

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            user: { id: mockUserId } as any
          } as any
        },
        error: null
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { subscription_expires_at: futureDate.toISOString() },
              error: null
            })
          })
        })
      })
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const result = await hasActiveSubscription()
      expect(result).toBe(true)
    })

    it('should return false for expired subscription', async () => {
      const mockUserId = 'user-123'
      const pastDate = new Date()
      pastDate.setFullYear(pastDate.getFullYear() - 1)

      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            user: { id: mockUserId } as any
          } as any
        },
        error: null
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { subscription_expires_at: pastDate.toISOString() },
              error: null
            })
          })
        })
      })
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const result = await hasActiveSubscription()
      expect(result).toBe(false)
    })

    it('should return false when no subscription exists', async () => {
      const mockUserId = 'user-123'
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: {
          session: {
            user: { id: mockUserId } as any
          } as any
        },
        error: null
      })

      const mockFrom = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { subscription_expires_at: null },
              error: null
            })
          })
        })
      })
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const result = await hasActiveSubscription()
      expect(result).toBe(false)
    })

    it('should return false when not authenticated', async () => {
      vi.mocked(supabase.auth.getSession).mockResolvedValue({
        data: { session: null },
        error: null
      })

      const result = await hasActiveSubscription()
      expect(result).toBe(false)
    })
  })
})
