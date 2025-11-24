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

  describe('RLS Policy - check_user_owns_apiary function with user_id parameter', () => {
    it('should call check_user_owns_apiary RPC with user_id before insert', async () => {
      const mockRpc = vi.fn().mockResolvedValue({
        data: true,
        error: null
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
        switch (table) {
          case 'hives':
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
                  }),
                  order: vi.fn().mockResolvedValue({
                    data: [],
                    error: null
                  })
                })
              }),
              insert: mockInsert
            }

          case 'apiaries':
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
            return {
              insert: vi.fn().mockResolvedValue({
                data: null,
                error: null
              })
            }

          default:
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
                  eq: vi.fn().mockResolvedValue({
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
        }
      })

      // Mock the RPC call
      const mockSupabaseWithRpc = {
        ...mockSupabaseClient,
        rpc: mockRpc,
        auth: {
          getSession: vi.fn().mockResolvedValue({
            data: {
              session: {
                user: { id: mockUserId },
                access_token: 'mock-token'
              }
            },
            error: null
          })
        }
      }

      vi.mocked(mockSupabaseClient).rpc = mockRpc
      vi.mocked(mockSupabaseClient).auth = mockSupabaseWithRpc.auth

      render(<HivesPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading hives...')).not.toBeInTheDocument()
      }, { timeout: 3000 })

      const addButton = screen.getByRole('button', { name: /add hive/i })
      await userEvent.click(addButton)

      const hiveNumberInput = screen.getByLabelText(/hive number/i)
      await userEvent.type(hiveNumberInput, 'TEST-H4')

      const apiarySelect = screen.getByLabelText(/apiary location/i)
      await userEvent.selectOptions(apiarySelect, mockApiaryId)

      const submitButton = screen.getByRole('button', { name: /add hive/i })
      await userEvent.click(submitButton)

      // Verify RPC was called with correct parameters
      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith('check_user_owns_apiary', {
          apiary_uuid: mockApiaryId,
          user_uuid: mockUserId
        })
      })

      // Verify insert was called after successful ownership check
      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith([
          expect.objectContaining({
            hive_number: 'TEST-H4',
            apiary_id: mockApiaryId,
            user_id: mockUserId
          })
        ])
      })
    })

    it('should verify auth session exists before insert', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'new-hive-123' },
            error: null
          })
        })
      })

      const mockGetSession = vi.fn().mockResolvedValue({
        data: {
          session: {
            user: { id: mockUserId },
            access_token: 'mock-access-token'
          }
        },
        error: null
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
                }),
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

      vi.mocked(mockSupabaseClient).auth = {
        getSession: mockGetSession
      } as any

      render(<HivesPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading hives...')).not.toBeInTheDocument()
      }, { timeout: 3000 })

      const addButton = screen.getByRole('button', { name: /add hive/i })
      await userEvent.click(addButton)

      const hiveNumberInput = screen.getByLabelText(/hive number/i)
      await userEvent.type(hiveNumberInput, 'TEST-H5')

      const submitButton = screen.getByRole('button', { name: /add hive/i })
      await userEvent.click(submitButton)

      // Verify getSession was called before insert
      await waitFor(() => {
        expect(mockGetSession).toHaveBeenCalled()
      })

      // Verify insert was called after session check
      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith([
          expect.objectContaining({
            hive_number: 'TEST-H5',
            user_id: mockUserId
          })
        ])
      })
    })

    it('should throw error if no active session found', async () => {
      const mockGetSession = vi.fn().mockResolvedValue({
        data: { session: null },
        error: null
      })

      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

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
            insert: vi.fn()
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

      vi.mocked(mockSupabaseClient).auth = {
        getSession: mockGetSession
      } as any

      render(<HivesPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading hives...')).not.toBeInTheDocument()
      }, { timeout: 3000 })

      const addButton = screen.getByRole('button', { name: /add hive/i })
      await userEvent.click(addButton)

      const hiveNumberInput = screen.getByLabelText(/hive number/i)
      await userEvent.type(hiveNumberInput, 'TEST-H6')

      const submitButton = screen.getByRole('button', { name: /add hive/i })
      await userEvent.click(submitButton)

      // Should show alert about no active session
      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          expect.stringContaining('No active session found')
        )
      })

      alertSpy.mockRestore()
    })
  })
})
