import { notFound } from 'next/navigation'
import PublicGDDTab from '@/components/embed/PublicGDDTab'
import { EMBED_REGIONS as REGIONS } from '@/lib/embed-regions'

/**
 * Iframe-embeddable Research / GDD page.
 *
 * Renders the slimmed-down PublicGDDTab against a region-specific Supabase
 * view. Used by external sites (e.g. tcbc.ie) via an <iframe> pointed at
 * https://www.hivecraic.com/embed/research/galway.
 *
 * The framing rules live in next.config.ts:
 *   - X-Frame-Options DENY is *not* applied to /embed/*
 *   - CSP frame-ancestors limits framing to the configured host(s)
 *
 * See: docs/features/tcbc-wordpress-research-widget.md
 */

// Regions live in src/lib/embed-regions.ts, shared with the weather route the embed calls.

export function generateStaticParams() {
  return Object.keys(REGIONS).map((region) => ({ region }))
}

export const dynamicParams = false

export default async function EmbedResearchRegionPage({
  params,
}: {
  params: Promise<{ region: string }>
}) {
  const { region } = await params
  const config = REGIONS[region]
  if (!config) notFound()

  return (
    <PublicGDDTab
      viewName={config.viewName}
      region={region}
      regionLabel={config.label}
    />
  )
}
