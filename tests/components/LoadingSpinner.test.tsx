import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

describe('LoadingSpinner', () => {
  it('should render without crashing', () => {
    render(<LoadingSpinner />)
    // Use getAllByText since there are two elements with same text (visible + sr-only)
    expect(screen.getAllByText('Loading...').length).toBeGreaterThanOrEqual(1)
  })

  it('should display default text', () => {
    render(<LoadingSpinner />)
    const elements = screen.getAllByText('Loading...')
    expect(elements[0]).toBeVisible()
  })

  it('should display custom text when provided', () => {
    render(<LoadingSpinner text="Please wait..." />)
    const elements = screen.getAllByText('Please wait...')
    expect(elements.length).toBeGreaterThanOrEqual(1)
  })
})
