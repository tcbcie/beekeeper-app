import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LoadingSpinner from '@/components/ui/LoadingSpinner'

describe('LoadingSpinner', () => {
  it('should render without crashing', () => {
    render(<LoadingSpinner />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('should display default text', () => {
    render(<LoadingSpinner />)
    expect(screen.getByText('Loading...')).toBeVisible()
  })

  it('should display custom text when provided', () => {
    render(<LoadingSpinner text="Please wait..." />)
    expect(screen.getByText('Please wait...')).toBeInTheDocument()
  })
})
