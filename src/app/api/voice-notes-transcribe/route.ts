import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { openai as getOpenAI } from '@/lib/openai'

// Fail-fast at module init so a missing env surfaces at deploy time, not in a
// per-request 500 with a misleading `voice-notes-transcribe error` log line.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    'voice-notes-transcribe: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set.'
  )
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const MAX_AUDIO_BYTES = 25 * 1024 * 1024
const TRANSCRIPTION_TIMEOUT_MS = 60_000
const CLEANUP_TIMEOUT_MS = 30_000

// Apiculture vocabulary bias passed as the Whisper / gpt-4o-transcribe `prompt`.
// Kept under ~200 tokens (cap is 224) and ordered most-distinctive-first so it
// survives any silent truncation by the API.
const APICULTURE_PROMPT =
  'Beekeeping inspection note. Common vocabulary: varroa, Varroa destructor, ' +
  'propolis, queen excluder, brood box, super, supers, supersedure, ' +
  'drone laying, laying worker, foulbrood, AFB, EFB, Nosema, chalkbrood, ' +
  'sacbrood, deformed wing virus, uncapping, smoker, hive tool, mating nuc, ' +
  'graft, grafting, Jenter, Cupkit, Cloake board, oxalic acid, formic acid, ' +
  'Apiguard, Apivar, sealed brood, open brood, capped brood, eggs, larvae, ' +
  'queen cells, swarm cells, supersedure cells, apiary, eircode, ' +
  'Buckfast, Carniolan, Italian, Native Irish black bee, NIHBS.'

// Whisper / gpt-4o-transcribe silently truncate the `prompt` parameter at
// ~224 tokens. A char/4 heuristic is a safe lower bound; warn at boot if our
// prompt approaches the cap so the next contributor sees it without needing
// to discover the silent truncation in production.
if (APICULTURE_PROMPT.length / 4 > 200) {
  console.warn(
    `voice-notes-transcribe: APICULTURE_PROMPT is ~${Math.ceil(APICULTURE_PROMPT.length / 4)} tokens; ` +
    'the transcription API caps `prompt` at ~224 tokens and silently truncates. Trim the vocabulary.'
  )
}

const CLEANUP_SYSTEM_PROMPT = `You are cleaning up dictated beekeeping notes for a field inspection record.
Keep the meaning and every detail the speaker mentioned.
Fix punctuation, capitalisation, and grammar.
Remove filler words such as "um", "uh", "like", "you know", and false starts.
Do not add information, interpretation, or headings that were not spoken.
Use British English spelling and phrasing.

Correct misheard beekeeping terminology where the speaker's intent is clear, e.g.:
  "borrow a" / "boroughs" / "barrow"      -> "varroa"
  "proper list" / "propers"               -> "propolis"
  "super seed" / "super seeded"           -> "supersede" / "supersedure"
  "drone lying"                           -> "drone laying"
  "fowl brood" / "fall brood"             -> "foulbrood"
  "a f b" / "e f b"                       -> "AFB" / "EFB"
  "no Sema" / "no see ma"                 -> "Nosema"
  "chalk brewed"                          -> "chalkbrood"
  "queen sell" / "queen sells"            -> "queen cell" / "queen cells"
  "broad box" / "brewed box"              -> "brood box"
  "ock zalic" / "ox alec"                 -> "oxalic"
  "appy guard" / "appy var"               -> "Apiguard" / "Apivar"
  "buck fast"                             -> "Buckfast"
  "ny bs" / "nibs"                        -> "NIHBS"
Never invent a correction if the spoken word is unclear -- leave it as the speaker said it.
Return only the cleaned note text with no preamble, quotes, or labels.`

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing authorization header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid authentication' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('subscription_expires_at, is_active')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Soft-deleted / admin-disabled accounts must lose access even if their
    // subscription clock has not yet run out. Mirrors src/lib/auth.ts.
    if (profile.is_active === false) {
      return NextResponse.json(
        { error: 'Account is not active', code: 'ACCOUNT_INACTIVE' },
        { status: 403 }
      )
    }

    const now = new Date()
    const expiresAt = profile.subscription_expires_at ? new Date(profile.subscription_expires_at) : null
    const hasActiveSubscription = expiresAt && !Number.isNaN(expiresAt.getTime()) && expiresAt > now
    if (!hasActiveSubscription) {
      return NextResponse.json(
        { error: 'Premium subscription required', code: 'SUBSCRIPTION_REQUIRED' },
        { status: 403 }
      )
    }

    // Parse multipart body separately so a malformed payload returns 400
    // rather than being swallowed by the outer catch as a generic 500.
    let audio: File
    try {
      const formData = await request.formData()
      const raw = formData.get('audio')
      if (!(raw instanceof File) || raw.size === 0) {
        return NextResponse.json({ error: 'Missing or empty audio file' }, { status: 400 })
      }
      if (raw.size > MAX_AUDIO_BYTES) {
        return NextResponse.json({ error: 'Audio exceeds 25MB limit' }, { status: 400 })
      }
      audio = raw
    } catch (err) {
      console.error('voice-notes-transcribe: malformed multipart body:', err)
      return NextResponse.json({ error: 'Malformed request body' }, { status: 400 })
    }

    const client = getOpenAI()

    let transcript: string
    try {
      const result = await client.audio.transcriptions.create(
        {
          model: 'gpt-4o-transcribe',
          file: audio,
          language: 'en',
          prompt: APICULTURE_PROMPT
        },
        { timeout: TRANSCRIPTION_TIMEOUT_MS, maxRetries: 1 }
      )
      transcript = (result.text || '').trim()
    } catch (err) {
      console.error('Audio transcription failed:', err)
      return NextResponse.json(
        { error: 'Transcription failed', code: 'OPENAI_ERROR' },
        { status: 502 }
      )
    }

    if (!transcript) {
      return NextResponse.json({ transcript: '', cleaned: '' })
    }

    // Scale the cleanup output cap to the actual transcript length so a long
    // dictation is not silently truncated, while keeping a hard ceiling so a
    // runaway model cannot produce unbounded text.
    const approxTranscriptTokens = Math.ceil(transcript.length / 4)
    const cleanupMaxTokens = Math.min(2000, Math.max(200, approxTranscriptTokens + 100))

    let cleaned = transcript
    try {
      const completion = await client.chat.completions.create(
        {
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: CLEANUP_SYSTEM_PROMPT },
            { role: 'user', content: transcript }
          ],
          temperature: 0.2,
          max_tokens: cleanupMaxTokens
        },
        { timeout: CLEANUP_TIMEOUT_MS, maxRetries: 1 }
      )
      const output = completion.choices?.[0]?.message?.content?.trim()
      if (output) {
        cleaned = output
      }
    } catch (err) {
      console.error('GPT clean-up failed, falling back to raw transcript:', err)
    }

    return NextResponse.json({ transcript, cleaned })
  } catch (err) {
    console.error('voice-notes-transcribe error:', err)
    return NextResponse.json({ error: 'Unexpected server error' }, { status: 500 })
  }
}
