'use client'

import { useCallback, useId, useRef, type MouseEvent, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useDialogA11y } from '@/hooks/useDialogA11y'

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

  return (
    <div
      className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 ${overlayClassName}`.trim()}
      onClick={handleBackdropClick}
    >
      <div
        ref={panelRef}
        className={`field-journal-panel w-full ${maxWidthClassName} ${shellClassName}`.trim()}
        onClick={handlePanelClick}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
      >
        <div className={`border-b border-border px-6 py-4 flex items-center justify-between gap-3 ${headerClassName}`.trim()}>
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

        <div className={bodyClassName}>
          {children}
        </div>

        {footer}
      </div>
    </div>
  )
}
