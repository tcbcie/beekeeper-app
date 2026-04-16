import IframeHeightReporter from '@/components/embed/IframeHeightReporter'

/**
 * Embed layout — used by iframe-embeddable pages such as
 * /embed/research/[region]. Deliberately minimal: no app header, footer,
 * navigation, install prompt or auth gate. The host page (e.g. tcbc.ie)
 * provides the surrounding chrome via the iframe wrapper.
 *
 * Framing is allowed via Content-Security-Policy frame-ancestors set in
 * next.config.ts; the catch-all X-Frame-Options DENY rule explicitly
 * excludes /embed/* there.
 *
 * IframeHeightReporter posts the content height to the parent window so the
 * iframe can auto-size. No min-height here — any viewport-based minimum
 * would prevent the reported height from shrinking below the iframe's
 * initial size.
 */
export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="bg-background text-foreground">
      <main className="px-3 py-4 sm:px-5 sm:py-5">
        {children}
      </main>
      <IframeHeightReporter />
    </div>
  )
}
