const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen3.5:0.8b'

export async function generateCompletion(prompt) {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      think: false
    })
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Ollama request failed (${response.status}): ${text}`)
  }

  const data = await response.json()
  return data.response
}
