'use client'

import { useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import ChatDialog from './ChatDialog'
import IconButton from '@/components/ui/IconButton'
import { useIsFormActive } from '@/contexts/BottomSurfaceContext'

export default function ChatButton() {
  const [isOpen, setIsOpen] = useState(false)

  // Mel floats over the page, and over a long form it covers the very fields
  // being filled in. While a form is in progress it shrinks and fades rather
  // than disappearing: still a 44px target, still reachable, far less in the
  // way. It returns to full size the moment the form is done or Mel is opened.
  const isFormActive = useIsFormActive()

  return (
    <>
      {/* Floating Action Button */}
      <IconButton
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed above-bottom-nav md:bottom-6 right-6 z-40 rounded-full
                    ${isFormActive && !isOpen ? 'w-11 h-11 opacity-60' : 'w-14 h-14'}
                    shadow-lg hover:shadow-xl transition-all duration-200
                    flex items-center justify-center
                    ${isOpen
                      ? 'bg-surface-elevated dark:bg-surface-elevated rotate-0'
                      : 'bg-forest-600 dark:bg-forest-600 hover:bg-forest-700'
                    }`}
        aria-label={isOpen ? 'Close Mel' : 'Open Mel'}
      >
        {isOpen ? (
          <X className="w-6 h-6 text-white" />
        ) : (
          <MessageCircle className="w-6 h-6 text-white" />
        )}
      </IconButton>

      {/* Chat Dialog */}
      <ChatDialog isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}
