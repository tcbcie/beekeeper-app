import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HiveHealthDashboard from '@/components/reports/HiveHealthDashboard'

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

describe('HiveHealthDashboard', () => {
  const mockHivesData = [
    {
      id: 'hive-1',
      hive_number: 'H001',
      status: 'active',
      archived_at: null,
      apiaries: { name: 'Main Apiary' },
      inspections: [
        {
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
          iapv_cbpv_disease: 0
        }
      ]
    },
    {
      id: 'hive-2',
      hive_number: 'H002',
      status: 'active',
      archived_at: null,
      apiaries: { name: 'Main Apiary' },
      inspections: [
        {
          inspection_date: '2025-11-15',
          queen_seen: false,
          population_strength: 2,
          brood_pattern_rating: 3,
          temperament_rating: 3,
          afb_disease: 1,
          efb_disease: 0,
          chalkbrood_disease: 0,
          nosemosis_disease: 0,
          dwv_disease: 0,
          iapv_cbpv_disease: 0
        }
      ]
    },
    {
      id: 'hive-3',
      hive_number: 'H003',
      status: 'active',
      archived_at: '2025-11-01',
      apiaries: { name: 'North Apiary' },
      inspections: []
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()

    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockHivesData,
            error: null
          })
        })
      })
    })
  })

  it('should render loading state initially', () => {
    render(<HiveHealthDashboard />)
    expect(screen.getByText('Loading hive health data...')).toBeInTheDocument()
  })

  it('should display summary statistics', async () => {
    render(<HiveHealthDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Total Hives')).toBeInTheDocument()
      expect(screen.getByText('Healthy')).toBeInTheDocument()
      expect(screen.getByText('Needs Attention')).toBeInTheDocument()
      expect(screen.getByText('Archived')).toBeInTheDocument()
    })

    // Check the numbers
    expect(screen.getByText('3')).toBeInTheDocument() // Total hives
  })

  it('should display hive cards with correct information', async () => {
    render(<HiveHealthDashboard />)

    await waitFor(() => {
      expect(screen.getByText('H001')).toBeInTheDocument()
      expect(screen.getByText('H002')).toBeInTheDocument()
    })

    // Check for apiary names
    expect(screen.getAllByText('Main Apiary').length).toBeGreaterThan(0)
  })

  it('should show health status indicators', async () => {
    render(<HiveHealthDashboard />)

    await waitFor(() => {
      expect(screen.getByText('Healthy')).toBeInTheDocument()
      expect(screen.getByText('Diseased')).toBeInTheDocument()
    })
  })

  it('should filter hives by active only', async () => {
    const user = userEvent.setup()
    render(<HiveHealthDashboard />)

    await waitFor(() => {
      expect(screen.getByText('H001')).toBeInTheDocument()
      expect(screen.getByText('H003')).toBeInTheDocument()
    })

    const activeButton = screen.getByRole('button', { name: /active only/i })
    await user.click(activeButton)

    await waitFor(() => {
      expect(screen.getByText('H001')).toBeInTheDocument()
      expect(screen.getByText('H002')).toBeInTheDocument()
      expect(screen.queryByText('H003')).not.toBeInTheDocument()
    })
  })

  it('should filter hives that need attention', async () => {
    const user = userEvent.setup()
    render(<HiveHealthDashboard />)

    await waitFor(() => {
      expect(screen.getByText('H001')).toBeInTheDocument()
    })

    const needsAttentionButton = screen.getByRole('button', { name: /needs attention/i })
    await user.click(needsAttentionButton)

    await waitFor(() => {
      // H002 should be shown (has disease and low population)
      expect(screen.getByText('H002')).toBeInTheDocument()
      // H001 should not be shown (healthy)
      expect(screen.queryByText('H001')).not.toBeInTheDocument()
    })
  })

  it('should display queen status correctly', async () => {
    render(<HiveHealthDashboard />)

    await waitFor(() => {
      expect(screen.getByText(/queen: seen/i)).toBeInTheDocument()
      expect(screen.getByText(/queen: not seen/i)).toBeInTheDocument()
    })
  })

  it('should show population strength ratings', async () => {
    render(<HiveHealthDashboard />)

    await waitFor(() => {
      expect(screen.getByText('4/5')).toBeInTheDocument() // H001 population
      expect(screen.getByText('2/5')).toBeInTheDocument() // H002 population
    })
  })

  it('should handle empty data gracefully', async () => {
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

    render(<HiveHealthDashboard />)

    await waitFor(() => {
      expect(screen.getByText('No hives found matching the selected filter.')).toBeInTheDocument()
    })
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

    render(<HiveHealthDashboard />)

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    consoleErrorSpy.mockRestore()
  })

  it('should show days since last inspection', async () => {
    render(<HiveHealthDashboard />)

    await waitFor(() => {
      // Should show days since inspection for hives with inspections
      const daysElements = screen.getAllByText(/days ago/)
      expect(daysElements.length).toBeGreaterThan(0)
    })
  })

  it('should indicate hives with no inspections', async () => {
    render(<HiveHealthDashboard />)

    await waitFor(() => {
      expect(screen.getByText('No inspections recorded')).toBeInTheDocument()
    })
  })
})
