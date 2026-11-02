import { adminNavItems, baseNavItems } from './navigation'

export interface ScreenInfo {
  title: string
  /** Where Back goes when the app was opened directly on this screen, e.g. from a QR code. Null on a main screen. */
  parentHref: string | null
}

const D = '/dashboard'

/** Screens that are not menu destinations. The first match wins, so deeper routes come first. */
const SUB_SCREENS: Array<[pattern: RegExp, title: string, parent: string | ((path: string) => string)]> = [
  [/^\/dashboard\/hives\/[^/]+$/, 'Hive', `${D}/hives`],
  [/^\/dashboard\/hive-scan\//, 'Hive', `${D}/hives`],
  [/^\/dashboard\/apiaries\/[^/]+\/map\/3d$/, '3D map', parentOf],
  [/^\/dashboard\/apiaries\/[^/]+\/map$/, 'Apiary map', parentOf],
  [/^\/dashboard\/apiaries\/[^/]+$/, 'Apiary', `${D}/apiaries`],
  [/^\/dashboard\/queens\/compare$/, 'Compare queens', `${D}/queens`],
  [/^\/dashboard\/queens\/lineage$/, 'Lineage', `${D}/queens`],
  [/^\/dashboard\/queens\/[^/]+$/, 'Queen', `${D}/queens`],
  [/^\/dashboard\/crm\/customers\/[^/]+$/, 'Customer', `${D}/crm/customers`],
  [/^\/dashboard\/crm\/orders\/[^/]+\/invoice$/, 'Invoice', parentOf],
  [/^\/dashboard\/crm\/orders\/[^/]+$/, 'Order', `${D}/crm/orders`],
  [/^\/dashboard\/settings\/subscription-history$/, 'Subscription history', `${D}/settings`],
  [/^\/dashboard\/mating-nucs$/, 'Mating nucs', `${D}/batches`],
  [/^\/dashboard\/rearing-team$/, 'Rearing team', `${D}/batches`],
  [/^\/dashboard\/apiary-team$/, 'Apiary team', `${D}/apiaries`],
  [/^\/dashboard\/qr-tags$/, 'QR tags', `${D}/tools`],
  [/^\/dashboard\/traceability$/, 'Traceability', `${D}/tools`],
  [/^\/dashboard\/scales$/, 'Scales', `${D}/tools`],
  [/^\/dashboard\/support$/, 'Support', `${D}/about`],
  [/^\/dashboard\/submit-colony$/, 'Submit a colony', D],
]

function parentOf(path: string): string {
  return path.slice(0, path.lastIndexOf('/'))
}

export function getScreenInfo(pathname: string): ScreenInfo {
  const destination = [...baseNavItems, ...adminNavItems].find(item => item.href === pathname)
  if (destination) return { title: destination.label, parentHref: null }

  for (const [pattern, title, parent] of SUB_SCREENS) {
    if (pattern.test(pathname)) {
      return { title, parentHref: typeof parent === 'function' ? parent(pathname) : parent }
    }
  }
  // A route not listed yet still gets a working Back.
  return { title: 'HiveCraic', parentHref: D }
}
