const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const VISION_MODEL = process.env.OLLAMA_VISION_MODEL || 'llava:latest'

export async function generateVisionCompletion(prompt, base64Image) {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: VISION_MODEL,
      prompt,
      images: [base64Image],
      stream: false
    })
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Ollama vision request failed (${response.status}): ${text}`)
  }

  const data = await response.json()
  return data.response
}
