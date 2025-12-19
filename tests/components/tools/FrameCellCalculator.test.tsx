import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import FrameCellCalculator from '@/components/tools/FrameCellCalculator'

// Mock frame standards data
const mockFrameStandards = [
  { id: '1', label: 'British National Deep', width_mm: 335, height_mm: 195, display_order: 1, is_active: true },
  { id: '2', label: 'British National Shallow', width_mm: 335, height_mm: 115, display_order: 2, is_active: true },
  { id: '3', label: 'Langstroth Deep', width_mm: 425, height_mm: 210, display_order: 3, is_active: true },
  { id: '4', label: 'Langstroth Medium', width_mm: 425, height_mm: 146, display_order: 4, is_active: true },
  { id: '5', label: 'Langstroth Shallow', width_mm: 425, height_mm: 117, display_order: 5, is_active: true },
  { id: '6', label: 'Dadant Modified Deep', width_mm: 425, height_mm: 270, display_order: 6, is_active: true },
  { id: '7', label: 'Dadant Modified Shallow', width_mm: 425, height_mm: 127, display_order: 7, is_active: true },
  { id: '8', label: 'Smith', width_mm: 350, height_mm: 195, display_order: 8, is_active: true },
  { id: '9', label: 'Commercial', width_mm: 406, height_mm: 195, display_order: 9, is_active: true },
]

// Mock Supabase
const mockSupabaseFrom = vi.fn()
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: (table: string) => mockSupabaseFrom(table),
  },
}))

describe('FrameCellCalculator', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock implementation for Supabase
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'frame_standards') {
        return {
          select: () => ({
            eq: () => ({
              order: () => Promise.resolve({ data: mockFrameStandards, error: null }),
            }),
          }),
        }
      }
      return {}
    })
  })

  describe('Rendering', () => {
    it('should render the Frame Cell Counter title', async () => {
      render(<FrameCellCalculator />)
      expect(screen.getByText('Frame Cell Counter')).toBeInTheDocument()
    })

    it('should render the description text', async () => {
      render(<FrameCellCalculator />)
      expect(
        screen.getByText(/Calculate the approximate number of cells on a frame/)
      ).toBeInTheDocument()
    })

    it('should render the frame standard dropdown', async () => {
      render(<FrameCellCalculator />)
      expect(screen.getByText('Frame Standard')).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    it('should render cell size input', async () => {
      render(<FrameCellCalculator />)
      expect(screen.getByText('Cell Size (mm)')).toBeInTheDocument()
    })

    it('should render sides selection buttons', async () => {
      render(<FrameCellCalculator />)
      expect(screen.getByText('Count Sides')).toBeInTheDocument()
      expect(screen.getByText('One Side')).toBeInTheDocument()
      expect(screen.getByText('Both Sides')).toBeInTheDocument()
    })

    it('should render cell size preset buttons', async () => {
      render(<FrameCellCalculator />)
      expect(screen.getByText('5.1mm (Standard)')).toBeInTheDocument()
      expect(screen.getByText('4.9mm (Small Cell)')).toBeInTheDocument()
    })

    it('should render the results section', async () => {
      render(<FrameCellCalculator />)
      expect(screen.getByText('Approximate Total Cells')).toBeInTheDocument()
    })

    it('should render the reference info section', async () => {
      render(<FrameCellCalculator />)
      expect(screen.getByText('Typical Cell Counts:')).toBeInTheDocument()
    })

    it('should render dimension input fields', async () => {
      render(<FrameCellCalculator />)
      expect(screen.getByText('Comb Width (mm)')).toBeInTheDocument()
      expect(screen.getByText('Comb Height (mm)')).toBeInTheDocument()
    })
  })

  describe('Frame Standards from Database', () => {
    it('should load frame standards from database', async () => {
      render(<FrameCellCalculator />)

      await waitFor(() => {
        expect(screen.getByText(/British National Deep/)).toBeInTheDocument()
      })
    })

    it('should display Custom option in dropdown', async () => {
      render(<FrameCellCalculator />)

      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Custom' })).toBeInTheDocument()
      })
    })

    it('should list all frame standards in dropdown', async () => {
      render(<FrameCellCalculator />)

      await waitFor(() => {
        expect(screen.getByText(/British National Deep/)).toBeInTheDocument()
        expect(screen.getByText(/British National Shallow/)).toBeInTheDocument()
        expect(screen.getByText(/Langstroth Deep/)).toBeInTheDocument()
        expect(screen.getByText(/Langstroth Medium/)).toBeInTheDocument()
        expect(screen.getByText(/Langstroth Shallow/)).toBeInTheDocument()
        expect(screen.getByText(/Dadant Modified Deep/)).toBeInTheDocument()
        expect(screen.getByText(/Dadant Modified Shallow/)).toBeInTheDocument()
        expect(screen.getByText(/Smith/)).toBeInTheDocument()
        expect(screen.getByText(/Commercial/)).toBeInTheDocument()
      })
    })

    it('should set first standard as default after loading', async () => {
      render(<FrameCellCalculator />)

      await waitFor(() => {
        const dropdown = screen.getByRole('combobox')
        expect(dropdown).toHaveValue('1') // First standard's id
      })
    })

    it('should use fallback presets if database fetch fails', async () => {
      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === 'frame_standards') {
          return {
            select: () => ({
              eq: () => ({
                order: () => Promise.resolve({ data: null, error: { message: 'Database error' } }),
              }),
            }),
          }
        }
        return {}
      })

      render(<FrameCellCalculator />)

      // Should still render with fallback presets
      await waitFor(() => {
        expect(screen.getByText(/British National Deep/)).toBeInTheDocument()
      })
    })
  })

  describe('Cell Size Selection', () => {
    it('should default to 5.1mm cell size', async () => {
      render(<FrameCellCalculator />)

      const cellSizeInput = screen.getByDisplayValue('5.1')
      expect(cellSizeInput).toBeInTheDocument()
    })

    it('should switch to small cell when 4.9mm button is clicked', async () => {
      render(<FrameCellCalculator />)

      fireEvent.click(screen.getByText('4.9mm (Small Cell)'))

      const cellSizeInput = screen.getByDisplayValue('4.9')
      expect(cellSizeInput).toBeInTheDocument()
    })

    it('should switch to standard cell when 5.1mm button is clicked', async () => {
      render(<FrameCellCalculator />)

      // First switch to small cell
      fireEvent.click(screen.getByText('4.9mm (Small Cell)'))

      // Then switch back to standard
      fireEvent.click(screen.getByText('5.1mm (Standard)'))

      const cellSizeInput = screen.getByDisplayValue('5.1')
      expect(cellSizeInput).toBeInTheDocument()
    })

    it('should allow manual cell size input', async () => {
      render(<FrameCellCalculator />)

      const cellSizeInput = screen.getByDisplayValue('5.1')
      fireEvent.change(cellSizeInput, { target: { value: '6.9' } })

      expect(screen.getByDisplayValue('6.9')).toBeInTheDocument()
    })
  })

  describe('Sides Selection', () => {
    it('should default to both sides', async () => {
      render(<FrameCellCalculator />)

      const bothSidesButton = screen.getByText('Both Sides')
      expect(bothSidesButton).toHaveClass('bg-forest-600')
    })

    it('should switch to one side when clicked', async () => {
      render(<FrameCellCalculator />)

      fireEvent.click(screen.getByText('One Side'))

      const oneSideButton = screen.getByText('One Side')
      expect(oneSideButton).toHaveClass('bg-forest-600')
    })
  })

  describe('Calculation Logic', () => {
    it('should calculate approximately 5000-6000 cells for British National Deep', async () => {
      render(<FrameCellCalculator />)

      await waitFor(() => {
        // After loading, first standard (British National Deep) is selected
        // Expected: (335 * 195) / (0.866 * 5.1 * 5.1) * 2 ≈ 5800
        const resultText = screen.getByText(/^[\d,]+$/)
        const cellCount = parseInt(resultText.textContent?.replace(/,/g, '') || '0')

        expect(cellCount).toBeGreaterThan(5000)
        expect(cellCount).toBeLessThan(6500)
      })
    })

    it('should halve the count when switching to one side', async () => {
      render(<FrameCellCalculator />)

      await waitFor(() => {
        expect(screen.getByText(/British National Deep/)).toBeInTheDocument()
      })

      // Get initial count (both sides)
      const initialResultText = screen.getByText(/^[\d,]+$/)
      const initialCount = parseInt(initialResultText.textContent?.replace(/,/g, '') || '0')

      // Switch to one side
      fireEvent.click(screen.getByText('One Side'))

      // Get new count
      const newResultText = screen.getByText(/^[\d,]+$/)
      const newCount = parseInt(newResultText.textContent?.replace(/,/g, '') || '0')

      // Should be approximately half
      expect(newCount).toBeCloseTo(initialCount / 2, -2) // Within 100
    })

    it('should increase cell count with smaller cell size', async () => {
      render(<FrameCellCalculator />)

      await waitFor(() => {
        expect(screen.getByText(/British National Deep/)).toBeInTheDocument()
      })

      // Get initial count with 5.1mm
      const initialResultText = screen.getByText(/^[\d,]+$/)
      const initialCount = parseInt(initialResultText.textContent?.replace(/,/g, '') || '0')

      // Switch to 4.9mm
      fireEvent.click(screen.getByText('4.9mm (Small Cell)'))

      // Get new count
      const newResultText = screen.getByText(/^[\d,]+$/)
      const newCount = parseInt(newResultText.textContent?.replace(/,/g, '') || '0')

      // Smaller cells = more cells
      expect(newCount).toBeGreaterThan(initialCount)
    })

    it('should update when custom dimensions are changed', async () => {
      render(<FrameCellCalculator />)

      await waitFor(() => {
        expect(screen.getByText(/British National Deep/)).toBeInTheDocument()
      })

      // Get initial count
      const initialResultText = screen.getByText(/^[\d,]+$/)
      const initialCount = parseInt(initialResultText.textContent?.replace(/,/g, '') || '0')

      // Change width to be larger
      const widthInput = screen.getByDisplayValue('335')
      fireEvent.change(widthInput, { target: { value: '500' } })

      // Get new count
      const newResultText = screen.getByText(/^[\d,]+$/)
      const newCount = parseInt(newResultText.textContent?.replace(/,/g, '') || '0')

      expect(newCount).toBeGreaterThan(initialCount)
    })
  })

  describe('Display Format', () => {
    it('should display cell count with thousands separator', async () => {
      render(<FrameCellCalculator />)

      await waitFor(() => {
        // The result should be formatted with commas for thousands
        const resultText = screen.getByText(/^[\d,]+$/)
        expect(resultText.textContent).toMatch(/^\d{1,3}(,\d{3})*$/)
      })
    })

    it('should display dimensions in the result description', async () => {
      render(<FrameCellCalculator />)

      await waitFor(() => {
        // Should show something like "335mm x 195mm"
        expect(screen.getByText(/335mm x 195mm/)).toBeInTheDocument()
      })
    })

    it('should indicate when counting both sides', async () => {
      render(<FrameCellCalculator />)

      expect(screen.getByText(/\(both sides\)/)).toBeInTheDocument()
    })

    it('should indicate when counting one side', async () => {
      render(<FrameCellCalculator />)

      fireEvent.click(screen.getByText('One Side'))

      expect(screen.getByText(/\(one side\)/)).toBeInTheDocument()
    })
  })
})

describe('Hexagon Cell Calculation Formula', () => {
  it('should use correct hexagon area formula', () => {
    // Hexagon area = 0.866 * d² (where d is diameter/cell size)
    const cellSize = 5.1
    const expectedHexArea = 0.866 * cellSize * cellSize

    expect(expectedHexArea).toBeCloseTo(22.53, 1)
  })

  it('should calculate frame area correctly', () => {
    // British National Deep: 335mm x 195mm
    const width = 335
    const height = 195
    const expectedArea = width * height

    expect(expectedArea).toBe(65325)
  })

  it('should calculate cell count using formula: (area / hexArea) * sides', () => {
    const width = 335
    const height = 195
    const cellSize = 5.1
    const sides = 2

    const hexagonArea = 0.866 * cellSize * cellSize
    const totalArea = width * height
    const cellCount = Math.round((totalArea / hexagonArea) * sides)

    // Expected: (65325 / 22.53) * 2 ≈ 5800
    expect(cellCount).toBeGreaterThan(5500)
    expect(cellCount).toBeLessThan(6200)
  })

  it('should handle zero dimensions gracefully', () => {
    const width = 0
    const height = 195
    const cellSize = 5.1

    const hexagonArea = 0.866 * cellSize * cellSize
    const totalArea = width * height
    const cellCount = Math.round((totalArea / hexagonArea) * 2)

    expect(cellCount).toBe(0)
  })

  it('should handle very small cell sizes', () => {
    const width = 335
    const height = 195
    const cellSize = 4.9 // Small cell
    const sides = 2

    const hexagonArea = 0.866 * cellSize * cellSize
    const totalArea = width * height
    const cellCount = Math.round((totalArea / hexagonArea) * sides)

    // Smaller cells = more cells
    expect(cellCount).toBeGreaterThan(6000)
  })

  it('should handle drone cell sizes', () => {
    const width = 335
    const height = 195
    const cellSize = 6.9 // Drone cells
    const sides = 2

    const hexagonArea = 0.866 * cellSize * cellSize
    const totalArea = width * height
    const cellCount = Math.round((totalArea / hexagonArea) * sides)

    // Larger cells = fewer cells
    expect(cellCount).toBeLessThan(3500)
  })
})
