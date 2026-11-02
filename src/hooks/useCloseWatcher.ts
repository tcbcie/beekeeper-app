'use client'

import { useEffect, useRef } from 'react'

interface CloseWatcherLike {
  onclose: (() => void) | null
  destroy: () => void
}

/**
 * Android's Back button closes the surface rather than leaving the page. CloseWatcher does this
 * without adding browser history, which could trap someone trying to leave, or undo a navigation
 * made from inside the surface. Browsers without it simply keep their usual Back.
 */
export function useCloseWatcher(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose)
  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    const Watcher = (window as unknown as { CloseWatcher?: new () => CloseWatcherLike }).CloseWatcher
    if (!isOpen || !Watcher) return

    let watcher: CloseWatcherLike | null = null
    let rearm: ReturnType<typeof setTimeout> | undefined
    const watch = () => {
      watcher = new Watcher()
      watcher.onclose = () => {
        onCloseRef.current()
        // A watcher fires once, and the surface may stay open ("Keep editing" on a discard prompt).
        // If it does close, the clean-up below cancels this.
        rearm = setTimeout(watch, 0)
      }
    }
    watch()

    return () => {
      clearTimeout(rearm)
      watcher?.destroy()
    }
  }, [isOpen])
}
