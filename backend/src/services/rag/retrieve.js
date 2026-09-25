import pool from '../../config/database.js'
import { generateEmbedding, toVectorLiteral } from './embeddingService.js'

export async function retrieveRelevantChunks(query, topK = 3, userId = null) {
  const embedding = await generateEmbedding(query)
  const vectorLiteral = toVectorLiteral(embedding)

  // User scoping: a user sees their own documents plus shared ones
  // (documents with no owner). When userId is null (e.g. internal
  // calls without a user context) only shared documents are searched.
  const params = [vectorLiteral, topK]
  let userFilter = ''
  if (userId) {
    params.push(userId)
    userFilter = 'WHERE kd.user_id = $3 OR kd.user_id IS NULL'
  }

  const result = await pool.query(
    `SELECT kc.id, kc.chunk_text, kd.title, kd.category, kc.embedding <=> $1::vector AS distance
     FROM knowledge_chunks kc
     JOIN knowledge_documents kd ON kd.id = kc.document_id
     ${userFilter}
     ORDER BY distance ASC
     LIMIT $2`,
    params
  )

  return result.rows
}

// ------------------------------------------------------------
// RAG context builder for diagnosis agents.
//   - Formats retrieved chunks into a prompt-ready text block
//   - Returns { text, sources } so the UI can show what was used
//   - NEVER throws: if the knowledge base, database, or Ollama
//     is unavailable, diagnosis still works (just without RAG)
//   - Hard 4 second timeout so diagnoses never hang on RAG
// ------------------------------------------------------------
const CHUNK_PREVIEW_LIMIT = 800
const RAG_TIMEOUT_MS = 4000

export function formatKnowledgeChunks(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return { text: '', sources: [] }
  }

  const blocks = []
  const sources = []

  rows.forEach((row) => {
    const chunk = (row.chunk_text || '').trim()
    if (!chunk) return

    const title = row.title || 'Untitled document'
    const category = row.category || 'general'

    blocks.push(`[${blocks.length + 1}] (from "${title}" - ${category})\n${chunk.slice(0, CHUNK_PREVIEW_LIMIT)}`)
    sources.push({ title, category })
  })

  if (blocks.length === 0) {
    return { text: '', sources: [] }
  }

  return { text: blocks.join('\n---\n'), sources }
}

export async function getKnowledgeContextForProblem(query, topK = 3, userId = null) {
  let timeoutHandle
  try {
    const rows = await Promise.race([
      retrieveRelevantChunks(query, topK, userId),
      new Promise((_, reject) => {
        timeoutHandle = setTimeout(
          () => reject(new Error('Knowledge lookup timed out')),
          RAG_TIMEOUT_MS
        )
      })
    ])
    clearTimeout(timeoutHandle)
    return formatKnowledgeChunks(rows)
  } catch (err) {
    clearTimeout(timeoutHandle)
    console.warn('Knowledge context unavailable, continuing diagnosis without RAG:', err.message)
    return { text: '', sources: [] }
  }
}
