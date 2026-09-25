import { generateVisionCompletion } from '../services/ai/visionClient.js'
import { parseAiJson } from '../utils/parseAiJson.js'

const STRICTLY_REQUIRED_FIELDS = ['problem', 'rootCause', 'confidence', 'solution']
const LIST_FIELDS_WITH_DEFAULTS = ['evidence', 'steps', 'verification', 'warnings']

function buildPrompt() {
  return `You are an expert IT support engineer looking at a screenshot of a computer showing an error or problem.

Look at the image carefully and identify what IT problem it shows.

Respond with ONLY a single valid JSON object. No markdown, no code fences, no text before or after it. The JSON object must have exactly these fields:

{
  "problem": "describe what you see in the screenshot in one sentence",
  "rootCause": "the most likely root cause",
  "confidence": 0-100,
  "evidence": ["what in the image supports this diagnosis"],
  "solution": "a short summary of the fix",
  "steps": ["step 1", "step 2"],
  "verification": ["how to confirm the fix worked"],
  "warnings": ["anything to be careful about, or an empty array if none"]
}`
}

export async function runVisualAgent(base64Image, maxAttempts = 3) {
  const prompt = buildPrompt()
  let lastError

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const raw = await generateVisionCompletion(prompt, base64Image)

    try {
      const parsed = parseAiJson(raw)

      const missing = STRICTLY_REQUIRED_FIELDS.filter((field) => !(field in parsed))
      if (missing.length > 0) {
        throw new Error(`AI response is missing required fields: ${missing.join(', ')}`)
      }

      for (const field of LIST_FIELDS_WITH_DEFAULTS) {
        if (!(field in parsed) || !Array.isArray(parsed[field])) {
          parsed[field] = []
        }
      }

      return parsed
    } catch (err) {
      lastError = err
      lastError.rawResponse = raw
      console.warn(`Visual agent returned invalid JSON on attempt ${attempt}/${maxAttempts}, retrying...`)
    }
  }

  throw lastError
}
