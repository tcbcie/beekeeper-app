import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import VersionDisplay from '@/components/VersionDisplay'
import { getAppVersion } from '@/lib/update-manager'

// Mock the getAppVersion function
vi.mock('@/lib/update-manager', () => ({
  getAppVersion: vi.fn()
}))

describe('VersionDisplay', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should render version number', () => {
    ;(getAppVersion as any).mockReturnValue('1.2.3')

    render(<VersionDisplay />)

    expect(screen.getByText('v1.2.3')).toBeInTheDocument()
  })

  it('should call getAppVersion', () => {
    ;(getAppVersion as any).mockReturnValue('1.0.0')

    render(<VersionDisplay />)

    expect(getAppVersion).toHaveBeenCalled()
  })

  it('should render with correct styling classes', () => {
    ;(getAppVersion as any).mockReturnValue('1.4.2')

    const { container } = render(<VersionDisplay />)

    const versionElement = container.querySelector('div')
    expect(versionElement).toHaveClass('text-xs')
    expect(versionElement).toHaveClass('text-text-tertiary')
  })

  it('should display different version numbers correctly', () => {
    const versions = ['0.0.1', '1.0.0', '2.5.3', '10.20.30']

    versions.forEach(version => {
      ;(getAppVersion as any).mockReturnValue(version)

      const { unmount } = render(<VersionDisplay />)

      expect(screen.getByText(`v${version}`)).toBeInTheDocument()

      unmount()
    })
  })

  it('should handle version with pre-release tag', () => {
    ;(getAppVersion as any).mockReturnValue('1.0.0-beta.1')

    render(<VersionDisplay />)

    expect(screen.getByText('v1.0.0-beta.1')).toBeInTheDocument()
  })

  it('should handle version with build metadata', () => {
    ;(getAppVersion as any).mockReturnValue('1.0.0+build.123')

    render(<VersionDisplay />)

    expect(screen.getByText('v1.0.0+build.123')).toBeInTheDocument()
  })

  it('should render as a div element', () => {
    ;(getAppVersion as any).mockReturnValue('1.0.0')

    const { container } = render(<VersionDisplay />)

    expect(container.firstChild?.nodeName).toBe('DIV')
  })

  it('should be accessible', () => {
    ;(getAppVersion as any).mockReturnValue('1.2.3')

    const { container } = render(<VersionDisplay />)

    const versionElement = container.querySelector('div')
    expect(versionElement).toBeInTheDocument()
    expect(versionElement?.textContent).toBe('v1.2.3')
  })
})
