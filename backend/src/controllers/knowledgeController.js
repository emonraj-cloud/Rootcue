import pool from '../config/database.js'
import { ingestDocument } from '../services/rag/ingestDocument.js'
import { retrieveRelevantChunks } from '../services/rag/retrieve.js'
import { chunkText } from '../services/rag/chunker.js'

export async function createKnowledgeDocument(req, res) {
  try {
    const { category, title, content } = req.body

    if (!category || !title || !content) {
      return res.status(400).json({ success: false, message: 'category, title and content are required' })
    }

    // Documents are owned by the user who uploads them.
    const result = await ingestDocument({ category, title, content, userId: req.user.id })
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
    // Users see their own documents plus shared ones (no owner).
    const result = await pool.query(
      'SELECT id, category, title, user_id, created_at FROM knowledge_documents WHERE user_id = $1 OR user_id IS NULL ORDER BY created_at DESC',
      [req.user.id]
    )
    res.json({ success: true, documents: result.rows })
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


const MAX_CHUNKS_PER_UPLOAD = 500

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
    const { query } = req.body

    if (!query) {
      return res.status(400).json({ success: false, message: 'query is required' })
    }

    // Search is scoped to this user's documents plus shared ones.
    const results = await retrieveRelevantChunks(query, 3, req.user.id)
    res.json({ success: true, results })
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
