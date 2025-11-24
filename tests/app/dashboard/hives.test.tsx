import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HivesPage from '@/app/dashboard/hives/page'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush
  })
}))

// Hoist mocks
const { mockFrom, mockSupabaseClient } = vi.hoisted(() => {
  const mockFrom = vi.fn()
  const mockSupabaseClient = {
    from: mockFrom
  }
  return { mockFrom, mockSupabaseClient }
})

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabaseClient
}))

// Mock auth
vi.mock('@/lib/auth', () => ({
  getCurrentUserId: vi.fn().mockResolvedValue('user-123')
}))

describe('HivesPage - Create Hive RLS Policy', () => {
  const mockUserId = 'user-123'
  const mockApiaryId = 'apiary-456'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('user_id field requirement for RLS compliance', () => {
    it('should include user_id in insert data', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'new-hive-123' },
            error: null
          })
        })
      })

      // Setup comprehensive mocks for all the queries that HivesPage makes
      mockFrom.mockImplementation((table: string) => {
        switch (table) {
          case 'hives':
            // Mock for fetching hives list (returns empty)
            const hivesMock = {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  or: vi.fn().mockReturnValue({
                    is: vi.fn().mockReturnValue({
                      order: vi.fn().mockResolvedValue({
                        data: [],
                        error: null
                      })
                    })
                  }),
                  order: vi.fn().mockResolvedValue({
                    data: [],
                    error: null
                  })
                })
              }),
              insert: mockInsert
            }
            return hivesMock

          case 'apiaries':
            // Mock for fetching apiaries list and ownership check
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: {
                      id: mockApiaryId,
                      user_id: mockUserId,
                      name: 'Test Apiary'
                    },
                    error: null
                  }),
                  order: vi.fn().mockResolvedValue({
                    data: [{ id: mockApiaryId, name: 'Test Apiary' }],
                    error: null
                  })
                })
              })
            }

          case 'queens':
            // Mock for queens dropdown
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: [],
                    error: null
                  })
                }),
                in: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            }

          case 'hive_configuration_history':
            // Mock for configuration history
            return {
              insert: vi.fn().mockResolvedValue({
                data: null,
                error: null
              })
            }

          case 'team_apiaries':
          case 'inspections':
          case 'varroa_treatments':
          case 'varroa_checks':
          case 'feeding_records':
          case 'honey_harvests':
          case 'tasks_events':
            // Mock for other queries - return empty arrays
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: [],
                    error: null
                  }),
                  limit: vi.fn().mockResolvedValue({
                    data: [],
                    error: null
                  })
                }),
                in: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({
                      data: [],
                      error: null
                    }),
                    limit: vi.fn().mockResolvedValue({
                      data: [],
                      error: null
                    })
                  })
                })
              })
            }

          default:
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  order: vi.fn().mockResolvedValue({
                    data: [],
                    error: null
                  })
                })
              })
            }
        }
      })

      render(<HivesPage />)

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading hives...')).not.toBeInTheDocument()
      }, { timeout: 3000 })

      // Open the add hive form
      const addButton = screen.getByRole('button', { name: /add hive/i })
      await userEvent.click(addButton)

      // Fill in required field - hive number
      const hiveNumberInput = screen.getByLabelText(/hive number/i)
      await userEvent.type(hiveNumberInput, 'TEST-H1')

      // Select an apiary
      const apiarySelect = screen.getByLabelText(/apiary location/i)
      await userEvent.selectOptions(apiarySelect, mockApiaryId)

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /add hive/i })
      await userEvent.click(submitButton)

      // Verify that insert was called with user_id
      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith([
          expect.objectContaining({
            hive_number: 'TEST-H1',
            apiary_id: mockApiaryId,
            user_id: mockUserId
          })
        ])
      })
    })

    it('should verify apiary ownership before inserting hive', async () => {
      const mockApiaryCheck = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: mockApiaryId,
              user_id: mockUserId,
              name: 'Test Apiary'
            },
            error: null
          })
        })
      })

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'new-hive-123' },
            error: null
          })
        })
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'apiaries') {
          return {
            select: mockApiaryCheck
          }
        } else if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                or: vi.fn().mockReturnValue({
                  is: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({
                      data: [],
                      error: null
                    })
                  })
                })
              })
            }),
            insert: mockInsert
          }
        } else if (table === 'hive_configuration_history') {
          return {
            insert: vi.fn().mockResolvedValue({
              data: null,
              error: null
            })
          }
        }
        // Default fallback
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            }),
            in: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        }
      })

      render(<HivesPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading hives...')).not.toBeInTheDocument()
      }, { timeout: 3000 })

      const addButton = screen.getByRole('button', { name: /add hive/i })
      await userEvent.click(addButton)

      const hiveNumberInput = screen.getByLabelText(/hive number/i)
      await userEvent.type(hiveNumberInput, 'TEST-H2')

      const apiarySelect = screen.getByLabelText(/apiary location/i)
      await userEvent.selectOptions(apiarySelect, mockApiaryId)

      const submitButton = screen.getByRole('button', { name: /add hive/i })
      await userEvent.click(submitButton)

      // Verify apiary ownership was checked
      await waitFor(() => {
        expect(mockApiaryCheck).toHaveBeenCalled()
      })

      // Verify insert was called with correct data after ownership check
      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith([
          expect.objectContaining({
            hive_number: 'TEST-H2',
            apiary_id: mockApiaryId,
            user_id: mockUserId
          })
        ])
      })
    })

    it('should allow hive creation without apiary (null apiary_id complies with RLS policy)', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'new-hive-123' },
            error: null
          })
        })
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                or: vi.fn().mockReturnValue({
                  is: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({
                      data: [],
                      error: null
                    })
                  })
                })
              })
            }),
            insert: mockInsert
          }
        } else if (table === 'hive_configuration_history') {
          return {
            insert: vi.fn().mockResolvedValue({
              data: null,
              error: null
            })
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        }
      })

      render(<HivesPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading hives...')).not.toBeInTheDocument()
      }, { timeout: 3000 })

      const addButton = screen.getByRole('button', { name: /add hive/i })
      await userEvent.click(addButton)

      const hiveNumberInput = screen.getByLabelText(/hive number/i)
      await userEvent.type(hiveNumberInput, 'TEST-H3')

      // Don't select an apiary - leave it as the default empty value
      const submitButton = screen.getByRole('button', { name: /add hive/i })
      await userEvent.click(submitButton)

      // Should insert with null/empty apiary_id and user_id
      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith([
          expect.objectContaining({
            hive_number: 'TEST-H3',
            user_id: mockUserId
          })
        ])
      })
    })
  })
})
