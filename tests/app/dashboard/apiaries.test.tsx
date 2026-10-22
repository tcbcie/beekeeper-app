import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders } from '../../utils/render'
import { mockQuery } from '../../utils/supabase-mock'
import ApiariesPage from '@/app/dashboard/apiaries/page'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
  usePathname: () => '/dashboard/apiaries',
  useSearchParams: () => new URLSearchParams(),
}))

// Hoist mocks
const { mockFrom, mockGetSession } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetSession: vi.fn(),
}))

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: mockFrom,
    auth: { getSession: mockGetSession },
  },
}))

vi.mock('@/lib/auth', () => ({
  getCurrentUserId: vi.fn().mockResolvedValue('user-123'),
}))

// Team access is a cached RPC; a fixed "no teams" answer keeps each test independent.
vi.mock('@/lib/team-access', () => ({
  getTeamAccess: vi.fn().mockResolvedValue({ isTeamMember: false, sharedApiaryIds: [] }),
  clearTeamAccessCache: vi.fn(),
}))

vi.mock('@/lib/elevation', () => ({
  fetchElevation: vi.fn().mockResolvedValue(null),
}))

// Mapbox can't run in jsdom; the picker only needs to appear.
vi.mock('@/components/MapLocationPicker', () => ({
  default: () => <div>Map location picker</div>,
}))

const mockUserId = 'user-123'

interface ApiaryRow {
  id: string
  user_id?: string
  name: string
  location?: string | null
  city?: string | null
  eircode?: string | null
  notes?: string | null
  is_uk_ni?: boolean
}

/** Point every table at an empty result, `apiaries` at `rows`, and record apiary inserts. */
function mockTables(rows: ApiaryRow[] = []) {
  const mockInsert = vi.fn()
  mockFrom.mockImplementation((table: string) =>
    table === 'apiaries'
      ? mockQuery({ data: rows, error: null }, { insert: mockInsert })
      : mockQuery({ data: [], error: null })
  )
  return mockInsert
}

/** Address lookups succeed: Irish Eircodes via /api/geocode, UK postcodes via postcodes.io. */
function mockGeocodeSuccess() {
  mockGetSession.mockResolvedValue({ data: { session: { access_token: 'token' } } })
  vi.stubGlobal(
    'fetch',
    vi.fn((url: string) =>
      Promise.resolve({
        json: () =>
          Promise.resolve(
            url.includes('postcodes.io')
              ? { status: 200, result: { latitude: 54.597, longitude: -5.93 } }
              : { ok: true, lat: '53.35', lon: '-6.26' }
          ),
      })
    )
  )
}

async function renderPage() {
  renderWithProviders(<ApiariesPage />)
  // The header button is the ready signal: it appears once loading has finished.
  return screen.findAllByRole('button', { name: /^add apiary$/i })
}

async function openAddForm() {
  const [headerButton] = await renderPage()
  await userEvent.click(headerButton)
  return screen.getByPlaceholderText(/home garden/i).closest('form') as HTMLFormElement
}

function submitForm(form: HTMLFormElement) {
  return userEvent.click(within(form).getByRole('button', { name: /^add apiary$/i }))
}

describe('ApiariesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    mockGetSession.mockResolvedValue({ data: { session: null } })
    mockTables()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('Add Apiary Form - Eircode Field', () => {
    it('should show Eircode field with label "Eircode (Postcode)"', async () => {
      await openAddForm()
      expect(screen.getByText('Eircode (Postcode)')).toBeInTheDocument()
    })

    it('should not require Eircode field to submit form', async () => {
      const mockInsert = mockTables()
      const form = await openAddForm()

      const eircodeInput = screen.getByPlaceholderText(/e\.g\., d02 xy45/i)
      expect(eircodeInput).not.toBeRequired()

      await userEvent.type(screen.getByPlaceholderText(/home garden/i), 'New Apiary')
      await submitForm(form)
      await userEvent.click(await screen.findByRole('button', { name: 'Save without a location' }))

      await waitFor(() => expect(mockInsert).toHaveBeenCalled())
    })

    it('should show helper text indicating Eircode is optional', async () => {
      await openAddForm()
      expect(screen.getByText(/optional - used for automatic weather data/i)).toBeInTheDocument()
    })
  })

  describe('Add Apiary Form - UK/NI Checkbox', () => {
    it('should show UK/NI Postcode checkbox', async () => {
      await openAddForm()
      const checkbox = screen.getByLabelText(/uk\/ni postcode/i)
      expect(checkbox).toBeInTheDocument()
      expect(checkbox).not.toBeChecked()
    })

    it('should toggle UK/NI checkbox when clicked', async () => {
      await openAddForm()
      const checkbox = screen.getByLabelText(/uk\/ni postcode/i) as HTMLInputElement
      expect(checkbox.checked).toBe(false)
      await userEvent.click(checkbox)
      expect(checkbox.checked).toBe(true)
      await userEvent.click(checkbox)
      expect(checkbox.checked).toBe(false)
    })

    it('should reset UK/NI checkbox to false when form is cancelled', async () => {
      await openAddForm()
      await userEvent.click(screen.getByLabelText(/uk\/ni postcode/i))
      expect((screen.getByLabelText(/uk\/ni postcode/i) as HTMLInputElement).checked).toBe(true)

      // The header button reads "Cancel" while the form is open.
      await userEvent.click(screen.getAllByRole('button', { name: /^cancel$/i })[0])
      await waitFor(() => expect(screen.queryByText('Add New Apiary')).not.toBeInTheDocument())

      await openAddForm()
      expect((screen.getByLabelText(/uk\/ni postcode/i) as HTMLInputElement).checked).toBe(false)
    })
  })

  describe('Add Apiary Form - Dynamic Placeholder', () => {
    it('should show Irish Eircode placeholder by default', async () => {
      await openAddForm()
      expect(screen.getByPlaceholderText(/e\.g\., d02 xy45/i)).toBeInTheDocument()
    })

    it('should change placeholder to UK format when UK/NI checkbox is checked', async () => {
      await openAddForm()
      await userEvent.click(screen.getByLabelText(/uk\/ni postcode/i))
      expect(screen.getByPlaceholderText(/e\.g\., bt1 5gs/i)).toBeInTheDocument()
      expect(screen.queryByPlaceholderText(/e\.g\., d02 xy45/i)).not.toBeInTheDocument()
    })

    it('should revert to Irish placeholder when UK/NI checkbox is unchecked', async () => {
      await openAddForm()
      const checkbox = screen.getByLabelText(/uk\/ni postcode/i)
      await userEvent.click(checkbox)
      expect(screen.getByPlaceholderText(/e\.g\., bt1 5gs/i)).toBeInTheDocument()
      await userEvent.click(checkbox)
      expect(screen.getByPlaceholderText(/e\.g\., d02 xy45/i)).toBeInTheDocument()
    })
  })

  describe('Add Apiary Form - Field Validation', () => {
    it('should still require apiary name', async () => {
      await openAddForm()
      expect(screen.getByPlaceholderText(/home garden/i)).toBeRequired()
    })

    it('should convert Eircode to uppercase', async () => {
      await openAddForm()
      const eircodeInput = screen.getByPlaceholderText(/e\.g\., d02 xy45/i) as HTMLInputElement
      await userEvent.type(eircodeInput, 'd02xy45')
      expect(eircodeInput.value).toBe('D02XY45')
    })
  })

  describe('Edit Apiary Form', () => {
    const existing: ApiaryRow = {
      id: 'apiary-1',
      user_id: mockUserId,
      name: 'Test Apiary',
      location: 'North Field',
      city: 'Dublin',
      eircode: 'D02 XY45',
      notes: 'Test notes',
    }

    it('should populate form when editing existing apiary', async () => {
      mockTables([existing])
      renderWithProviders(<ApiariesPage />)

      await screen.findByText('Test Apiary')
      await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))

      expect(screen.getByDisplayValue('Test Apiary')).toBeInTheDocument()
      expect(screen.getByDisplayValue('North Field')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Dublin')).toBeInTheDocument()
      expect(screen.getByDisplayValue('D02 XY45')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test notes')).toBeInTheDocument()
    })

    it('should leave UK/NI unchecked when editing an Irish apiary', async () => {
      mockTables([existing])
      renderWithProviders(<ApiariesPage />)

      await screen.findByText('Test Apiary')
      await userEvent.click(screen.getByRole('button', { name: /^edit$/i }))

      expect((screen.getByLabelText(/uk\/ni postcode/i) as HTMLInputElement).checked).toBe(false)
    })
  })

  describe('Form Submission', () => {
    it('should successfully create apiary without Eircode', async () => {
      const mockInsert = mockTables()
      const form = await openAddForm()

      await userEvent.type(screen.getByPlaceholderText(/home garden/i), 'New Apiary')
      await submitForm(form)
      await userEvent.click(await screen.findByRole('button', { name: 'Save without a location' }))

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith([
          expect.objectContaining({ name: 'New Apiary', eircode: null, user_id: mockUserId }),
        ])
      })
    })

    it('should successfully create apiary with Eircode', async () => {
      mockGeocodeSuccess()
      const mockInsert = mockTables()
      const form = await openAddForm()

      await userEvent.type(screen.getByPlaceholderText(/home garden/i), 'New Apiary')
      await userEvent.type(screen.getByPlaceholderText(/e\.g\., d02 xy45/i), 'D02XY45')
      await submitForm(form)

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith([
          expect.objectContaining({ name: 'New Apiary', eircode: 'D02XY45', user_id: mockUserId }),
        ])
      })
    })
  })

  describe('Eircode Missing Confirmation', () => {
    it('should show confirmation popup when submitting without Eircode', async () => {
      const form = await openAddForm()

      await userEvent.type(screen.getByPlaceholderText(/home garden/i), 'Test Apiary')
      await submitForm(form)

      const dialog = await screen.findByRole('dialog')
      expect(within(dialog).getByText('No location set for this apiary')).toBeInTheDocument()
      expect(within(dialog).getByText(/weather is not recorded automatically/i)).toBeInTheDocument()
    })

    it('should proceed with submission when user confirms popup', async () => {
      const mockInsert = mockTables()
      const form = await openAddForm()

      await userEvent.type(screen.getByPlaceholderText(/home garden/i), 'Test Apiary')
      await submitForm(form)
      await userEvent.click(await screen.findByRole('button', { name: 'Save without a location' }))

      await waitFor(() => expect(mockInsert).toHaveBeenCalled())
    })

    it('should cancel submission and offer the map when user rejects popup', async () => {
      const mockInsert = mockTables()
      const form = await openAddForm()

      await userEvent.type(screen.getByPlaceholderText(/home garden/i), 'Test Apiary')
      await submitForm(form)
      await userEvent.click(await screen.findByRole('button', { name: 'Set on map' }))

      expect(await screen.findByText('Map location picker')).toBeInTheDocument()
      expect(mockInsert).not.toHaveBeenCalled()
      expect(screen.getByText('Add New Apiary')).toBeInTheDocument()
    })

    it('should not show confirmation popup when Eircode is provided and found', async () => {
      mockGeocodeSuccess()
      const mockInsert = mockTables()
      const form = await openAddForm()

      await userEvent.type(screen.getByPlaceholderText(/home garden/i), 'Test Apiary')
      await userEvent.type(screen.getByPlaceholderText(/e\.g\., d02 xy45/i), 'D02XY45')
      await submitForm(form)

      await waitFor(() => expect(mockInsert).toHaveBeenCalled())
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('should show confirmation popup when Eircode is only whitespace', async () => {
      const form = await openAddForm()

      await userEvent.type(screen.getByPlaceholderText(/home garden/i), 'Test Apiary')
      await userEvent.type(screen.getByPlaceholderText(/e\.g\., d02 xy45/i), '   ')
      await submitForm(form)

      expect(await screen.findByRole('dialog')).toBeInTheDocument()
    })
  })

  describe('Database - is_uk_ni Column', () => {
    it('should save is_uk_ni as false when UK/NI checkbox is unchecked', async () => {
      mockGeocodeSuccess()
      const mockInsert = mockTables()
      const form = await openAddForm()

      await userEvent.type(screen.getByPlaceholderText(/home garden/i), 'Irish Apiary')
      await userEvent.type(screen.getByPlaceholderText(/e\.g\., d02 xy45/i), 'D02XY45')
      await submitForm(form)

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith([expect.objectContaining({ is_uk_ni: false })])
      })
    })

    it('should save is_uk_ni as true when UK/NI checkbox is checked', async () => {
      mockGeocodeSuccess()
      const mockInsert = mockTables()
      const form = await openAddForm()

      await userEvent.type(screen.getByPlaceholderText(/home garden/i), 'Belfast Apiary')
      await userEvent.click(screen.getByLabelText(/uk\/ni postcode/i))
      await userEvent.type(screen.getByPlaceholderText(/e\.g\., bt1 5gs/i), 'BT1 5GS')
      await submitForm(form)

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith([expect.objectContaining({ is_uk_ni: true })])
      })
    })

    it('should save is_uk_ni as false even when no Eircode is provided', async () => {
      const mockInsert = mockTables()
      const form = await openAddForm()

      await userEvent.type(screen.getByPlaceholderText(/home garden/i), 'No Postcode Apiary')
      await submitForm(form)
      await userEvent.click(await screen.findByRole('button', { name: 'Save without a location' }))

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith([expect.objectContaining({ is_uk_ni: false, eircode: null })])
      })
    })
  })
})
