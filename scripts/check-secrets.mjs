#!/usr/bin/env node
// Secret scanner.
//
// Scans ADDED LINES ONLY and rejects the change if it finds a secret (JWTs, private keys,
// Supabase / Stripe / Resend / OpenAI / Google / Mapbox / AWS / GitHub tokens, connection
// strings with a password ...). It also refuses data-shaped files: new .sql/.csv files outside
// the allowlist below, and any added or changed file over 1 MB.
//
//   node scripts/check-secrets.mjs                 staged changes (run by .husky/pre-commit)
//   node scripts/check-secrets.mjs --range A..B    a commit range (run by GitHub Actions, so
//                                                  `git commit --no-verify` can't get past it)
//
// To allowlist a deliberate occurrence, add `secret-scan-ignore` on the same line in a code
// comment, OR add a pattern to ALLOWLIST_FILES / DATA_FILE_ALLOWLIST below.

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

// Data files that may be committed on purpose (schema migrations, static reference tables).
const DATA_FILE_ALLOWLIST = [
  /^supabase\/migrations\//,
  /^migrations\//,
  /^src\/sql\//,
  /^external_references\/(?:Ireland_Beekeeper_Associations_Directory|approved_varroa_treatments_NI_UK_with_summary|beekeeping_facts_365)\.csv$/,
]
const MAX_FILE_BYTES = 1024 * 1024

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
    name: 'Supabase secret API key',
    // New-style server key (sb_secret_…): full database access, bypasses RLS.
    regex: /\bsb_secret_[A-Za-z0-9_-]{20,}/,
  },
  {
    name: 'Supabase personal access token',
    regex: /\bsbp_[A-Za-z0-9]{20,}/,
  },
  {
    name: 'Stripe secret, restricted or webhook key',
    regex: /\b(?:sk_test_|rk_live_|rk_test_|whsec_)[A-Za-z0-9]{20,}/,
  },
  {
    name: 'Resend API key',
    regex: /\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}/,
  },
  {
    name: 'OpenAI or Anthropic API key',
    regex: /\bsk-(?:proj-|ant-)?[A-Za-z0-9_-]{32,}/,
  },
  {
    name: 'Google API key',
    regex: /\bAIza[0-9A-Za-z_-]{35}\b/,
  },
  {
    name: 'Mapbox secret token',
    regex: /\bsk\.eyJ[A-Za-z0-9_-]{20,}/,
  },
  {
    name: 'AWS access key ID',
    regex: /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/,
  },
  {
    name: 'GitHub token',
    regex: /\b(?:gh[pousr]_[A-Za-z0-9]{36,}|github_pat_[A-Za-z0-9_]{40,})/,
  },
  {
    name: 'Encrypted private key',
    regex: /-----BEGIN ENCRYPTED PRIVATE KEY-----/,
  },
  {
    name: 'Connection string with a password',
    // Skips documentation placeholders such as user:password@ or user:<pw>@.
    regex: /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis):\/\/[^\s:@/]+:(?!(?:password|pass|pwd|secret|changeme|xxx+)@|[<${])[^\s@/]{3,}@/,
  },
  {
    name: 'Secret assigned in an env-style line',
    // KEY_SECRET=..., FOO_TOKEN="..." with a real-looking value. Placeholders are skipped:
    // values containing your / here / xxx / changeme / example / placeholder anywhere
    // (e.g. sk_test_your_key_here), and <value>, ${VAR} or process.env.X.
    regex: /\b[A-Z0-9_]*(?:SECRET|TOKEN|PRIVATE_KEY|API_KEY|PASSWORD)[A-Z0-9_]*\s*=\s*["']?(?![<$]|process\.env)(?![A-Za-z0-9_\-/+=.]*(?:your|here|xxx|changeme|example|placeholder|YOUR|HERE|XXX))[A-Za-z0-9_\-/+=.]{24,}/,
  },
  {
    name: 'Supabase service-role JWT marker (decoded payload)',
    // If anyone ever pastes a decoded service_role JWT payload, flag it.
    regex: /"role"\s*:\s*"service_role"/,
  },
]

// `--range A..B` scans a commit range (CI); otherwise the staged changes (pre-commit hook).
const rangeIndex = process.argv.indexOf('--range')
const RANGE = rangeIndex !== -1 ? process.argv[rangeIndex + 1] : null
if (rangeIndex !== -1 && !/^[0-9A-Za-z._/^~-]+\.\.[0-9A-Za-z._/^~-]+$/.test(RANGE || '')) {
  console.error('Usage: check-secrets.mjs [--range <base>..<head>]')
  process.exit(2)
}
const DIFF_TARGET = RANGE || '--cached'
const HEAD_REF = RANGE ? RANGE.split('..')[1] : ''

function git(args) {
  try {
    return execSync(`git ${args}`, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 })
  } catch (err) {
    console.error(`Failed to run git ${args}:`, err.message)
    process.exit(2)
  }
}

// Added files that look like data (new .sql/.csv outside the allowlist), and any added or
// changed file over 1 MB.
function scanFiles() {
  const hits = []
  const added = git(`diff ${DIFF_TARGET} --name-only --diff-filter=A --no-color`).split('\n').filter(Boolean)
  for (const file of added) {
    if (/\.(?:sql|csv)$/i.test(file) && !DATA_FILE_ALLOWLIST.some(rx => rx.test(file))) {
      hits.push({ file, line: 0, name: 'New .sql/.csv data file (database exports must never be committed)', masked: '-' })
    }
  }
  const changed = git(`diff ${DIFF_TARGET} --name-only --diff-filter=AM --no-color`).split('\n').filter(Boolean)
  for (const file of changed) {
    if (ALLOWLIST_FILES.some(rx => rx.test(file))) continue
    const size = Number(git(`cat-file -s "${HEAD_REF}:${file.replace(/"/g, '')}"`).trim())
    if (size > MAX_FILE_BYTES) {
      hits.push({ file, line: 0, name: `File over 1 MB (${Math.round(size / 1024)} KB)`, masked: '-' })
    }
  }
  return hits
}

function scan() {
  const diff = git(`diff ${DIFF_TARGET} -U0 --no-color`)
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

const hits = [...scan(), ...scanFiles()]
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
console.error('  3. `git commit --no-verify` skips this hook locally, but the same scan runs in')
console.error('     GitHub Actions on every push and pull request, so the push will still fail.')
console.error('     To bypass for this one commit only: `git commit --no-verify`')
console.error('     (do not normalise this; it leaves us in the position we just')
console.error('     dug ourselves out of.)')
console.error('')
process.exit(1)
