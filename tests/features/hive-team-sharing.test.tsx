import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import HivesPage from '@/app/dashboard/hives/page'

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn()
  })),
  usePathname: () => '/dashboard/hives',
  useSearchParams: () => new URLSearchParams()
}))

// Hoist mock objects for module initialization
const { mockAuth, mockFrom, mockSupabaseClient } = vi.hoisted(() => {
  const mockAuth = {
    getUser: vi.fn(),
    getSession: vi.fn()
  }

  const mockFrom = vi.fn()

  const mockSupabaseClient = {
    auth: mockAuth,
    from: mockFrom
  }

  return { mockAuth, mockFrom, mockSupabaseClient }
})

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabaseClient
}))

// Mock auth helper
vi.mock('@/lib/auth', () => ({
  getCurrentUserId: vi.fn(() => Promise.resolve('owner-user-123'))
}))

// Helper to create basic query chain
const createQueryChain = (data: any) => ({
  is: vi.fn().mockReturnThis(),
  not: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  neq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  order: vi.fn().mockResolvedValue({ data, error: null })
})

describe('Hive Team Owner Sharing Feature', () => {
  const ownerId = 'owner-user-123'
  const apiaryId = 'apiary-456'
  const teamName = 'Test Beekeeping Team'

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default auth mock
    mockAuth.getSession.mockResolvedValue({
      data: { session: { user: { id: ownerId } } },
      error: null
    })
  })

  describe('Shared with Team Indicator', () => {
    it('should display "Shared with Team" badge for hive owner when apiary is shared with a team', async () => {
      const hiveData = {
        id: 'hive-1',
        hive_number: 'H-1',
        apiary_id: apiaryId,
        user_id: ownerId,
        status: 'active',
        queen_id: null,
        queen_marked: false,
        queen_mated: false,
        queen_clipped: false,
        configuration: null,
        apiaries: { name: 'Main Apiary' },
        configuration_changer: null
      }

      let teamApiariesCallCount = 0

      mockFrom.mockImplementation((table: string) => {
        if (table === 'team_members') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ team_id: 'team-789' }],
                error: null
              })
            })
          }
        }

        if (table === 'team_apiaries') {
          teamApiariesCallCount++
          if (teamApiariesCallCount === 1) {
            // First call - getting shared apiary IDs
            return {
              select: vi.fn().mockReturnValue({
                in: vi.fn().mockResolvedValue({
                  data: [{ apiary_id: apiaryId }],
                  error: null
                })
              })
            }
          }
          // Second call - getting team info
          return {
            select: vi.fn().mockReturnValue({
              in: vi.fn().mockResolvedValue({
                data: [{ apiary_id: apiaryId, teams: { name: teamName } }],
                error: null
              })
            })
          }
        }

        if (table === 'apiaries') {
          const apiariesChain: any = {
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [{ id: apiaryId, name: 'Main Apiary', user_id: ownerId }],
              error: null
            })
          }
          apiariesChain.eq.mockReturnValue(apiariesChain)
          apiariesChain.neq.mockReturnValue(apiariesChain)
          apiariesChain.in.mockReturnValue(apiariesChain)

          return {
            select: vi.fn().mockReturnValue(apiariesChain)
          }
        }

        if (table === 'queens') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: [],
                    error: null
                  })
                })
              })
            })
          }
        }

        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue(createQueryChain([hiveData]))
          }
        }

        // Default mock for all other tables (inspections, treatments, etc.)
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [],
                    error: null
                  })
                })
              })
            })
          })
        }
      })

      render(<HivesPage />)

      // Wait for the component to finish loading
      await waitFor(() => {
        expect(screen.queryByText('Loading hives...')).not.toBeInTheDocument()
      }, { timeout: 3000 })

      // Verify the "Shared with Team" badge is displayed
      await waitFor(() => {
        const badge = screen.getByText((content, element) => {
          return element?.textContent === `📤Shared with ${teamName}` || false
        })
        expect(badge).toBeInTheDocument()
      })

      // Verify badge styling
      const badge = screen.getByText((content, element) => {
        return element?.textContent === `📤Shared with ${teamName}` || false
      })

      expect(badge).toHaveClass('bg-purple-100')
      expect(badge).toHaveClass('dark:bg-purple-900/50')
      expect(badge).toHaveClass('text-purple-800')
      expect(badge).toHaveClass('dark:text-purple-300')
    })

    it('should NOT display "Shared with Team" badge when apiary is not shared', async () => {
      const apiaryPrivateId = 'apiary-private-999'

      const hiveData = {
        id: 'hive-3',
        hive_number: 'H-3',
        apiary_id: apiaryPrivateId,
        user_id: ownerId,
        status: 'active',
        queen_id: null,
        queen_marked: false,
        queen_mated: false,
        queen_clipped: false,
        configuration: null,
        apiaries: { name: 'Private Apiary' },
        configuration_changer: null
      }

      mockFrom.mockImplementation((table: string) => {
        if (table === 'team_members') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [], // No team memberships
                error: null
              })
            })
          }
        }

        if (table === 'apiaries') {
          const apiariesChain: any = {
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({
              data: [{ id: apiaryPrivateId, name: 'Private Apiary', user_id: ownerId }],
              error: null
            })
          }
          apiariesChain.eq.mockReturnValue(apiariesChain)
          apiariesChain.neq.mockReturnValue(apiariesChain)
          apiariesChain.in.mockReturnValue(apiariesChain)

          return {
            select: vi.fn().mockReturnValue(apiariesChain)
          }
        }

        if (table === 'queens') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: [],
                    error: null
                  })
                })
              })
            })
          }
        }

        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue(createQueryChain([hiveData]))
          }
        }

        // Default mock for all other tables
        return {
          select: vi.fn().mockReturnValue({
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue({
                    data: [],
                    error: null
                  })
                })
              })
            })
          })
        }
      })

      render(<HivesPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading hives...')).not.toBeInTheDocument()
      }, { timeout: 3000 })

      // Verify hive number is displayed
      expect(screen.getByText('H-3')).toBeInTheDocument()

      // Verify "Shared with Team" badge is NOT present
      const sharedWithBadge = screen.queryByText(/Shared with/i)
      expect(sharedWithBadge).not.toBeInTheDocument()

      // Verify "Shared via Team" badge is also NOT present
      const sharedViaBadge = screen.queryByText(/Shared via/i)
      expect(sharedViaBadge).not.toBeInTheDocument()
    })
  })
})
