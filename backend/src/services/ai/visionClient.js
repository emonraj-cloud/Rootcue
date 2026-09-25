const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const VISION_MODEL = process.env.OLLAMA_VISION_MODEL || 'gemma4:31b-cloud'

const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS) || 120000

export async function generateVisionCompletion(prompt, base64Image) {
  let response
  try {
    response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS),
      body: JSON.stringify({
        model: VISION_MODEL,
        prompt,
        images: [base64Image],
        stream: false
      })
    })
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      throw new Error(
        `Vision model "${VISION_MODEL}" did not respond within ${OLLAMA_TIMEOUT_MS}ms.`
      )
    }
    throw new Error(`Could not reach Ollama at ${OLLAMA_BASE_URL}: ${err.message}`)
  }

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Ollama vision request failed (${response.status}): ${text}`)
  }

  const data = await response.json()
  return data.response
}
