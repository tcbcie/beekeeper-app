import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HiveConfigurationHistory from '@/components/HiveConfigurationHistory'

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

describe('HiveConfigurationHistory', () => {
  const mockHiveId = 'hive-123'

  beforeEach(() => {
    vi.clearAllMocks()
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
      mockFrom.mockImplementation((table: string) => {
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
                    },
                    {
                      id: '2',
                      hive_id: mockHiveId,
                      changed_at: '2025-01-14T10:00:00Z',
                      changed_by: 'user-1',
                      configuration: { brood_boxes: 1 }
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
        expect(screen.getByText('(2 entries)')).toBeInTheDocument()
      })
    })

    it('should show singular "entry" for single record', async () => {
      mockFrom.mockImplementation((table: string) => {
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
  })

  describe('User Information', () => {
    it('should display user full name when available', async () => {
      mockFrom.mockImplementation((table: string) => {
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
        expect(screen.getByText(/Changed by:/)).toBeInTheDocument()
        expect(screen.getByText('John Doe')).toBeInTheDocument()
      })
    })

    it('should fall back to email when full name is not available', async () => {
      mockFrom.mockImplementation((table: string) => {
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
        expect(screen.getByText('john@example.com')).toBeInTheDocument()
      })
    })

    it('should show "Unknown" when user profile is not found', async () => {
      mockFrom.mockImplementation((table: string) => {
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
        expect(screen.getByText('Unknown')).toBeInTheDocument()
      })
    })
  })

  describe('Date Formatting', () => {
    it('should format dates in Irish locale format', async () => {
      mockFrom.mockImplementation((table: string) => {
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
        const historyEntries = screen.getAllByText(/Changed by:/)
        expect(historyEntries).toHaveLength(3)
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
        const historyEntries = screen.getAllByText(/Changed by:/)
        expect(historyEntries).toHaveLength(5)
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
        const historyEntries = screen.getAllByText(/Changed by:/)
        expect(historyEntries).toHaveLength(3)
        expect(screen.queryByText(/Show More/)).not.toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database connection failed' }
            })
          })
        })
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
})
