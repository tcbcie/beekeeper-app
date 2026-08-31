import { useId, type ReactNode } from 'react'
import FieldLabel from './FieldLabel'

/**
 * Shared label, help-text and error semantics for the form control primitives.
 *
 * These are opt-in. A control that is given none of `label`, `helpText` or
 * `error` renders exactly as it did before, with no wrapper element and no
 * generated id, so existing consumers are unaffected.
 *
 * Required state is conveyed by the native `required` attribute, which already
 * exposes the correct role to assistive technology; `aria-required` would be
 * redundant alongside it, so it is deliberately not set.
 */

export interface FieldSemanticsProps {
  label?: ReactNode
  helpText?: ReactNode
  error?: ReactNode
}

interface UseFieldSemanticsArgs extends FieldSemanticsProps {
  id?: string
  describedBy?: string
}

export interface FieldSemantics {
  /** Wrap the control when any of label, helpText or error is supplied. */
  hasShell: boolean
  /** Id to place on the control, and to point the label's htmlFor at. */
  controlId: string | undefined
  helpId: string | undefined
  errorId: string | undefined
  /** Existing aria-describedby merged with the generated help and error ids. */
  describedBy: string | undefined
  /** True when an error is present, for aria-invalid and the danger tone. */
  invalid: boolean
}

export function useFieldSemantics({
  id,
  label,
  helpText,
  error,
  describedBy,
}: UseFieldSemanticsArgs): FieldSemantics {
  const generatedId = useId()
  const hasShell = Boolean(label || helpText || error)

  if (!hasShell) {
    return {
      hasShell: false,
      controlId: id,
      helpId: undefined,
      errorId: undefined,
      describedBy,
      invalid: false,
    }
  }

  const controlId = id ?? `${generatedId}-control`
  const helpId = helpText ? `${generatedId}-help` : undefined
  const errorId = error ? `${generatedId}-error` : undefined

  const described = [describedBy, helpId, errorId].filter(Boolean).join(' ')

  return {
    hasShell: true,
    controlId,
    helpId,
    errorId,
    describedBy: described || undefined,
    invalid: Boolean(error),
  }
}

interface FieldShellProps extends FieldSemanticsProps {
  semantics: FieldSemantics
  required?: boolean
  children: ReactNode
}

export function FieldShell({
  semantics,
  label,
  helpText,
  error,
  required = false,
  children,
}: FieldShellProps) {
  if (!semantics.hasShell) return <>{children}</>

  return (
    <div>
      {label && (
        <FieldLabel htmlFor={semantics.controlId} required={required}>
          {label}
        </FieldLabel>
      )}
      {children}
      {helpText && (
        <p id={semantics.helpId} className="mt-1 text-sm text-text-muted">
          {helpText}
        </p>
      )}
      {error && (
        <p id={semantics.errorId} role="alert" className="mt-1 text-sm text-red-700 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  )
}
