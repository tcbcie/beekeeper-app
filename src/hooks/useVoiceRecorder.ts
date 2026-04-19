'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface UseVoiceRecorderReturn {
  isRecording: boolean
  isSupported: boolean
  error: string | null
  startRecording: () => Promise<void>
  stopRecording: () => Promise<Blob | null>
  reset: () => void
}

function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') {
    return ''
  }
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) {
      return type
    }
  }
  return ''
}

export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const mimeTypeRef = useRef<string>('')
  const mountedRef = useRef(true)

  const isSupported =
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== 'undefined'

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
    recorderRef.current = null
    chunksRef.current = []
  }, [])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      cleanupStream()
    }
  }, [cleanupStream])

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError('Voice recording is not supported in this browser.')
      return
    }
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = pickMimeType()
      mimeTypeRef.current = mimeType
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      chunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data)
        }
      }
      recorderRef.current = recorder
      recorder.start()
      if (mountedRef.current) {
        setIsRecording(true)
      }
    } catch (err) {
      cleanupStream()
      const message = err instanceof Error ? err.message : 'Could not access the microphone.'
      if (mountedRef.current) {
        setError(message)
        setIsRecording(false)
      }
    }
  }, [cleanupStream, isSupported])

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const recorder = recorderRef.current
      if (!recorder) {
        resolve(null)
        return
      }
      recorder.onstop = () => {
        const mimeType = mimeTypeRef.current || 'audio/webm'
        const blob = chunksRef.current.length > 0 ? new Blob(chunksRef.current, { type: mimeType }) : null
        cleanupStream()
        if (mountedRef.current) {
          setIsRecording(false)
        }
        resolve(blob)
      }
      try {
        recorder.stop()
      } catch {
        cleanupStream()
        if (mountedRef.current) {
          setIsRecording(false)
        }
        resolve(null)
      }
    })
  }, [cleanupStream])

  const reset = useCallback(() => {
    cleanupStream()
    if (mountedRef.current) {
      setIsRecording(false)
      setError(null)
    }
  }, [cleanupStream])

  return { isRecording, isSupported, error, startRecording, stopRecording, reset }
}
