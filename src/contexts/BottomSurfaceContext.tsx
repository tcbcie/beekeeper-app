'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

/**
 * Decides which interruptive surface may occupy the bottom of a mobile screen.
 *
 * Five surfaces previously shared `z-50` and three of them sat in the same
 * vertical band, so whichever happened to appear later in the DOM covered the
 * others. Each managed its own visibility and none knew the rest existed.
 *
 * A surface declares that it *wants* the region; exactly one is granted it, by
 * fixed precedence. A surface that loses is deferred rather than cancelled: it
 * appears once the surface above it goes away.
 *
 * Toasts are deliberately not part of this. They are transient rather than
 * interruptive, and simply sit clear of whatever is showing.
 */

export type BottomSurface = 'update' | 'install' | 'notification'

/** An available update outranks an install offer, which outranks a permission ask. */
const PRECEDENCE: readonly BottomSurface[] = ['update', 'install', 'notification']

interface BottomSurfaceContextValue {
  activeSurface: BottomSurface | null
  claim: (surface: BottomSurface) => void
  release: (surface: BottomSurface) => void
  /** True while the user is part-way through a form worth protecting. */
  isFormActive: boolean
  setFormActive: (active: boolean) => void
}

const BottomSurfaceContext = createContext<BottomSurfaceContextValue | null>(null)

export function BottomSurfaceProvider({ children }: { children: ReactNode }) {
  const [claims, setClaims] = useState<BottomSurface[]>([])
  const [isFormActive, setIsFormActive] = useState(false)

  const claim = useCallback((surface: BottomSurface) => {
    setClaims(prev => (prev.includes(surface) ? prev : [...prev, surface]))
  }, [])

  const release = useCallback((surface: BottomSurface) => {
    setClaims(prev => (prev.includes(surface) ? prev.filter(s => s !== surface) : prev))
  }, [])

  const setFormActive = useCallback((active: boolean) => {
    setIsFormActive(active)
  }, [])

  const activeSurface = useMemo(() => {
    // Nothing interrupts a form in progress. The claim is retained, so the
    // surface returns once the user has finished rather than being lost.
    if (isFormActive) return null
    return PRECEDENCE.find(surface => claims.includes(surface)) ?? null
  }, [claims, isFormActive])

  const value = useMemo(
    () => ({ activeSurface, claim, release, isFormActive, setFormActive }),
    [activeSurface, claim, release, isFormActive, setFormActive]
  )

  return <BottomSurfaceContext.Provider value={value}>{children}</BottomSurfaceContext.Provider>
}

function useBottomSurfaceContext(): BottomSurfaceContextValue | null {
  return useContext(BottomSurfaceContext)
}

/**
 * Declares that a surface wants the bottom region, and reports whether it may
 * show. Returns `wants` unchanged when no provider is mounted, so a component
 * rendered outside the shell still behaves as it did before.
 */
export function useBottomSurfaceSlot(surface: BottomSurface, wants: boolean): boolean {
  const context = useBottomSurfaceContext()
  const claim = context?.claim
  const release = context?.release

  useEffect(() => {
    if (!wants || !claim || !release) return
    claim(surface)
    return () => release(surface)
  }, [wants, surface, claim, release])

  if (!context) return wants
  return wants && context.activeSurface === surface
}

/** True while a form worth protecting is in progress. */
export function useIsFormActive(): boolean {
  return useBottomSurfaceContext()?.isFormActive ?? false
}

/**
 * Reports form progress to the shell for the lifetime of the calling component,
 * clearing the flag on unmount so a closed form cannot keep the shell muted.
 */
export function useReportFormActive(active: boolean): void {
  const context = useBottomSurfaceContext()
  const setFormActive = context?.setFormActive

  useEffect(() => {
    if (!setFormActive) return
    setFormActive(active)
  }, [active, setFormActive])

  useEffect(() => {
    if (!setFormActive) return
    return () => setFormActive(false)
  }, [setFormActive])
}
