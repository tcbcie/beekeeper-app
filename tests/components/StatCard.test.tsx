import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Bug, ClipboardList, Crown, House, CheckCircle2 } from 'lucide-react'
import StatCard from '@/components/ui/StatCard'

describe('StatCard', () => {
  it('renders with label and value', () => {
    render(
      <StatCard
        label="Total Hives"
        value={25}
        icon={Bug}
        color="text-yellow-500"
      />
    )

    expect(screen.getByText('Total Hives')).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument()
  })

  it('renders the icon accessibly using the card label', () => {
    render(
      <StatCard
        label="Active Colonies"
        value={18}
        icon={House}
        color="text-green-500"
      />
    )

    expect(screen.getByLabelText('Active Colonies')).toBeInTheDocument()
  })

  it('applies the color class to the rendered icon', () => {
    render(
      <StatCard
        label="Queens"
        value={10}
        icon={Crown}
        color="text-purple-500"
      />
    )

    const iconElement = screen.getByLabelText('Queens')
    expect(iconElement.className).toContain('text-purple-500')
  })

  it('handles zero values', () => {
    render(
      <StatCard
        label="Inspections Due"
        value={0}
        icon={ClipboardList}
        color="text-blue-500"
      />
    )

    expect(screen.getByText('0')).toBeInTheDocument()
  })

  it('handles large values', () => {
    render(
      <StatCard
        label="Total Inspections"
        value={1234}
        icon={CheckCircle2}
        color="text-green-600"
      />
    )

    expect(screen.getByText('1234')).toBeInTheDocument()
  })

  it('renders independently when rerendered', () => {
    const { rerender } = render(
      <StatCard
        label="Card 1"
        value={10}
        icon={Bug}
        color="text-red-500"
      />
    )

    expect(screen.getByText('Card 1')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()

    rerender(
      <StatCard
        label="Card 2"
        value={20}
        icon={Bug}
        color="text-blue-500"
      />
    )

    expect(screen.getByText('Card 2')).toBeInTheDocument()
    expect(screen.getByText('20')).toBeInTheDocument()
  })
})
