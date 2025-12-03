import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HarvestReport from '@/components/reports/HarvestReport'

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

describe('HarvestReport', () => {
  const mockHarvestData = [
    {
      id: 'harvest-1',
      hive_id: 'hive-1',
      harvest_date: '2025-07-15',
      honey_weight_kg: 25.5,
      notes: 'Excellent summer harvest',
      hives: {
        hive_number: 'H001',
        apiaries: { name: 'Main Apiary' }
      }
    },
    {
      id: 'harvest-2',
      hive_id: 'hive-2',
      harvest_date: '2025-08-20',
      honey_weight_kg: 18.0,
      notes: null,
      hives: {
        hive_number: 'H002',
        apiaries: { name: 'North Apiary' }
      }
    },
    {
      id: 'harvest-3',
      hive_id: 'hive-3',
      harvest_date: '2025-09-10',
      honey_weight_kg: 30.2,
      notes: 'Late season harvest',
      hives: {
        hive_number: 'H003',
        apiaries: { name: 'Main Apiary' }
      }
    },
    {
      id: 'harvest-4',
      hive_id: 'hive-1',
      harvest_date: '2024-07-10',
      honey_weight_kg: 22.0,
      notes: 'Previous year harvest',
      hives: {
        hive_number: 'H001',
        apiaries: { name: 'Main Apiary' }
      }
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockHarvestData,
            error: null
          })
        })
      })
    })
  })

  it('should render loading state initially', () => {
    render(<HarvestReport />)
    expect(screen.getByText('Loading harvest data...')).toBeInTheDocument()
  })

  it('should display summary statistics', async () => {
    render(<HarvestReport />)

    await waitFor(() => {
      expect(screen.getByText('Total Harvest')).toBeInTheDocument()
      expect(screen.getByText('Harvest Events')).toBeInTheDocument()
      expect(screen.getByText('Avg Per Harvest')).toBeInTheDocument()
    })
  })

  it('should calculate total harvest correctly for current year', async () => {
    render(<HarvestReport />)

    await waitFor(() => {
      // 2025 harvests: 25.5 + 18.0 + 30.2 = 73.7 kg
      expect(screen.getByText('73.7 kg')).toBeInTheDocument()
    })
  })

  it('should calculate average per harvest correctly', async () => {
    render(<HarvestReport />)

    await waitFor(() => {
      // Average for 2025: 73.7 / 3 = 24.6 kg
      expect(screen.getByText('24.6 kg')).toBeInTheDocument()
    })
  })

  it('should display harvest cards with correct information', async () => {
    render(<HarvestReport />)

    await waitFor(() => {
      expect(screen.getByText('H001')).toBeInTheDocument()
      expect(screen.getByText('H002')).toBeInTheDocument()
      expect(screen.getByText('H003')).toBeInTheDocument()
    })

    // Check weights are displayed
    expect(screen.getByText('25.5 kg')).toBeInTheDocument()
    expect(screen.getByText('18.0 kg')).toBeInTheDocument()
    expect(screen.getByText('30.2 kg')).toBeInTheDocument()
  })

  it('should filter harvests by year', async () => {
    const user = userEvent.setup()
    render(<HarvestReport />)

    await waitFor(() => {
      // Initially showing 2025 (current year)
      expect(screen.getByText('H001')).toBeInTheDocument()
      expect(screen.getByText('H002')).toBeInTheDocument()
      expect(screen.getByText('H003')).toBeInTheDocument()
    })

    // Click 2024 year button
    const year2024Button = screen.getByRole('button', { name: '2024' })
    await user.click(year2024Button)

    await waitFor(() => {
      // Should show 2024 harvest total: 22.0 kg
      expect(screen.getByText('22.0 kg')).toBeInTheDocument()
      // Should show 1 harvest event
      const eventsElement = screen.getByText('Harvest Events')
      expect(eventsElement.parentElement?.textContent).toContain('1')
    })
  })

  it('should filter harvests by apiary', async () => {
    const user = userEvent.setup()
    render(<HarvestReport />)

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

  it('should display apiary breakdown statistics', async () => {
    render(<HarvestReport />)

    await waitFor(() => {
      expect(screen.getByText('Harvest by Apiary')).toBeInTheDocument()
    })

    // Should show stats for Main Apiary and North Apiary
    const mainApiaryElements = screen.getAllByText('Main Apiary')
    expect(mainApiaryElements.length).toBeGreaterThan(0)

    const northApiaryElements = screen.getAllByText('North Apiary')
    expect(northApiaryElements.length).toBeGreaterThan(0)
  })

  it('should show harvest notes when available', async () => {
    render(<HarvestReport />)

    await waitFor(() => {
      expect(screen.getByText('Excellent summer harvest')).toBeInTheDocument()
      expect(screen.getByText('Late season harvest')).toBeInTheDocument()
    })
  })

  it('should display formatted dates', async () => {
    render(<HarvestReport />)

    await waitFor(() => {
      // Check for formatted dates (July, August, September)
      const dateElements = screen.getAllByText(/July|August|September/)
      expect(dateElements.length).toBeGreaterThan(0)
    })
  })

  it('should handle empty data with helpful message', async () => {
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

    render(<HarvestReport />)

    await waitFor(() => {
      expect(screen.getByText(/No harvest records found for/)).toBeInTheDocument()
      expect(screen.getByText('Record your honey harvests to track productivity over time.')).toBeInTheDocument()
    })
  })

  it('should show year filter buttons', async () => {
    render(<HarvestReport />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '2025' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '2024' })).toBeInTheDocument()
    })
  })

  it('should show all apiaries option in filter', async () => {
    render(<HarvestReport />)

    await waitFor(() => {
      const allButtons = screen.getAllByRole('button', { name: 'All' })
      expect(allButtons.length).toBeGreaterThan(0)
    })
  })

  it('should calculate apiary totals correctly', async () => {
    render(<HarvestReport />)

    await waitFor(() => {
      expect(screen.getByText('Harvest by Apiary')).toBeInTheDocument()
    })

    // Main Apiary total: 25.5 + 30.2 = 55.7 kg (for 2025)
    expect(screen.getByText('55.7 kg')).toBeInTheDocument()
    // North Apiary total: 18.0 kg
    expect(screen.getByText('18.0 kg')).toBeInTheDocument()
  })

  it('should handle API errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Database error' }
          })
        })
      })
    })

    render(<HarvestReport />)

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    consoleErrorSpy.mockRestore()
  })

  it('should show individual harvest section', async () => {
    render(<HarvestReport />)

    await waitFor(() => {
      expect(screen.getByText('Individual Harvests')).toBeInTheDocument()
    })
  })
})
