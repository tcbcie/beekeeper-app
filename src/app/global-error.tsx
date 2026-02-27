'use client'

import Button from '@/components/ui/Button'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body className="bg-background flex items-center justify-center min-h-screen p-4">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-text-secondary mb-4">
            {error.message || 'An unexpected error occurred'}
          </p>
          <Button
            onClick={reset}
            tone="amber"
          >
            Try again
          </Button>
        </div>
      </body>
    </html>
  )
}
