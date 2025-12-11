import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ApiariesPage from '@/app/dashboard/apiaries/page'

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush
  })
}))

// Mock Toast - must be before component import uses it
vi.mock('@/components/ui/Toast', () => ({
  useToast: () => ({
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }),
}))

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

// Mock auth
vi.mock('@/lib/auth', () => ({
  getCurrentUserId: vi.fn().mockResolvedValue('user-123')
}))

describe('ApiariesPage', () => {
  const mockUserId = 'user-123'

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock for apiaries list
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
  })

  describe('Add Apiary Form - Eircode Field', () => {
    it('should show Eircode field with label "Eircode (Postcode)"', async () => {
      render(<ApiariesPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading apiaries...')).not.toBeInTheDocument()
      })

      const addButton = screen.getByRole('button', { name: /add apiary/i })
      await userEvent.click(addButton)

      expect(screen.getByText('Eircode (Postcode)')).toBeInTheDocument()
    })

    it('should not require Eircode field to submit form', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm')
      confirmSpy.mockReturnValue(true) // User confirms to proceed without Eircode

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null
            })
          })
        }),
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      })

      render(<ApiariesPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading apiaries...')).not.toBeInTheDocument()
      })

      const addButton = screen.getByRole('button', { name: /add apiary/i })
      await userEvent.click(addButton)

      // Check that Eircode input is not required
      const eircodeInput = screen.getByPlaceholderText(/e\.g\., d02 xy45/i)
      expect(eircodeInput).not.toBeRequired()

      // Fill only required field (name)
      const nameInput = screen.getByPlaceholderText(/home garden/i)
      await userEvent.type(nameInput, 'Test Apiary')

      // Submit without filling Eircode should work
      const submitButton = screen.getByRole('button', { name: /^add apiary$/i })
      await userEvent.click(submitButton)

      // Form should be submitted successfully (form should close)
      await waitFor(() => {
        expect(screen.queryByText('Add New Apiary')).not.toBeInTheDocument()
      })

      confirmSpy.mockRestore()
    })

    it('should show helper text indicating Eircode is optional', async () => {
      render(<ApiariesPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading apiaries...')).not.toBeInTheDocument()
      })

      const addButton = screen.getByRole('button', { name: /add apiary/i })
      await userEvent.click(addButton)

      expect(screen.getByText(/optional - used for automatic weather data/i)).toBeInTheDocument()
    })
  })

  describe('Add Apiary Form - UK/NI Checkbox', () => {
    it('should show UK/NI Postcode checkbox', async () => {
      render(<ApiariesPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading apiaries...')).not.toBeInTheDocument()
      })

      const addButton = screen.getByRole('button', { name: /add apiary/i })
      await userEvent.click(addButton)

      const checkbox = screen.getByLabelText(/uk\/ni postcode/i)
      expect(checkbox).toBeInTheDocument()
      expect(checkbox).not.toBeChecked()
    })

    it('should toggle UK/NI checkbox when clicked', async () => {
      render(<ApiariesPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading apiaries...')).not.toBeInTheDocument()
      })

      const addButton = screen.getByRole('button', { name: /add apiary/i })
      await userEvent.click(addButton)

      const checkbox = screen.getByLabelText(/uk\/ni postcode/i) as HTMLInputElement
      expect(checkbox.checked).toBe(false)

      await userEvent.click(checkbox)
      expect(checkbox.checked).toBe(true)

      await userEvent.click(checkbox)
      expect(checkbox.checked).toBe(false)
    })

    it('should reset UK/NI checkbox to false when form is canceled', async () => {
      render(<ApiariesPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading apiaries...')).not.toBeInTheDocument()
      })

      const addButton = screen.getByRole('button', { name: /add apiary/i })
      await userEvent.click(addButton)

      const checkbox = screen.getByLabelText(/uk\/ni postcode/i) as HTMLInputElement
      await userEvent.click(checkbox)
      expect(checkbox.checked).toBe(true)

      // Use getAllByRole to find the correct cancel button (the one inside the form)
      const cancelButtons = screen.getAllByRole('button', { name: /cancel/i })
      const formCancelButton = cancelButtons.find(button => button.getAttribute('type') === 'button' && button.textContent === 'Cancel')
      await userEvent.click(formCancelButton!)

      // Form should be closed
      await waitFor(() => {
        expect(screen.queryByText('Add New Apiary')).not.toBeInTheDocument()
      })

      // Re-open form
      await userEvent.click(addButton)
      const newCheckbox = screen.getByLabelText(/uk\/ni postcode/i) as HTMLInputElement
      expect(newCheckbox.checked).toBe(false)
    })
  })

  describe('Add Apiary Form - Dynamic Placeholder', () => {
    it('should show Irish Eircode placeholder by default', async () => {
      render(<ApiariesPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading apiaries...')).not.toBeInTheDocument()
      })

      const addButton = screen.getByRole('button', { name: /add apiary/i })
      await userEvent.click(addButton)

      const eircodeInput = screen.getByPlaceholderText(/e\.g\., d02 xy45/i)
      expect(eircodeInput).toBeInTheDocument()
    })

    it('should change placeholder to UK format when UK/NI checkbox is checked', async () => {
      render(<ApiariesPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading apiaries...')).not.toBeInTheDocument()
      })

      const addButton = screen.getByRole('button', { name: /add apiary/i })
      await userEvent.click(addButton)

      // Initially shows Irish placeholder
      expect(screen.getByPlaceholderText(/e\.g\., d02 xy45/i)).toBeInTheDocument()

      // Check UK/NI checkbox
      const checkbox = screen.getByLabelText(/uk\/ni postcode/i)
      await userEvent.click(checkbox)

      // Should now show UK placeholder
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/e\.g\., bt1 5gs/i)).toBeInTheDocument()
      })

      // Should not show Irish placeholder anymore
      expect(screen.queryByPlaceholderText(/e\.g\., d02 xy45/i)).not.toBeInTheDocument()
    })

    it('should revert to Irish placeholder when UK/NI checkbox is unchecked', async () => {
      render(<ApiariesPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading apiaries...')).not.toBeInTheDocument()
      })

      const addButton = screen.getByRole('button', { name: /add apiary/i })
      await userEvent.click(addButton)

      const checkbox = screen.getByLabelText(/uk\/ni postcode/i)

      // Check the checkbox
      await userEvent.click(checkbox)
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/e\.g\., bt1 5gs/i)).toBeInTheDocument()
      })

      // Uncheck the checkbox
      await userEvent.click(checkbox)
      await waitFor(() => {
        expect(screen.getByPlaceholderText(/e\.g\., d02 xy45/i)).toBeInTheDocument()
      })
    })
  })

  describe('Add Apiary Form - Field Validation', () => {
    it('should still require apiary name', async () => {
      render(<ApiariesPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading apiaries...')).not.toBeInTheDocument()
      })

      const addButton = screen.getByRole('button', { name: /add apiary/i })
      await userEvent.click(addButton)

      const nameInput = screen.getByPlaceholderText(/home garden/i)
      expect(nameInput).toBeRequired()
    })

    it('should convert Eircode to uppercase', async () => {
      render(<ApiariesPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading apiaries...')).not.toBeInTheDocument()
      })

      const addButton = screen.getByRole('button', { name: /add apiary/i })
      await userEvent.click(addButton)

      const eircodeInput = screen.getByPlaceholderText(/e\.g\., d02 xy45/i) as HTMLInputElement
      await userEvent.type(eircodeInput, 'd02xy45')

      expect(eircodeInput.value).toBe('D02XY45')
    })
  })

  describe('Edit Apiary Form', () => {
    it('should populate form when editing existing apiary', async () => {
      const mockApiary = {
        id: 'apiary-1',
        name: 'Test Apiary',
        location: 'North Field',
        city: 'Dublin',
        eircode: 'D02 XY45',
        notes: 'Test notes'
      }

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [mockApiary],
              error: null
            })
          })
        })
      })

      render(<ApiariesPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Apiary')).toBeInTheDocument()
      })

      const editButton = screen.getByRole('button', { name: /edit/i })
      await userEvent.click(editButton)

      expect(screen.getByDisplayValue('Test Apiary')).toBeInTheDocument()
      expect(screen.getByDisplayValue('North Field')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Dublin')).toBeInTheDocument()
      expect(screen.getByDisplayValue('D02 XY45')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Test notes')).toBeInTheDocument()
    })

    it('should reset UK/NI checkbox to false when editing apiary', async () => {
      const mockApiary = {
        id: 'apiary-1',
        name: 'Test Apiary',
        location: 'North Field',
        city: 'Dublin',
        eircode: 'D02 XY45',
        notes: ''
      }

      mockFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [mockApiary],
              error: null
            })
          })
        })
      })

      render(<ApiariesPage />)

      await waitFor(() => {
        expect(screen.getByText('Test Apiary')).toBeInTheDocument()
      })

      const editButton = screen.getByRole('button', { name: /edit/i })
      await userEvent.click(editButton)

      const checkbox = screen.getByLabelText(/uk\/ni postcode/i) as HTMLInputElement
      expect(checkbox.checked).toBe(false)
    })
  })

  describe('Form Submission', () => {
    it('should successfully create apiary without Eircode', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm')
      confirmSpy.mockReturnValue(true) // User confirms to proceed without Eircode

      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: null
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            }),
            insert: mockInsert
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        }
      })

      render(<ApiariesPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading apiaries...')).not.toBeInTheDocument()
      })

      const addButton = screen.getByRole('button', { name: /add apiary/i })
      await userEvent.click(addButton)

      const nameInput = screen.getByPlaceholderText(/home garden/i)
      await userEvent.type(nameInput, 'New Apiary')

      const submitButton = screen.getByRole('button', { name: /^add apiary$/i })
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith([
          expect.objectContaining({
            name: 'New Apiary',
            eircode: '',
            user_id: mockUserId
          })
        ])
      })

      confirmSpy.mockRestore()
    })

    it('should successfully create apiary with Eircode', async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: null
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            }),
            insert: mockInsert
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        }
      })

      render(<ApiariesPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading apiaries...')).not.toBeInTheDocument()
      })

      const addButton = screen.getByRole('button', { name: /add apiary/i })
      await userEvent.click(addButton)

      const nameInput = screen.getByPlaceholderText(/home garden/i)
      await userEvent.type(nameInput, 'New Apiary')

      const eircodeInput = screen.getByPlaceholderText(/e\.g\., d02 xy45/i)
      await userEvent.type(eircodeInput, 'D02XY45')

      const submitButton = screen.getByRole('button', { name: /^add apiary$/i })
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith([
          expect.objectContaining({
            name: 'New Apiary',
            eircode: 'D02XY45',
            user_id: mockUserId
          })
        ])
      })
    })
  })

  describe('Eircode Missing Confirmation', () => {
    it('should show confirmation popup when submitting without Eircode', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm')
      confirmSpy.mockReturnValue(true)

      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: null
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            }),
            insert: mockInsert
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        }
      })

      render(<ApiariesPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading apiaries...')).not.toBeInTheDocument()
      })

      const addButton = screen.getByRole('button', { name: /add apiary/i })
      await userEvent.click(addButton)

      const nameInput = screen.getByPlaceholderText(/home garden/i)
      await userEvent.type(nameInput, 'Test Apiary')

      const submitButton = screen.getByRole('button', { name: /^add apiary$/i })
      await userEvent.click(submitButton)

      // Should show confirmation dialog
      expect(confirmSpy).toHaveBeenCalledWith(
        expect.stringContaining('You haven\'t entered an Eircode or Postcode')
      )
      expect(confirmSpy).toHaveBeenCalledWith(
        expect.stringContaining('weather information will not be automatically recorded')
      )

      confirmSpy.mockRestore()
    })

    it('should proceed with submission when user confirms popup', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm')
      confirmSpy.mockReturnValue(true) // User clicks OK

      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: null
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            }),
            insert: mockInsert
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        }
      })

      render(<ApiariesPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading apiaries...')).not.toBeInTheDocument()
      })

      const addButton = screen.getByRole('button', { name: /add apiary/i })
      await userEvent.click(addButton)

      const nameInput = screen.getByPlaceholderText(/home garden/i)
      await userEvent.type(nameInput, 'Test Apiary')

      const submitButton = screen.getByRole('button', { name: /^add apiary$/i })
      await userEvent.click(submitButton)

      // Should proceed with insert
      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalled()
      })

      confirmSpy.mockRestore()
    })

    it('should cancel submission when user rejects popup', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm')
      confirmSpy.mockReturnValue(false) // User clicks Cancel

      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: null
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            }),
            insert: mockInsert
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        }
      })

      render(<ApiariesPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading apiaries...')).not.toBeInTheDocument()
      })

      const addButton = screen.getByRole('button', { name: /add apiary/i })
      await userEvent.click(addButton)

      const nameInput = screen.getByPlaceholderText(/home garden/i)
      await userEvent.type(nameInput, 'Test Apiary')

      const submitButton = screen.getByRole('button', { name: /^add apiary$/i })
      await userEvent.click(submitButton)

      // Should NOT proceed with insert
      await waitFor(() => {
        expect(mockInsert).not.toHaveBeenCalled()
      })

      // Form should still be open
      expect(screen.getByText('Add New Apiary')).toBeInTheDocument()

      confirmSpy.mockRestore()
    })

    it('should not show confirmation popup when Eircode is provided', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm')

      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: null
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            }),
            insert: mockInsert
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        }
      })

      render(<ApiariesPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading apiaries...')).not.toBeInTheDocument()
      })

      const addButton = screen.getByRole('button', { name: /add apiary/i })
      await userEvent.click(addButton)

      const nameInput = screen.getByPlaceholderText(/home garden/i)
      await userEvent.type(nameInput, 'Test Apiary')

      const eircodeInput = screen.getByPlaceholderText(/e\.g\., d02 xy45/i)
      await userEvent.type(eircodeInput, 'D02XY45')

      const submitButton = screen.getByRole('button', { name: /^add apiary$/i })
      await userEvent.click(submitButton)

      // Should NOT show confirmation dialog
      expect(confirmSpy).not.toHaveBeenCalled()

      // Should proceed with insert
      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalled()
      })

      confirmSpy.mockRestore()
    })

    it('should show confirmation popup when Eircode is only whitespace', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm')
      confirmSpy.mockReturnValue(true)

      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: null
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            }),
            insert: mockInsert
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        }
      })

      render(<ApiariesPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading apiaries...')).not.toBeInTheDocument()
      })

      const addButton = screen.getByRole('button', { name: /add apiary/i })
      await userEvent.click(addButton)

      const nameInput = screen.getByPlaceholderText(/home garden/i)
      await userEvent.type(nameInput, 'Test Apiary')

      const eircodeInput = screen.getByPlaceholderText(/e\.g\., d02 xy45/i)
      await userEvent.type(eircodeInput, '   ') // Only whitespace

      const submitButton = screen.getByRole('button', { name: /^add apiary$/i })
      await userEvent.click(submitButton)

      // Should show confirmation dialog even with whitespace
      expect(confirmSpy).toHaveBeenCalledWith(
        expect.stringContaining('You haven\'t entered an Eircode or Postcode')
      )

      confirmSpy.mockRestore()
    })
  })

  describe('Database - is_uk_ni Column', () => {
    it('should save is_uk_ni as false when UK/NI checkbox is unchecked', async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: null
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            }),
            insert: mockInsert
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        }
      })

      render(<ApiariesPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading apiaries...')).not.toBeInTheDocument()
      })

      const addButton = screen.getByRole('button', { name: /add apiary/i })
      await userEvent.click(addButton)

      const nameInput = screen.getByPlaceholderText(/home garden/i)
      await userEvent.type(nameInput, 'Test Apiary')

      const eircodeInput = screen.getByPlaceholderText(/e\.g\., d02 xy45/i)
      await userEvent.type(eircodeInput, 'D02XY45')

      // UK/NI checkbox is unchecked by default
      const submitButton = screen.getByRole('button', { name: /^add apiary$/i })
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith([
          expect.objectContaining({
            name: 'Test Apiary',
            eircode: 'D02XY45',
            is_uk_ni: false,
            user_id: mockUserId
          })
        ])
      })
    })

    it('should save is_uk_ni as true when UK/NI checkbox is checked', async () => {
      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: null
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            }),
            insert: mockInsert
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        }
      })

      render(<ApiariesPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading apiaries...')).not.toBeInTheDocument()
      })

      const addButton = screen.getByRole('button', { name: /add apiary/i })
      await userEvent.click(addButton)

      const nameInput = screen.getByPlaceholderText(/home garden/i)
      await userEvent.type(nameInput, 'Belfast Apiary')

      const eircodeInput = screen.getByPlaceholderText(/e\.g\., d02 xy45/i)

      // Check UK/NI checkbox
      const checkbox = screen.getByLabelText(/uk\/ni postcode/i)
      await userEvent.click(checkbox)

      // Type UK postcode
      await userEvent.clear(eircodeInput)
      const ukInput = screen.getByPlaceholderText(/e\.g\., bt1 5gs/i)
      await userEvent.type(ukInput, 'BT1 5GS')

      const submitButton = screen.getByRole('button', { name: /^add apiary$/i })
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith([
          expect.objectContaining({
            name: 'Belfast Apiary',
            eircode: 'BT1 5GS',
            is_uk_ni: true,
            user_id: mockUserId
          })
        ])
      })
    })

    it('should save is_uk_ni as false even when no Eircode is provided', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm')
      confirmSpy.mockReturnValue(true)

      const mockInsert = vi.fn().mockResolvedValue({
        data: null,
        error: null
      })

      mockFrom.mockImplementation((table: string) => {
        if (table === 'apiaries') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [],
                  error: null
                })
              })
            }),
            insert: mockInsert
          }
        }
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: [],
                error: null
              })
            })
          })
        }
      })

      render(<ApiariesPage />)

      await waitFor(() => {
        expect(screen.queryByText('Loading apiaries...')).not.toBeInTheDocument()
      })

      const addButton = screen.getByRole('button', { name: /add apiary/i })
      await userEvent.click(addButton)

      const nameInput = screen.getByPlaceholderText(/home garden/i)
      await userEvent.type(nameInput, 'Test Apiary')

      // Submit without Eircode
      const submitButton = screen.getByRole('button', { name: /^add apiary$/i })
      await userEvent.click(submitButton)

      await waitFor(() => {
        expect(mockInsert).toHaveBeenCalledWith([
          expect.objectContaining({
            name: 'Test Apiary',
            eircode: '',
            is_uk_ni: false,
            user_id: mockUserId
          })
        ])
      })

      confirmSpy.mockRestore()
    })
  })
})
