import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { openai as getOpenAI } from '@/lib/openai'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

const MAX_AUDIO_BYTES = 25 * 1024 * 1024

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

    const now = new Date()
    const expiresAt = profile.subscription_expires_at ? new Date(profile.subscription_expires_at) : null
    const hasActiveSubscription = expiresAt && expiresAt > now
    if (!hasActiveSubscription) {
      return NextResponse.json(
        { error: 'Premium subscription required', code: 'SUBSCRIPTION_REQUIRED' },
        { status: 403 }
      )
    }

    const formData = await request.formData()
    const audio = formData.get('audio')
    if (!(audio instanceof File) || audio.size === 0) {
      return NextResponse.json({ error: 'Missing or empty audio file' }, { status: 400 })
    }
    if (audio.size > MAX_AUDIO_BYTES) {
      return NextResponse.json({ error: 'Audio exceeds 25MB limit' }, { status: 400 })
    }

    const client = getOpenAI()

    let transcript: string
    try {
      const whisperResult = await client.audio.transcriptions.create({
        model: 'gpt-4o-transcribe',
        file: audio,
        language: 'en',
        prompt: APICULTURE_PROMPT
      })
      transcript = (whisperResult.text || '').trim()
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

    let cleaned = transcript
    try {
      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: CLEANUP_SYSTEM_PROMPT },
          { role: 'user', content: transcript }
        ],
        temperature: 0.2,
        max_tokens: 600
      })
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
