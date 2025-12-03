import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import VarroaReport from '@/components/reports/VarroaReport'

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

describe('VarroaReport', () => {
  const mockTreatmentsData = [
    {
      id: 'treatment-1',
      hive_id: 'hive-1',
      treatment_date: '2025-11-15',
      treatment_type: 'Oxalic Acid',
      pre_treatment_count: 100,
      post_treatment_count: 20,
      notes: 'First treatment of season',
      hives: {
        hive_number: 'H001',
        apiaries: { name: 'Main Apiary' }
      }
    },
    {
      id: 'treatment-2',
      hive_id: 'hive-2',
      treatment_date: '2025-11-20',
      treatment_type: 'Formic Acid',
      pre_treatment_count: 80,
      post_treatment_count: 10,
      notes: null,
      hives: {
        hive_number: 'H002',
        apiaries: { name: 'North Apiary' }
      }
    },
    {
      id: 'treatment-3',
      hive_id: 'hive-3',
      treatment_date: '2025-10-15',
      treatment_type: 'Apiguard',
      pre_treatment_count: 50,
      post_treatment_count: 40,
      notes: 'Low effectiveness',
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
          order: vi.fn().mockResolvedValue({
            data: mockTreatmentsData,
            error: null
          })
        })
      })
    })
  })

  it('should render loading state initially', () => {
    render(<VarroaReport />)
    expect(screen.getByText('Loading varroa treatment data...')).toBeInTheDocument()
  })

  it('should display summary statistics', async () => {
    render(<VarroaReport />)

    await waitFor(() => {
      expect(screen.getByText('Total Treatments')).toBeInTheDocument()
      expect(screen.getByText('Last 30 Days')).toBeInTheDocument()
      expect(screen.getByText('Avg Effectiveness')).toBeInTheDocument()
      expect(screen.getByText('Low Effectiveness')).toBeInTheDocument()
    })
  })

  it('should calculate effectiveness correctly', async () => {
    render(<VarroaReport />)

    await waitFor(() => {
      // H001: (100-20)/100 = 80% effective
      expect(screen.getByText('80% effective')).toBeInTheDocument()
      // H002: (80-10)/80 = 87.5% ≈ 88% effective
      expect(screen.getByText('88% effective')).toBeInTheDocument()
      // H003: (50-40)/50 = 20% effective
      expect(screen.getByText('20% effective')).toBeInTheDocument()
    })
  })

  it('should display treatment cards with correct information', async () => {
    render(<VarroaReport />)

    await waitFor(() => {
      expect(screen.getByText('H001')).toBeInTheDocument()
      expect(screen.getByText('H002')).toBeInTheDocument()
      expect(screen.getByText('H003')).toBeInTheDocument()
    })

    // Check treatment types
    expect(screen.getByText('Oxalic Acid')).toBeInTheDocument()
    expect(screen.getByText('Formic Acid')).toBeInTheDocument()
    expect(screen.getByText('Apiguard')).toBeInTheDocument()
  })

  it('should display pre and post treatment counts', async () => {
    render(<VarroaReport />)

    await waitFor(() => {
      expect(screen.getByText(/Pre-count:/i)).toBeInTheDocument()
      expect(screen.getByText(/Post-count:/i)).toBeInTheDocument()
    })

    // Check specific counts are displayed
    const countElements = screen.getAllByText(/100|20|80|10|50|40/)
    expect(countElements.length).toBeGreaterThan(0)
  })

  it('should filter treatments by apiary', async () => {
    const user = userEvent.setup()
    render(<VarroaReport />)

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

  it('should show treatment notes when available', async () => {
    render(<VarroaReport />)

    await waitFor(() => {
      expect(screen.getByText('First treatment of season')).toBeInTheDocument()
      expect(screen.getByText('Low effectiveness')).toBeInTheDocument()
    })
  })

  it('should display formatted dates', async () => {
    render(<VarroaReport />)

    await waitFor(() => {
      // Check for formatted date (November/October)
      const dateElements = screen.getAllByText(/November|October/)
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

    render(<VarroaReport />)

    await waitFor(() => {
      expect(screen.getByText('No varroa treatments recorded yet.')).toBeInTheDocument()
      expect(screen.getByText('Start tracking your varroa treatments to see effectiveness data here.')).toBeInTheDocument()
    })
  })

  it('should calculate average effectiveness correctly', async () => {
    render(<VarroaReport />)

    await waitFor(() => {
      // Average: (80 + 88 + 20) / 3 = 62.67 ≈ 63%
      const avgElements = screen.getAllByText(/63%/)
      expect(avgElements.length).toBeGreaterThan(0)
    })
  })

  it('should count treatments in last 30 days', async () => {
    render(<VarroaReport />)

    await waitFor(() => {
      // H001 and H002 are in last 30 days (November), H003 is older (October)
      const lastThirtyElement = screen.getByText('Last 30 Days')
      expect(lastThirtyElement).toBeInTheDocument()
      // The number "2" should appear near "Last 30 Days"
      expect(lastThirtyElement.parentElement?.textContent).toContain('2')
    })
  })

  it('should identify low effectiveness treatments', async () => {
    render(<VarroaReport />)

    await waitFor(() => {
      // H003 has 20% effectiveness which is < 70%
      const lowEffElement = screen.getByText('Low Effectiveness')
      expect(lowEffElement).toBeInTheDocument()
      expect(lowEffElement.parentElement?.textContent).toContain('1')
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

    render(<VarroaReport />)

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalled()
    })

    consoleErrorSpy.mockRestore()
  })

  it('should show all apiaries filter button', async () => {
    render(<VarroaReport />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'All Apiaries' })).toBeInTheDocument()
    })
  })
})
