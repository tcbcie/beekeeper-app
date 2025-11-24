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

  describe('RLS Policy - Permissive policies with application-layer security', () => {
    it('should successfully insert hive with user_id when RLS policies are permissive', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'new-hive-rls-test' },
            error: null
          })
        })
      })

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  is: vi.fn().mockResolvedValue({
                    data: [],
                    error: null,
                    count: 0
                  })
                })
              })
            }),
            insert: mockInsert
          }
        }
        if (table === 'apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [{ id: mockApiaryId, name: 'Test Apiary' }],
                error: null
              })
            })
          }
        }
        if (table === 'queens') {
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
        return { select: vi.fn() }
      })

      mockSupabaseClient.from = mockFrom
      mockSupabaseClient.auth = {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: { id: mockUserId },
              access_token: 'valid-token'
            }
          },
          error: null
        }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } }
        })
      }
      mockSupabaseClient.rpc = vi.fn().mockResolvedValue({
        data: true,
        error: null
      })

      render(<HivesPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading hives...')).not.toBeInTheDocument()
      }, { timeout: 3000 })

      const addButton = screen.getByRole('button', { name: /add hive/i })
      await userEvent.click(addButton)

      const hiveNumberInput = screen.getByLabelText(/hive number/i)
      await userEvent.type(hiveNumberInput, 'RLS-TEST-H1')

      const apiarySelect = screen.getByLabelText(/apiary/i)
      await userEvent.selectOptions(apiarySelect, mockApiaryId)

      const submitButton = screen.getByRole('button', { name: /add hive/i })
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalled()
        const insertCall = mockInsert.mock.calls[0][0]
        expect(insertCall[0]).toMatchObject({
          hive_number: 'RLS-TEST-H1',
          apiary_id: mockApiaryId,
          user_id: mockUserId
        })
      })
    })

    it('should allow SELECT operations with permissive RLS policy', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockResolvedValue({
              data: [
                { id: 'hive-1', hive_number: 'H1', user_id: mockUserId },
                { id: 'hive-2', hive_number: 'H2', user_id: mockUserId }
              ],
              error: null,
              count: 2
            })
          })
        })
      })

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'hives') {
          return { select: mockSelect }
        }
        if (table === 'apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          }
        }
        if (table === 'queens') {
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
        return { select: vi.fn() }
      })

      mockSupabaseClient.from = mockFrom
      mockSupabaseClient.auth = {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: { id: mockUserId },
              access_token: 'valid-token'
            }
          },
          error: null
        }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } }
        })
      }

      render(<HivesPage />)

      await waitFor(() => {
        expect(mockSelect).toHaveBeenCalled()
        expect(screen.getByText('H1')).toBeInTheDocument()
        expect(screen.getByText('H2')).toBeInTheDocument()
      })
    })

    it('should enforce application-layer security by filtering queries with user_id', async () => {
      const mockEq = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({
            data: [],
            error: null,
            count: 0
          })
        })
      })

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq
      })

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'hives') {
          return { select: mockSelect }
        }
        if (table === 'apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          }
        }
        if (table === 'queens') {
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
        return { select: vi.fn() }
      })

      mockSupabaseClient.from = mockFrom
      mockSupabaseClient.auth = {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: { id: mockUserId },
              access_token: 'valid-token'
            }
          },
          error: null
        }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } }
        })
      }

      render(<HivesPage />)

      await waitFor(() => {
        expect(mockSelect).toHaveBeenCalled()
        // Verify that the application code filters by user_id
        expect(mockEq).toHaveBeenCalledWith('user_id', mockUserId)
      })
    })
  })

  describe('Configuration Change Tracking Visibility', () => {
    const mockUserId = 'user-123'
    const otherUserId = 'user-456'

    it('should hide "Last changed" for non-shared hives', async () => {
      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  is: vi.fn().mockResolvedValue({
                    data: [{
                      id: 'hive-1',
                      hive_number: 'H1',
                      user_id: mockUserId,
                      is_shared: false,
                      configuration_changed_at: '2025-01-15T10:30:00Z',
                      configuration: { brood_boxes_full: 1 }
                    }],
                    error: null,
                    count: 1
                  })
                })
              })
            })
          }
        }
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) }
      })

      mockSupabaseClient.from = mockFrom
      mockSupabaseClient.auth = {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: mockUserId }, access_token: 'token' } },
          error: null
        }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } }
        })
      }

      render(<HivesPage />)

      await waitFor(() => {
        expect(screen.getByText('H1')).toBeInTheDocument()
      })

      // Should NOT show "Last changed" for non-shared hives
      expect(screen.queryByText(/Last changed:/)).not.toBeInTheDocument()
    })

    it('should hide "Last changed" for shared hives owned by current user', async () => {
      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  is: vi.fn().mockResolvedValue({
                    data: [{
                      id: 'hive-1',
                      hive_number: 'H1',
                      user_id: mockUserId,
                      is_shared: true,
                      team_name: 'Test Team',
                      configuration_changed_at: '2025-01-15T10:30:00Z',
                      configuration: { brood_boxes_full: 1 }
                    }],
                    error: null,
                    count: 1
                  })
                })
              })
            })
          }
        }
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) }
      })

      mockSupabaseClient.from = mockFrom
      mockSupabaseClient.auth = {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: mockUserId }, access_token: 'token' } },
          error: null
        }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } }
        })
      }

      render(<HivesPage />)

      await waitFor(() => {
        expect(screen.getByText('H1')).toBeInTheDocument()
      })

      // Should NOT show "Last changed" even though it's shared, because user owns it
      expect(screen.queryByText(/Last changed:/)).not.toBeInTheDocument()
    })

    it('should show "Last changed" for shared hives NOT owned by current user', async () => {
      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  is: vi.fn().mockResolvedValue({
                    data: [{
                      id: 'hive-1',
                      hive_number: 'Team Hive 1',
                      user_id: otherUserId,
                      is_shared: true,
                      team_name: 'Test Team',
                      configuration_changed_at: '2025-01-15T10:30:00Z',
                      configuration_changer: {
                        full_name: 'John Doe',
                        email: 'john@example.com'
                      },
                      configuration: { brood_boxes_full: 1 }
                    }],
                    error: null,
                    count: 1
                  })
                })
              })
            })
          }
        }
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) }
      })

      mockSupabaseClient.from = mockFrom
      mockSupabaseClient.auth = {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: mockUserId }, access_token: 'token' } },
          error: null
        }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } }
        })
      }

      render(<HivesPage />)

      await waitFor(() => {
        expect(screen.getByText('Team Hive 1')).toBeInTheDocument()
      })

      // SHOULD show "Last changed" because it's shared and owned by someone else
      await waitFor(() => {
        expect(screen.getByText(/Last changed:/)).toBeInTheDocument()
        expect(screen.getByText(/John Doe/)).toBeInTheDocument()
      })
    })

    it('should hide "Last changed" when configuration_changed_at is null', async () => {
      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  is: vi.fn().mockResolvedValue({
                    data: [{
                      id: 'hive-1',
                      hive_number: 'Team Hive 1',
                      user_id: otherUserId,
                      is_shared: true,
                      team_name: 'Test Team',
                      configuration_changed_at: null,
                      configuration: { brood_boxes_full: 1 }
                    }],
                    error: null,
                    count: 1
                  })
                })
              })
            })
          }
        }
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }) }
      })

      mockSupabaseClient.from = mockFrom
      mockSupabaseClient.auth = {
        getSession: vi.fn().mockResolvedValue({
          data: { session: { user: { id: mockUserId }, access_token: 'token' } },
          error: null
        }),
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } }
        })
      }

      render(<HivesPage />)

      await waitFor(() => {
        expect(screen.getByText('Team Hive 1')).toBeInTheDocument()
      })

      // Should NOT show "Last changed" when timestamp is null
      expect(screen.queryByText(/Last changed:/)).not.toBeInTheDocument()
    })
  })
})
