#!/usr/bin/env node
// Pre-commit secret scanner.
//
// Scans STAGED ADDITIONS ONLY (lines beginning with `+` in git diff --cached)
// and rejects the commit if it finds a JWT, a PEM private key, or a Stripe
// live secret key. Run by .husky/pre-commit. Also runnable manually via
// `npm run secrets:scan`.
//
// To allowlist a deliberate occurrence, add `secret-scan-ignore` on the same
// line in a code comment, OR add a glob to ALLOWLIST_FILES below.

import { execSync } from 'node:child_process'

const ALLOWLIST_FILES = [
  // Lock files contain long hashes that look like secrets but aren't.
  /^package-lock\.json$/,
  /^yarn\.lock$/,
  /^pnpm-lock\.yaml$/,
  // Source maps embed obfuscated strings.
  /\.map$/,
  // The scanner itself contains the regex patterns and example matches.
  /^scripts\/check-secrets\.mjs$/,
]

const PATTERNS = [
  {
    name: 'JWT token',
    // JSON Web Tokens: three base64url segments separated by dots,
    // header always starts with `eyJ` (`{"`). Require all three segments
    // to be substantial so we don't fire on truncated fragments.
    regex: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}/,
  },
  {
    name: 'PEM private key',
    regex: /-----BEGIN (?:RSA |EC |DSA |OPENSSH |PGP )?PRIVATE KEY-----/,
  },
  {
    name: 'Stripe live secret key',
    regex: /\bsk_live_[A-Za-z0-9]{20,}/,
  },
  {
    name: 'Supabase service-role JWT marker (decoded payload)',
    // If anyone ever pastes a decoded service_role JWT payload, flag it.
    regex: /"role"\s*:\s*"service_role"/,
  },
]

function getStagedDiff() {
  try {
    return execSync('git diff --cached -U0 --no-color', {
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024,
    })
  } catch (err) {
    console.error('Failed to read staged diff:', err.message)
    process.exit(2)
  }
}

function scan() {
  const diff = getStagedDiff()
  if (!diff.trim()) return []

  const hits = []
  let currentFile = null
  let currentLineNo = 0

  for (const rawLine of diff.split('\n')) {
    if (rawLine.startsWith('+++ b/')) {
      currentFile = rawLine.slice(6)
      currentLineNo = 0
      continue
    }
    if (rawLine.startsWith('--- ') || rawLine.startsWith('+++ ')) {
      continue
    }
    if (rawLine.startsWith('@@')) {
      // @@ -a,b +c,d @@  -- new-file starts at line c
      const m = rawLine.match(/\+(\d+)/)
      currentLineNo = m ? parseInt(m[1], 10) : 0
      continue
    }
    if (!rawLine.startsWith('+') || rawLine.startsWith('+++')) {
      if (rawLine.startsWith(' ')) currentLineNo++
      continue
    }
    // This is an added line. Advance the line counter after we check it.
    const lineContent = rawLine.slice(1)

    if (!currentFile) {
      // Defensive: ran into a `+` line before any `+++ b/` header. Treat
      // as a parser glitch rather than blocking the commit with a `null:N`
      // hit that no one can act on.
      currentLineNo++
      continue
    }
    if (ALLOWLIST_FILES.some(rx => rx.test(currentFile))) {
      currentLineNo++
      continue
    }
    if (/secret-scan-ignore/.test(lineContent)) {
      currentLineNo++
      continue
    }

    for (const { name, regex } of PATTERNS) {
      const match = lineContent.match(regex)
      if (match) {
        // Show only the prefix and length. Trailing bytes of a JWT or PEM
        // body carry signature/key material; logging them — even masked —
        // would survive in scrollback or a pasted bug report.
        const masked = match[0].length > 16
          ? `${match[0].slice(0, 8)}... (${match[0].length} chars)`
          : `${match[0].slice(0, 4)}... (${match[0].length} chars)`
        hits.push({
          file: currentFile,
          line: currentLineNo,
          name,
          masked,
        })
      }
    }
    currentLineNo++
  }
  return hits
}

const hits = scan()
if (hits.length === 0) {
  process.exit(0)
}

console.error('')
console.error('[31m✗ Secret-scan hook blocked this commit.[0m')
console.error('')
for (const h of hits) {
  console.error(`  ${h.file}:${h.line}  ${h.name}`)
  console.error(`    matched: ${h.masked}`)
}
console.error('')
console.error('Options:')
console.error('  1. Remove the secret and use an env var instead.')
console.error('  2. If this is genuinely safe (placeholder, test fixture, etc.),')
console.error('     add the comment `secret-scan-ignore` on the same line.')
console.error('  3. To bypass for this one commit only: `git commit --no-verify`')
console.error('     (do not normalise this; it leaves us in the position we just')
console.error('     dug ourselves out of.)')
console.error('')
process.exit(1)
