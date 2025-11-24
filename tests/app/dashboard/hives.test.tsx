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

describe('HivesPage - Create Hive', () => {
  const mockUserId = 'user-123'
  const mockApiaryId = 'apiary-456'

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock for empty hives list
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null
          })
        })
      })
    })
  })

  describe('RLS Policy Compliance - user_id field', () => {
    it('should include user_id when creating a new hive', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'new-hive-123' },
            error: null
          })
        })
      })

      const mockApiarySelect = vi.fn().mockReturnValue({
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

      mockFrom.mockImplementation((table: string) => {
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            }),
            insert: mockInsert
          }
        } else if (table === 'apiaries') {
          return {
            select: mockApiarySelect
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
      })

      // Open the add hive form
      const addButton = screen.getByRole('button', { name: /add hive/i })
      await userEvent.click(addButton)

      // Fill in required fields
      const hiveNumberInput = screen.getByLabelText(/hive number/i)
      await userEvent.type(hiveNumberInput, 'TEST-H1')

      // Submit the form
      const submitButton = screen.getByRole('button', { name: /^add hive$/i })
      await userEvent.click(submitButton)

      // Verify that insert was called with user_id
      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith([
          expect.objectContaining({
            hive_number: 'TEST-H1',
            user_id: mockUserId
          })
        ])
      })
    })

    it('should verify apiary ownership before creating hive', async () => {
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
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            }),
            insert: mockInsert
          }
        } else if (table === 'apiaries') {
          return {
            select: mockApiaryCheck
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
      })

      const addButton = screen.getByRole('button', { name: /add hive/i })
      await userEvent.click(addButton)

      const hiveNumberInput = screen.getByLabelText(/hive number/i)
      await userEvent.type(hiveNumberInput, 'TEST-H1')

      // Select an apiary
      const apiarySelect = screen.getByLabelText(/apiary/i)
      await userEvent.selectOptions(apiarySelect, mockApiaryId)

      const submitButton = screen.getByRole('button', { name: /^add hive$/i })
      await userEvent.click(submitButton)

      // Verify apiary ownership was checked
      await waitFor(() => {
        expect(mockApiaryCheck).toHaveBeenCalled()
      })

      // Verify insert was called after ownership check passed
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

    it('should reject hive creation if apiary does not belong to user', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

      const mockApiaryCheck = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: mockApiaryId,
              user_id: 'different-user-789', // Different user
              name: 'Someone Elses Apiary'
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
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            }),
            insert: mockInsert
          }
        } else if (table === 'apiaries') {
          return {
            select: mockApiaryCheck
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
      })

      const addButton = screen.getByRole('button', { name: /add hive/i })
      await userEvent.click(addButton)

      const hiveNumberInput = screen.getByLabelText(/hive number/i)
      await userEvent.type(hiveNumberInput, 'TEST-H1')

      const apiarySelect = screen.getByLabelText(/apiary/i)
      await userEvent.selectOptions(apiarySelect, mockApiaryId)

      const submitButton = screen.getByRole('button', { name: /^add hive$/i })
      await userEvent.click(submitButton)

      // Should show error alert
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          expect.stringContaining('does not belong to you')
        )
      })

      // Insert should NOT be called
      expect(mockInsert).not.toHaveBeenCalled()

      alertSpy.mockRestore()
    })

    it('should allow hive creation without apiary (null apiary_id)', async () => {
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
                order: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
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
      })

      const addButton = screen.getByRole('button', { name: /add hive/i })
      await userEvent.click(addButton)

      const hiveNumberInput = screen.getByLabelText(/hive number/i)
      await userEvent.type(hiveNumberInput, 'TEST-H1')

      // Don't select an apiary - leave it as null
      const submitButton = screen.getByRole('button', { name: /^add hive$/i })
      await userEvent.click(submitButton)

      // Should insert with null apiary_id
      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith([
          expect.objectContaining({
            hive_number: 'TEST-H1',
            apiary_id: null,
            user_id: mockUserId
          })
        ])
      })
    })
  })
})
