import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const CONFIG_PATH = path.join(__dirname, 'ingestion.config.json')

const DEFAULT_CONFIG = {
  chunkSize: 1000,
  chunkOverlap: 200,
  embeddingModel: 'text-embedding-3-small',
  minTextLength: 100,
  batchSize: 25,
  charBatchSize: 50000,
  ocrProviderPreference: 'gemini',
  translationProviderPreference: 'gemini'
}

export function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const configFile = fs.readFileSync(CONFIG_PATH, 'utf8')
      const userConfig = JSON.parse(configFile)
      return { ...DEFAULT_CONFIG, ...userConfig }
    }
  } catch (error) {
    console.warn(`Warning: Failed to load config file: ${error.message}. Using defaults.`)
  }
  return DEFAULT_CONFIG
}
