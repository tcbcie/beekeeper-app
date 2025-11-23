import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatCard from '@/components/ui/StatCard'

describe('StatCard', () => {
  it('should render with label and value', () => {
    render(
      <StatCard
        label="Total Hives"
        value={25}
        icon="🐝"
        color="text-yellow-500"
      />
    )

    expect(screen.getByText('Total Hives')).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument()
  })

  it('should display icon correctly', () => {
    render(
      <StatCard
        label="Active Colonies"
        value={18}
        icon="🏠"
        color="text-green-500"
      />
    )

    expect(screen.getByText('🏠')).toBeInTheDocument()
  })

  it('should apply correct color class', () => {
    const { container } = render(
      <StatCard
        label="Queens"
        value={10}
        icon="👑"
        color="text-purple-500"
      />
    )

    const iconElement = screen.getByText('👑')
    expect(iconElement.className).toContain('text-purple-500')
  })

  it('should handle zero value', () => {
    render(
      <StatCard
        label="Inspections Due"
        value={0}
        icon="📋"
        color="text-blue-500"
      />
    )

    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('should handle large numbers', () => {
    render(
      <StatCard
        label="Total Inspections"
        value={1234}
        icon="✓"
        color="text-green-600"
      />
    )

    expect(screen.getByText('1234')).toBeInTheDocument()
  })

  it('should render multiple stat cards independently', () => {
    const { rerender } = render(
      <StatCard
        label="Card 1"
        value={10}
        icon="A"
        color="text-red-500"
      />
    )

    expect(screen.getByText('Card 1')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()

    rerender(
      <StatCard
        label="Card 2"
        value={20}
        icon="B"
        color="text-blue-500"
      />
    )

    expect(screen.getByText('Card 2')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
  })
})
