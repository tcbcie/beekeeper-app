import { notFound } from 'next/navigation'
import PublicGDDTab from '@/components/embed/PublicGDDTab'

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

interface RegionConfig {
  viewName: string
  label: string
  latitude: number
  longitude: number
}

// Add new regions here as the corresponding public_<region>_gdd view is created.
const REGIONS: Record<string, RegionConfig> = {
  galway: {
    viewName: 'public_galway_gdd',
    label: 'Galway',
    latitude: 53.2707,
    longitude: -9.0568,
  },
}

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
      regionCoords={{ latitude: config.latitude, longitude: config.longitude }}
      regionLabel={config.label}
    />
  )
}
