import express from 'express'
import pool from '../config/database.js'
import { protect } from '../middleware/authMiddleware.js'
import { runOrchestrator } from '../agents/orchestrator.js'
import { recordAudit } from '../services/auditLogger.js'

const router = express.Router()

// The list used to SELECT *, which shipped every JSONB column and no agent
// name, and the client then read `title` when the column is called `name`.
// The list now states exactly what the page renders, and counts the messages
// so a transcript can be summarised without loading every one of them.
router.get('/', protect, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         c.id,
         c.name,
         c.status,
         c.metadata,
         c.agent_id AS "agentId",
         a.name AS "agentName",
         a.agent_type AS "agentType",
         c.user_id AS "userId",
         u.name AS "userName",
         COUNT(m.id)::int AS "messageCount",
         MAX(m.created_at) AS "lastMessageAt",
         c.created_at AS "createdAt",
         c.updated_at AS "updatedAt"
       FROM conversations c
       LEFT JOIN agents a ON a.id = c.agent_id
       LEFT JOIN users u ON u.id = c.user_id
       LEFT JOIN messages m ON m.conversation_id = c.id
       WHERE c.workspace_id = $1
       GROUP BY c.id, a.name, a.agent_type, u.name
       ORDER BY COALESCE(MAX(m.created_at), c.updated_at) DESC`,
      [req.user.workspace_id || null]
    )
    res.json({ success: true, conversations: result.rows })
  } catch (err) {
    console.error('Conversations list error:', err.message)
    res.status(500).json({ success: false, message: 'Failed to fetch conversations' })
  }
})

router.get('/:id', protect, async (req, res) => {
  try {
    const convResult = await pool.query(
      `SELECT
         c.id,
         c.name,
         c.status,
         c.metadata,
         c.agent_id AS "agentId",
         a.name AS "agentName",
         c.user_id AS "userId",
         c.created_at AS "createdAt",
         c.updated_at AS "updatedAt"
       FROM conversations c
       LEFT JOIN agents a ON a.id = c.agent_id
       WHERE c.id = $1 AND c.workspace_id = $2`,
      [req.params.id, req.user.workspace_id || null]
    )
    if (convResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Conversation not found' })
    }

    const msgResult = await pool.query(
      `SELECT
         id,
         role,
         content,
         tool_calls AS "toolCalls",
         tool_call_id AS "toolCallId",
         created_at AS "createdAt"
       FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at ASC`,
      [req.params.id]
    )

    res.json({ success: true, conversation: convResult.rows[0], messages: msgResult.rows })
  } catch (err) {
    console.error('Conversation detail error:', err.message)
    res.status(500).json({ success: false, message: 'Failed to fetch conversation' })
  }
})

router.post('/', protect, async (req, res) => {
  const { agent_id: agentId, name } = req.body || {}

  if (!agentId) {
    return res.status(400).json({ success: false, message: 'An agent is required' })
  }

  try {
    // agent_id is NOT NULL and references agents(id), and the table is
    // workspace-scoped, so check it here rather than letting the insert fail
    // with a foreign key error the user cannot act on.
    const agent = await pool.query(
      'SELECT id FROM agents WHERE id = $1 AND workspace_id = $2',
      [agentId, req.user.workspace_id || null]
    )
    if (agent.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'That agent does not exist in this workspace' })
    }

    const result = await pool.query(
      `INSERT INTO conversations (workspace_id, agent_id, user_id, name, status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, 'active', NOW(), NOW())
       RETURNING id, name, status, agent_id AS "agentId", user_id AS "userId",
                 created_at AS "createdAt", updated_at AS "updatedAt"`,
      [req.user.workspace_id || null, agentId, req.user.userId, (name || '').trim() || 'New conversation']
    )

    res.status(201).json({ success: true, conversation: result.rows[0] })
    recordAudit(req, {
      action: 'create',
      resourceType: 'conversation',
      resourceId: result.rows[0].id,
      details: { name: result.rows[0].name, agentId }
    })
  } catch (err) {
    console.error('Conversation create error:', err.message)
    res.status(500).json({ success: false, message: 'Failed to create conversation' })
  }
})

// Sends a turn: stores the user message, asks the orchestrator, stores the
// reply. Storing the user message first means a failed model call still keeps
// what the user typed instead of dropping the whole turn.
router.post('/:id/messages', protect, async (req, res) => {
  const { content } = req.body || {}

  if (!content || !String(content).trim()) {
    return res.status(400).json({ success: false, message: 'A message is required' })
  }

  let conversationId
  try {
    const conv = await pool.query(
      'SELECT id FROM conversations WHERE id = $1 AND workspace_id = $2',
      [req.params.id, req.user.workspace_id || null]
    )
    if (conv.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Conversation not found' })
    }
    conversationId = req.params.id
  } catch (err) {
    console.error('Conversation lookup error:', err.message)
    return res.status(500).json({ success: false, message: 'Failed to open the conversation' })
  }

  const text = String(content).trim()

  try {
    const userMessage = await pool.query(
      `INSERT INTO messages (conversation_id, role, content, created_at)
       VALUES ($1, 'user', $2, NOW())
       RETURNING id, role, content, created_at AS "createdAt"`,
      [conversationId, text]
    )
    await pool.query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [conversationId])

    // Recent turns give the model the thread so far. Capped because the
    // local model has a small context window and older turns stop helping.
    const history = await pool.query(
      `SELECT role, content FROM messages
       WHERE conversation_id = $1
       ORDER BY created_at DESC
       LIMIT 6`,
      [conversationId]
    )
    const transcript = history.rows
      .reverse()
      .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
      .join('\n')

    const prompt = transcript
      ? `Conversation so far:\n${transcript}\n\nLatest question:\n${text}`
      : text

    const diagnosis = await runOrchestrator(prompt, req.user.userId)
    const reply = formatReply(diagnosis)

    const assistantMessage = await pool.query(
      `INSERT INTO messages (conversation_id, role, content, created_at)
       VALUES ($1, 'assistant', $2, NOW())
       RETURNING id, role, content, created_at AS "createdAt"`,
      [conversationId, reply]
    )

    await pool.query(
      `UPDATE conversations SET updated_at = NOW() WHERE id = $1`,
      [conversationId]
    )

    res.status(201).json({
      success: true,
      message: userMessage.rows[0],
      reply: assistantMessage.rows[0],
      agentUsed: diagnosis.agentUsed
    })

    recordAudit(req, {
      action: 'message',
      resourceType: 'conversation',
      resourceId: conversationId,
      details: { agentUsed: diagnosis.agentUsed, characters: text.length }
    })
  } catch (err) {
    console.error('Conversation message error:', err.message)
    res.status(500).json({ success: false, message: 'Failed to send message' })
  }
})

router.patch('/:id', protect, async (req, res) => {
  const { name, status } = req.body || {}

  if (name === undefined && status === undefined) {
    return res.status(400).json({ success: false, message: 'Nothing to update' })
  }
  if (status !== undefined && !['active', 'archived'].includes(status)) {
    return res.status(400).json({ success: false, message: 'Status must be active or archived' })
  }

  try {
    const result = await pool.query(
      `UPDATE conversations
       SET name = COALESCE($1, name),
           status = COALESCE($2, status),
           updated_at = NOW()
       WHERE id = $3 AND workspace_id = $4
       RETURNING id, name, status, agent_id AS "agentId", updated_at AS "updatedAt"`,
      [
        name === undefined ? null : String(name).trim() || null,
        status || null,
        req.params.id,
        req.user.workspace_id || null
      ]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Conversation not found' })
    }

    res.json({ success: true, conversation: result.rows[0] })
    recordAudit(req, {
      action: 'update',
      resourceType: 'conversation',
      resourceId: req.params.id,
      details: { name: result.rows[0].name, status: result.rows[0].status }
    })
  } catch (err) {
    console.error('Conversation update error:', err.message)
    res.status(500).json({ success: false, message: 'Failed to update conversation' })
  }
})

router.delete('/:id', protect, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM conversations WHERE id = $1 AND workspace_id = $2 RETURNING id',
      [req.params.id, req.user.workspace_id || null]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Conversation not found' })
    }

    res.json({ success: true })
    recordAudit(req, { action: 'delete', resourceType: 'conversation', resourceId: req.params.id })
  } catch (err) {
    console.error('Conversation delete error:', err.message)
    res.status(500).json({ success: false, message: 'Failed to delete conversation' })
  }
})

// messages.content is plain text, so the structured diagnosis is rendered into
// a readable transcript rather than dumped as JSON into the bubble.
function formatReply(diagnosis) {
  if (!diagnosis || typeof diagnosis !== 'object') return String(diagnosis ?? '')

  const parts = []
  const push = (label, value) => {
    if (!value) return
    if (Array.isArray(value)) {
      if (value.length === 0) return
      parts.push(`${label}:\n${value.map((v, i) => `${i + 1}. ${v}`).join('\n')}`)
    } else {
      parts.push(`${label}:\n${value}`)
    }
  }

  if (diagnosis.rootCause) parts.push(`Root cause:\n${diagnosis.rootCause}`)
  push('Evidence', diagnosis.evidence)
  if (diagnosis.solution) parts.push(`Solution:\n${diagnosis.solution}`)
  push('Steps', diagnosis.steps)
  push('How to verify', diagnosis.verification)
  push('Watch out', diagnosis.warnings)

  return parts.join('\n\n') || 'The model returned an empty answer. Try describing the problem again.'
}

export default router
