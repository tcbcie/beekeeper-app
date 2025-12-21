'use client'

import { useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import ChatDialog from './ChatDialog'

export default function ChatButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      {/* Floating Action Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full
                    shadow-lg hover:shadow-xl transition-all duration-200
                    flex items-center justify-center
                    ${isOpen
                      ? 'bg-slate-600 dark:bg-slate-700 rotate-0'
                      : 'bg-forest-600 dark:bg-forest-600 hover:bg-forest-700'
                    }`}
        aria-label={isOpen ? 'Close Mel' : 'Open Mel'}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}
      </button>

      {/* Chat Dialog */}
      <ChatDialog isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
