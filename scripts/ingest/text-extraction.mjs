import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

let pdfParse = null
let pdfToImg = null

// Initialize services
export async function initializeExtractionServices(openaiApiKey, googleApiKey) {
    if (!openaiApiKey) {
        // Warning is handled by main script / user check
    }
    
    // Dynamically import libraries
    if (!pdfParse) pdfParse = (await import('pdf-parse')).default
    if (!pdfToImg) {
        const module = await import('pdf-to-img')
        pdfToImg = module.pdf
    }

    const services = {
        openai: new OpenAI({ apiKey: openaiApiKey }),
        geminiModel: null
    }

    if (googleApiKey) {
        const genAI = new GoogleGenerativeAI(googleApiKey)
        services.geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    }

    return services
}

// Extract text using standard pdf-parse
export async function extractTextStandard(buffer) {
    const pdfData = await pdfParse(buffer)
    return pdfData.text?.trim() || ''
}

// Extract text using OpenAI Vision OCR
export async function extractTextWithOCR(buffer, openai) {
    console.log('  Using OCR (OpenAI Vision API)...')

    const document = await pdfToImg(buffer, { scale: 2.0 })
    const totalPages = document.length

    console.log(`  PDF has ${totalPages} pages`)

    const allText = []

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        try {
            const imageBuffer = await document.getPage(pageNum)
            const base64Image = imageBuffer.toString('base64')

            const response = await openai.chat.completions.create({
                model: 'gpt-4o',
                messages: [
                    {
                        role: 'user',
                        content: [
                            {
                                type: 'text',
                                text: 'Extract ALL text from this page. Preserve paragraph structure. Output only the extracted text, nothing else.'
                            },
                            {
                                type: 'image_url',
                                image_url: {
                                    url: `data:image/png;base64,${base64Image}`,
                                    detail: 'high'
                                }
                            }
                        ]
                    }
                ],
                max_tokens: 4000
            })

            const pageText = response.choices[0].message.content
            allText.push(pageText)
            process.stdout.write(`  OCR progress: ${pageNum}/${totalPages} pages\r`)
        } catch (err) {
            console.log(`\n  Warning: OCR failed for page ${pageNum}: ${err.message}`)
        }
    }

    console.log(`\n  OCR complete: ${allText.length} pages processed`)
    return allText.join('\n\n')
}

// Extract text using Gemini Batched OCR
export async function extractWithGeminiBatched(buffer, geminiModel, batchSize = 25) {
    if (!geminiModel) {
        throw new Error('Gemini not configured')
    }

    console.log('  ⚡ Using Gemini 2.0 Flash for OCR (text extraction only)...')

    const document = await pdfToImg(buffer, { scale: 2.0 })
    const totalPages = document.length

    console.log(`  PDF has ${totalPages} pages, processing in batches of ${batchSize}`)

    const allText = []
    const totalBatches = Math.ceil(totalPages / batchSize)

    for (let batchNum = 0; batchNum < totalBatches; batchNum++) {
        const startPage = batchNum * batchSize + 1
        const endPage = Math.min((batchNum + 1) * batchSize, totalPages)

        console.log(`  Processing batch ${batchNum + 1}/${totalBatches} (pages ${startPage}-${endPage})...`)

        const batchImages = []
        for (let pageNum = startPage; pageNum <= endPage; pageNum++) {
            const imageBuffer = await document.getPage(pageNum)
            batchImages.push({
                inlineData: {
                    data: imageBuffer.toString('base64'),
                    mimeType: 'image/png'
                }
            })
        }

        const prompt = `You are a professional OCR (Optical Character Recognition) engine.

INSTRUCTIONS:
1. Extract ALL text from these ${batchImages.length} page images in reading order.
2. Preserve the ORIGINAL language - do NOT translate anything.
3. Preserve paragraph structure and flow.
4. Output ONLY the extracted text. No markdown, no commentary.

Extract the text exactly as written in the document.`

        try {
            const result = await geminiModel.generateContent([prompt, ...batchImages])
            const batchText = result.response.text().trim()
            allText.push(batchText)
        } catch (err) {
            console.log(`  Warning: Gemini batch ${batchNum + 1} failed: ${err.message}`)
        }
    }

    console.log(`  Gemini OCR complete: ${allText.length}/${totalBatches} batches processed`)
    return allText.join('\n\n')
}
