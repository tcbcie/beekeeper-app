import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import SubscriptionHistoryTable from '@/components/SubscriptionHistoryTable'

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    rpc: vi.fn()
  }
}))

// Import the mocked supabase
import { supabase } from '@/lib/supabase'

// The mock resolves plain objects, not full PostgREST responses, so use it untyped.
const rpc = supabase.rpc as unknown as Mock

describe('SubscriptionHistoryTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Loading State', () => {
    it('should show loading skeleton while fetching data', () => {
      // Mock a delayed response
      rpc.mockImplementation(() =>
        new Promise(() => {}) // Never resolves
      )

      render(<SubscriptionHistoryTable />)

      expect(screen.getByText('Subscription History')).toBeInTheDocument()
      // Check for loading skeleton elements
      const skeletons = document.querySelectorAll('.animate-pulse')
      expect(skeletons.length).toBeGreaterThan(0)
    })
  })

  describe('Empty State', () => {
    it('should return null when there is no subscription history', async () => {
      rpc.mockResolvedValue({
        data: [],
        error: null
      })

      const { container } = render(<SubscriptionHistoryTable />)

      await waitFor(() => {
        expect(container.firstChild).toBeNull()
      })
    })

    it('should not show "Subscription History" heading when empty', async () => {
      rpc.mockResolvedValue({
        data: [],
        error: null
      })

      render(<SubscriptionHistoryTable />)

      await waitFor(() => {
        expect(screen.queryByText('Subscription History')).not.toBeInTheDocument()
      })
    })

    it('should not show empty state message when no history', async () => {
      rpc.mockResolvedValue({
        data: [],
        error: null
      })

      render(<SubscriptionHistoryTable />)

      await waitFor(() => {
        expect(screen.queryByText('No subscription history yet')).not.toBeInTheDocument()
        expect(screen.queryByText('Your renewals and activations will appear here')).not.toBeInTheDocument()
      })
    })
  })

  describe('With Data', () => {
    const mockHistoryData = [
      {
        id: '1',
        code: 'TEST-CODE-123',
        activated_at: '2025-01-15T10:00:00Z',
        expires_at: '2099-01-15T10:00:00Z',
        is_current: true
      },
      {
        id: '2',
        code: 'OLD-CODE-456',
        activated_at: '2024-01-15T10:00:00Z',
        expires_at: '2025-01-15T10:00:00Z',
        is_current: false
      }
    ]

    it('should display subscription history table with data', async () => {
      rpc.mockResolvedValue({
        data: mockHistoryData,
        error: null
      })

      render(<SubscriptionHistoryTable />)

      await waitFor(() => {
        expect(screen.getByText('Subscription History')).toBeInTheDocument()
        expect(screen.getByText('TEST-CODE-123')).toBeInTheDocument()
        expect(screen.getByText('OLD-CODE-456')).toBeInTheDocument()
      })
    })

    it('should show correct number of activations', async () => {
      rpc.mockResolvedValue({
        data: mockHistoryData,
        error: null
      })

      render(<SubscriptionHistoryTable />)

      await waitFor(() => {
        expect(screen.getByText('2 activations')).toBeInTheDocument()
      })
    })

    it('should show "Current" badge for current subscription', async () => {
      rpc.mockResolvedValue({
        data: mockHistoryData,
        error: null
      })

      render(<SubscriptionHistoryTable />)

      await waitFor(() => {
        expect(screen.getByText('Current')).toBeInTheDocument()
      })
    })

    it('should show "Active" status for current non-expired subscription', async () => {
      rpc.mockResolvedValue({
        data: mockHistoryData,
        error: null
      })

      render(<SubscriptionHistoryTable />)

      await waitFor(() => {
        expect(screen.getByText('Active')).toBeInTheDocument()
      })
    })

    it('should show table headers', async () => {
      rpc.mockResolvedValue({
        data: mockHistoryData,
        error: null
      })

      render(<SubscriptionHistoryTable />)

      await waitFor(() => {
        expect(screen.getByText('Code')).toBeInTheDocument()
        expect(screen.getByText('Activated')).toBeInTheDocument()
        expect(screen.getByText('Expires')).toBeInTheDocument()
        expect(screen.getByText('Status')).toBeInTheDocument()
      })
    })

    it('should show footer message', async () => {
      rpc.mockResolvedValue({
        data: mockHistoryData,
        error: null
      })

      render(<SubscriptionHistoryTable />)

      await waitFor(() => {
        expect(screen.getByText('Showing all subscription activations and renewals for your account')).toBeInTheDocument()
      })
    })

    it('should use singular "activation" for one item', async () => {
      rpc.mockResolvedValue({
        data: [mockHistoryData[0]],
        error: null
      })

      render(<SubscriptionHistoryTable />)

      await waitFor(() => {
        expect(screen.getByText('1 activation')).toBeInTheDocument()
      })
    })
  })

  describe('Expired Subscriptions', () => {
    it('should show "Expired" status for past subscriptions', async () => {
      const expiredData = [
        {
          id: '1',
          code: 'EXPIRED-CODE',
          activated_at: '2023-01-15T10:00:00Z',
          expires_at: '2024-01-15T10:00:00Z',
          is_current: false
        }
      ]

      rpc.mockResolvedValue({
        data: expiredData,
        error: null
      })

      render(<SubscriptionHistoryTable />)

      await waitFor(() => {
        expect(screen.getByText('Expired')).toBeInTheDocument()
      })
    })

    it('should show "Past" status for non-current unexpired subscriptions', async () => {
      const pastData = [
        {
          id: '1',
          code: 'PAST-CODE',
          activated_at: '2024-06-15T10:00:00Z',
          expires_at: '2099-06-15T10:00:00Z',
          is_current: false
        }
      ]

      rpc.mockResolvedValue({
        data: pastData,
        error: null
      })

      render(<SubscriptionHistoryTable />)

      await waitFor(() => {
        expect(screen.getByText('Past')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should return null when RPC call fails', async () => {
      rpc.mockResolvedValue({
        data: null,
        error: { message: 'Database error' }
      })

      const { container } = render(<SubscriptionHistoryTable />)

      await waitFor(() => {
        expect(container.firstChild).toBeNull()
      })
    })

    it('should log error to console when fetch fails', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const mockError = { message: 'Network error' }

      rpc.mockResolvedValue({
        data: null,
        error: mockError
      })

      render(<SubscriptionHistoryTable />)

      await waitFor(() => {
        expect(consoleErrorSpy).toHaveBeenCalledWith(
          'Error fetching subscription history:',
          mockError
        )
      })

      consoleErrorSpy.mockRestore()
    })
  })

  describe('Date Formatting', () => {
    it('should format activation date with time', async () => {
      const dataWithDate = [
        {
          id: '1',
          code: 'TEST-CODE',
          activated_at: '2025-01-15T14:30:00Z',
          expires_at: '2026-01-15T10:00:00Z',
          is_current: true
        }
      ]

      rpc.mockResolvedValue({
        data: dataWithDate,
        error: null
      })

      render(<SubscriptionHistoryTable />)

      await waitFor(() => {
        // Date should be formatted as locale string with time
        const dateElement = screen.getByText(/Jan.*2025/)
        expect(dateElement).toBeInTheDocument()
      })
    })

    it('should format expiration date without time', async () => {
      const dataWithDate = [
        {
          id: '1',
          code: 'TEST-CODE',
          activated_at: '2025-01-15T14:30:00Z',
          expires_at: '2026-02-20T10:00:00Z',
          is_current: true
        }
      ]

      rpc.mockResolvedValue({
        data: dataWithDate,
        error: null
      })

      render(<SubscriptionHistoryTable />)

      await waitFor(() => {
        // Expiration should be formatted as simple date
        const dateElement = screen.getByText(/Feb.*2026/)
        expect(dateElement).toBeInTheDocument()
      })
    })
  })

  describe('Current Subscription Highlighting', () => {
    it('should highlight current subscription row with background color', async () => {
      const dataWithCurrent = [
        {
          id: '1',
          code: 'CURRENT-CODE',
          activated_at: '2025-01-15T10:00:00Z',
          expires_at: '2026-01-15T10:00:00Z',
          is_current: true
        },
        {
          id: '2',
          code: 'OLD-CODE',
          activated_at: '2024-01-15T10:00:00Z',
          expires_at: '2025-01-15T10:00:00Z',
          is_current: false
        }
      ]

      rpc.mockResolvedValue({
        data: dataWithCurrent,
        error: null
      })

      const { container } = render(<SubscriptionHistoryTable />)

      await waitFor(() => {
        const rows = container.querySelectorAll('tbody tr')
        expect(rows[0]).toHaveClass('bg-surface-elevated')
        expect(rows[0]).toHaveClass('dark:bg-surface-elevated')
        expect(rows[1]).not.toHaveClass('bg-surface-elevated')
      })
    })
  })
})
