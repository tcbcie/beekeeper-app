import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

/**
 * The in-app navigation guard.
 *
 * The risk in a guard like this is over-reach: intercepting downloads, new-tab
 * clicks or external links would break ordinary navigation in a way that looks
 * like the app is broken rather than protective. Most of these assert what it
 * must leave alone.
 */

const push = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

import { useNavigationGuard } from '@/hooks/useNavigationGuard'

const confirmLeave = vi.fn(async () => true)

function Harness({ active = true, href = '/dashboard/hives', ...anchorProps }: {
  active?: boolean
  href?: string
} & Record<string, unknown>) {
  useNavigationGuard(active, confirmLeave)
  return (
    <a href={href} {...anchorProps}>
      go
    </a>
  )
}

const clickLink = (init?: MouseEventInit) =>
  fireEvent.click(screen.getByText('go'), { button: 0, ...init })

beforeEach(() => {
  push.mockClear()
  confirmLeave.mockClear()
  confirmLeave.mockImplementation(async () => true)
  window.history.replaceState({}, '', '/dashboard/records')
})

describe('when there is unsaved work', () => {
  it('asks before following an in-app link', async () => {
    render(<Harness />)
    clickLink()
    await waitFor(() => expect(confirmLeave).toHaveBeenCalledTimes(1))
  })

  it('navigates once the user agrees', async () => {
    render(<Harness />)
    clickLink()
    await waitFor(() => expect(push).toHaveBeenCalledWith('/dashboard/hives'))
  })

  it('stays put when the user declines', async () => {
    confirmLeave.mockImplementation(async () => false)
    render(<Harness />)
    clickLink()
    await waitFor(() => expect(confirmLeave).toHaveBeenCalled())
    expect(push).not.toHaveBeenCalled()
  })

  it('preserves the query string and hash of the destination', async () => {
    render(<Harness href="/dashboard/records?create=inspection#top" />)
    clickLink()
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/dashboard/records?create=inspection#top')
    )
  })
})

describe('what it must not intercept', () => {
  it('ignores clicks when there is nothing to lose', async () => {
    render(<Harness active={false} />)
    clickLink()
    expect(confirmLeave).not.toHaveBeenCalled()
  })

  it('ignores external links, which beforeunload already covers', () => {
    render(<Harness href="https://example.com/somewhere" />)
    clickLink()
    expect(confirmLeave).not.toHaveBeenCalled()
  })

  it('ignores downloads', () => {
    render(<Harness download="report.pdf" href="/files/report.pdf" />)
    clickLink()
    expect(confirmLeave).not.toHaveBeenCalled()
  })

  it('ignores links that open in a new tab', () => {
    render(<Harness target="_blank" />)
    clickLink()
    expect(confirmLeave).not.toHaveBeenCalled()
  })

  it('ignores in-page anchors', () => {
    render(<Harness href="#section" />)
    clickLink()
    expect(confirmLeave).not.toHaveBeenCalled()
  })

  it('ignores a link to the page already open', () => {
    render(<Harness href="/dashboard/records" />)
    clickLink()
    expect(confirmLeave).not.toHaveBeenCalled()
  })

  it('ignores modifier-clicks, which open elsewhere rather than navigating', () => {
    render(<Harness />)
    clickLink({ metaKey: true })
    clickLink({ ctrlKey: true })
    clickLink({ shiftKey: true })
    expect(confirmLeave).not.toHaveBeenCalled()
  })

  it('ignores middle-click', () => {
    render(<Harness />)
    fireEvent.click(screen.getByText('go'), { button: 1 })
    expect(confirmLeave).not.toHaveBeenCalled()
  })

  it('ignores clicks that are not on a link at all', () => {
    render(
      <>
        <Harness />
        <button type="button">unrelated</button>
      </>
    )
    fireEvent.click(screen.getByText('unrelated'))
    expect(confirmLeave).not.toHaveBeenCalled()
  })
})

describe('teardown', () => {
  it('stops guarding once the work is saved', () => {
    const { rerender } = render(<Harness active />)
    rerender(<Harness active={false} />)
    clickLink()
    expect(confirmLeave).not.toHaveBeenCalled()
  })
})
