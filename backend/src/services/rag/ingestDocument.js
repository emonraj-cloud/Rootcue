import pool from '../../config/database.js'
import { generateEmbedding, toVectorLiteral } from './embeddingService.js'
import { chunkText } from './chunker.js'

export async function ingestDocument({ category, title, content, userId = null }) {
  const docResult = await pool.query(
    'INSERT INTO knowledge_documents (category, title, content, user_id) VALUES ($1, $2, $3, $4) RETURNING id',
    [category, title, content, userId]
  )
  const documentId = docResult.rows[0].id

  const chunks = chunkText(content)

  for (const chunk of chunks) {
    const embedding = await generateEmbedding(chunk)
    const vectorLiteral = toVectorLiteral(embedding)

    await pool.query(
      'INSERT INTO knowledge_chunks (document_id, chunk_text, embedding) VALUES ($1, $2, $3::vector)',
      [documentId, chunk, vectorLiteral]
    )
  }

  return { documentId, chunkCount: chunks.length }
}
