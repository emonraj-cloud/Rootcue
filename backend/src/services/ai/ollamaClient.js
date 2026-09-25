const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'gemma4:31b-cloud'

// Without a timeout a slow or unreachable model leaves the request
// hanging forever, and the UI sits on "Analyzing" with no feedback.
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS) || 120000

export async function generateCompletion(prompt) {
  let response
  try {
    response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS),
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        prompt,
        stream: false,
        think: false
      })
    })
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      throw new Error(
        `AI model "${OLLAMA_MODEL}" did not respond within ${OLLAMA_TIMEOUT_MS}ms. ` +
          'It may be loading, or the model may be too slow on this machine.'
      )
    }
    throw new Error(`Could not reach Ollama at ${OLLAMA_BASE_URL}: ${err.message}`)
  }

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Ollama request failed (${response.status}): ${text}`)
  }

  const data = await response.json()
  return data.response
}
