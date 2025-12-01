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

// Helper function to create comprehensive default mocks for all tables
const createDefaultTableMock = () => {
  // Create a chainable mock object that returns itself for most methods
  const chainableMock: any = {
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    limit: vi.fn().mockResolvedValue({ data: [], error: null })
  }

  // Make chain methods also return the chainable mock
  chainableMock.eq.mockReturnValue(chainableMock)
  chainableMock.neq.mockReturnValue(chainableMock)
  chainableMock.in.mockReturnValue(chainableMock)
  chainableMock.is.mockReturnValue(chainableMock)
  chainableMock.not.mockReturnValue(chainableMock)
  chainableMock.or.mockReturnValue(chainableMock)
  chainableMock.order.mockReturnValue(chainableMock)

  return {
    select: vi.fn().mockReturnValue(chainableMock),
    insert: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: null, error: null })
      })
    })
  }
}

// Helper function to create hives table mock with insert support
const createHivesMock = (mockInsert: any) => {
  const hivesChain: any = {
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [], error: null })
  }

  hivesChain.is.mockReturnValue(hivesChain)
  hivesChain.not.mockReturnValue(hivesChain)
  hivesChain.eq.mockReturnValue(hivesChain)
  hivesChain.neq.mockReturnValue(hivesChain)
  hivesChain.in.mockReturnValue(hivesChain)
  hivesChain.or.mockReturnValue(hivesChain)

  return {
    select: vi.fn().mockReturnValue(hivesChain),
    insert: mockInsert
  }
}

describe('HivesPage - Create Hive RLS Policy', () => {
  const mockUserId = 'user-123'
  const mockApiaryId = 'apiary-456'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('user_id field requirement for RLS compliance', () => {
    it('should include user_id in insert data', { timeout: 15000 }, async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

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
            return createHivesMock(mockInsert)

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
                  }),
                  neq: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({
                      data: [],
                      error: null
                    })
                  })
                }),
                in: vi.fn().mockReturnValue({
                  neq: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({
                      data: [],
                      error: null
                    })
                  })
                })
              })
            }

          case 'queens':
            // Mock for queens dropdown - supports .eq().eq().order() chain
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({
                      data: [],
                      error: null
                    })
                  }),
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

          case 'team_members':
            // Mock for team memberships query
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            }

          case 'team_apiaries':
          case 'inspections':
          case 'varroa_treatments':
          case 'varroa_checks':
          case 'feeding_records':
          case 'honey_harvests':
          case 'feedings':
          case 'harvests':
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
                    order: vi.fn().mockReturnValue({
                      limit: vi.fn().mockResolvedValue({
                        data: [],
                        error: null
                      })
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
            return createDefaultTableMock()
        }
      })

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

      // Wait for loading to complete
      await waitFor(() => {
        expect(screen.queryByText('Loading hives...')).not.toBeInTheDocument()
      }, { timeout: 3000 })

      // Open the add hive form
      const addButton = screen.getByRole('button', { name: /add hive/i })
      await userEvent.click(addButton)

      // Fill in required field - hive number
      const hiveNumberInput = screen.getByPlaceholderText('e.g., A-1, B-3')
      await userEvent.type(hiveNumberInput, 'TEST-H1')

      // Select an apiary - find the required select in the form
      const selects = screen.getAllByRole('combobox')
      const apiarySelect = selects.find((select: HTMLElement) =>
        (select as HTMLSelectElement).required &&
        select.querySelector('option[value=""]')?.textContent === 'Select apiary'
      ) as HTMLSelectElement
      await userEvent.selectOptions(apiarySelect, mockApiaryId)

      // Submit the form - get the submit button that's inside the form
      const submitButtons = screen.getAllByRole('button', { name: /add hive/i })
      const formSubmitButton = submitButtons.find(btn => btn.getAttribute('type') === 'submit' && btn.getAttribute('form') === 'hive-form')
      await userEvent.click(formSubmitButton!)

      // Check if any alert was shown (indicates an error)
      if (alertSpy.mock.calls.length > 0) {
        console.log('Alert was called with:', alertSpy.mock.calls)
      }

      // Verify that insert was called with user_id
      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith([
          expect.objectContaining({
            hive_number: 'TEST-H1',
            apiary_id: mockApiaryId,
            user_id: mockUserId
          })
        ])
      }, { timeout: 10000 })

      alertSpy.mockRestore()
    })

    it('should verify apiary ownership before inserting hive', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

      const mockEqChain = vi.fn().mockReturnValue({
        order: vi.fn().mockResolvedValue({
          data: [{ id: mockApiaryId, name: 'Test Apiary', user_id: mockUserId }],
          error: null
        }),
        single: vi.fn().mockResolvedValue({
          data: {
            id: mockApiaryId,
            user_id: mockUserId,
            name: 'Test Apiary'
          },
          error: null
        })
      })

      const mockApiaryCheck = vi.fn().mockReturnValue({
        eq: mockEqChain
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
          return createHivesMock(mockInsert)
        } else if (table === 'hive_configuration_history') {
          return {
            insert: vi.fn().mockResolvedValue({
              data: null,
              error: null
            })
          }
        }
        // Default fallback
        return createDefaultTableMock()
      })

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

      const hiveNumberInput = screen.getByPlaceholderText('e.g., A-1, B-3')
      await userEvent.type(hiveNumberInput, 'TEST-H2')

      const selects = screen.getAllByRole('combobox')
      const apiarySelect = selects.find((select: HTMLElement) =>
        (select as HTMLSelectElement).required &&
        select.querySelector('option[value=""]')?.textContent === 'Select apiary'
      ) as HTMLSelectElement
      await userEvent.selectOptions(apiarySelect, mockApiaryId)

      const submitButtons = screen.getAllByRole('button', { name: /add hive/i })
      const formSubmitButton = submitButtons.find(btn => btn.getAttribute('type') === 'submit' && btn.getAttribute('form') === 'hive-form')
      await userEvent.click(formSubmitButton!)

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

      alertSpy.mockRestore()
    })

    it.skip('should allow hive creation without apiary (null apiary_id complies with RLS policy)', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

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
          return createHivesMock(mockInsert)
        } else if (table === 'hive_configuration_history') {
          return {
            insert: vi.fn().mockResolvedValue({
              data: null,
              error: null
            })
          }
        }
        return createDefaultTableMock()
      })

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

      const hiveNumberInput = screen.getByPlaceholderText('e.g., A-1, B-3')
      await userEvent.type(hiveNumberInput, 'TEST-H3')

      // Don't select an apiary - leave it as the default empty value
      const submitButtons = screen.getAllByRole('button', { name: /add hive/i })
      const formSubmitButton = submitButtons.find(btn => btn.getAttribute('type') === 'submit' && btn.getAttribute('form') === 'hive-form')
      await userEvent.click(formSubmitButton!)

      // Should insert with null/empty apiary_id and user_id
      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith([
          expect.objectContaining({
            hive_number: 'TEST-H3',
            user_id: mockUserId
          })
        ])
      })

      alertSpy.mockRestore()
    })
  })

  describe('RLS Policy - check_user_owns_apiary function with user_id parameter', () => {
    it('should call check_user_owns_apiary RPC with user_id before insert', { timeout: 15000 }, async () => {
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
            const hivesChain: any = {
              is: vi.fn().mockReturnThis(),
              not: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              neq: vi.fn().mockReturnThis(),
              in: vi.fn().mockReturnThis(),
              or: vi.fn().mockReturnThis(),
              order: vi.fn().mockResolvedValue({ data: [], error: null })
            }
            hivesChain.is.mockReturnValue(hivesChain)
            hivesChain.not.mockReturnValue(hivesChain)
            hivesChain.eq.mockReturnValue(hivesChain)
            hivesChain.neq.mockReturnValue(hivesChain)
            hivesChain.in.mockReturnValue(hivesChain)
            hivesChain.or.mockReturnValue(hivesChain)

            return {
              select: vi.fn().mockReturnValue(hivesChain),
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
                  eq: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({
                      data: [],
                      error: null
                    })
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
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

      mockSupabaseClient.rpc = mockRpc
      mockSupabaseClient.auth = {
        getSession: vi.fn().mockResolvedValue({
          data: {
            session: {
              user: { id: mockUserId },
              access_token: 'mock-token'
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
        expect(screen.queryByText('Loading hives...')).not.toBeInTheDocument()
      }, { timeout: 3000 })

      const addButton = screen.getByRole('button', { name: /add hive/i })
      await userEvent.click(addButton)

      const hiveNumberInput = screen.getByPlaceholderText('e.g., A-1, B-3')
      await userEvent.type(hiveNumberInput, 'TEST-H4')

      const selects = screen.getAllByRole('combobox')
      const apiarySelect = selects.find((select: HTMLElement) =>
        (select as HTMLSelectElement).required &&
        select.querySelector('option[value=""]')?.textContent === 'Select apiary'
      ) as HTMLSelectElement
      await userEvent.selectOptions(apiarySelect, mockApiaryId)

      const submitButtons = screen.getAllByRole('button', { name: /add hive/i })
      const formSubmitButton = submitButtons.find(btn => btn.getAttribute('type') === 'submit' && btn.getAttribute('form') === 'hive-form')
      await userEvent.click(formSubmitButton!)

      // Verify RPC was called with correct parameters
      await waitFor(() => {
        expect(mockRpc).toHaveBeenCalledWith('check_user_owns_apiary', {
          apiary_uuid: mockApiaryId,
          user_uuid: mockUserId
        })
      }, { timeout: 10000 })

      // Verify insert was called after successful ownership check
      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith([
          expect.objectContaining({
            hive_number: 'TEST-H4',
            apiary_id: mockApiaryId,
            user_id: mockUserId
          })
        ])
      }, { timeout: 10000 })

      alertSpy.mockRestore()
    })

    it.skip('should verify auth session exists before insert', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

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
                is: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    or: vi.fn().mockReturnValue({
                      is: vi.fn().mockReturnValue({
                        order: vi.fn().mockResolvedValue({
                          data: [],
                          error: null
                        })
                      })
                    })
                  }),
                  order: vi.fn().mockResolvedValue({
                    data: [],
                    error: null
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
        return createDefaultTableMock()
      })

      vi.mocked(mockSupabaseClient).auth = {
        getSession: mockGetSession,
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } }
        })
      } as any

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

      const hiveNumberInput = screen.getByPlaceholderText('e.g., A-1, B-3')
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

      alertSpy.mockRestore()
    })

    it.skip('should throw error if no active session found', async () => {
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
                is: vi.fn().mockReturnValue({
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
                })
              })
            }),
            insert: vi.fn()
          }
        }
        return createDefaultTableMock()
      })

      vi.mocked(mockSupabaseClient).auth = {
        getSession: mockGetSession,
        onAuthStateChange: vi.fn().mockReturnValue({
          data: { subscription: { unsubscribe: vi.fn() } }
        })
      } as any

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

      const hiveNumberInput = screen.getByPlaceholderText('e.g., A-1, B-3')
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
    it.skip('should successfully insert hive with user_id when RLS policies are permissive', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

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
            select: vi.fn().mockReturnValue((() => {
              const chain: any = {
                is: vi.fn().mockReturnThis(),
                not: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                neq: vi.fn().mockReturnThis(),
                in: vi.fn().mockReturnThis(),
                or: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                  count: 0
                })
              }
              return chain
            })()),
            insert: mockInsert
          }
        }
        if (table === 'apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [{ id: mockApiaryId, name: 'Test Apiary' }],
                  error: null
                })
              })
            })
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
        return createDefaultTableMock()
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

      const hiveNumberInput = screen.getByPlaceholderText('e.g., A-1, B-3')
      await userEvent.type(hiveNumberInput, 'RLS-TEST-H1')

      const apiarySelect = screen.getAllByRole('combobox').find((select: HTMLElement) =>
        (select as HTMLSelectElement).required &&
        select.querySelector('option[value=""]')?.textContent === 'Select apiary'
      ) as HTMLSelectElement
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

      alertSpy.mockRestore()
    })

    it.skip('should allow SELECT operations with permissive RLS policy', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

      const mockSelect = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              or: vi.fn().mockReturnValue({
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
        return createDefaultTableMock()
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
        expect(mockSelect).toHaveBeenCalled()
        expect(screen.getByText('H1')).toBeInTheDocument()
        expect(screen.getByText('H2')).toBeInTheDocument()
      })

      alertSpy.mockRestore()
    })

    it.skip('should enforce application-layer security by filtering queries with user_id', async () => {
      const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {})

      const mockEqChain = vi.fn().mockReturnValue({
        or: vi.fn().mockReturnValue({
          is: vi.fn().mockResolvedValue({
            data: [],
            error: null,
            count: 0
          })
        })
      })

      const mockEq = vi.fn().mockReturnValue({
        is: vi.fn().mockReturnValue({
          eq: mockEqChain
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
        return createDefaultTableMock()
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
        expect(mockSelect).toHaveBeenCalled()
        // Verify that the application code filters by user_id
        expect(mockEq).toHaveBeenCalledWith('user_id', mockUserId)
      })

      alertSpy.mockRestore()
    })
  })

  describe('Configuration Change Tracking Visibility', () => {
    const mockUserId = 'user-123'
    const otherUserId = 'user-456'

    it('should hide "Last changed" for non-shared hives', async () => {
      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue((() => {
              const chain: any = {
                is: vi.fn().mockReturnThis(),
                not: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                neq: vi.fn().mockReturnThis(),
                in: vi.fn().mockReturnThis(),
                or: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({
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
              }
              chain.is.mockReturnValue(chain)
              chain.not.mockReturnValue(chain)
              chain.eq.mockReturnValue(chain)
              chain.neq.mockReturnValue(chain)
              chain.in.mockReturnValue(chain)
              chain.or.mockReturnValue(chain)
              return chain
            })())
          }
        }
        return createDefaultTableMock()
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
            select: vi.fn().mockReturnValue((() => {
              const chain: any = {
                is: vi.fn().mockReturnThis(),
                not: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                neq: vi.fn().mockReturnThis(),
                in: vi.fn().mockReturnThis(),
                or: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({
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
              }
              return chain
            })())
          }
        }
        return createDefaultTableMock()
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
            select: vi.fn().mockReturnValue((() => {
              const chain: any = {
                is: vi.fn().mockReturnThis(),
                not: vi.fn().mockReturnThis(),
                eq: vi.fn().mockReturnThis(),
                neq: vi.fn().mockReturnThis(),
                in: vi.fn().mockReturnThis(),
                or: vi.fn().mockReturnThis(),
                order: vi.fn().mockResolvedValue({
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
              }
              return chain
            })())
          }
        }
        return createDefaultTableMock()
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
      const hivesData = [{
        id: 'hive-1',
        hive_number: 'Team Hive 1',
        user_id: otherUserId,
        is_shared: true,
        team_name: 'Test Team',
        configuration_changed_at: null,
        configuration: { brood_boxes_full: 1 }
      }]

      const hivesChain: any = {
        is: vi.fn().mockReturnThis(),
        not: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        or: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: hivesData, error: null, count: 1 })
      }
      hivesChain.is.mockReturnValue(hivesChain)
      hivesChain.not.mockReturnValue(hivesChain)
      hivesChain.eq.mockReturnValue(hivesChain)
      hivesChain.neq.mockReturnValue(hivesChain)
      hivesChain.in.mockReturnValue(hivesChain)
      hivesChain.or.mockReturnValue(hivesChain)

      const mockFrom = vi.fn().mockImplementation((table: string) => {
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue(hivesChain)
          }
        }
        return createDefaultTableMock()
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
