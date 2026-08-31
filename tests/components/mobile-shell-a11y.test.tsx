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
