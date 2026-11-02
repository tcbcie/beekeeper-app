'use client'

import { useCallback, useId, useRef, type MouseEvent, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useDialogA11y } from '@/hooks/useDialogA11y'
import { useVerticalSwipe } from '@/hooks/useVerticalSwipe'

interface ModalShellProps {
  title: ReactNode
  children: ReactNode
  footer?: ReactNode
  onClose?: () => void
  closeDisabled?: boolean
  closeOnBackdrop?: boolean
  maxWidthClassName?: string
  shellClassName?: string
  headerClassName?: string
  titleClassName?: string
  bodyClassName?: string
  overlayClassName?: string
  showCloseButton?: boolean
}

/**
 * The shared modal surface.
 *
 * Keyboard and focus behaviour comes from `useDialogA11y`: Escape closes, Tab
 * cycles within the panel rather than escaping to the page behind it, focus
 * starts inside and returns to whatever opened the modal. Previously this
 * component provided a backdrop and ARIA roles but none of that, so every modal
 * in the application was reachable only by mouse once open, and a keyboard user
 * tabbing through one fell out into the page behind.
 *
 * `role="dialog"` and `aria-modal` sit on the panel, not the backdrop: the panel
 * is the dialog, and assistive technology should treat its bounds as the modal
 * boundary. The heading is associated by id, so the dialog announces its own
 * name instead of reading out its entire contents to find one.
 */
export default function ModalShell({
  title,
  children,
  footer,
  onClose,
  closeDisabled = false,
  closeOnBackdrop = false,
  maxWidthClassName = 'max-w-md',
  shellClassName = '',
  headerClassName = '',
  titleClassName = '',
  bodyClassName = 'p-6',
  overlayClassName = '',
  showCloseButton = true,
}: ModalShellProps) {
  const panelRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  // Escape must respect closeDisabled, or a modal held open mid-save could be
  // dismissed by a keypress while the write it is guarding is still in flight.
  const handleRequestClose = useCallback(() => {
    if (closeDisabled || !onClose) return
    onClose()
  }, [closeDisabled, onClose])

  // Always open: this component unmounts when closed rather than staying in the
  // tree, so there is no closed state to describe.
  useDialogA11y({ isOpen: true, onClose: handleRequestClose, containerRef: panelRef })

  const handleBackdropClick = () => {
    if (!closeOnBackdrop) return
    handleRequestClose()
  }

  const handlePanelClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
  }

  // A shortcut beside the close button, on the header only so it can't compete with scrolling.
  const swipeHandlers = useVerticalSwipe({ onSwipeDown: handleRequestClose })

  // A bottom sheet on a phone, under the thumb and above the keyboard; a centred dialog from `md` up.
  return (
    <div
      className={`fixed inset-0 bg-black/50 flex items-end justify-center z-50 pb-[var(--keyboard-inset,0px)] md:items-center md:p-4 ${overlayClassName}`.trim()}
      onClick={handleBackdropClick}
    >
      <div
        ref={panelRef}
        className={`field-journal-panel modal-sheet flex w-full flex-col max-h-[calc(92dvh-var(--keyboard-inset,0px))] pb-[env(safe-area-inset-bottom)] md:max-h-[92dvh] md:pb-0 ${maxWidthClassName} ${shellClassName}`.trim()}
        onClick={handlePanelClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div {...swipeHandlers} className="flex-shrink-0">
          <div aria-hidden="true" className="flex justify-center pt-2 md:hidden">
            <span className="h-1 w-10 rounded-full bg-text-tertiary" />
          </div>
          <div className={`border-b border-border px-4 py-2 md:px-6 md:py-4 flex items-center justify-between gap-3 ${headerClassName}`.trim()}>
            <h3 id={titleId} className={`text-lg font-semibold text-foreground ${titleClassName}`.trim()}>
              {title}
            </h3>
            {showCloseButton && onClose && (
              <button
                type="button"
                onClick={onClose}
                disabled={closeDisabled}
                className="fj-icon-btn p-1 disabled:opacity-50"
                aria-label="Close dialog"
              >
                <X size={20} />
              </button>
            )}
          </div>
        </div>

        {/* Scrolls by itself, so a tall form can't run off the screen with its footer out of reach. */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className={bodyClassName}>
            {children}
          </div>
        </div>

        {footer && <div className="flex-shrink-0">{footer}</div>}
      </div>
    </div>
  )
}
