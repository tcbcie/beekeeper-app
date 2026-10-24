/**
 * The public site address for anything printed or scanned: hive and nuc QR tags, jar and batch
 * labels. Never `window.location.origin`: a tag printed from a preview or local address would
 * keep that address for ever (C3-18). Sign-in redirects still use the current origin.
 */
export const SITE_URL = 'https://www.hivecraic.com'
