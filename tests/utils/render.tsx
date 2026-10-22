import type { ReactElement, ReactNode } from 'react'
import { render, type RenderOptions } from '@testing-library/react'
import { ToastProvider } from '@/components/ui/Toast'
import { ConfirmProvider } from '@/components/ui/ConfirmDialog'
import { SelectionProvider } from '@/contexts/SelectionContext'

/**
 * The app-wide providers the screens expect, in the same order as the real layouts
 * (src/app/layout.tsx: Toast > Confirm; src/app/dashboard/layout.tsx: Selection).
 * Without them, useToast / useConfirm / useSelection throw on render.
 */
function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <SelectionProvider>{children}</SelectionProvider>
      </ConfirmProvider>
    </ToastProvider>
  )
}

/** `render` wrapped in the app providers. `rerender` keeps them. */
export function renderWithProviders(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return render(ui, { wrapper: AppProviders, ...options })
}
