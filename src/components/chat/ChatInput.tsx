'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2, Mic, Square } from 'lucide-react'
import IconButton from '@/components/ui/IconButton'
import { supabase } from '@/lib/supabase'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'

interface ChatInputProps {
  onSend: (message: string) => void
  isLoading: boolean
  disabled?: boolean
}

export default function ChatInput({ onSend, isLoading, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Voice input: record, then turn the speech into text in the box (see docs/features/mel-voice-input.md)
  const { isRecording, isSupported, error: recorderError, startRecording, stopRecording } = useVoiceRecorder()
  const [transcribing, setTranscribing] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const voiceAbortRef = useRef<AbortController | null>(null)
  const voiceBusy = isRecording || transcribing

  // Closing Mel unmounts this box: drop any transcription still in flight.
  useEffect(() => () => voiceAbortRef.current?.abort(), [])

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [message])

  const handleSubmit = () => {
    const trimmed = message.trim()
    if (trimmed && !isLoading && !disabled && !voiceBusy) {
      onSend(trimmed)
      setMessage('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleVoice = async () => {
    if (transcribing) return
    if (!isRecording) {
      setVoiceError(null)
      await startRecording()
      return
    }

    const blob = await stopRecording()
    if (!blob) {
      setVoiceError('Nothing was recorded. Tap the microphone and try again.')
      return
    }
    const controller = new AbortController()
    voiceAbortRef.current = controller
    setTranscribing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setVoiceError('Your session has expired. Please sign in again.')
        return
      }
      const fd = new FormData()
      const ext = blob.type.includes('mp4') ? 'mp4' : blob.type.includes('ogg') ? 'ogg' : 'webm'
      fd.append('audio', blob, `mel-question.${ext}`)
      fd.append('cleanup', 'false')
      const res = await fetch('/api/voice-notes-transcribe', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: fd,
        signal: controller.signal
      })
      const body = await res.json().catch(() => ({})) as { cleaned?: string; error?: string; code?: string }
      if (controller.signal.aborted) return
      if (!res.ok) {
        setVoiceError(body.code === 'SUBSCRIPTION_REQUIRED'
          ? 'An active subscription is required to use voice input.'
          : body.error || 'Could not turn your speech into text. Please try again.')
        return
      }
      const spoken = (body.cleaned || '').trim()
      if (!spoken) {
        setVoiceError('No words were heard. Tap the microphone and try again.')
        return
      }
      setMessage(prev => {
        const existing = prev.trimEnd()
        return (existing ? `${existing} ${spoken}` : spoken).slice(0, 2000)
      })
      textareaRef.current?.focus()
    } catch (err) {
      if ((err as Error)?.name === 'AbortError' || controller.signal.aborted) return
      console.error('Mel voice input failed:', err)
      setVoiceError('Could not turn your speech into text. Please try again.')
    } finally {
      if (voiceAbortRef.current === controller) voiceAbortRef.current = null
      if (!controller.signal.aborted) setTranscribing(false)
    }
  }

  const voiceStatus = voiceError || recorderError
    || (isRecording ? 'Listening… tap stop when you have finished.' : null)
    || (transcribing ? 'Turning your speech into text…' : null)

  return (
    <div className="border-t border-border bg-surface">
      <p
        aria-live="polite"
        className={voiceStatus
          ? `px-3 pt-2 text-sm ${voiceError || recorderError ? 'text-red-700 dark:text-red-400' : 'text-text-secondary'}`
          : 'sr-only'}
      >
        {voiceStatus}
      </p>
      <div className="flex gap-2 items-end p-3">
        <textarea
          ref={textareaRef}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about beekeeping..."
          disabled={isLoading || disabled}
          rows={1}
          className="flex-1 resize-none rounded-lg border border-border bg-surface-secondary
                     px-3 py-2 text-base text-text-primary placeholder:text-text-muted
                     focus:outline-none focus:ring-2 focus:ring-forest-500
                     disabled:opacity-50 disabled:cursor-not-allowed
                     dark:bg-surface-elevated dark:border-border"
          maxLength={2000}
        />
        {isSupported && (
          <IconButton
            onClick={handleVoice}
            disabled={transcribing || disabled}
            size="sm"
            className={`flex-shrink-0 h-12 w-12 border disabled:cursor-not-allowed ${
              isRecording
                ? 'bg-red-700 hover:bg-red-800 border-red-700 text-white motion-safe:animate-pulse'
                : 'bg-surface border-border text-text-primary hover:bg-surface-secondary'
            }`}
            aria-label={transcribing ? 'Turning speech into text' : isRecording ? 'Stop recording' : 'Ask by voice'}
          >
            {transcribing ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isRecording ? (
              <Square className="w-5 h-5" />
            ) : (
              <Mic className="w-5 h-5" />
            )}
          </IconButton>
        )}
        <IconButton
          onClick={handleSubmit}
          disabled={!message.trim() || isLoading || disabled || voiceBusy}
          size="sm"
          className="flex-shrink-0 h-10 w-10 bg-forest-600 hover:bg-forest-700
                     disabled:opacity-50 disabled:cursor-not-allowed dark:bg-forest-600 dark:hover:bg-forest-700"
          aria-label="Send message"
        >
          {isLoading ? (
            <Loader2 className="w-5 h-5 text-white animate-spin" />
          ) : (
            <Send className="w-5 h-5 text-white" />
          )}
        </IconButton>
      </div>
    </div>
  )
}
