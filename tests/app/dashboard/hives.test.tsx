import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../utils/render'
import { mockQuery } from '../../utils/supabase-mock'
import HivesPage from '@/app/dashboard/hives/page'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush, replace: vi.fn(), back: vi.fn() }),
  usePathname: () => '/dashboard/hives',
  useSearchParams: () => new URLSearchParams(),
}))

// Hoist mocks
const { mockFrom, mockRpc, mockGetSession } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRpc: vi.fn(),
  mockGetSession: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    rpc: mockRpc,
    auth: {
      getSession: mockGetSession,
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}))

vi.mock('@/lib/auth', () => ({
  getCurrentUserId: vi.fn().mockResolvedValue('user-123'),
}))

// Team access is a cached RPC; a fixed answer keeps each test independent.
vi.mock('@/lib/team-access', () => ({
  getTeamAccess: vi.fn().mockResolvedValue({
    teamIds: ['team-1'],
    sharedApiaryIds: ['apiary-shared'],
    sharedOwnerIds: ['user-456'],
    isTeamMember: true,
  }),
  clearTeamAccessCache: vi.fn(),
}))

const mockUserId = 'user-123'
const otherUserId = 'user-456'
const mockApiaryId = 'apiary-456'

/** Every table empty except `hives` and `apiaries`; hive inserts are recorded. */
function mockTables(hives: Record<string, unknown>[] = []) {
  const mockInsert = vi.fn()
  mockFrom.mockImplementation((table: string) => {
    if (table === 'hives') return mockQuery({ data: hives, error: null, count: hives.length }, { insert: mockInsert })
    if (table === 'apiaries') {
      return mockQuery({ data: [{ id: mockApiaryId, name: 'Test Apiary', user_id: mockUserId }], error: null })
    }
    return mockQuery({ data: [], error: null })
  })
  return mockInsert
}

describe('HivesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockRpc.mockResolvedValue({ data: [], error: null })
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: mockUserId }, access_token: 'token' } },
      error: null,
    })
  })

  describe('Create hive (RLS)', () => {
    it('should include user_id in insert data', { timeout: 15000 }, async () => {
      const mockInsert = mockTables()
      renderWithProviders(<HivesPage />)

      // The header button is the ready signal: it appears once loading has finished.
      const [addButton] = await screen.findAllByRole('button', { name: /^add hive$/i })
      await userEvent.click(addButton)

      await userEvent.type(screen.getByPlaceholderText('e.g., A-1, B-3'), 'TEST-H1')
      const apiarySelect = screen
        .getAllByRole('combobox')
        .find((select) => select.querySelector('option[value=""]')?.textContent === 'Select apiary') as HTMLSelectElement
      await userEvent.selectOptions(apiarySelect, mockApiaryId)

      const submit = screen
        .getAllByRole('button', { name: /add hive/i })
        .find((button) => button.getAttribute('type') === 'submit')
      await userEvent.click(submit!)

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith([
          expect.objectContaining({ hive_number: 'TEST-H1', apiary_id: mockApiaryId, user_id: mockUserId }),
        ])
      }, { timeout: 10000 })
    })
  })

  describe('Configuration Change Tracking Visibility', () => {
    // A hive counts as shared when someone else owns it (useHivesList: user_id !== current user).
    const hive = (overrides: Record<string, unknown>) => ({
      id: 'hive-1',
      hive_number: 'H1',
      apiary_id: mockApiaryId,
      user_id: mockUserId,
      configuration_changed_at: '2025-01-15T10:30:00Z',
      configuration: { brood_boxes_full: 1 },
      ...overrides,
    })

    it('should hide "Last changed" for the user\'s own hives', async () => {
      mockTables([hive({})])
      renderWithProviders(<HivesPage />)

      await screen.findByText('H1')
      expect(screen.queryByText(/Last changed:/)).not.toBeInTheDocument()
    })

    it('should hide "Last changed" for an own hive in a shared apiary', async () => {
      mockTables([hive({ apiary_id: 'apiary-shared' })])
      renderWithProviders(<HivesPage />)

      await screen.findByText('H1')
      expect(screen.queryByText(/Last changed:/)).not.toBeInTheDocument()
    })

    it('should show "Last changed" for shared hives NOT owned by current user', async () => {
      mockTables([hive({ apiary_id: 'apiary-shared', user_id: otherUserId })])
      renderWithProviders(<HivesPage />)

      await screen.findByText('H1')
      expect(screen.getByText(/Last changed:/)).toBeInTheDocument()
    })

    it('should hide "Last changed" when configuration_changed_at is null', async () => {
      mockTables([hive({ apiary_id: 'apiary-shared', user_id: otherUserId, configuration_changed_at: null })])
      renderWithProviders(<HivesPage />)

      await screen.findByText('H1')
      expect(screen.queryByText(/Last changed:/)).not.toBeInTheDocument()
    })
  })
})
