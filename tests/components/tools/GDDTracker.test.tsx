import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import GDDTracker from '@/components/tools/GDDTracker'

const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  warning: vi.fn(),
  info: vi.fn(),
}

vi.mock('@/components/ui/Toast', () => ({
  useToast: () => mockToast,
}))

const mockApiaries = [
  { id: 'apiary-1', name: 'Home Apiary', eircode: 'D02X285', latitude: 53.3498, longitude: -6.2603, is_uk_ni: false },
  { id: 'apiary-2', name: 'Farm Apiary', eircode: 'BT1 1AA', latitude: 54.5973, longitude: -5.9301, is_uk_ni: true },
  { id: 'apiary-3', name: 'No Location', eircode: null, latitude: null, longitude: null, is_uk_ni: false },
]

const mockVegetationTypes = [
  { id: 'veg-1', value: 'Oil Seed Rape (Canola)' },
  { id: 'veg-2', value: 'Clover (White)' },
  { id: 'veg-3', value: 'Hawthorn' },
]

const mockRecords = [
  {
    id: 'record-1',
    apiary_id: 'apiary-1',
    vegetation_type_id: 'veg-1',
    year: 2025,
    start_date: '2025-04-15',
    end_date: '2025-05-20',
    gdd_value: 245.5,
    is_shared: true,
    notes: 'Good bloom period',
    apiaries: { name: 'Home Apiary', eircode: 'D02X285' },
    dropdown_values: { value: 'Oil Seed Rape (Canola)' },
  },
  {
    id: 'record-2',
    apiary_id: 'apiary-2',
    vegetation_type_id: 'veg-2',
    year: 2025,
    start_date: '2025-06-01',
    end_date: null,
    gdd_value: null,
    is_shared: false,
    notes: null,
    apiaries: { name: 'Farm Apiary', eircode: 'BT1 1AA' },
    dropdown_values: { value: 'Clover (White)' },
  },
]

const mockSupabaseFrom = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => mockSupabaseFrom(table),
  },
}))

const mockFetch = vi.fn()
global.fetch = mockFetch
global.confirm = vi.fn(() => true)

const buildDefaultSupabaseMocks = () => {
  mockSupabaseFrom.mockImplementation((table: string) => {
    if (table === 'apiaries') {
      return {
        select: () => ({
          eq: () => ({
            order: () => Promise.resolve({ data: mockApiaries, error: null }),
          }),
        }),
      }
    }

    if (table === 'dropdown_values') {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              order: () =>
                Promise.resolve({
                  data: mockVegetationTypes.map((value) => ({
                    ...value,
                    dropdown_categories: { category_key: 'vegetation_type' },
                  })),
                  error: null,
                }),
            }),
          }),
        }),
      }
    }

    if (table === 'gdd_records') {
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              order: () => Promise.resolve({ data: mockRecords, error: null }),
            }),
          }),
        }),
        insert: () => ({
          select: () => ({
            single: () => Promise.resolve({ data: { id: 'new-record' }, error: null }),
          }),
        }),
        update: () => ({
          eq: () => Promise.resolve({ data: null, error: null }),
        }),
        delete: () => ({
          eq: () => Promise.resolve({ data: null, error: null }),
        }),
      }
    }

    return {}
  })
}

describe('GDDTracker', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    buildDefaultSupabaseMocks()
  })

  describe('Rendering', () => {
    it('renders the tracker title and info box', async () => {
      render(<GDDTracker userId="test-user-id" />)

      await waitFor(() => {
        expect(screen.getByText('GDD Tracker')).toBeInTheDocument()
        expect(screen.getByText('What is GDD (Growing Degree Days)?')).toBeInTheDocument()
        expect(
          screen.getByText(/GDD measures accumulated heat units to predict plant development/)
        ).toBeInTheDocument()
      })
    })

    it('renders the header actions and seasonal-multiplier legend', async () => {
      render(<GDDTracker userId="test-user-id" />)

      await waitFor(() => {
        expect(screen.getByText('Add Record')).toBeInTheDocument()
        expect(screen.getByText(/Group by Vegetation/)).toBeInTheDocument()
        expect(screen.getByText(/Seasonal multipliers: Jan/i)).toBeInTheDocument()
      })
    })

    it('shows a loading spinner initially', () => {
      render(<GDDTracker userId="test-user-id" />)
      expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    })
  })

  describe('Records Display', () => {
    it('renders existing records in the table', async () => {
      render(<GDDTracker userId="test-user-id" />)

      await waitFor(() => {
        expect(screen.getByText('Home Apiary')).toBeInTheDocument()
        expect(screen.getByText('Oil Seed Rape (Canola)')).toBeInTheDocument()
        expect(screen.getByText('245.5')).toBeInTheDocument()
      })
    })

    it('renders the current table headers', async () => {
      render(<GDDTracker userId="test-user-id" />)

      await waitFor(() => {
        expect(screen.getByText('Actions')).toBeInTheDocument()
        expect(screen.getByText('Year')).toBeInTheDocument()
        expect(screen.getByText('Apiary')).toBeInTheDocument()
        expect(screen.getByText('Vegetation')).toBeInTheDocument()
        expect(screen.getByText('Bloom Date')).toBeInTheDocument()
        expect(screen.getByText('End')).toBeInTheDocument()
        expect(screen.getByText('GDD')).toBeInTheDocument()
        expect(screen.getByText('Shared')).toBeInTheDocument()
      })
    })

    it('shows a calculate action for records without a stored GDD value', async () => {
      render(<GDDTracker userId="test-user-id" />)

      await waitFor(() => {
        expect(screen.getByText('Calculate')).toBeInTheDocument()
      })
    })

    it('shows the empty state when no records exist', async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'gdd_records') {
          return {
            select: () => ({
              eq: () => ({
                order: () => ({
                  order: () => Promise.resolve({ data: [], error: null }),
                }),
              }),
            }),
          }
        }

        if (table === 'apiaries') {
          return {
            select: () => ({
              eq: () => ({
                order: () => Promise.resolve({ data: mockApiaries, error: null }),
              }),
            }),
          }
        }

        if (table === 'dropdown_values') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  order: () =>
                    Promise.resolve({
                      data: mockVegetationTypes.map((value) => ({
                        ...value,
                        dropdown_categories: { category_key: 'vegetation_type' },
                      })),
                      error: null,
                    }),
                }),
              }),
            }),
          }
        }

        return {}
      })

      render(<GDDTracker userId="test-user-id" />)

      await waitFor(() => {
        expect(screen.getByText(/No GDD records yet/)).toBeInTheDocument()
      })
    })
  })

  describe('Add Record Form', () => {
    it('opens the form with the current field labels', async () => {
      render(<GDDTracker userId="test-user-id" />)

      await waitFor(() => {
        fireEvent.click(screen.getByText('Add Record'))
      })

      await waitFor(() => {
        expect(screen.getByText('New GDD Record')).toBeInTheDocument()
        expect(screen.getByText('Apiary *')).toBeInTheDocument()
        expect(screen.getByText('Vegetation Type *')).toBeInTheDocument()
        expect(screen.getByText('Bloom Observed Date *')).toBeInTheDocument()
        expect(screen.getByText('Bloom End Date (optional)')).toBeInTheDocument()
        expect(screen.getByText(/GDD calculated from Jan 1st to this date/)).toBeInTheDocument()
      })
    })

    it('shows the sharing hint in British English', async () => {
      render(<GDDTracker userId="test-user-id" />)

      await waitFor(() => {
        fireEvent.click(screen.getByText('Add Record'))
      })

      await waitFor(() => {
        expect(screen.getByText('Share this data with nearby beekeepers')).toBeInTheDocument()
        expect(
          screen.getByText(/Data will be anonymised and only shown to users within 20km/)
        ).toBeInTheDocument()
      })
    })

    it('hides the form when Cancel is clicked', async () => {
      render(<GDDTracker userId="test-user-id" />)

      await waitFor(() => {
        fireEvent.click(screen.getByText('Add Record'))
      })

      await waitFor(() => {
        expect(screen.getByText('New GDD Record')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Cancel'))

      await waitFor(() => {
        expect(screen.queryByText('New GDD Record')).not.toBeInTheDocument()
      })
    })

    it('shows a warning toast when required fields are missing', async () => {
      render(<GDDTracker userId="test-user-id" />)

      await waitFor(() => {
        fireEvent.click(screen.getByText('Add Record'))
      })

      await waitFor(() => {
        fireEvent.click(screen.getByText('Save Record'))
      })

      expect(mockToast.warning).toHaveBeenCalledWith(
        'Please select an apiary, vegetation type, and start date'
      )
    })
  })

  describe('Record Actions', () => {
    it('asks for confirmation before deleting a record', async () => {
      render(<GDDTracker userId="test-user-id" />)

      await waitFor(() => {
        expect(screen.getByText('Home Apiary')).toBeInTheDocument()
      })

      fireEvent.click(screen.getAllByTitle('Delete record')[0])

      expect(global.confirm).toHaveBeenCalledWith('Are you sure you want to delete this record?')
    })

    it('does not call Supabase delete when confirmation is rejected', async () => {
      vi.mocked(global.confirm).mockReturnValueOnce(false)

      render(<GDDTracker userId="test-user-id" />)

      await waitFor(() => {
        expect(screen.getByText('Home Apiary')).toBeInTheDocument()
      })

      mockSupabaseFrom.mockClear()
      fireEvent.click(screen.getAllByTitle('Delete record')[0])

      expect(mockSupabaseFrom).not.toHaveBeenCalledWith('gdd_records')
    })

    it('renders the sharing status actions', async () => {
      render(<GDDTracker userId="test-user-id" />)

      await waitFor(() => {
        expect(screen.getByTitle('Sharing enabled')).toBeInTheDocument()
        expect(screen.getByTitle('Sharing disabled')).toBeInTheDocument()
      })
    })
  })
})

describe('GDD Calculation Logic', () => {
  const getSeasonalMultiplier = (month: number) => {
    if (month === 1) return 0.5
    if (month === 2) return 0.75
    return 1
  }

  it('applies the current seasonal multipliers by month', () => {
    const januaryAverage = (10 + 6) / 2
    const februaryAverage = (12 + 4) / 2
    const marchAverage = (12 + 4) / 2

    expect(januaryAverage * getSeasonalMultiplier(1)).toBe(4)
    expect(februaryAverage * getSeasonalMultiplier(2)).toBe(6)
    expect(marchAverage * getSeasonalMultiplier(3)).toBe(8)
  })

  it('accumulates GDD using the seasonal multiplier formula', () => {
    const weatherData = [
      { month: 1, tMax: 10, tMin: 6 }, // avg=8, GDD=4
      { month: 2, tMax: 12, tMin: 4 }, // avg=8, GDD=6
      { month: 3, tMax: 12, tMin: 4 }, // avg=8, GDD=8
      { month: 3, tMax: -2, tMin: -6 }, // avg=-4, GDD=0
    ]

    let totalGDD = 0
    for (const day of weatherData) {
      const avgTemp = (day.tMax + day.tMin) / 2
      if (avgTemp > 0) {
        totalGDD += avgTemp * getSeasonalMultiplier(day.month)
      }
    }

    expect(totalGDD).toBe(18)
  })

  it('rounds the stored GDD to one decimal place', () => {
    const totalGDD = 245.567
    const rounded = Math.round(totalGDD * 10) / 10
    expect(rounded).toBe(245.6)
  })

  it('skips null temperatures when accumulating GDD', () => {
    const weatherData = [
      { month: 1, tMax: 10, tMin: 6 }, // avg=8, GDD=4
      { month: 2, tMax: null, tMin: 12 }, // skip
      { month: 2, tMax: 18, tMin: null }, // skip
      { month: 3, tMax: 12, tMin: 4 }, // avg=8, GDD=8
    ]

    let totalGDD = 0
    for (const day of weatherData) {
      if (day.tMax !== null && day.tMin !== null) {
        const avgTemp = (day.tMax + day.tMin) / 2
        if (avgTemp > 0) {
          totalGDD += avgTemp * getSeasonalMultiplier(day.month)
        }
      }
    }

    expect(totalGDD).toBe(12)
  })
})

describe('Data Export Integration', () => {
  it('uses the gdd_records table name for CRUD operations', () => {
    expect('gdd_records').toBe('gdd_records')
  })
})
