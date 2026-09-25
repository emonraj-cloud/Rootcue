import express from 'express'
import pool from '../config/database.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/', protect, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM conversations WHERE workspace_id = $1 ORDER BY updated_at DESC',
      [req.user.workspace_id || null]
    )
    res.json({ success: true, conversations: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch conversations' })
  }
})

router.get('/:id', protect, async (req, res) => {
  try {
    const convResult = await pool.query(
      'SELECT * FROM conversations WHERE id = $1 AND workspace_id = $2',
      [req.params.id, req.user.workspace_id || null]
    )
    if (convResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Conversation not found' })

    const msgResult = await pool.query(
      'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [req.params.id]
    )
    res.json({
      success: true,
      conversation: convResult.rows[0],
      messages: msgResult.rows
    })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch conversation' })
  }
})

router.post('/', protect, async (req, res) => {
  try {
    const { agent_id, name } = req.body
    const result = await pool.query(
      `INSERT INTO conversations (workspace_id, agent_id, user_id, name, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'active', NOW(), NOW()) RETURNING *`,
      [req.user.workspace_id || null, agent_id, req.user.userId, name]
    )
    res.status(201).json({ success: true, conversation: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create conversation' })
  }
})

router.post('/:id/messages', protect, async (req, res) => {
  try {
    const { role, content, tool_calls, tool_call_id } = req.body
    const result = await pool.query(
      `INSERT INTO messages (conversation_id, role, content, tool_calls, tool_call_id, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
      [req.params.id, role, content, tool_calls, tool_call_id]
    )
    await pool.query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [req.params.id])
    res.status(201).json({ success: true, message: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to send message' })
  }
})

export default router
