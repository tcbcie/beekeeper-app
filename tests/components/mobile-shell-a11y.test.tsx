import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

const mockPathname = vi.fn(() => '/dashboard/hives')

vi.mock('next/navigation', () => ({
  usePathname: () => mockPathname(),
}))

vi.mock('@/lib/auth', () => ({
  getUserRole: vi.fn(async () => 'User'),
}))

vi.mock('@/hooks/useCrmEnabled', () => ({
  useCrmEnabled: () => ({ crmEnabled: false }),
}))

vi.mock('@/hooks/useLogbookEnabled', () => ({
  useLogbookEnabled: () => ({ logbookEnabled: false }),
}))

import MobileDrawer from '@/components/MobileDrawer'
import BottomNavBar from '@/components/BottomNavBar'

beforeEach(() => {
  mockPathname.mockReturnValue('/dashboard/hives')
})

describe('MobileDrawer modal semantics', () => {
  it('exposes itself as a named modal dialog', () => {
    render(<MobileDrawer isOpen onClose={vi.fn()} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAccessibleName('Menu')
  })

  it('marks the current destination with aria-current', () => {
    render(<MobileDrawer isOpen onClose={vi.fn()} />)
    const current = screen.getAllByRole('link').filter(
      (link) => link.getAttribute('aria-current') === 'page'
    )
    expect(current).toHaveLength(1)
    expect(current[0]).toHaveAttribute('href', '/dashboard/hives')
  })

  it('marks no destination as current on an unrelated route', () => {
    mockPathname.mockReturnValue('/dashboard/nowhere')
    render(<MobileDrawer isOpen onClose={vi.fn()} />)
    const current = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page')
    expect(current).toHaveLength(0)
  })
})

describe('MobileDrawer closed state', () => {
  it('is inert while closed, so its links leave the tab order', () => {
    const { container } = render(<MobileDrawer isOpen={false} onClose={vi.fn()} />)
    const drawer = container.querySelector('#mobile-drawer')
    expect(drawer).toHaveAttribute('inert')
  })

  it('drops inert when opened', () => {
    const { container } = render(<MobileDrawer isOpen onClose={vi.fn()} />)
    expect(container.querySelector('#mobile-drawer')).not.toHaveAttribute('inert')
  })
})

describe('MobileDrawer keyboard and focus lifecycle', () => {
  it('closes on Escape', () => {
    const onClose = vi.fn()
    // Mounted closed and then opened, matching how the dashboard layout drives
    // it. The drawer's route-change effect also fires on mount, so mounting it
    // already-open would count an extra onClose that never happens in practice.
    const { rerender } = render(<MobileDrawer isOpen={false} onClose={onClose} />)
    rerender(<MobileDrawer isOpen onClose={onClose} />)
    onClose.mockClear()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('does not respond to Escape while closed', () => {
    const onClose = vi.fn()
    render(<MobileDrawer isOpen={false} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('moves focus inside the drawer when it opens', async () => {
    const { container } = render(<MobileDrawer isOpen onClose={vi.fn()} />)
    const drawer = container.querySelector('#mobile-drawer') as HTMLElement
    await waitFor(() => {
      expect(drawer.contains(document.activeElement)).toBe(true)
    })
  })

  it('returns focus to whatever opened it', async () => {
    const trigger = document.createElement('button')
    document.body.appendChild(trigger)
    trigger.focus()
    expect(document.activeElement).toBe(trigger)

    const { rerender } = render(<MobileDrawer isOpen onClose={vi.fn()} />)
    await waitFor(() => expect(document.activeElement).not.toBe(trigger))

    rerender(<MobileDrawer isOpen={false} onClose={vi.fn()} />)
    await waitFor(() => expect(document.activeElement).toBe(trigger))

    trigger.remove()
  })

  it('wraps Tab from the last focusable element back to the first', () => {
    const { container } = render(<MobileDrawer isOpen onClose={vi.fn()} />)
    const drawer = container.querySelector('#mobile-drawer') as HTMLElement
    const focusable = Array.from(
      drawer.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    last.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(first)
  })

  it('wraps Shift+Tab from the first focusable element to the last', () => {
    const { container } = render(<MobileDrawer isOpen onClose={vi.fn()} />)
    const drawer = container.querySelector('#mobile-drawer') as HTMLElement
    const focusable = Array.from(
      drawer.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]

    first.focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)
  })

  it('pulls focus back in if it has escaped the drawer', () => {
    const outside = document.createElement('button')
    document.body.appendChild(outside)

    const { container } = render(<MobileDrawer isOpen onClose={vi.fn()} />)
    const drawer = container.querySelector('#mobile-drawer') as HTMLElement

    outside.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(drawer.contains(document.activeElement)).toBe(true)

    outside.remove()
  })
})

describe('BottomNavBar', () => {
  it('marks the active destination with aria-current', () => {
    render(<BottomNavBar onMoreClick={vi.fn()} />)
    const current = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('aria-current') === 'page')
    expect(current).toHaveLength(1)
    expect(current[0]).toHaveAttribute('href', '/dashboard/hives')
  })

  it('reports the drawer as collapsed by default', () => {
    render(<BottomNavBar onMoreClick={vi.fn()} />)
    const more = screen.getByRole('button', { name: 'Open menu' })
    expect(more).toHaveAttribute('aria-expanded', 'false')
    expect(more).toHaveAttribute('aria-controls', 'mobile-drawer')
    expect(more).toHaveAttribute('aria-haspopup', 'dialog')
  })

  it('reports the drawer as expanded when it is open', () => {
    render(<BottomNavBar onMoreClick={vi.fn()} isMoreOpen />)
    const more = screen.getByRole('button', { name: 'Close menu' })
    expect(more).toHaveAttribute('aria-expanded', 'true')
  })

  it('opens the drawer when More is pressed', () => {
    const onMoreClick = vi.fn()
    render(<BottomNavBar onMoreClick={onMoreClick} />)
    fireEvent.click(screen.getByRole('button', { name: 'Open menu' }))
    expect(onMoreClick).toHaveBeenCalledTimes(1)
  })
})

describe('BottomNavBar layout (Phase 2)', () => {
  it('shows exactly four destinations plus More', () => {
    render(<BottomNavBar onMoreClick={vi.fn()} />)
    expect(screen.getAllByRole('link')).toHaveLength(4)
    expect(screen.getByRole('button', { name: 'Open menu' })).toBeInTheDocument()
  })

  it('uses the short label in the bar, not the full one', () => {
    render(<BottomNavBar onMoreClick={vi.fn()} />)
    // Full names stay in the drawer and desktop sidebar.
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Tasks')).toBeInTheDocument()
    expect(screen.queryByText('Overview')).not.toBeInTheDocument()
    expect(screen.queryByText('Tasks & Events')).not.toBeInTheDocument()
  })

  it('keeps Apiaries out of the bar but in the drawer', () => {
    const { unmount } = render(<BottomNavBar onMoreClick={vi.fn()} />)
    expect(screen.queryByText('Apiaries')).not.toBeInTheDocument()
    unmount()

    render(<MobileDrawer isOpen onClose={vi.fn()} />)
    expect(screen.getByText('Apiaries')).toBeInTheDocument()
  })

  it('has no horizontal scroll container', () => {
    const { container } = render(<BottomNavBar onMoreClick={vi.fn()} />)
    expect(container.querySelector('.overflow-x-auto')).toBeNull()
    expect(container.querySelector('.scrollbar-hide')).toBeNull()
    expect(container.querySelector('.min-w-max')).toBeNull()
  })

  it('lets every slot shrink, so the row can never overflow the viewport', () => {
    const { container } = render(<BottomNavBar onMoreClick={vi.fn()} />)
    const slots = container.querySelectorAll('a[href], button')
    expect(slots.length).toBe(5)
    slots.forEach(slot => {
      // Flex items default to min-width:auto and would otherwise refuse to
      // shrink below their label, pushing the row into horizontal overflow.
      expect(slot).toHaveClass('min-w-0')
      expect(slot).toHaveClass('flex-1')
    })
  })

  it('reserves a 48px touch target per slot', () => {
    const { container } = render(<BottomNavBar onMoreClick={vi.fn()} />)
    container.querySelectorAll('a[href], button').forEach(slot => {
      expect(slot).toHaveClass('min-h-[48px]')
    })
  })

  it('renders labels at the 14px floor rather than 11px', () => {
    const { container } = render(<BottomNavBar onMoreClick={vi.fn()} />)
    expect(screen.getByText('Records')).toHaveClass('text-sm')
    // Checked as a string: an arbitrary-value class is not a valid selector.
    expect(container.innerHTML).not.toContain('text-[11px]')
  })
})
