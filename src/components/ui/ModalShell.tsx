import type { MouseEvent, ReactNode } from 'react'
import { X } from 'lucide-react'

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
  const handleBackdropClick = () => {
    if (!closeOnBackdrop || closeDisabled || !onClose) return
    onClose()
  }

  const handlePanelClick = (event: MouseEvent<HTMLDivElement>) => {
    event.stopPropagation()
  }

  return (
    <div
      className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 ${overlayClassName}`.trim()}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div
        className={`field-journal-panel w-full ${maxWidthClassName} ${shellClassName}`.trim()}
        onClick={handlePanelClick}
      >
        <div className={`border-b border-border px-6 py-4 flex items-center justify-between gap-3 ${headerClassName}`.trim()}>
          <h3 className={`text-lg font-semibold text-foreground ${titleClassName}`.trim()}>
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
