import pool from '../config/database.js'
import { ingestDocument } from '../services/rag/ingestDocument.js'
import { retrieveRelevantChunks } from '../services/rag/retrieve.js'
import { chunkText } from '../services/rag/chunker.js'
import { generateEmbedding, toVectorLiteral } from '../services/rag/embeddingService.js'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const MAX_CATEGORY = 100
const MAX_TITLE = 255
const MAX_CONTENT = 400_000
const MAX_CHUNKS_PER_UPLOAD = 500

function isValidUuid(value) {
  return typeof value === 'string' && UUID_RE.test(value)
}

// `if (!category)` accepted a whitespace-only string, so a document could be
// stored with a category that rendered as blank and could never be filtered for.
function clean(req, res) {
  const category = typeof req.body?.category === 'string' ? req.body.category.trim() : ''
  const title = typeof req.body?.title === 'string' ? req.body.title.trim() : ''
  const content = typeof req.body?.content === 'string' ? req.body.content : ''

  if (!category) {
    res.status(400).json({ success: false, message: 'category is required' })
    return null
  }
  if (category.length > MAX_CATEGORY) {
    res.status(400).json({ success: false, message: `Category is limited to ${MAX_CATEGORY} characters` })
    return null
  }
  if (!title) {
    res.status(400).json({ success: false, message: 'title is required' })
    return null
  }
  if (title.length > MAX_TITLE) {
    res.status(400).json({ success: false, message: `Title is limited to ${MAX_TITLE} characters` })
    return null
  }
  if (!content.trim()) {
    res.status(400).json({ success: false, message: 'content is required' })
    return null
  }
  if (content.length > MAX_CONTENT) {
    res.status(400).json({
      success: false,
      message: `Content is ${content.length} characters. The maximum is ${MAX_CONTENT}.`
    })
    return null
  }

  return { category, title, content }
}

export async function createKnowledgeDocument(req, res) {
  try {
    const clean_ = clean(req, res)
    if (!clean_) return

    // Documents are owned by the user who uploads them.
    const result = await ingestDocument({ ...clean_, userId: req.user.id })
    res.status(201).json({ success: true, ...result })
  } catch (err) {
    console.error('Knowledge ingest error:', err.message)

    if (err && err.code === '42703') {
      return res.status(500).json({
        success: false,
        message: 'Database is missing a required column. Please run the database migration first: cd backend && npm run migrate'
      })
    }

    res.status(500).json({ success: false, message: 'Something went wrong while ingesting the document' })
  }
}

export async function listKnowledgeDocuments(req, res) {
  try {
    // Users see their own documents plus shared ones (no owner). The chunk
    // count and size were missing, so two documents with the same title were
    // indistinguishable and there was no sign of whether a document had
    // actually been embedded.
    const result = await pool.query(
      `SELECT kd.id, kd.category, kd.title, kd.user_id, kd.created_at,
              LENGTH(kd.content) AS content_length,
              COUNT(kc.id)::int AS chunk_count
       FROM knowledge_documents kd
       LEFT JOIN knowledge_chunks kc ON kc.document_id = kd.id
       WHERE kd.user_id = $1 OR kd.user_id IS NULL
       GROUP BY kd.id
       ORDER BY kd.created_at DESC`,
      [req.user.id]
    )

    // One place to see whether the knowledge base is doing anything at all.
    const stats = await pool.query(
      `SELECT COUNT(DISTINCT kd.id)::int AS documents,
              COUNT(kc.id)::int AS chunks,
              COUNT(DISTINCT kd.category)::int AS categories
       FROM knowledge_documents kd
       LEFT JOIN knowledge_chunks kc ON kc.document_id = kd.id
       WHERE kd.user_id = $1 OR kd.user_id IS NULL`,
      [req.user.id]
    )

    const categories = await pool.query(
      `SELECT category, COUNT(*)::int AS count
       FROM knowledge_documents
       WHERE user_id = $1 OR user_id IS NULL
       GROUP BY category
       ORDER BY count DESC, category ASC`,
      [req.user.id]
    )

    res.json({
      success: true,
      documents: result.rows,
      stats: stats.rows[0],
      categories: categories.rows
    })
  } catch (err) {
    console.error('List knowledge error:', err.message)

    if (err && err.code === '42703') {
      return res.status(500).json({
        success: false,
        message: 'Database is missing a required column. Please run the database migration first: cd backend && npm run migrate'
      })
    }

    res.status(500).json({ success: false, message: 'Something went wrong while fetching documents' })
  }
}

export async function getKnowledgeDocument(req, res) {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Document id is not a valid id' })
    }

    // Own documents plus shared ones, matching what search is allowed to return.
    const result = await pool.query(
      'SELECT id, category, title, content, user_id, created_at FROM knowledge_documents WHERE id = $1 AND (user_id = $2 OR user_id IS NULL)',
      [req.params.id, req.user.id]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Document not found' })
    }
    res.json({ success: true, document: result.rows[0] })
  } catch (err) {
    console.error('Get knowledge document error:', err.message)
    res.status(500).json({ success: false, message: 'Something went wrong while fetching the document' })
  }
}

// There was no way to remove a document. A wrong or outdated one then kept
// being retrieved and injected into every future diagnosis, with no escape.
export async function deleteKnowledgeDocument(req, res) {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Document id is not a valid id' })
    }

    // Shared documents have no owner and must not be deletable by a user.
    const owned = await pool.query(
      'SELECT id, title FROM knowledge_documents WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )
    if (owned.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Document not found' })
    }

    // knowledge_chunks is ON DELETE CASCADE, so the embeddings go with it and
    // stop matching searches.
    const chunks = await pool.query(
      'SELECT COUNT(*)::int AS count FROM knowledge_chunks WHERE document_id = $1',
      [req.params.id]
    )

    await pool.query('DELETE FROM knowledge_documents WHERE id = $1 AND user_id = $2', [
      req.params.id,
      req.user.id
    ])

    res.json({ success: true, id: req.params.id, chunksRemoved: chunks.rows[0].count })
  } catch (err) {
    console.error('Delete knowledge document error:', err.message)
    res.status(500).json({ success: false, message: 'Something went wrong while deleting the document' })
  }
}

// Editing re-embeds from scratch rather than trying to patch individual
// chunks: an ivfflat index over half-updated vectors returns nonsense.
// The document row is updated in place and only the chunks are replaced.
// Deleting and re-inserting the document instead would mint a new id, which
// left the old id returning 404 and left the UI pointing at nothing.
export async function updateKnowledgeDocument(req, res) {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Document id is not a valid id' })
    }

    const owned = await pool.query(
      'SELECT id FROM knowledge_documents WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    )
    if (owned.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Document not found' })
    }

    const clean_ = clean(req, res)
    if (!clean_) return

    const chunker = chunkText(clean_.content)
    const truncated = chunker.length > MAX_CHUNKS_PER_UPLOAD
    const chunks = truncated ? chunker.slice(0, MAX_CHUNKS_PER_UPLOAD) : chunker

    await pool.query('DELETE FROM knowledge_chunks WHERE document_id = $1', [req.params.id])
    await pool.query(
      'UPDATE knowledge_documents SET category = $1, title = $2, content = $3 WHERE id = $4 AND user_id = $5',
      [clean_.category, clean_.title, clean_.content, req.params.id, req.user.id]
    )

    for (const chunk of chunks) {
      const embedding = await generateEmbedding(chunk)
      await pool.query(
        'INSERT INTO knowledge_chunks (document_id, chunk_text, embedding) VALUES ($1, $2, $3::vector)',
        [req.params.id, chunk, toVectorLiteral(embedding)]
      )
    }

    res.json({
      success: true,
      id: req.params.id,
      documentId: req.params.id,
      chunkCount: chunks.length,
      truncated
    })
  } catch (err) {
    console.error('Update knowledge document error:', err.message)
    res.status(500).json({ success: false, message: 'Something went wrong while updating the document' })
  }
}


export async function uploadKnowledgeFile(req, res) {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'A text/code file is required' })
    }

    let content = req.file.buffer.toString('utf8').replace(/\0/g, '').trim()

    if (!content) {
      return res.status(400).json({ success: false, message: 'The uploaded file is empty' })
    }

    const originalName = req.file.originalname || 'uploaded-file'
    const title = (req.body?.title || originalName).trim() || originalName
    const category = (req.body?.category || 'uploaded').trim() || 'uploaded'

    const chunks = chunkText(content)
    const truncated = chunks.length > MAX_CHUNKS_PER_UPLOAD
    const contentForIngest = truncated
      ? chunks.slice(0, MAX_CHUNKS_PER_UPLOAD).join(' ')
      : content

    const result = await ingestDocument({
      category,
      title,
      content: contentForIngest,
      userId: req.user.id
    })

    res.status(201).json({
      success: true,
      ...result,
      truncated,
      originalName
    })
  } catch (err) {
    console.error('Knowledge file upload error:', err.message)

    if (err && err.code === '42703') {
      return res.status(500).json({
        success: false,
        message: 'Database is missing a required column. Please run the database migration first: cd backend && npm run migrate'
      })
    }

    res.status(500).json({ success: false, message: 'Something went wrong while uploading the knowledge file' })
  }
}

export async function searchKnowledge(req, res) {
  try {
    const rawQuery = typeof req.body?.query === 'string' ? req.body.query.trim() : ''

    if (!rawQuery) {
      return res.status(400).json({ success: false, message: 'query is required' })
    }

    // The limit was hardcoded to 3 with no way to widen it, and the returned
    // cosine distance was discarded, so the UI could not tell a close match
    // from a barely related one.
    const limit = Math.min(Math.max(Number.parseInt(req.body?.limit, 10) || 5, 1), 25)

    // Search is scoped to this user's documents plus shared ones.
    const results = await retrieveRelevantChunks(rawQuery, limit, req.user.id)

    // Cosine distance is 0 for identical and 1 for opposite. Report a
    // percentage so a weak match does not read as a confident one.
    const withScores = results.map((row) => ({
      ...row,
      distance: Number(row.distance),
      relevance: Math.max(0, Math.min(100, Math.round((1 - Number(row.distance)) * 100)))
    }))

    res.json({ success: true, results: withScores, query: rawQuery })
  } catch (err) {
    console.error('Knowledge search error:', err.message)

    if (err && err.code === '42703') {
      return res.status(500).json({
        success: false,
        message: 'Database is missing a required column. Please run the database migration first: cd backend && npm run migrate'
      })
    }

    res.status(500).json({ success: false, message: 'Something went wrong while searching the knowledge base' })
  }
}
