'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Loader2 } from 'lucide-react'

interface ChatInputProps {
  onSend: (message: string) => void
  isLoading: boolean
  disabled?: boolean
}

export default function ChatInput({ onSend, isLoading, disabled }: ChatInputProps) {
  const [message, setMessage] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`
    }
  }, [message])

  const handleSubmit = () => {
    const trimmed = message.trim()
    if (trimmed && !isLoading && !disabled) {
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

  return (
    <div className="flex gap-2 items-end p-3 border-t border-border bg-surface">
      <textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about beekeeping..."
        disabled={isLoading || disabled}
        rows={1}
        className="flex-1 resize-none rounded-lg border border-border bg-surface-secondary
                   px-3 py-2 text-sm text-text-primary placeholder:text-text-muted
                   focus:outline-none focus:ring-2 focus:ring-forest-500
                   disabled:opacity-50 disabled:cursor-not-allowed
                   dark:bg-slate-700 dark:border-slate-600"
        maxLength={2000}
      />
      <button
        onClick={handleSubmit}
        disabled={!message.trim() || isLoading || disabled}
        className="flex-shrink-0 h-10 w-10 rounded-lg bg-forest-600 hover:bg-forest-700
                   disabled:opacity-50 disabled:cursor-not-allowed
                   flex items-center justify-center transition-colors
                   dark:bg-forest-600 dark:hover:bg-forest-700"
        aria-label="Send message"
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 text-white animate-spin" />
        ) : (
          <Send className="w-5 h-5 text-white" />
        )}
      </button>
    </div>
  )
}
