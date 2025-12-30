// Detect language of text using GPT
export async function detectLanguage(text, openai) {
  // Take a sample of text for detection
  const sample = text.slice(0, 500)

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a language detector. Respond with ONLY the ISO 639-1 language code (e.g., "en", "de", "fr", "es", "it", "nl", "pl", "cs", "sk"). Nothing else.'
        },
        {
          role: 'user',
          content: `Detect the language of this text:

${sample}`
        }
      ],
      max_tokens: 10,
      temperature: 0
    })

    const lang = response.choices[0].message.content.trim().toLowerCase()
    return lang.slice(0, 2) // Ensure we only get 2-char code
  } catch (err) {
    console.log(`  Warning: Language detection failed - ${err.message}`)
    return 'en' // Default to English
  }
}

// Translate text to English using GPT
export async function translateToEnglish(text, sourceLanguage, openai) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a professional translator. Translate the following text from ${sourceLanguage} to British English. Preserve all technical beekeeping terminology. Maintain paragraph structure. Output ONLY the translation, nothing else.`
        },
        {
          role: 'user',
          content: text
        }
      ],
      max_tokens: 4000,
      temperature: 0.3
    })

    return response.choices[0].message.content.trim()
  } catch (err) {
    console.log(`  Warning: Translation failed - ${err.message}`)
    return text // Return original if translation fails
  }
}

// Translate chunks in batches using OpenAI
export async function translateChunks(chunks, sourceLanguage, openai) {
  console.log(`  Translating ${chunks.length} chunks from ${sourceLanguage} to British English...`)
  const translatedChunks = []

  for (let i = 0; i < chunks.length; i++) {
    const translated = await translateToEnglish(chunks[i], sourceLanguage, openai)
    translatedChunks.push(translated)

    if ((i + 1) % 10 === 0) {
      process.stdout.write(`  Translation progress: ${i + 1}/${chunks.length}\r`)
    }
  }

  console.log(`  Translation complete: ${translatedChunks.length} chunks`)
  return translatedChunks
}

// Translate full text using Gemini (before chunking, preserves context)
export async function translateFullText(text, sourceLanguage, geminiModel, charBatchSize = 50000) {
  if (!geminiModel) {
    throw new Error('Gemini not configured')
  }

  console.log(`  ⚡ Translating full text with Gemini (${sourceLanguage} -> en-GB)...`)

  if (text.length <= charBatchSize) {
    // Single pass for shorter texts
    const prompt = `You are a professional translator specializing in beekeeping literature.

Translate the following text from ${sourceLanguage} to British English.
- Preserve all technical beekeeping terminology
- Maintain paragraph structure
- Output ONLY the translation, nothing else.

Text to translate:
${text}`

    try {
      const result = await geminiModel.generateContent(prompt)
      return result.response.text().trim()
    } catch (err) {
      throw new Error(`Gemini translation failed: ${err.message}`)
    }
  }

  // Batch translation for long texts
  console.log(`  Text is ${text.length} chars, translating in batches...`)
  const translatedParts = []
  let start = 0

  while (start < text.length) {
    let end = Math.min(start + charBatchSize, text.length)

    // Try to break at paragraph boundary
    if (end < text.length) {
      const lastParagraph = text.lastIndexOf('\n\n', end)
      if (lastParagraph > start + charBatchSize * 0.5) {
        end = lastParagraph + 2
      }
    }

    const chunk = text.slice(start, end)
    const batchNum = translatedParts.length + 1

    const prompt = `You are a professional translator specializing in beekeeping literature.

Translate this text from ${sourceLanguage} to British English.
- Preserve all technical beekeeping terminology
- Maintain paragraph structure
- Output ONLY the translation, nothing else.

Text:
${chunk}`

    try {
      const result = await geminiModel.generateContent(prompt)
      translatedParts.push(result.response.text().trim())
      process.stdout.write(`  Translation batch ${batchNum} complete\r`)
    } catch (err) {
      console.log(`  Warning: Translation batch ${batchNum} failed: ${err.message}`)
      translatedParts.push(chunk) // Keep original if translation fails
    }

    start = end
  }

  console.log(`  Translation complete: ${translatedParts.length} batches`)
  return translatedParts.join('\n\n')
}
