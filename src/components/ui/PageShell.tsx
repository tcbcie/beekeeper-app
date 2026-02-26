import type { ReactNode } from 'react'

interface PageShellProps {
  children: ReactNode
  className?: string
  innerClassName?: string
  centered?: boolean
}

export default function PageShell({
  children,
  className = '',
  innerClassName = '',
  centered = false,
}: PageShellProps) {
  return (
    <div
      className={`relative isolate overflow-hidden bg-background ${centered ? 'min-h-screen flex items-center justify-center' : ''} ${className}`.trim()}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 field-journal-texture opacity-70" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-56 field-journal-glow" />
      <div aria-hidden="true" className="pointer-events-none absolute -top-20 right-[-8%] h-52 w-52 rounded-full bg-amber-300/15 blur-3xl dark:bg-amber-500/10" />
      <div aria-hidden="true" className="pointer-events-none absolute top-24 left-[-10%] h-64 w-64 rounded-full bg-forest-400/12 blur-3xl dark:bg-forest-500/10" />

      <div className={`relative z-10 w-full ${innerClassName}`.trim()}>
        {children}
      </div>
    </div>
  )
}

