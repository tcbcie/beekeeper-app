import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import InspectionReport from '@/components/reports/InspectionReport'

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

vi.mock('@/lib/auth', () => ({
  getCurrentUserId: vi.fn().mockResolvedValue('user-123')
}))

describe('InspectionReport', () => {
  const mockInspectionData = [
    {
      id: 'inspection-1',
      hive_id: 'hive-1',
      inspection_date: '2025-12-01',
      queen_seen: true,
      population_strength: 4,
      brood_pattern_rating: 5,
      temperament_rating: 4,
      afb_disease: 0,
      efb_disease: 0,
      chalkbrood_disease: 0,
      nosemosis_disease: 0,
      dwv_disease: 0,
      iapv_cbpv_disease: 0,
      queen_cups: false,
      swarm_cells: false,
      supercedure_cells: false,
      emergency_cells: false,
      notes: 'Hive looking strong',
      hives: {
        hive_number: 'H001',
        apiaries: { name: 'Main Apiary' }
      }
    },
    {
      id: 'inspection-2',
      hive_id: 'hive-2',
      inspection_date: '2025-11-28',
      queen_seen: false,
      population_strength: 3,
      brood_pattern_rating: 3,
      temperament_rating: 5,
      afb_disease: 1,
      efb_disease: 0,
      chalkbrood_disease: 0,
      nosemosis_disease: 0,
      dwv_disease: 0,
      iapv_cbpv_disease: 0,
      queen_cups: true,
      swarm_cells: false,
      supercedure_cells: false,
      emergency_cells: false,
      notes: null,
      hives: {
        hive_number: 'H002',
        apiaries: { name: 'North Apiary' }
      }
    },
    {
      id: 'inspection-3',
      hive_id: 'hive-3',
      inspection_date: '2025-11-25',
      queen_seen: true,
      population_strength: 5,
      brood_pattern_rating: 4,
      temperament_rating: 3,
      afb_disease: 0,
      efb_disease: 0,
      chalkbrood_disease: 0,
      nosemosis_disease: 0,
      dwv_disease: 0,
      iapv_cbpv_disease: 0,
      queen_cups: false,
      swarm_cells: true,
      supercedure_cells: false,
      emergency_cells: false,
      notes: 'Swarm cells found',
      hives: {
        hive_number: 'H003',
        apiaries: { name: 'Main Apiary' }
      }
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockInspectionData,
              error: null
            })
          })
        })
      })
    })
  })

  it('should render loading state initially', () => {
    render(<InspectionReport />)
    expect(screen.getByText('Loading inspection data...')).toBeInTheDocument()
  })

  it('should display summary statistics', async () => {
    render(<InspectionReport />)

    await waitFor(() => {
      expect(screen.getByText('Total Inspections')).toBeInTheDocument()
      expect(screen.getByText('Queen Seen')).toBeInTheDocument()
      expect(screen.getByText('Queen Cells Found')).toBeInTheDocument()
      expect(screen.getByText('Disease Detected')).toBeInTheDocument()
    })
  })

  it('should count inspections correctly', async () => {
    render(<InspectionReport />)

    await waitFor(() => {
      const totalElement = screen.getByText('Total Inspections')
      expect(totalElement.parentElement?.textContent).toContain('3')
    })
  })

  it('should count queen sightings correctly', async () => {
    render(<InspectionReport />)

    await waitFor(() => {
      const queenElement = screen.getByText('Queen Seen')
      expect(queenElement.parentElement?.textContent).toContain('2')
    })
  })

  it('should count disease detections correctly', async () => {
    render(<InspectionReport />)

    await waitFor(() => {
      const diseaseElement = screen.getByText('Disease Detected')
      expect(diseaseElement.parentElement?.textContent).toContain('1')
    })
  })

  it('should count queen cells correctly', async () => {
    render(<InspectionReport />)

    await waitFor(() => {
      const queenCellsElement = screen.getByText('Queen Cells Found')
      expect(queenCellsElement.parentElement?.textContent).toContain('2')
    })
  })

  it('should display average ratings', async () => {
    render(<InspectionReport />)

    await waitFor(() => {
      expect(screen.getByText('Average Ratings')).toBeInTheDocument()
      expect(screen.getByText('Population Strength')).toBeInTheDocument()
      expect(screen.getByText('Brood Pattern')).toBeInTheDocument()
      expect(screen.getByText('Temperament')).toBeInTheDocument()
    })

    // Check average calculations
    // Population: (4+3+5)/3 = 4.0
    // Brood: (5+3+4)/3 = 4.0
    // Temperament: (4+5+3)/3 = 4.0
    const avgElements = screen.getAllByText('4.0')
    expect(avgElements.length).toBeGreaterThan(0)
  })

  it('should display inspection cards with correct information', async () => {
    render(<InspectionReport />)

    await waitFor(() => {
      expect(screen.getByText('H001')).toBeInTheDocument()
      expect(screen.getByText('H002')).toBeInTheDocument()
      expect(screen.getByText('H003')).toBeInTheDocument()
    })
  })

  it('should show disease indicators', async () => {
    render(<InspectionReport />)

    await waitFor(() => {
      expect(screen.getByText('Disease')).toBeInTheDocument()
    })
  })

  it('should show queen cells indicators', async () => {
    render(<InspectionReport />)

    await waitFor(() => {
      const queenCellsElements = screen.getAllByText('Queen Cells')
      expect(queenCellsElements.length).toBe(2) // H002 and H003 have queen cells
    })
  })

  it('should filter inspections by time period', async () => {
    const user = userEvent.setup()
    render(<InspectionReport />)

    await waitFor(() => {
      expect(screen.getByText('H001')).toBeInTheDocument()
      expect(screen.getByText('H002')).toBeInTheDocument()
      expect(screen.getByText('H003')).toBeInTheDocument()
    })

    // Click 7 days filter
    const last7DaysButton = screen.getByRole('button', { name: /last 7 days/i })
    await user.click(last7DaysButton)

    // Should trigger re-fetch with new date filter
    await waitFor(() => {
      expect(mockFrom).toHaveBeenCalled()
    })
  })

  it('should filter inspections by apiary', async () => {
    const user = userEvent.setup()
    render(<InspectionReport />)

    await waitFor(() => {
      expect(screen.getByText('H001')).toBeInTheDocument()
      expect(screen.getByText('H002')).toBeInTheDocument()
      expect(screen.getByText('H003')).toBeInTheDocument()
    })

    const mainApiaryButton = screen.getByRole('button', { name: 'Main Apiary' })
    await user.click(mainApiaryButton)

    await waitFor(() => {
      expect(screen.getByText('H001')).toBeInTheDocument()
      expect(screen.getByText('H003')).toBeInTheDocument()
      expect(screen.queryByText('H002')).not.toBeInTheDocument()
    })
  })

  it('should display queen status correctly', async () => {
    render(<InspectionReport />)

    await waitFor(() => {
      expect(screen.getByText(/Queen: Seen/)).toBeInTheDocument()
      expect(screen.getByText(/Queen: Not seen/)).toBeInTheDocument()
    })
  })

  it('should show strength ratings', async () => {
    render(<InspectionReport />)

    await waitFor(() => {
      expect(screen.getByText(/Strength:/)).toBeInTheDocument()
      // Check for ratings out of 5
      const strengthElements = screen.getAllByText(/\/5/)
      expect(strengthElements.length).toBeGreaterThan(0)
    })
  })

  it('should show inspection notes when available', async () => {
    render(<InspectionReport />)

    await waitFor(() => {
      expect(screen.getByText('Hive looking strong')).toBeInTheDocument()
      expect(screen.getByText('Swarm cells found')).toBeInTheDocument()
    })
  })

  it('should display formatted dates', async () => {
    render(<InspectionReport />)

    await waitFor(() => {
      // Check for formatted dates (December/November)
      const dateElements = screen.getAllByText(/December|November/)
      expect(dateElements.length).toBeGreaterThan(0)
    })
  })

  it('should handle empty data with helpful message', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        })
      })
    })

    render(<InspectionReport />)

    await waitFor(() => {
      expect(screen.getByText(/No inspections found in the last/)).toBeInTheDocument()
      expect(screen.getByText('Conduct regular hive inspections to track health and progress.')).toBeInTheDocument()
    })
  })

  it('should show time period filter buttons', async () => {
    render(<InspectionReport />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /last 7 days/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /last 30 days/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /last 90 days/i })).toBeInTheDocument()
    })
  })

  it('should handle API errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' }
            })
          })
        })
      })
    })

    render(<InspectionReport />)

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    consoleErrorSpy.mockRestore()
  })

  it('should show all apiaries option in filter', async () => {
    render(<InspectionReport />)

    await waitFor(() => {
      const allButtons = screen.getAllByRole('button', { name: 'All' })
      expect(allButtons.length).toBeGreaterThan(0)
    })
  })
})
