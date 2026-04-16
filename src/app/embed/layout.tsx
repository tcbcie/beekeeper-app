/**
 * Embed layout — used by iframe-embeddable pages such as
 * /embed/research/[region]. Deliberately minimal: no app header, footer,
 * navigation, install prompt or auth gate. The host page (e.g. tcbc.ie)
 * provides the surrounding chrome via the iframe wrapper.
 *
 * Framing is allowed via Content-Security-Policy frame-ancestors set in
 * next.config.ts; the catch-all X-Frame-Options DENY rule explicitly
 * excludes /embed/* there.
 */
export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="px-3 py-4 sm:px-5 sm:py-5">
        {children}
      </main>
    </div>
  )
}
