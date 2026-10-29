'use client'

import { useState, useRef, useEffect, useId } from 'react'
import { X, Sparkles } from 'lucide-react'
import { ChatMessage as ChatMessageType } from '@/types/chat'
import ChatMessage from './ChatMessage'
import ChatInput from './ChatInput'
import { supabase } from '@/lib/supabase'
import IconButton from '@/components/ui/IconButton'
import { useSubmitLock } from '@/hooks/useSubmitLock'
import { useDialogA11y } from '@/hooks/useDialogA11y'

// Long enough for Mel's slowest answers (the server allows 60 seconds per model call).
const REQUEST_TIMEOUT_MS = 70_000

// What the user sees when a request fails: never raw browser or parser text.
function friendlyError(status: number, data: { error?: string; code?: string }): string {
  if (data.code === 'SUBSCRIPTION_REQUIRED') {
    return 'This feature requires a premium subscription. Please upgrade to access Mel.'
  }
  if (status === 401) return 'Your session has expired. Please sign in again.'
  if (status === 429) return data.error || 'Mel is busy. Please try again in a moment.'
  if (status >= 500) return 'Mel couldn\'t answer just now. Please try again.'
  return data.error || 'Mel couldn\'t answer just now. Please try again.'
}

interface ChatDialogProps {
  isOpen: boolean
  onClose: () => void
}

export default function ChatDialog({ isOpen, onClose }: ChatDialogProps) {
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  // Questions that got no answer stay on screen but aren't sent as history next time.
  const failedIdsRef = useRef(new Set<string>())
  const titleId = useId()
  const { run } = useSubmitLock()

  // Escape closes, focus moves into Mel and back to the button afterwards, Tab stays inside.
  useDialogA11y({ isOpen, onClose, containerRef: dialogRef })

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Add welcome message on first open
  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([
        {
          id: 'welcome',
          role: 'assistant',
          content: 'Hi I\'m Mel, your Virtual Assistant. Ask me anything about your hives, inspections, or general beekeeping knowledge.',
          timestamp: new Date()
        }
      ])
    }
  }, [isOpen, messages.length])

  // The submit lock stops a double tap sending the same question twice.
  const sendMessage = (content: string) => run(async () => {
    setError(null)

    // Add user message
    const userMessage: ChatMessageType = {
      id: `user-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

    try {
      // Get auth token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        throw new Error('Your session has expired. Please sign in again.')
      }

      // Send to API
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          message: content,
          conversationHistory: messages.filter(m => m.id !== 'welcome' && !failedIdsRef.current.has(m.id))
        }),
        signal: controller.signal
      })

      // A timeout or gateway error returns an HTML page, not JSON.
      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(friendlyError(response.status, data))
      }

      // Add assistant response
      const assistantMessage: ChatMessageType = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
        sources: data.sources
      }
      setMessages(prev => [...prev, assistantMessage])

    } catch (err) {
      failedIdsRef.current.add(userMessage.id)
      if (err instanceof DOMException && err.name === 'AbortError') {
        setError('Mel took too long to answer. Please try again.')
      } else if (err instanceof TypeError) {
        // fetch rejects with a TypeError when there is no connection.
        setError('No connection. Check your internet and try again.')
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong')
      }
    } finally {
      clearTimeout(timer)
      setIsLoading(false)
    }
  })

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop: a click outside closes Mel on every screen size (the conversation is kept). */}
      <div
        className="fixed inset-0 bg-black/50 z-50 md:bg-transparent"
        onClick={onClose}
      />

      {/* Dialog */}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="fixed above-bottom-nav md:bottom-24 left-0 right-0 md:right-6 md:left-auto
                   z-50 w-full md:w-96 h-[70vh] md:h-[500px] md:max-h-[70vh]
                   bg-surface rounded-t-2xl md:rounded-2xl shadow-2xl
                   flex flex-col overflow-hidden
                   border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-surface-secondary">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-500" />
          <h2 id={titleId} className="font-semibold text-text-primary">Mel your Virtual Assistant</h2>
        </div>
          <IconButton
            onClick={onClose}
            size="xs"
            className="hover:bg-surface"
            aria-label="Close chat"
          >
            <X className="w-5 h-5 text-text-secondary" />
          </IconButton>
        </div>

        {/* Messages: new replies are read out by screen readers */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" role="log" aria-live="polite">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}

          {isLoading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-white animate-pulse" />
              </div>
              <div className="bg-surface-secondary rounded-lg px-4 py-2">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-text-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          {error && (
            <div role="alert" className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <ChatInput onSend={sendMessage} isLoading={isLoading} />
      </div>
    </>
  )
}
