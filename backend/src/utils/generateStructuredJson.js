import { generateCompletion } from '../services/ai/ollamaClient.js'
import { parseAiJson } from './parseAiJson.js'

export async function generateStructuredJson(prompt, maxAttempts = 3) {
  let lastError

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const raw = await generateCompletion(prompt)

    try {
      const parsed = parseAiJson(raw)
      return { parsed, raw }
    } catch (err) {
      lastError = err
      lastError.rawResponse = raw
      console.warn(`AI returned invalid JSON on attempt ${attempt}/${maxAttempts}, retrying...`)
    }
  }

  throw lastError
}
