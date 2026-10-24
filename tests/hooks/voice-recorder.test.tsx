import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

/**
 * The voice recorder must never leave the microphone on (C4-13).
 *
 * getUserMedia resolves only after the permission prompt, so the form can be closed (reset or
 * unmounted) before the stream arrives, and a second tap can land while the first is pending.
 */

import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'

class FakeRecorder {
  ondataavailable: ((event: { data: Blob }) => void) | null = null
  onstop: (() => void) | null = null
  static isTypeSupported() { return true }
  start() {}
  stop() { this.onstop?.() }
}

function deferredStream() {
  const stop = vi.fn()
  const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream
  let resolve!: (s: MediaStream) => void
  const promise = new Promise<MediaStream>(r => { resolve = r })
  return { stream, stop, promise, resolve: () => resolve(stream) }
}

describe('useVoiceRecorder', () => {
  const getUserMedia = vi.fn()

  beforeEach(() => {
    getUserMedia.mockReset()
    vi.stubGlobal('MediaRecorder', FakeRecorder)
    Object.defineProperty(navigator, 'mediaDevices', { value: { getUserMedia }, configurable: true })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('stops a microphone granted after the recorder was reset', async () => {
    const pending = deferredStream()
    getUserMedia.mockReturnValue(pending.promise)
    const { result } = renderHook(() => useVoiceRecorder())

    let start!: Promise<void>
    act(() => { start = result.current.startRecording() })
    act(() => { result.current.reset() })
    await act(async () => { pending.resolve(); await start })

    expect(pending.stop).toHaveBeenCalled()
    expect(result.current.isRecording).toBe(false)
  })

  it('stops a microphone granted after unmount', async () => {
    const pending = deferredStream()
    getUserMedia.mockReturnValue(pending.promise)
    const { result, unmount } = renderHook(() => useVoiceRecorder())

    let start!: Promise<void>
    act(() => { start = result.current.startRecording() })
    unmount()
    pending.resolve()
    await start

    expect(pending.stop).toHaveBeenCalled()
  })

  it('ignores a second tap while a start is pending', async () => {
    const pending = deferredStream()
    getUserMedia.mockReturnValue(pending.promise)
    const { result } = renderHook(() => useVoiceRecorder())

    let first!: Promise<void>
    act(() => { first = result.current.startRecording() })
    await act(async () => { await result.current.startRecording() })
    await act(async () => { pending.resolve(); await first })

    expect(getUserMedia).toHaveBeenCalledTimes(1)
    expect(result.current.isRecording).toBe(true)
    expect(pending.stop).not.toHaveBeenCalled()
  })
})
