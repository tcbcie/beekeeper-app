'use client'

import { User, Bot } from 'lucide-react'
import { ChatMessage as ChatMessageType } from '@/types/chat'

interface ChatMessageProps {
  message: ChatMessageType
}

// Parse markdown links [text](url) into clickable anchor tags
function parseMarkdownLinks(text: string, isUser: boolean): React.ReactNode[] {
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
  const parts: React.ReactNode[] = []
  let lastIndex = 0
  let match

  while ((match = linkRegex.exec(text)) !== null) {
    // Add text before the link
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index))
    }

    // Add the link — only allow http(s) to prevent javascript: XSS
    const [, linkText, url] = match
    const isSafeUrl = /^https?:\/\//i.test(url)
    if (isSafeUrl) {
      parts.push(
        <a
          key={match.index}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`underline hover:opacity-80 ${
            isUser ? 'text-green-200' : 'text-amber-600 dark:text-amber-400'
          }`}
        >
          {linkText}
        </a>
      )
    } else {
      parts.push(linkText)
    }

    lastIndex = match.index + match[0].length
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts.length > 0 ? parts : [text]
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user'
  const hasSources = !isUser && message.sources && message.sources.length > 0

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
          isUser
            ? 'bg-forest-800'
            : 'bg-amber-800'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-white" />
        ) : (
          <Bot className="w-4 h-4 text-white" />
        )}
      </div>

      {/* Message bubble */}
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-forest-800 text-white'
            : 'bg-surface-secondary text-text-primary'
        }`}
      >
        <p className="text-sm whitespace-pre-wrap break-words">
          {parseMarkdownLinks(message.content, isUser)}
        </p>
        {hasSources && (
          <div className="mt-2 pt-2 border-t border-border/50">
            <p className="text-sm text-text-muted mb-1">Sources:</p>
            <ul className="space-y-0.5">
              {message.sources!.map((source, idx) => (
                <li key={idx} className="text-xs">
                  {parseMarkdownLinks(source, false)}
                </li>
              ))}
            </ul>
          </div>
        )}
        <span
          className={`text-xs mt-1 block ${
            isUser ? 'text-green-200' : 'text-text-muted'
          }`}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
      </div>
    </div>
  )
}
