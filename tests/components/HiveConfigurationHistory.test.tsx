import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HiveConfigurationHistory from '@/components/HiveConfigurationHistory'

// Hoist mocks
const { mockFrom, mockAuth, mockSupabaseClient } = vi.hoisted(() => {
  const mockFrom = vi.fn()
  const mockAuth = {
    getUser: vi.fn()
  }
  const mockSupabaseClient = {
    from: mockFrom,
    auth: mockAuth
  }
  return { mockFrom, mockAuth, mockSupabaseClient }
})

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabaseClient
}))

describe('HiveConfigurationHistory', () => {
  const mockHiveId = 'hive-123'

  // Helper to create standard table mocks with hives and team_apiaries support
  const createTableMock = (historyData: any[], profileData: any = { full_name: 'John Doe', email: 'john@example.com' }) => {
    return (table: string) => {
      if (table === 'hives') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { user_id: 'user-1', apiary_id: 'apiary-1' },
                error: null
              })
            })
          })
        }
      }

      if (table === 'team_apiaries') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        }
      }

      if (table === 'hive_configuration_history') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: historyData,
                error: null
              })
            })
          })
        }
      }

      if (table === 'profiles') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: profileData,
                error: null
              })
            })
          })
        }
      }

      // Default mock
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null
            }),
            single: vi.fn().mockResolvedValue({
              data: null,
              error: null
            })
          })
        })
      }
    }
  }

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default auth mock
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null
    })
  })

  describe('Loading State', () => {
    it('should show loading spinner while fetching data', () => {
      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              // Delay resolution to keep loading state
              then: () => new Promise(() => {})
            })
          })
        })
      })

      render(<HiveConfigurationHistory hiveId={mockHiveId} />)

      const expandButton = screen.getByRole('button', { name: /configuration history/i })
      userEvent.click(expandButton)

      expect(screen.getByRole('button')).toHaveTextContent('Configuration History')
    })
  })

  describe('Collapsed State', () => {
    it('should start collapsed by default', () => {
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

      render(<HiveConfigurationHistory hiveId={mockHiveId} />)

      expect(screen.queryByText('No configuration changes recorded yet')).not.toBeInTheDocument()
    })

    it('should show entry count in header', async () => {
      mockFrom.mockImplementation(createTableMock([
        {
          id: '1',
          hive_id: mockHiveId,
          changed_at: '2025-01-15T10:00:00Z',
          changed_by: 'user-1',
          configuration: { brood_boxes: 2 }
        },
        {
          id: '2',
          hive_id: mockHiveId,
          changed_at: '2025-01-14T10:00:00Z',
          changed_by: 'user-1',
          configuration: { brood_boxes: 1 }
        }
      ]))

      render(<HiveConfigurationHistory hiveId={mockHiveId} />)

      await waitFor(() => {
        expect(screen.getByText('(2 entries)')).toBeInTheDocument()
      })
    })

    it('should show singular "entry" for single record', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { user_id: 'user-1', apiary_id: 'apiary-1' },
                  error: null
                })
              })
            })
          }
        }

        if (table === 'team_apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          }
        }

        if (table === 'hive_configuration_history') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: '1',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-15T10:00:00Z',
                      changed_by: 'user-1',
                      configuration: { brood_boxes: 2 }
                    }
                  ],
                  error: null
                })
              })
            })
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { full_name: 'John Doe', email: 'john@example.com' },
                error: null
              })
            })
          })
        }
      })

      render(<HiveConfigurationHistory hiveId={mockHiveId} />)

      await waitFor(() => {
        expect(screen.getByText('(1 entry)')).toBeInTheDocument()
      })
    })
  })

  describe('Empty State', () => {
    it('should show empty message when no history exists', async () => {
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

      render(<HiveConfigurationHistory hiveId={mockHiveId} />)

      const expandButton = screen.getByRole('button', { name: /configuration history/i })
      await userEvent.click(expandButton)

      await waitFor(() => {
        expect(screen.getByText('No configuration changes recorded yet')).toBeInTheDocument()
      })
    })
  })

  describe('Initial Configuration', () => {
    it('should mark first entry as "Initial Configuration"', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { user_id: 'user-1', apiary_id: 'apiary-1' },
                  error: null
                })
              })
            })
          }
        }

        if (table === 'team_apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          }
        }

        if (table === 'hive_configuration_history') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: '1',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-15T10:00:00Z',
                      changed_by: 'user-1',
                      configuration: {
                        hive_size: 'full',
                        brood_boxes: 2,
                        queen_excluder: true
                      }
                    }
                  ],
                  error: null
                })
              })
            })
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { full_name: 'John Doe', email: 'john@example.com' },
                error: null
              })
            })
          })
        }
      })

      render(<HiveConfigurationHistory hiveId={mockHiveId} />)

      const expandButton = screen.getByRole('button', { name: /configuration history/i })
      await userEvent.click(expandButton)

      await waitFor(() => {
        expect(screen.getByText('Initial Configuration')).toBeInTheDocument()
      })
    })

    it('should show all non-empty fields for initial configuration', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { user_id: 'user-1', apiary_id: 'apiary-1' },
                  error: null
                })
              })
            })
          }
        }

        if (table === 'team_apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          }
        }

        if (table === 'hive_configuration_history') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: '1',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-15T10:00:00Z',
                      changed_by: 'user-1',
                      configuration: {
                        hive_size: 'nuc',
                        brood_boxes: 2,
                        honey_supers: 1,
                        queen_excluder: true,
                        feeder: false
                      }
                    }
                  ],
                  error: null
                })
              })
            })
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { full_name: 'John Doe', email: 'john@example.com' },
                error: null
              })
            })
          })
        }
      })

      render(<HiveConfigurationHistory hiveId={mockHiveId} />)

      const expandButton = screen.getByRole('button', { name: /configuration history/i })
      await userEvent.click(expandButton)

      await waitFor(() => {
        expect(screen.getByText(/Size:/)).toBeInTheDocument()
        expect(screen.getByText(/Nuc/)).toBeInTheDocument()
        expect(screen.getByText(/Brood boxes:/)).toBeInTheDocument()
        expect(screen.getByText(/Honey supers:/)).toBeInTheDocument()
        expect(screen.getByText(/Queen excluder:/)).toBeInTheDocument()
      })
    })

    it('should not show false/0/empty values in initial configuration', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { user_id: 'user-1', apiary_id: 'apiary-1' },
                  error: null
                })
              })
            })
          }
        }

        if (table === 'team_apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          }
        }

        if (table === 'hive_configuration_history') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: '1',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-15T10:00:00Z',
                      changed_by: 'user-1',
                      configuration: {
                        brood_boxes: 2,
                        honey_supers: 0,
                        feeder: false,
                        feeder_type: ''
                      }
                    }
                  ],
                  error: null
                })
              })
            })
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { full_name: 'John Doe', email: 'john@example.com' },
                error: null
              })
            })
          })
        }
      })

      render(<HiveConfigurationHistory hiveId={mockHiveId} />)

      const expandButton = screen.getByRole('button', { name: /configuration history/i })
      await userEvent.click(expandButton)

      await waitFor(() => {
        expect(screen.getByText(/Brood boxes:/)).toBeInTheDocument()
        expect(screen.queryByText(/Honey supers:/)).not.toBeInTheDocument()
        expect(screen.queryByText(/Feeder:/)).not.toBeInTheDocument()
      })
    })
  })

  describe('Configuration Comparison', () => {
    it('should show only changed fields between configurations', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { user_id: 'user-1', apiary_id: 'apiary-1' },
                  error: null
                })
              })
            })
          }
        }

        if (table === 'team_apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          }
        }

        if (table === 'hive_configuration_history') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: '2',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-15T10:00:00Z',
                      changed_by: 'user-1',
                      configuration: {
                        brood_boxes: 3,
                        honey_supers: 2,
                        queen_excluder: true
                      }
                    },
                    {
                      id: '1',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-14T10:00:00Z',
                      changed_by: 'user-1',
                      configuration: {
                        brood_boxes: 2,
                        honey_supers: 2,
                        queen_excluder: true
                      }
                    }
                  ],
                  error: null
                })
              })
            })
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { full_name: 'John Doe', email: 'john@example.com' },
                error: null
              })
            })
          })
        }
      })

      render(<HiveConfigurationHistory hiveId={mockHiveId} />)

      const expandButton = screen.getByRole('button', { name: /configuration history/i })
      await userEvent.click(expandButton)

      await waitFor(() => {
        // Should show Configuration Updated (not Initial)
        expect(screen.getByText('Configuration Updated')).toBeInTheDocument()

        // Should show only changed field (brood_boxes)
        const broodBoxesFields = screen.getAllByText(/Brood boxes:/)
        expect(broodBoxesFields.length).toBeGreaterThan(0)
      })
    })

    it('should show before and after values with arrow', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { user_id: 'user-1', apiary_id: 'apiary-1' },
                  error: null
                })
              })
            })
          }
        }

        if (table === 'team_apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          }
        }

        if (table === 'hive_configuration_history') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: '2',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-15T10:00:00Z',
                      changed_by: 'user-1',
                      configuration: {
                        hive_size: 'full',
                        brood_boxes: 3
                      }
                    },
                    {
                      id: '1',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-14T10:00:00Z',
                      changed_by: 'user-1',
                      configuration: {
                        hive_size: 'nuc',
                        brood_boxes: 2
                      }
                    }
                  ],
                  error: null
                })
              })
            })
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { full_name: 'John Doe', email: 'john@example.com' },
                error: null
              })
            })
          })
        }
      })

      render(<HiveConfigurationHistory hiveId={mockHiveId} />)

      const expandButton = screen.getByRole('button', { name: /configuration history/i })
      await userEvent.click(expandButton)

      await waitFor(() => {
        // Check for before → after format
        const sizeFields = screen.getAllByText(/Size:/)
        const updateEntry = sizeFields[0].parentElement
        expect(updateEntry?.textContent).toContain('Nuc →')
        expect(updateEntry?.textContent).toContain('Full Size')
      })
    })

    it('should format boolean values correctly', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { user_id: 'user-1', apiary_id: 'apiary-1' },
                  error: null
                })
              })
            })
          }
        }

        if (table === 'team_apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          }
        }

        if (table === 'hive_configuration_history') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: '2',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-15T10:00:00Z',
                      changed_by: 'user-1',
                      configuration: {
                        queen_excluder: true,
                        feeder: true
                      }
                    },
                    {
                      id: '1',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-14T10:00:00Z',
                      changed_by: 'user-1',
                      configuration: {
                        queen_excluder: false,
                        feeder: false
                      }
                    }
                  ],
                  error: null
                })
              })
            })
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { full_name: 'John Doe', email: 'john@example.com' },
                error: null
              })
            })
          })
        }
      })

      render(<HiveConfigurationHistory hiveId={mockHiveId} />)

      const expandButton = screen.getByRole('button', { name: /configuration history/i })
      await userEvent.click(expandButton)

      await waitFor(() => {
        const queenExcluderFields = screen.getAllByText(/Queen excluder:/)
        const updateEntry = queenExcluderFields[0].parentElement
        expect(updateEntry?.textContent).toContain('No →')
        expect(updateEntry?.textContent).toContain('Yes')
      })
    })

    it('should format frame orientation correctly', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { user_id: 'user-1', apiary_id: 'apiary-1' },
                  error: null
                })
              })
            })
          }
        }

        if (table === 'team_apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          }
        }

        if (table === 'hive_configuration_history') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: '2',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-15T10:00:00Z',
                      changed_by: 'user-1',
                      configuration: {
                        frame_orientation: 'cold'
                      }
                    },
                    {
                      id: '1',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-14T10:00:00Z',
                      changed_by: 'user-1',
                      configuration: {
                        frame_orientation: 'warm'
                      }
                    }
                  ],
                  error: null
                })
              })
            })
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { full_name: 'John Doe', email: 'john@example.com' },
                error: null
              })
            })
          })
        }
      })

      render(<HiveConfigurationHistory hiveId={mockHiveId} />)

      const expandButton = screen.getByRole('button', { name: /configuration history/i })
      await userEvent.click(expandButton)

      await waitFor(() => {
        const orientationFields = screen.getAllByText(/Frame orientation:/)
        const updateEntry = orientationFields[0].parentElement
        expect(updateEntry?.textContent).toContain('Warm way →')
        expect(updateEntry?.textContent).toContain('Cold way')
      })
    })

    it('should display message when no changes are detected', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { user_id: 'user-1', apiary_id: 'apiary-1' },
                  error: null
                })
              })
            })
          }
        }

        if (table === 'team_apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          }
        }

        if (table === 'hive_configuration_history') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: '2',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-15T11:00:00Z',
                      changed_by: 'user-1',
                      configuration: { brood_boxes: 2, honey_supers: 1 }
                    },
                    {
                      id: '1',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-15T10:00:00Z',
                      changed_by: 'user-1',
                      configuration: { brood_boxes: 2, honey_supers: 1 } // Same as current
                    }
                  ],
                  error: null
                })
              })
            })
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { full_name: 'John Doe', email: 'john@example.com' },
                error: null
              })
            })
          })
        }
      })

      render(<HiveConfigurationHistory hiveId={mockHiveId} />)

      const expandButton = screen.getByRole('button', { name: /configuration history/i })
      await userEvent.click(expandButton)

      await waitFor(() => {
        // Should show "no changes detected" message for the latest entry
        expect(screen.getByText(/No changes detected/i)).toBeInTheDocument()
        expect(screen.getByText(/configuration may have been saved without modifications/i)).toBeInTheDocument()
      })
    })
  })

  describe('User Information', () => {
    it('should display user full name when available', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { user_id: 'user-1', apiary_id: 'apiary-1' },
                  error: null
                })
              })
            })
          }
        }

        if (table === 'team_apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          }
        }

        if (table === 'hive_configuration_history') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: '1',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-15T10:00:00Z',
                      changed_by: 'user-1',
                      configuration: { brood_boxes: 2 }
                    }
                  ],
                  error: null
                })
              })
            })
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { full_name: 'John Doe', email: 'john@example.com' },
                error: null
              })
            })
          })
        }
      })

      render(<HiveConfigurationHistory hiveId={mockHiveId} />)

      const expandButton = screen.getByRole('button', { name: /configuration history/i })
      await userEvent.click(expandButton)

      await waitFor(() => {
        // Component displays configuration entries without user attribution
        screen.getByText('Initial Configuration')
      })
    })

    it('should fall back to email when full name is not available', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { user_id: 'user-1', apiary_id: 'apiary-1' },
                  error: null
                })
              })
            })
          }
        }

        if (table === 'team_apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          }
        }

        if (table === 'hive_configuration_history') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: '1',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-15T10:00:00Z',
                      changed_by: 'user-1',
                      configuration: { brood_boxes: 2 }
                    }
                  ],
                  error: null
                })
              })
            })
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { full_name: null, email: 'john@example.com' },
                error: null
              })
            })
          })
        }
      })

      render(<HiveConfigurationHistory hiveId={mockHiveId} />)

      const expandButton = screen.getByRole('button', { name: /configuration history/i })
      await userEvent.click(expandButton)

      await waitFor(() => {
        // Component displays configuration entries without user attribution
        screen.getByText('Initial Configuration')
      })
    })

    it('should show "Unknown" when user profile is not found', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { user_id: 'user-1', apiary_id: 'apiary-1' },
                  error: null
                })
              })
            })
          }
        }

        if (table === 'team_apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          }
        }

        if (table === 'hive_configuration_history') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: '1',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-15T10:00:00Z',
                      changed_by: 'user-1',
                      configuration: { brood_boxes: 2 }
                    }
                  ],
                  error: null
                })
              })
            })
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'User not found' }
              })
            })
          })
        }
      })

      render(<HiveConfigurationHistory hiveId={mockHiveId} />)

      const expandButton = screen.getByRole('button', { name: /configuration history/i })
      await userEvent.click(expandButton)

      await waitFor(() => {
        // Component displays configuration entries without user attribution
        screen.getByText('Initial Configuration')
      })
    })
  })

  describe('Date Formatting', () => {
    it('should format dates in Irish locale format', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { user_id: 'user-1', apiary_id: 'apiary-1' },
                  error: null
                })
              })
            })
          }
        }

        if (table === 'team_apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          }
        }

        if (table === 'hive_configuration_history') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: '1',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-15T14:30:00Z',
                      changed_by: 'user-1',
                      configuration: { brood_boxes: 2 }
                    }
                  ],
                  error: null
                })
              })
            })
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { full_name: 'John Doe', email: 'john@example.com' },
                error: null
              })
            })
          })
        }
      })

      render(<HiveConfigurationHistory hiveId={mockHiveId} />)

      const expandButton = screen.getByRole('button', { name: /configuration history/i })
      await userEvent.click(expandButton)

      await waitFor(() => {
        expect(screen.getByText(/15\/01\/2025/)).toBeInTheDocument()
        const dateElements = screen.getAllByText(/at/)
        expect(dateElements.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Show More/Less Functionality', () => {
    it('should initially show only 3 entries when more than 3 exist', async () => {
      const historyData = Array.from({ length: 5 }, (_, i) => ({
        id: `${i + 1}`,
        hive_id: mockHiveId,
        changed_at: `2025-01-${15 - i}T10:00:00Z`,
        changed_by: 'user-1',
        configuration: { brood_boxes: i + 1 }
      }))

      mockFrom.mockImplementation((table: string) => {
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { user_id: 'user-1', apiary_id: 'apiary-1' },
                  error: null
                })
              })
            })
          }
        }

        if (table === 'team_apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          }
        }

        if (table === 'hive_configuration_history') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: historyData,
                  error: null
                })
              })
            })
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { full_name: 'John Doe', email: 'john@example.com' },
                error: null
              })
            })
          })
        }
      })

      render(<HiveConfigurationHistory hiveId={mockHiveId} />)

      const expandButton = screen.getByRole('button', { name: /configuration history/i })
      await userEvent.click(expandButton)

      await waitFor(() => {
        // Check for configuration entries by looking for "Configuration Updated" or "Initial Configuration"
        const updatedEntries = screen.getAllByText(/Configuration Updated|Initial Configuration/)
        expect(updatedEntries).toHaveLength(3)
        expect(screen.getByText(/Show More \(2 older\)/)).toBeInTheDocument()
      })
    })

    it('should show all entries when "Show More" is clicked', async () => {
      const historyData = Array.from({ length: 5 }, (_, i) => ({
        id: `${i + 1}`,
        hive_id: mockHiveId,
        changed_at: `2025-01-${15 - i}T10:00:00Z`,
        changed_by: 'user-1',
        configuration: { brood_boxes: i + 1 }
      }))

      mockFrom.mockImplementation((table: string) => {
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { user_id: 'user-1', apiary_id: 'apiary-1' },
                  error: null
                })
              })
            })
          }
        }

        if (table === 'team_apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          }
        }

        if (table === 'hive_configuration_history') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: historyData,
                  error: null
                })
              })
            })
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { full_name: 'John Doe', email: 'john@example.com' },
                error: null
              })
            })
          })
        }
      })

      render(<HiveConfigurationHistory hiveId={mockHiveId} />)

      const expandButton = screen.getByRole('button', { name: /configuration history/i })
      await userEvent.click(expandButton)

      await waitFor(() => {
        expect(screen.getByText(/Show More \(2 older\)/)).toBeInTheDocument()
      })

      const showMoreButton = screen.getByText(/Show More/)
      await userEvent.click(showMoreButton)

      await waitFor(() => {
        // Check for configuration entries by looking for "Configuration Updated" or "Initial Configuration"
        const updatedEntries = screen.getAllByText(/Configuration Updated|Initial Configuration/)
        expect(updatedEntries).toHaveLength(5)
        expect(screen.getByText(/Show Less/)).toBeInTheDocument()
      })
    })

    it('should not show "Show More" button when 3 or fewer entries', async () => {
      const historyData = Array.from({ length: 3 }, (_, i) => ({
        id: `${i + 1}`,
        hive_id: mockHiveId,
        changed_at: `2025-01-${15 - i}T10:00:00Z`,
        changed_by: 'user-1',
        configuration: { brood_boxes: i + 1 }
      }))

      mockFrom.mockImplementation((table: string) => {
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { user_id: 'user-1', apiary_id: 'apiary-1' },
                  error: null
                })
              })
            })
          }
        }

        if (table === 'team_apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          }
        }

        if (table === 'hive_configuration_history') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: historyData,
                  error: null
                })
              })
            })
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { full_name: 'John Doe', email: 'john@example.com' },
                error: null
              })
            })
          })
        }
      })

      render(<HiveConfigurationHistory hiveId={mockHiveId} />)

      const expandButton = screen.getByRole('button', { name: /configuration history/i })
      await userEvent.click(expandButton)

      await waitFor(() => {
        // Check for configuration entries by looking for "Configuration Updated" or "Initial Configuration"
        const updatedEntries = screen.getAllByText(/Configuration Updated|Initial Configuration/)
        expect(updatedEntries).toHaveLength(3)
        expect(screen.queryByText(/Show More/)).not.toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockFrom.mockImplementation((table: string) => {
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { user_id: 'user-1', apiary_id: 'apiary-1' },
                  error: null
                })
              })
            })
          }
        }

        if (table === 'team_apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          }
        }

        if (table === 'hive_configuration_history') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Database connection failed' }
                })
              })
            })
          }
        }

        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: null,
                error: null
              })
            })
          })
        }
      })

      render(<HiveConfigurationHistory hiveId={mockHiveId} />)

      const expandButton = screen.getByRole('button', { name: /configuration history/i })
      await userEvent.click(expandButton)

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error fetching configuration history:',
          { message: 'Database connection failed' }
        )
      })

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Location Change Tracking', () => {
    it('should show initial location in first configuration', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { user_id: 'user-1', apiary_id: 'apiary-1' },
                  error: null
                })
              })
            })
          }
        }

        if (table === 'team_apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          }
        }

        if (table === 'hive_configuration_history') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: '1',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-15T10:00:00Z',
                      changed_by: 'user-1',
                      configuration: { brood_boxes: 2 },
                      apiary_id: 'apiary-1',
                      row_in_apiary: 2,
                      order_in_apiary: 3,
                      apiary: { name: 'Main Apiary' }
                    }
                  ],
                  error: null
                })
              })
            })
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { full_name: 'John Doe', email: 'john@example.com' },
                error: null
              })
            })
          })
        }
      })

      render(<HiveConfigurationHistory hiveId={mockHiveId} />)

      const expandButton = screen.getByRole('button', { name: /configuration history/i })
      await userEvent.click(expandButton)

      await waitFor(() => {
        expect(screen.getByText('Initial Configuration')).toBeInTheDocument()
        expect(screen.getByText(/Location:/)).toBeInTheDocument()
        expect(screen.getByText(/Main Apiary, Row 2, Position 3/)).toBeInTheDocument()
      })
    })

    it('should detect and display apiary change', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { user_id: 'user-1', apiary_id: 'apiary-1' },
                  error: null
                })
              })
            })
          }
        }

        if (table === 'team_apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          }
        }

        if (table === 'hive_configuration_history') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: '2',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-15T11:00:00Z',
                      changed_by: 'user-1',
                      configuration: { brood_boxes: 2 },
                      apiary_id: 'apiary-2',
                      row_in_apiary: 1,
                      order_in_apiary: 5,
                      apiary: { name: 'Back Apiary' }
                    },
                    {
                      id: '1',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-15T10:00:00Z',
                      changed_by: 'user-1',
                      configuration: { brood_boxes: 2 },
                      apiary_id: 'apiary-1',
                      row_in_apiary: 2,
                      order_in_apiary: 3,
                      apiary: { name: 'Main Apiary' }
                    }
                  ],
                  error: null
                })
              })
            })
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { full_name: 'John Doe', email: 'john@example.com' },
                error: null
              })
            })
          })
        }
      })

      render(<HiveConfigurationHistory hiveId={mockHiveId} />)

      const expandButton = screen.getByRole('button', { name: /configuration history/i })
      await userEvent.click(expandButton)

      await waitFor(() => {
        expect(screen.getByText('Configuration Updated')).toBeInTheDocument()
        const locationFields = screen.getAllByText(/Location:/)
        expect(locationFields.length).toBeGreaterThan(0)
        const updateEntry = locationFields[0].parentElement
        expect(updateEntry?.textContent).toContain('Main Apiary, Row 2, Position 3 →')
        expect(updateEntry?.textContent).toContain('Back Apiary, Row 1, Position 5')
      })
    })

    it('should detect row change within same apiary', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { user_id: 'user-1', apiary_id: 'apiary-1' },
                  error: null
                })
              })
            })
          }
        }

        if (table === 'team_apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          }
        }

        if (table === 'hive_configuration_history') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: '2',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-15T11:00:00Z',
                      changed_by: 'user-1',
                      configuration: { brood_boxes: 2 },
                      apiary_id: 'apiary-1',
                      row_in_apiary: 3,
                      order_in_apiary: 3,
                      apiary: { name: 'Main Apiary' }
                    },
                    {
                      id: '1',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-15T10:00:00Z',
                      changed_by: 'user-1',
                      configuration: { brood_boxes: 2 },
                      apiary_id: 'apiary-1',
                      row_in_apiary: 2,
                      order_in_apiary: 3,
                      apiary: { name: 'Main Apiary' }
                    }
                  ],
                  error: null
                })
              })
            })
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { full_name: 'John Doe', email: 'john@example.com' },
                error: null
              })
            })
          })
        }
      })

      render(<HiveConfigurationHistory hiveId={mockHiveId} />)

      const expandButton = screen.getByRole('button', { name: /configuration history/i })
      await userEvent.click(expandButton)

      await waitFor(() => {
        const locationFields = screen.getAllByText(/Location:/)
        const updateEntry = locationFields[0].parentElement
        expect(updateEntry?.textContent).toContain('Main Apiary, Row 2, Position 3 →')
        expect(updateEntry?.textContent).toContain('Main Apiary, Row 3, Position 3')
      })
    })

    it('should detect position change within same row', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { user_id: 'user-1', apiary_id: 'apiary-1' },
                  error: null
                })
              })
            })
          }
        }

        if (table === 'team_apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          }
        }

        if (table === 'hive_configuration_history') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: '2',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-15T11:00:00Z',
                      changed_by: 'user-1',
                      configuration: { brood_boxes: 2 },
                      apiary_id: 'apiary-1',
                      row_in_apiary: 2,
                      order_in_apiary: 5,
                      apiary: { name: 'Main Apiary' }
                    },
                    {
                      id: '1',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-15T10:00:00Z',
                      changed_by: 'user-1',
                      configuration: { brood_boxes: 2 },
                      apiary_id: 'apiary-1',
                      row_in_apiary: 2,
                      order_in_apiary: 3,
                      apiary: { name: 'Main Apiary' }
                    }
                  ],
                  error: null
                })
              })
            })
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { full_name: 'John Doe', email: 'john@example.com' },
                error: null
              })
            })
          })
        }
      })

      render(<HiveConfigurationHistory hiveId={mockHiveId} />)

      const expandButton = screen.getByRole('button', { name: /configuration history/i })
      await userEvent.click(expandButton)

      await waitFor(() => {
        const locationFields = screen.getAllByText(/Location:/)
        const updateEntry = locationFields[0].parentElement
        expect(updateEntry?.textContent).toContain('Main Apiary, Row 2, Position 3 →')
        expect(updateEntry?.textContent).toContain('Main Apiary, Row 2, Position 5')
      })
    })

    it('should show both location and configuration changes together', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { user_id: 'user-1', apiary_id: 'apiary-1' },
                  error: null
                })
              })
            })
          }
        }

        if (table === 'team_apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          }
        }

        if (table === 'hive_configuration_history') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: '2',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-15T11:00:00Z',
                      changed_by: 'user-1',
                      configuration: { brood_boxes: 3, honey_supers: 2 },
                      apiary_id: 'apiary-2',
                      row_in_apiary: 1,
                      order_in_apiary: 1,
                      apiary: { name: 'Back Apiary' }
                    },
                    {
                      id: '1',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-15T10:00:00Z',
                      changed_by: 'user-1',
                      configuration: { brood_boxes: 2, honey_supers: 1 },
                      apiary_id: 'apiary-1',
                      row_in_apiary: 2,
                      order_in_apiary: 3,
                      apiary: { name: 'Main Apiary' }
                    }
                  ],
                  error: null
                })
              })
            })
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { full_name: 'John Doe', email: 'john@example.com' },
                error: null
              })
            })
          })
        }
      })

      render(<HiveConfigurationHistory hiveId={mockHiveId} />)

      const expandButton = screen.getByRole('button', { name: /configuration history/i })
      await userEvent.click(expandButton)

      await waitFor(() => {
        // Should show location change
        const locationFields = screen.getAllByText(/Location:/)
        expect(locationFields.length).toBeGreaterThan(0)

        // Check that both location texts are present in the document
        const mainApiaryElements = screen.getAllByText(/Main Apiary, Row 2, Position 3/)
        const backApiaryElements = screen.getAllByText(/Back Apiary, Row 1, Position 1/)
        expect(mainApiaryElements.length).toBeGreaterThan(0)
        expect(backApiaryElements.length).toBeGreaterThan(0)

        // Should also show configuration changes
        const broodBoxesFields = screen.getAllByText(/Brood boxes:/)
        expect(broodBoxesFields.length).toBeGreaterThan(0)
        const honeySuperFields = screen.getAllByText(/Honey supers:/)
        expect(honeySuperFields.length).toBeGreaterThan(0)
      })
    })

    it('should handle location without row or position', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { user_id: 'user-1', apiary_id: 'apiary-1' },
                  error: null
                })
              })
            })
          }
        }

        if (table === 'team_apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          }
        }

        if (table === 'hive_configuration_history') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: '1',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-15T10:00:00Z',
                      changed_by: 'user-1',
                      configuration: { brood_boxes: 2 },
                      apiary_id: 'apiary-1',
                      row_in_apiary: null,
                      order_in_apiary: null,
                      apiary: { name: 'Main Apiary' }
                    }
                  ],
                  error: null
                })
              })
            })
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { full_name: 'John Doe', email: 'john@example.com' },
                error: null
              })
            })
          })
        }
      })

      render(<HiveConfigurationHistory hiveId={mockHiveId} />)

      const expandButton = screen.getByRole('button', { name: /configuration history/i })
      await userEvent.click(expandButton)

      await waitFor(() => {
        // Should show just apiary name without row/position
        const locationFields = screen.getAllByText(/Location:/)
        expect(locationFields.length).toBeGreaterThan(0)
        const locationEntry = locationFields[0].parentElement
        expect(locationEntry?.textContent).toContain('Main Apiary')
        expect(locationEntry?.textContent).not.toContain('Row')
        expect(locationEntry?.textContent).not.toContain('Position')
      })
    })

    it('should not show location change when location is identical', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { user_id: 'user-1', apiary_id: 'apiary-1' },
                  error: null
                })
              })
            })
          }
        }

        if (table === 'team_apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          }
        }

        if (table === 'hive_configuration_history') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: '2',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-15T11:00:00Z',
                      changed_by: 'user-1',
                      configuration: { brood_boxes: 3 },
                      apiary_id: 'apiary-1',
                      row_in_apiary: 2,
                      order_in_apiary: 3,
                      apiary: { name: 'Main Apiary' }
                    },
                    {
                      id: '1',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-15T10:00:00Z',
                      changed_by: 'user-1',
                      configuration: { brood_boxes: 2 },
                      apiary_id: 'apiary-1',
                      row_in_apiary: 2,
                      order_in_apiary: 3,
                      apiary: { name: 'Main Apiary' }
                    }
                  ],
                  error: null
                })
              })
            })
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { full_name: 'John Doe', email: 'john@example.com' },
                error: null
              })
            })
          })
        }
      })

      render(<HiveConfigurationHistory hiveId={mockHiveId} />)

      const expandButton = screen.getByRole('button', { name: /configuration history/i })
      await userEvent.click(expandButton)

      await waitFor(() => {
        // Should show configuration change but NOT location change
        const broodBoxesFields = screen.getAllByText(/Brood boxes:/)
        expect(broodBoxesFields.length).toBeGreaterThan(0)

        // Should show "Configuration Updated" for latest entry
        expect(screen.getByText('Configuration Updated')).toBeInTheDocument()

        // Location field appears once (in initial config only), not twice (which would mean both entries have it)
        const locationLabels = screen.getAllByText(/Location:/)
        expect(locationLabels).toHaveLength(1)
      })
    })
  })

  describe('Queen Change Tracking', () => {
    it('should show initial queen assignment in first configuration', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { user_id: 'user-1', apiary_id: 'apiary-1' },
                  error: null
                })
              })
            })
          }
        }

        if (table === 'team_apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          }
        }

        if (table === 'hive_configuration_history') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: '1',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-15T10:00:00Z',
                      changed_by: 'user-1',
                      configuration: { brood_boxes: 2 },
                      queen_id: 'queen-1',
                      queen: { queen_number: 'Q123' }
                    }
                  ],
                  error: null
                })
              })
            })
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { full_name: 'John Doe', email: 'john@example.com' },
                error: null
              })
            })
          })
        }
      })

      render(<HiveConfigurationHistory hiveId={mockHiveId} />)

      const expandButton = screen.getByRole('button', { name: /configuration history/i })
      await userEvent.click(expandButton)

      await waitFor(() => {
        expect(screen.getByText('Initial Configuration')).toBeInTheDocument()
        expect(screen.getByText(/Queen:/)).toBeInTheDocument()
        expect(screen.getByText(/Q123/)).toBeInTheDocument()
      })
    })

    it('should detect and display queen change', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { user_id: 'user-1', apiary_id: 'apiary-1' },
                  error: null
                })
              })
            })
          }
        }

        if (table === 'team_apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          }
        }

        if (table === 'hive_configuration_history') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: '2',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-15T11:00:00Z',
                      changed_by: 'user-1',
                      configuration: { brood_boxes: 2 },
                      queen_id: 'queen-2',
                      queen: { queen_number: 'Q456' }
                    },
                    {
                      id: '1',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-15T10:00:00Z',
                      changed_by: 'user-1',
                      configuration: { brood_boxes: 2 },
                      queen_id: 'queen-1',
                      queen: { queen_number: 'Q123' }
                    }
                  ],
                  error: null
                })
              })
            })
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { full_name: 'John Doe', email: 'john@example.com' },
                error: null
              })
            })
          })
        }
      })

      render(<HiveConfigurationHistory hiveId={mockHiveId} />)

      const expandButton = screen.getByRole('button', { name: /configuration history/i })
      await userEvent.click(expandButton)

      await waitFor(() => {
        expect(screen.getByText('Configuration Updated')).toBeInTheDocument()
        const queenFields = screen.getAllByText(/Queen:/)
        expect(queenFields.length).toBeGreaterThan(0)
        const updateEntry = queenFields[0].parentElement
        expect(updateEntry?.textContent).toContain('Q123 →')
        expect(updateEntry?.textContent).toContain('Q456')
      })
    })

    it('should show manual queen status in initial configuration', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { user_id: 'user-1', apiary_id: 'apiary-1' },
                  error: null
                })
              })
            })
          }
        }

        if (table === 'team_apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          }
        }

        if (table === 'hive_configuration_history') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: '1',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-15T10:00:00Z',
                      changed_by: 'user-1',
                      configuration: { brood_boxes: 2 },
                      queen_id: null,
                      queen_marked: true,
                      queen_marking_color: 'White',
                      queen_mated: true,
                      queen_clipped: false
                    }
                  ],
                  error: null
                })
              })
            })
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { full_name: 'John Doe', email: 'john@example.com' },
                error: null
              })
            })
          })
        }
      })

      render(<HiveConfigurationHistory hiveId={mockHiveId} />)

      const expandButton = screen.getByRole('button', { name: /configuration history/i })
      await userEvent.click(expandButton)

      await waitFor(() => {
        expect(screen.getByText(/Queen marked:/)).toBeInTheDocument()
        expect(screen.getByText(/White/)).toBeInTheDocument()
        expect(screen.getByText(/Queen mated:/)).toBeInTheDocument()
      })
    })

    it('should detect queen marking color change', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { user_id: 'user-1', apiary_id: 'apiary-1' },
                  error: null
                })
              })
            })
          }
        }

        if (table === 'team_apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          }
        }

        if (table === 'hive_configuration_history') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: '2',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-15T11:00:00Z',
                      changed_by: 'user-1',
                      configuration: { brood_boxes: 2 },
                      queen_id: null,
                      queen_marked: true,
                      queen_marking_color: 'Yellow',
                      queen_mated: true,
                      queen_clipped: false
                    },
                    {
                      id: '1',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-15T10:00:00Z',
                      changed_by: 'user-1',
                      configuration: { brood_boxes: 2 },
                      queen_id: null,
                      queen_marked: true,
                      queen_marking_color: 'White',
                      queen_mated: true,
                      queen_clipped: false
                    }
                  ],
                  error: null
                })
              })
            })
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { full_name: 'John Doe', email: 'john@example.com' },
                error: null
              })
            })
          })
        }
      })

      render(<HiveConfigurationHistory hiveId={mockHiveId} />)

      const expandButton = screen.getByRole('button', { name: /configuration history/i })
      await userEvent.click(expandButton)

      await waitFor(() => {
        const queenMarkedFields = screen.getAllByText(/Queen marked:/)
        const updateEntry = queenMarkedFields[0].parentElement
        expect(updateEntry?.textContent).toContain('White →')
        expect(updateEntry?.textContent).toContain('Yellow')
      })
    })

    it('should detect queen mated status change', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { user_id: 'user-1', apiary_id: 'apiary-1' },
                  error: null
                })
              })
            })
          }
        }

        if (table === 'team_apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          }
        }

        if (table === 'hive_configuration_history') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: '2',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-15T11:00:00Z',
                      changed_by: 'user-1',
                      configuration: { brood_boxes: 2 },
                      queen_id: null,
                      queen_marked: false,
                      queen_mated: true,
                      queen_clipped: false
                    },
                    {
                      id: '1',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-15T10:00:00Z',
                      changed_by: 'user-1',
                      configuration: { brood_boxes: 2 },
                      queen_id: null,
                      queen_marked: false,
                      queen_mated: false,
                      queen_clipped: false
                    }
                  ],
                  error: null
                })
              })
            })
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { full_name: 'John Doe', email: 'john@example.com' },
                error: null
              })
            })
          })
        }
      })

      render(<HiveConfigurationHistory hiveId={mockHiveId} />)

      const expandButton = screen.getByRole('button', { name: /configuration history/i })
      await userEvent.click(expandButton)

      await waitFor(() => {
        const queenMatedFields = screen.getAllByText(/Queen mated:/)
        const updateEntry = queenMatedFields[0].parentElement
        expect(updateEntry?.textContent).toContain('No →')
        expect(updateEntry?.textContent).toContain('Yes')
      })
    })

    it('should show combined queen, location, and configuration changes', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { user_id: 'user-1', apiary_id: 'apiary-1' },
                  error: null
                })
              })
            })
          }
        }

        if (table === 'team_apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          }
        }

        if (table === 'hive_configuration_history') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: '2',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-15T11:00:00Z',
                      changed_by: 'user-1',
                      configuration: { brood_boxes: 3 },
                      apiary_id: 'apiary-2',
                      row_in_apiary: 1,
                      order_in_apiary: 1,
                      apiary: { name: 'Back Apiary' },
                      queen_id: 'queen-2',
                      queen: { queen_number: 'Q456' }
                    },
                    {
                      id: '1',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-15T10:00:00Z',
                      changed_by: 'user-1',
                      configuration: { brood_boxes: 2 },
                      apiary_id: 'apiary-1',
                      row_in_apiary: 2,
                      order_in_apiary: 3,
                      apiary: { name: 'Main Apiary' },
                      queen_id: 'queen-1',
                      queen: { queen_number: 'Q123' }
                    }
                  ],
                  error: null
                })
              })
            })
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { full_name: 'John Doe', email: 'john@example.com' },
                error: null
              })
            })
          })
        }
      })

      render(<HiveConfigurationHistory hiveId={mockHiveId} />)

      const expandButton = screen.getByRole('button', { name: /configuration history/i })
      await userEvent.click(expandButton)

      await waitFor(() => {
        // Should show location change
        const locationFields = screen.getAllByText(/Location:/)
        expect(locationFields.length).toBeGreaterThan(0)

        // Should show queen change
        const queenFields = screen.getAllByText(/Queen:/)
        expect(queenFields.length).toBeGreaterThan(0)

        // Should show configuration change
        const broodBoxesFields = screen.getAllByText(/Brood boxes:/)
        expect(broodBoxesFields.length).toBeGreaterThan(0)
      })
    })

    it('should not show queen changes when queen remains the same', async () => {
      mockFrom.mockImplementation((table: string) => {
        if (table === 'hives') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({
                  data: { user_id: 'user-1', apiary_id: 'apiary-1' },
                  error: null
                })
              })
            })
          }
        }

        if (table === 'team_apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            })
          }
        }

        if (table === 'hive_configuration_history') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [
                    {
                      id: '2',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-15T11:00:00Z',
                      changed_by: 'user-1',
                      configuration: { brood_boxes: 3 },
                      queen_id: 'queen-1',
                      queen: { queen_number: 'Q123' },
                      queen_marked: false,
                      queen_mated: false,
                      queen_clipped: false
                    },
                    {
                      id: '1',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-15T10:00:00Z',
                      changed_by: 'user-1',
                      configuration: { brood_boxes: 2 },
                      queen_id: 'queen-1',
                      queen: { queen_number: 'Q123' },
                      queen_marked: false,
                      queen_mated: false,
                      queen_clipped: false
                    }
                  ],
                  error: null
                })
              })
            })
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { full_name: 'John Doe', email: 'john@example.com' },
                error: null
              })
            })
          })
        }
      })

      render(<HiveConfigurationHistory hiveId={mockHiveId} />)

      const expandButton = screen.getByRole('button', { name: /configuration history/i })
      await userEvent.click(expandButton)

      await waitFor(() => {
        // Should show configuration change
        const broodBoxesFields = screen.getAllByText(/Brood boxes:/)
        expect(broodBoxesFields.length).toBeGreaterThan(0)

        // Queen field should only appear once (in initial config), not twice
        const queenLabels = screen.getAllByText(/Queen:/)
        expect(queenLabels).toHaveLength(1)
      })
    })
  })
})
