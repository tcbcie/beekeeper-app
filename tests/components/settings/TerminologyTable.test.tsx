import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import TerminologyTable from '@/components/settings/TerminologyTable'

// Mock terminology data
const mockTerminology = [
  { id: '1', english_term: 'Hive', german_term: 'Beute', created_at: '2024-01-01' },
  { id: '2', english_term: 'Frame', german_term: 'Rähmchen', created_at: '2024-01-01' },
  { id: '3', english_term: 'Queen', german_term: 'Königin', created_at: '2024-01-01' },
  { id: '4', english_term: 'Worker', german_term: 'Arbeiterin', created_at: '2024-01-01' },
  { id: '5', english_term: 'Drone', german_term: 'Drohne', created_at: '2024-01-01' },
  { id: '6', english_term: 'Smoker', german_term: 'Smoker', created_at: '2024-01-01' },
  { id: '7', english_term: 'Honey', german_term: 'Honig', created_at: '2024-01-01' },
  { id: '8', english_term: 'Wax', german_term: 'Wachs', created_at: '2024-01-01' },
  { id: '9', english_term: 'Varroa Mite', german_term: 'Varroamilbe', created_at: '2024-01-01' },
  { id: '10', english_term: 'Swarming', german_term: 'Schwärmen', created_at: '2024-01-01' },
]

// Mock Supabase
const mockSupabaseFrom = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => mockSupabaseFrom(table),
  },
}))

// Mock window.confirm and window.alert
global.confirm = vi.fn(() => true)
global.alert = vi.fn()

describe('TerminologyTable', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementation for Supabase
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'terminology') {
        return {
          select: () => ({
            order: () => Promise.resolve({ data: mockTerminology, error: null }),
          }),
          insert: () => ({
            select: () => ({
              single: () => Promise.resolve({ data: { id: 'new-id', english_term: 'New Term', german_term: 'Neuer Begriff', created_at: '2024-01-01' }, error: null }),
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
  })

  describe('Rendering', () => {
    it('should render the terminology table title', async () => {
      render(<TerminologyTable />)

      await waitFor(() => {
        expect(screen.getByText(/Beekeeping Terminology/)).toBeInTheDocument()
      })
    })

    it('should render the search input', async () => {
      render(<TerminologyTable />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search terms...')).toBeInTheDocument()
      })
    })

    it('should render the Add Term button', async () => {
      render(<TerminologyTable />)

      await waitFor(() => {
        expect(screen.getByText('Add Term')).toBeInTheDocument()
      })
    })

    it('should render table headers', async () => {
      render(<TerminologyTable />)

      await waitFor(() => {
        expect(screen.getByText('English')).toBeInTheDocument()
        expect(screen.getByText('German')).toBeInTheDocument()
        expect(screen.getByText('Actions')).toBeInTheDocument()
      })
    })

    it('should show loading spinner initially', () => {
      render(<TerminologyTable />)
      expect(document.querySelector('.animate-spin')).toBeInTheDocument()
    })

    it('should render terms count', async () => {
      render(<TerminologyTable />)

      await waitFor(() => {
        expect(screen.getByText(/Showing 10 of 10 terms/)).toBeInTheDocument()
      })
    })
  })

  describe('Data Display', () => {
    it('should display terminology entries', async () => {
      render(<TerminologyTable />)

      await waitFor(() => {
        expect(screen.getByText('Hive')).toBeInTheDocument()
        expect(screen.getByText('Beute')).toBeInTheDocument()
        expect(screen.getByText('Queen')).toBeInTheDocument()
        expect(screen.getByText('Königin')).toBeInTheDocument()
      })
    })

    it('should display edit and delete buttons for each term', async () => {
      render(<TerminologyTable />)

      await waitFor(() => {
        const editButtons = screen.getAllByTitle('Edit')
        const deleteButtons = screen.getAllByTitle('Delete')
        expect(editButtons.length).toBe(10)
        expect(deleteButtons.length).toBe(10)
      })
    })
  })

  describe('Search Functionality', () => {
    it('should filter by English term', async () => {
      render(<TerminologyTable />)

      await waitFor(() => {
        expect(screen.getByText('Hive')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search terms...')
      fireEvent.change(searchInput, { target: { value: 'queen' } })

      await waitFor(() => {
        expect(screen.getByText('Queen')).toBeInTheDocument()
        expect(screen.queryByText('Hive')).not.toBeInTheDocument()
      })
    })

    it('should filter by German term', async () => {
      render(<TerminologyTable />)

      await waitFor(() => {
        expect(screen.getByText('Hive')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search terms...')
      fireEvent.change(searchInput, { target: { value: 'Königin' } })

      await waitFor(() => {
        expect(screen.getByText('Queen')).toBeInTheDocument()
        expect(screen.getByText('Königin')).toBeInTheDocument()
        expect(screen.queryByText('Hive')).not.toBeInTheDocument()
      })
    })

    it('should be case-insensitive', async () => {
      render(<TerminologyTable />)

      await waitFor(() => {
        expect(screen.getByText('Hive')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search terms...')
      fireEvent.change(searchInput, { target: { value: 'QUEEN' } })

      await waitFor(() => {
        expect(screen.getByText('Queen')).toBeInTheDocument()
      })
    })

    it('should show empty state when no matches', async () => {
      render(<TerminologyTable />)

      await waitFor(() => {
        expect(screen.getByText('Hive')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search terms...')
      fireEvent.change(searchInput, { target: { value: 'nonexistent term xyz' } })

      await waitFor(() => {
        expect(screen.getByText('No terms found matching your search.')).toBeInTheDocument()
      })
    })

    it('should update results count when searching', async () => {
      render(<TerminologyTable />)

      await waitFor(() => {
        expect(screen.getByText(/Showing 10 of 10 terms/)).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Search terms...')
      fireEvent.change(searchInput, { target: { value: 'queen' } })

      await waitFor(() => {
        expect(screen.getByText(/Showing 1 of 10 terms/)).toBeInTheDocument()
      })
    })
  })

  describe('Add Term Functionality', () => {
    it('should show add form when Add Term button is clicked', async () => {
      render(<TerminologyTable />)

      await waitFor(() => {
        expect(screen.getByText('Add Term')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Add Term'))

      await waitFor(() => {
        expect(screen.getByText('Add New Term')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('English term')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('German term')).toBeInTheDocument()
      })
    })

    it('should hide add form when Cancel is clicked', async () => {
      render(<TerminologyTable />)

      await waitFor(() => {
        fireEvent.click(screen.getByText('Add Term'))
      })

      await waitFor(() => {
        expect(screen.getByText('Add New Term')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByText('Cancel'))

      await waitFor(() => {
        expect(screen.queryByText('Add New Term')).not.toBeInTheDocument()
      })
    })

    it('should show alert when trying to save empty fields', async () => {
      render(<TerminologyTable />)

      await waitFor(() => {
        fireEvent.click(screen.getByText('Add Term'))
      })

      await waitFor(() => {
        fireEvent.click(screen.getByText('Save'))
      })

      expect(global.alert).toHaveBeenCalledWith('Please fill in both English and German terms')
    })

    it('should add new term when form is submitted', async () => {
      render(<TerminologyTable />)

      await waitFor(() => {
        fireEvent.click(screen.getByText('Add Term'))
      })

      const englishInput = screen.getByPlaceholderText('English term')
      const germanInput = screen.getByPlaceholderText('German term')

      fireEvent.change(englishInput, { target: { value: 'New Term' } })
      fireEvent.change(germanInput, { target: { value: 'Neuer Begriff' } })

      fireEvent.click(screen.getByText('Save'))

      await waitFor(() => {
        expect(screen.queryByText('Add New Term')).not.toBeInTheDocument()
      })
    })
  })

  describe('Edit Term Functionality', () => {
    it('should show edit inputs when edit button is clicked', async () => {
      render(<TerminologyTable />)

      await waitFor(() => {
        expect(screen.getByText('Hive')).toBeInTheDocument()
      })

      const editButtons = screen.getAllByTitle('Edit')
      fireEvent.click(editButtons[0])

      await waitFor(() => {
        // Should show input fields with current values
        expect(screen.getByDisplayValue('Hive')).toBeInTheDocument()
        expect(screen.getByDisplayValue('Beute')).toBeInTheDocument()
      })
    })

    it('should show save and cancel buttons when editing', async () => {
      render(<TerminologyTable />)

      await waitFor(() => {
        expect(screen.getByText('Hive')).toBeInTheDocument()
      })

      const editButtons = screen.getAllByTitle('Edit')
      fireEvent.click(editButtons[0])

      await waitFor(() => {
        expect(screen.getByTitle('Save')).toBeInTheDocument()
        expect(screen.getByTitle('Cancel')).toBeInTheDocument()
      })
    })

    it('should cancel editing when cancel button is clicked', async () => {
      render(<TerminologyTable />)

      await waitFor(() => {
        expect(screen.getByText('Hive')).toBeInTheDocument()
      })

      const editButtons = screen.getAllByTitle('Edit')
      fireEvent.click(editButtons[0])

      await waitFor(() => {
        expect(screen.getByDisplayValue('Hive')).toBeInTheDocument()
      })

      fireEvent.click(screen.getByTitle('Cancel'))

      await waitFor(() => {
        expect(screen.queryByDisplayValue('Hive')).not.toBeInTheDocument()
        expect(screen.getByText('Hive')).toBeInTheDocument()
      })
    })
  })

  describe('Delete Term Functionality', () => {
    it('should show confirm dialog when delete button is clicked', async () => {
      render(<TerminologyTable />)

      await waitFor(() => {
        expect(screen.getByText('Hive')).toBeInTheDocument()
      })

      const deleteButtons = screen.getAllByTitle('Delete')
      fireEvent.click(deleteButtons[0])

      expect(global.confirm).toHaveBeenCalledWith('Delete "Hive"?')
    })

    it('should not delete when confirm returns false', async () => {
      vi.mocked(global.confirm).mockReturnValueOnce(false)

      render(<TerminologyTable />)

      await waitFor(() => {
        expect(screen.getByText('Hive')).toBeInTheDocument()
      })

      const deleteButtons = screen.getAllByTitle('Delete')
      fireEvent.click(deleteButtons[0])

      // Term should still be in the list
      await waitFor(() => {
        expect(screen.getByText('Hive')).toBeInTheDocument()
      })
    })

    it('should remove term from list when deleted', async () => {
      render(<TerminologyTable />)

      await waitFor(() => {
        expect(screen.getByText('Hive')).toBeInTheDocument()
      })

      const deleteButtons = screen.getAllByTitle('Delete')
      fireEvent.click(deleteButtons[0])

      await waitFor(() => {
        expect(screen.queryByText('Hive')).not.toBeInTheDocument()
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle empty data gracefully', async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'terminology') {
          return {
            select: () => ({
              order: () => Promise.resolve({ data: [], error: null }),
            }),
          }
        }
        return {}
      })

      render(<TerminologyTable />)

      await waitFor(() => {
        expect(screen.getByText(/Showing 0 of 0 terms/)).toBeInTheDocument()
      })
    })

    it('should handle fetch error gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'terminology') {
          return {
            select: () => ({
              order: () => Promise.resolve({ data: null, error: { message: 'Database error' } }),
            }),
          }
        }
        return {}
      })

      render(<TerminologyTable />)

      await waitFor(() => {
        expect(consoleSpy).toHaveBeenCalledWith('Error fetching terminology:', expect.any(Object))
      })

      consoleSpy.mockRestore()
    })
  })

  describe('Accessibility', () => {
    it('should have accessible search input', async () => {
      render(<TerminologyTable />)

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search terms...')
        expect(searchInput).toHaveAttribute('type', 'text')
      })
    })

    it('should have proper table structure', async () => {
      render(<TerminologyTable />)

      await waitFor(() => {
        expect(screen.getByRole('table')).toBeInTheDocument()
      })
    })

    it('should have title attributes on action buttons', async () => {
      render(<TerminologyTable />)

      await waitFor(() => {
        expect(screen.getAllByTitle('Edit').length).toBeGreaterThan(0)
        expect(screen.getAllByTitle('Delete').length).toBeGreaterThan(0)
      })
    })
  })
})

describe('Terminology Data Structure', () => {
  it('should expect correct fields in terminology entries', () => {
    const expectedFields = ['id', 'english_term', 'german_term', 'created_at']

    mockTerminology.forEach((term) => {
      expectedFields.forEach((field) => {
        expect(term).toHaveProperty(field)
      })
    })
  })
})
