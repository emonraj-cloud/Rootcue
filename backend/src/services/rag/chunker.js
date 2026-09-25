export function chunkText(text, maxWordsPerChunk = 150) {
  const words = text.split(/\s+/).filter(Boolean)
  const chunks = []

  for (let i = 0; i < words.length; i += maxWordsPerChunk) {
    chunks.push(words.slice(i, i + maxWordsPerChunk).join(' '))
  }

  return chunks
}
