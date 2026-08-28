// Validation for the payment links shown on a public jar-label scan page.
//
// The link itself lives on `profiles` (it is an account, not a product), and the
// price lives on the jar label (it varies by jar size).
//
// WHY AN ALLOWLIST AT ALL
// The link is set by the user and /j/ is public and unauthenticated. Without a
// host check, any account could paste any URL and use a page on hivecraic.com —
// carrying the trust badge and a named producer — to lend credibility to a fake
// payment page. That is a reputational problem for HiveCraic as a whole, not
// just for the one account.
//
// WHY IT IS ENFORCED TWICE
// Saving through the profile form is not the only way the row gets written: the
// owner can PATCH `profiles` directly through PostgREST, bypassing any
// client-side check. So the public page re-validates before rendering. The page
// is a server component, so that check runs on the server and cannot be skipped
// by the viewer.
//
// WHY IT IS NOT A DATABASE CHECK
// Providers add and change domains over time, and a CHECK constraint would mean
// a migration every time. The database enforces only what never changes (HTTPS,
// length); this list carries the rest.

export type PaymentProvider = 'revolut' | 'stripe' | 'sumup'

interface ProviderSpec {
  /** Shown on the button — what the customer recognises, not our column name. */
  buttonLabel: string
  /** Named in the reassurance line: "You'll be taken to X to pay securely." */
  destinationName: string
  /**
   * Exact hosts, plus suffixes matched on a dot boundary so `evilstripe.com`
   * cannot pass as `stripe.com`.
   */
  hosts: string[]
  hostSuffixes: string[]
}

// Only `revolut` is wired into the UI today. The other two specs are kept as
// ready configuration — the validation below is provider-generic, so bringing
// Stripe back is a UI change, not a rewrite.
export const PAYMENT_PROVIDERS: Record<PaymentProvider, ProviderSpec> = {
  revolut: {
    buttonLabel: 'Pay with Revolut',
    destinationName: 'Revolut',
    hosts: ['revolut.me'],
    hostSuffixes: ['.revolut.com', '.revolut.me'],
  },
  stripe: {
    buttonLabel: 'Pay by card',
    destinationName: 'Stripe',
    hosts: [],
    hostSuffixes: ['.stripe.com'],
  },
  sumup: {
    buttonLabel: 'Pay by card',
    destinationName: 'SumUp',
    hosts: ['sumup.me'],
    hostSuffixes: ['.sumup.com', '.sumup.me'],
  },
}

/** Human-readable host list, for the form's rejection message. */
export function allowedHostsDescription(provider: PaymentProvider): string {
  const spec = PAYMENT_PROVIDERS[provider]
  return [...spec.hosts, ...spec.hostSuffixes.map(s => `*${s}`)].join(', ')
}

/**
 * True when `url` is a link we are willing to put in front of a customer for
 * this provider. Rejects anything that is not HTTPS, or whose host is not on
 * the provider's list.
 */
export function isAllowedPaymentUrl(url: string | null | undefined, provider: PaymentProvider): boolean {
  if (!url) return false

  let parsed: URL
  try {
    parsed = new URL(url.trim())
  } catch {
    return false
  }

  // Guard against credentials in the URL ("https://revolut.me@evil.com"), which
  // some readers mistake for the real host.
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password) return false

  const host = parsed.hostname.toLowerCase()
  const spec = PAYMENT_PROVIDERS[provider]

  if (spec.hosts.includes(host)) return true
  return spec.hostSuffixes.some(suffix => host.endsWith(suffix))
}

export interface ResolvedPaymentLink {
  provider: PaymentProvider
  url: string
  buttonLabel: string
  destinationName: string
}

/**
 * The payment link a scan may actually render, or null.
 *
 * Revalidated here rather than trusted from the database: `profiles` is writable
 * by its owner through PostgREST, so a row can carry a URL the profile form
 * never saw. Returns null rather than warning — a customer must never be shown a
 * payment button we do not trust, and the producer sees the error in the form.
 */
export function resolvePaymentLink(source: { revolut_url?: string | null }): ResolvedPaymentLink | null {
  const url = source.revolut_url
  if (!isAllowedPaymentUrl(url, 'revolut')) return null

  const spec = PAYMENT_PROVIDERS.revolut
  return {
    provider: 'revolut',
    url: url!.trim(),
    buttonLabel: spec.buttonLabel,
    destinationName: spec.destinationName,
  }
}

/** Format a display price. Falls back to a plain join for unknown currencies. */
export function formatPaymentAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-IE', { style: 'currency', currency }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}
