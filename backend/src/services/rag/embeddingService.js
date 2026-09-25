const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
const EMBEDDING_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text'

export async function generateEmbedding(text) {
  const response = await fetch(`${OLLAMA_BASE_URL}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: EMBEDDING_MODEL, prompt: text })
  })

  if (!response.ok) {
    const errText = await response.text()
    throw new Error(`Ollama embeddings request failed (${response.status}): ${errText}`)
  }

  const data = await response.json()
  return data.embedding
}

export function toVectorLiteral(embedding) {
  return `[${embedding.join(',')}]`
}
