import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import UpdateNotification, { UpdateCheckButton } from '@/components/UpdateNotification'
import { updateManager } from '@/lib/update-manager'
import type { UpdateState } from '@/lib/update-manager'

// Mock the update manager
vi.mock('@/lib/update-manager', () => ({
  updateManager: {
    subscribe: vi.fn(),
    applyUpdate: vi.fn(),
    dismissUpdate: vi.fn(),
    checkForUpdates: vi.fn()
  }
}))

describe('UpdateNotification', () => {
  let mockSubscribe: any
  let mockUnsubscribe: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockUnsubscribe = vi.fn()
    mockSubscribe = vi.fn((callback: Function) => {
      // Call immediately with initial state
      callback({ status: 'no-update' })
      return mockUnsubscribe
    })
    ;(updateManager.subscribe as any) = mockSubscribe
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should not render when no update is available', () => {
    const { container } = render(<UpdateNotification />)
    expect(container.firstChild).toBeNull()
  })

  it('should render when update is ready', async () => {
    mockSubscribe.mockImplementation((callback: Function) => {
      callback({ status: 'ready' })
      return mockUnsubscribe
    })

    render(<UpdateNotification />)

    await waitFor(() => {
      expect(screen.getByText('Update Available')).toBeInTheDocument()
    })

    expect(screen.getByText(/A new version of HiveCraic is ready/i)).toBeInTheDocument()
    expect(screen.getByText('Update Now')).toBeInTheDocument()
    expect(screen.getByText('Later')).toBeInTheDocument()
  })

  it('should call applyUpdate when Update Now is clicked', async () => {
    mockSubscribe.mockImplementation((callback: Function) => {
      callback({ status: 'ready' })
      return mockUnsubscribe
    })

    render(<UpdateNotification />)

    await waitFor(() => {
      expect(screen.getByText('Update Now')).toBeInTheDocument()
    })

    const updateButton = screen.getByText('Update Now')
    fireEvent.click(updateButton)

    expect(updateManager.applyUpdate).toHaveBeenCalled()
  })

  it('should call dismissUpdate when Later is clicked', async () => {
    mockSubscribe.mockImplementation((callback: Function) => {
      callback({ status: 'ready' })
      return mockUnsubscribe
    })

    render(<UpdateNotification />)

    await waitFor(() => {
      expect(screen.getByText('Later')).toBeInTheDocument()
    })

    const laterButton = screen.getByText('Later')
    fireEvent.click(laterButton)

    expect(updateManager.dismissUpdate).toHaveBeenCalled()
  })

  it('should hide notification after Update Now is clicked', async () => {
    mockSubscribe.mockImplementation((callback: Function) => {
      callback({ status: 'ready' })
      return mockUnsubscribe
    })

    const { container } = render(<UpdateNotification />)

    await waitFor(() => {
      expect(screen.getByText('Update Now')).toBeInTheDocument()
    })

    const updateButton = screen.getByText('Update Now')
    fireEvent.click(updateButton)

    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    })
  })

  it('should hide notification after Later is clicked', async () => {
    mockSubscribe.mockImplementation((callback: Function) => {
      callback({ status: 'ready' })
      return mockUnsubscribe
    })

    const { container } = render(<UpdateNotification />)

    await waitFor(() => {
      expect(screen.getByText('Later')).toBeInTheDocument()
    })

    const laterButton = screen.getByText('Later')
    fireEvent.click(laterButton)

    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    })
  })

  it('should subscribe to update manager on mount', () => {
    render(<UpdateNotification />)

    expect(updateManager.subscribe).toHaveBeenCalled()
  })

  it('should unsubscribe from update manager on unmount', () => {
    const { unmount } = render(<UpdateNotification />)

    unmount()

    expect(mockUnsubscribe).toHaveBeenCalled()
  })

  it('should update visibility when state changes', async () => {
    let stateCallback: Function

    mockSubscribe.mockImplementation((callback: Function) => {
      stateCallback = callback
      callback({ status: 'no-update' })
      return mockUnsubscribe
    })

    const { container } = render(<UpdateNotification />)

    // Initially hidden
    expect(container.firstChild).toBeNull()

    // Simulate state change to ready
    await waitFor(() => {
      stateCallback({ status: 'ready' })
    })

    // Should now be visible
    await waitFor(() => {
      expect(screen.getByText('Update Available')).toBeInTheDocument()
    })
  })

  it('should hide when state changes to no-update', async () => {
    let stateCallback: Function

    mockSubscribe.mockImplementation((callback: Function) => {
      stateCallback = callback
      callback({ status: 'ready' })
      return mockUnsubscribe
    })

    const { container } = render(<UpdateNotification />)

    // Initially visible
    await waitFor(() => {
      expect(screen.getByText('Update Available')).toBeInTheDocument()
    })

    // Simulate state change to no-update
    await waitFor(() => {
      stateCallback({ status: 'no-update' })
    })

    // Should now be hidden
    await waitFor(() => {
      expect(container.firstChild).toBeNull()
    })
  })

  it('should render update icon', async () => {
    mockSubscribe.mockImplementation((callback: Function) => {
      callback({ status: 'ready' })
      return mockUnsubscribe
    })

    const { container } = render(<UpdateNotification />)

    await waitFor(() => {
      expect(screen.getByText('Update Available')).toBeInTheDocument()
    })

    // Check for SVG icon
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })
})

describe('UpdateCheckButton', () => {
  let mockSubscribe: any
  let mockUnsubscribe: any

  beforeEach(() => {
    vi.clearAllMocks()
    mockUnsubscribe = vi.fn()
    mockSubscribe = vi.fn((callback: Function) => {
      callback({ status: 'no-update' })
      return mockUnsubscribe
    })
    ;(updateManager.subscribe as any) = mockSubscribe
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should render check for updates button', () => {
    render(<UpdateCheckButton />)

    expect(screen.getByText('Check for Updates')).toBeInTheDocument()
  })

  it('should call checkForUpdates when clicked', () => {
    render(<UpdateCheckButton />)

    const button = screen.getByText('Check for Updates')
    fireEvent.click(button)

    expect(updateManager.checkForUpdates).toHaveBeenCalled()
  })

  it('should show checking state when update check is in progress', async () => {
    mockSubscribe.mockImplementation((callback: Function) => {
      callback({ status: 'checking' })
      return mockUnsubscribe
    })

    render(<UpdateCheckButton />)

    await waitFor(() => {
      expect(screen.getByText('Checking...')).toBeInTheDocument()
    })
  })

  it('should disable button when checking for updates', async () => {
    mockSubscribe.mockImplementation((callback: Function) => {
      callback({ status: 'checking' })
      return mockUnsubscribe
    })

    render(<UpdateCheckButton />)

    await waitFor(() => {
      const button = screen.getByText('Checking...')
      expect(button).toBeDisabled()
    })
  })

  it('should enable button when not checking', () => {
    render(<UpdateCheckButton />)

    const button = screen.getByText('Check for Updates')
    expect(button).not.toBeDisabled()
  })

  it('should render refresh icon', () => {
    const { container } = render(<UpdateCheckButton />)

    // Check for SVG icon
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('should have spinning animation when checking', async () => {
    mockSubscribe.mockImplementation((callback: Function) => {
      callback({ status: 'checking' })
      return mockUnsubscribe
    })

    const { container } = render(<UpdateCheckButton />)

    await waitFor(() => {
      const svg = container.querySelector('svg')
      expect(svg).toHaveClass('animate-spin')
    })
  })

  it('should not have spinning animation when not checking', () => {
    const { container } = render(<UpdateCheckButton />)

    const svg = container.querySelector('svg')
    expect(svg).not.toHaveClass('animate-spin')
  })

  it('should subscribe to update manager on mount', () => {
    render(<UpdateCheckButton />)

    expect(updateManager.subscribe).toHaveBeenCalled()
  })

  it('should unsubscribe from update manager on unmount', () => {
    const { unmount } = render(<UpdateCheckButton />)

    unmount()

    expect(mockUnsubscribe).toHaveBeenCalled()
  })

  it('should update button state when update state changes', async () => {
    let stateCallback: Function

    mockSubscribe.mockImplementation((callback: Function) => {
      stateCallback = callback
      callback({ status: 'no-update' })
      return mockUnsubscribe
    })

    render(<UpdateCheckButton />)

    // Initially shows "Check for Updates"
    expect(screen.getByText('Check for Updates')).toBeInTheDocument()

    // Simulate state change to checking
    await waitFor(() => {
      stateCallback({ status: 'checking' })
    })

    // Should now show "Checking..."
    await waitFor(() => {
      expect(screen.getByText('Checking...')).toBeInTheDocument()
    })

    // Simulate state change back to no-update
    await waitFor(() => {
      stateCallback({ status: 'no-update' })
    })

    // Should show "Check for Updates" again
    await waitFor(() => {
      expect(screen.getByText('Check for Updates')).toBeInTheDocument()
    })
  })
})
