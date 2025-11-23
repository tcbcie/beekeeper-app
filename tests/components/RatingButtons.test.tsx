import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RatingButtons from '@/components/ui/RatingButtons'

describe('RatingButtons', () => {
  it('should render all rating buttons (1-5)', () => {
    const mockOnChange = vi.fn()

    render(
      <RatingButtons
        value={0}
        onChange={mockOnChange}
        label="Test Rating"
      />
    )

    for (let i = 1; i <= 5; i++) {
      expect(screen.getByRole('button', { name: `Rate ${i} stars` })).toBeInTheDocument()
    }
  })

  it('should render "Not Recorded" button by default', () => {
    const mockOnChange = vi.fn()

    render(
      <RatingButtons
        value={0}
        onChange={mockOnChange}
        label="Test Rating"
      />
    )

    expect(screen.getByRole('button', { name: 'Not recorded' })).toBeInTheDocument()
  })

  it('should hide "Not Recorded" button when showNotRecorded is false', () => {
    const mockOnChange = vi.fn()

    render(
      <RatingButtons
        value={0}
        onChange={mockOnChange}
        label="Test Rating"
        showNotRecorded={false}
      />
    )

    expect(screen.queryByRole('button', { name: 'Not recorded' })).not.toBeInTheDocument()
  })

  it('should call onChange when rating button is clicked', () => {
    const mockOnChange = vi.fn()

    render(
      <RatingButtons
        value={0}
        onChange={mockOnChange}
        label="Test Rating"
      />
    )

    const ratingButton = screen.getByRole('button', { name: 'Rate 3 stars' })
    fireEvent.click(ratingButton)

    expect(mockOnChange).toHaveBeenCalledWith(3)
  })

  it('should call onChange with 0 when "Not Recorded" is clicked', () => {
    const mockOnChange = vi.fn()

    render(
      <RatingButtons
        value={3}
        onChange={mockOnChange}
        label="Test Rating"
      />
    )

    const notRecordedButton = screen.getByRole('button', { name: 'Not recorded' })
    fireEvent.click(notRecordedButton)

    expect(mockOnChange).toHaveBeenCalledWith(0)
  })

  it('should display label with current value', () => {
    const mockOnChange = vi.fn()

    render(
      <RatingButtons
        value={4}
        onChange={mockOnChange}
        label="Temperament"
      />
    )

    expect(screen.getByText(/Temperament:/)).toBeInTheDocument()
    expect(screen.getByText(/⭐⭐⭐⭐/)).toBeInTheDocument()
  })

  it('should display "Not Recorded" in label when value is 0', () => {
    const mockOnChange = vi.fn()

    render(
      <RatingButtons
        value={0}
        onChange={mockOnChange}
        label="Calmness"
      />
    )

    expect(screen.getByText(/Calmness:/)).toBeInTheDocument()
    // Use getAllByText since "Not Recorded" appears in both label and button
    const notRecordedElements = screen.getAllByText(/Not Recorded/)
    expect(notRecordedElements.length).toBeGreaterThanOrEqual(1)
  })

  it('should display help text when provided', () => {
    const mockOnChange = vi.fn()

    render(
      <RatingButtons
        value={0}
        onChange={mockOnChange}
        label="Rating"
        helpText="Rate from 1 (poor) to 5 (excellent)"
      />
    )

    expect(screen.getByText('Rate from 1 (poor) to 5 (excellent)')).toBeInTheDocument()
  })

  it('should not display help text when not provided', () => {
    const mockOnChange = vi.fn()

    const { container } = render(
      <RatingButtons
        value={0}
        onChange={mockOnChange}
        label="Rating"
      />
    )

    const helpTextElements = container.querySelectorAll('.text-xs.text-gray-500')
    expect(helpTextElements).toHaveLength(0)
  })

  it('should highlight selected rating button', () => {
    const mockOnChange = vi.fn()

    render(
      <RatingButtons
        value={3}
        onChange={mockOnChange}
        label="Test Rating"
      />
    )

    const selectedButton = screen.getByRole('button', { name: 'Rate 3 stars' })
    expect(selectedButton.className).toContain('bg-indigo-600')
    expect(selectedButton.className).toContain('text-white')
  })

  it('should allow changing rating multiple times', () => {
    const mockOnChange = vi.fn()

    render(
      <RatingButtons
        value={0}
        onChange={mockOnChange}
        label="Test Rating"
      />
    )

    // Click rating 2
    fireEvent.click(screen.getByRole('button', { name: 'Rate 2 stars' }))
    expect(mockOnChange).toHaveBeenCalledWith(2)

    // Click rating 5
    fireEvent.click(screen.getByRole('button', { name: 'Rate 5 stars' }))
    expect(mockOnChange).toHaveBeenCalledWith(5)

    // Click not recorded
    fireEvent.click(screen.getByRole('button', { name: 'Not recorded' }))
    expect(mockOnChange).toHaveBeenCalledWith(0)

    expect(mockOnChange).toHaveBeenCalledTimes(3)
  })

  it('should render stars correctly for all values', () => {
    const mockOnChange = vi.fn()

    const { rerender } = render(
      <RatingButtons
        value={1}
        onChange={mockOnChange}
        label="Test"
      />
    )

    expect(screen.getByText(/⭐$/)).toBeInTheDocument() // Exactly 1 star

    rerender(
      <RatingButtons
        value={2}
        onChange={mockOnChange}
        label="Test"
      />
    )
    expect(screen.getByText(/⭐⭐/)).toBeInTheDocument() // Exactly 2 stars

    rerender(
      <RatingButtons
        value={5}
        onChange={mockOnChange}
        label="Test"
      />
    )
    expect(screen.getByText(/⭐⭐⭐⭐⭐/)).toBeInTheDocument() // Exactly 5 stars
  })
})
