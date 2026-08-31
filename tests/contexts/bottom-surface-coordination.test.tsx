import { describe, it, expect } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { useState } from 'react'
import {
  BottomSurfaceProvider,
  useBottomSurfaceSlot,
  useIsFormActive,
  useReportFormActive,
  type BottomSurface,
} from '@/contexts/BottomSurfaceContext'

/**
 * Five surfaces previously shared z-50 in the same band, so whichever appeared
 * later in the DOM covered the rest. These assert the ordering is now decided
 * by precedence, and that a surface which loses is deferred, not discarded.
 */

function Banner({ surface, wants }: { surface: BottomSurface; wants: boolean }) {
  const mayShow = useBottomSurfaceSlot(surface, wants)
  return mayShow ? <div data-testid={surface}>{surface}</div> : null
}

function MelStandIn() {
  const isFormActive = useIsFormActive()
  return <div data-testid="mel">{isFormActive ? 'docked' : 'floating'}</div>
}

function FormReporter({ active }: { active: boolean }) {
  useReportFormActive(active)
  return null
}

describe('precedence', () => {
  it('shows the only surface asking for the region', () => {
    render(
      <BottomSurfaceProvider>
        <Banner surface="install" wants />
      </BottomSurfaceProvider>
    )
    expect(screen.getByTestId('install')).toBeInTheDocument()
  })

  it('grants the update banner over an install offer', () => {
    render(
      <BottomSurfaceProvider>
        <Banner surface="install" wants />
        <Banner surface="update" wants />
      </BottomSurfaceProvider>
    )
    expect(screen.getByTestId('update')).toBeInTheDocument()
    expect(screen.queryByTestId('install')).not.toBeInTheDocument()
  })

  it('grants an install offer over a permission request', () => {
    render(
      <BottomSurfaceProvider>
        <Banner surface="notification" wants />
        <Banner surface="install" wants />
      </BottomSurfaceProvider>
    )
    expect(screen.getByTestId('install')).toBeInTheDocument()
    expect(screen.queryByTestId('notification')).not.toBeInTheDocument()
  })

  it('is decided by precedence, not DOM order', () => {
    // The update banner is rendered last here and first in the test above;
    // it wins in both, which is the whole point of the change.
    render(
      <BottomSurfaceProvider>
        <Banner surface="update" wants />
        <Banner surface="notification" wants />
      </BottomSurfaceProvider>
    )
    expect(screen.getByTestId('update')).toBeInTheDocument()
    expect(screen.queryByTestId('notification')).not.toBeInTheDocument()
  })

  it('never shows two interruptive surfaces at once', () => {
    render(
      <BottomSurfaceProvider>
        <Banner surface="update" wants />
        <Banner surface="install" wants />
        <Banner surface="notification" wants />
      </BottomSurfaceProvider>
    )
    expect(document.querySelectorAll('[data-testid]')).toHaveLength(1)
  })
})

describe('deferral', () => {
  it('promotes the waiting surface once the higher one goes away', () => {
    function Harness() {
      const [updateWanted, setUpdateWanted] = useState(true)
      return (
        <BottomSurfaceProvider>
          <button onClick={() => setUpdateWanted(false)}>resolve update</button>
          <Banner surface="update" wants={updateWanted} />
          <Banner surface="install" wants />
        </BottomSurfaceProvider>
      )
    }
    render(<Harness />)

    expect(screen.getByTestId('update')).toBeInTheDocument()
    expect(screen.queryByTestId('install')).not.toBeInTheDocument()

    act(() => screen.getByText('resolve update').click())

    // Deferred, not cancelled.
    expect(screen.queryByTestId('update')).not.toBeInTheDocument()
    expect(screen.getByTestId('install')).toBeInTheDocument()
  })
})

describe('an active form holds the region', () => {
  it('suppresses every interruptive surface while a form is in progress', () => {
    render(
      <BottomSurfaceProvider>
        <FormReporter active />
        <Banner surface="update" wants />
        <Banner surface="install" wants />
      </BottomSurfaceProvider>
    )
    expect(screen.queryByTestId('update')).not.toBeInTheDocument()
    expect(screen.queryByTestId('install')).not.toBeInTheDocument()
  })

  it('releases the deferred surface once the form is finished', () => {
    function Harness() {
      const [active, setActive] = useState(true)
      return (
        <BottomSurfaceProvider>
          <FormReporter active={active} />
          <button onClick={() => setActive(false)}>finish form</button>
          <Banner surface="update" wants />
        </BottomSurfaceProvider>
      )
    }
    render(<Harness />)

    expect(screen.queryByTestId('update')).not.toBeInTheDocument()
    act(() => screen.getByText('finish form').click())
    expect(screen.getByTestId('update')).toBeInTheDocument()
  })

  it('reports form activity to surfaces that dock rather than hide', () => {
    function Harness() {
      const [active, setActive] = useState(false)
      return (
        <BottomSurfaceProvider>
          <FormReporter active={active} />
          <button onClick={() => setActive(true)}>start form</button>
          <MelStandIn />
        </BottomSurfaceProvider>
      )
    }
    render(<Harness />)

    expect(screen.getByTestId('mel')).toHaveTextContent('floating')
    act(() => screen.getByText('start form').click())
    expect(screen.getByTestId('mel')).toHaveTextContent('docked')
  })

  it('clears the flag when the reporting component unmounts', () => {
    function Harness() {
      const [mounted, setMounted] = useState(true)
      return (
        <BottomSurfaceProvider>
          {mounted && <FormReporter active />}
          <button onClick={() => setMounted(false)}>unmount form</button>
          <Banner surface="update" wants />
        </BottomSurfaceProvider>
      )
    }
    render(<Harness />)

    expect(screen.queryByTestId('update')).not.toBeInTheDocument()
    act(() => screen.getByText('unmount form').click())
    // A closed form must not keep the shell muted for the rest of the session.
    expect(screen.getByTestId('update')).toBeInTheDocument()
  })
})

describe('without a provider', () => {
  it('leaves a surface behaving exactly as it did before', () => {
    // Components are mounted in tests and stories outside the shell; the hook
    // must not change their behaviour when no coordinator is present.
    render(<Banner surface="update" wants />)
    expect(screen.getByTestId('update')).toBeInTheDocument()
  })
})
