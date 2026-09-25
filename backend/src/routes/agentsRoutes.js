import express from 'express'
import pool from '../config/database.js'
import { protect } from '../middleware/authMiddleware.js'
import { visualUpload } from '../middleware/visualUploadMiddleware.js'
import {
  codeAgentHandler,
  databaseAgentHandler,
  devopsAgentHandler,
  visualAgentHandler
} from '../controllers/agentsController.js'

const router = express.Router()

// The AI agent endpoints must be declared before the '/:id' routes.
router.post('/visual', protect, visualUpload.single('image'), visualAgentHandler)
router.post('/code', protect, codeAgentHandler)
router.post('/database', protect, databaseAgentHandler)
router.post('/devops', protect, devopsAgentHandler)

router.get('/', protect, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM agents WHERE workspace_id = $1 ORDER BY created_at DESC',
      [req.user.workspace_id || null]
    )
    res.json({ success: true, agents: result.rows })
  } catch (err) {
    console.error('Get agents error:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch agents' })
  }
})

router.get('/:id', protect, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM agents WHERE id = $1 AND workspace_id = $2',
      [req.params.id, req.user.workspace_id || null]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Agent not found' })
    }
    res.json({ success: true, agent: result.rows[0] })
  } catch (err) {
    console.error('Get agent error:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch agent' })
  }
})

router.post('/', protect, async (req, res) => {
  try {
    const { name, description, avatar_url, agent_type, model_config, instructions, personality, response_style, rules, tool_ids, knowledge_base_ids, guardrails } = req.body
    // model_config / tool_ids / knowledge_base_ids / guardrails are jsonb.
    // node-postgres turns a plain JS array into a Postgres array literal,
    // which jsonb rejects with "invalid input syntax for type json", so
    // these have to be serialised here. An empty array slipped through
    // because it happens to serialise to the valid JSON "{}".
    const result = await pool.query(
      `INSERT INTO agents (workspace_id, name, description, avatar_url, agent_type, model_config, instructions, personality, response_style, rules, tool_ids, knowledge_base_ids, guardrails, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
       RETURNING *`,
      [req.user.workspace_id || null, name, description, avatar_url, agent_type || 'general', JSON.stringify(model_config || {}), instructions, personality, response_style, rules, JSON.stringify(tool_ids || []), JSON.stringify(knowledge_base_ids || []), JSON.stringify(guardrails || {}), req.user.userId]
    )
    res.status(201).json({ success: true, agent: result.rows[0] })
  } catch (err) {
    console.error('Create agent error:', err)
    res.status(500).json({ success: false, message: 'Failed to create agent' })
  }
})

router.put('/:id', protect, async (req, res) => {
  try {
    // Only touch the fields the client actually sent. Writing every column
    // turned any partial update into NULLs, which broke the NOT NULL
    // constraints on name, status and agent_type.
    const body = req.body || {}
    const jsonbFields = new Set(['model_config', 'tool_ids', 'knowledge_base_ids', 'guardrails'])

    const sets = []
    const values = []
    for (const [key, value] of Object.entries(body)) {
      if (key === 'id' || key === 'workspace_id' || key === 'created_by' || key === 'created_at' || key === 'updated_at') continue
      if (!/^[a-z_]+$/.test(key)) continue

      values.push(jsonbFields.has(key) && value != null ? JSON.stringify(value) : value)
      sets.push(`${key} = $${values.length}`)
    }

    if (sets.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' })
    }

    values.push(req.params.id)
    values.push(req.user.workspace_id || null)

    const result = await pool.query(
      `UPDATE agents SET ${sets.join(', ')}, updated_at = NOW()
       WHERE id = $${values.length - 1} AND workspace_id = $${values.length} RETURNING *`,
      values
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Agent not found' })
    }
    res.json({ success: true, agent: result.rows[0] })
  } catch (err) {
    console.error('Update agent error:', err)
    res.status(500).json({ success: false, message: 'Failed to update agent' })
  }
})

router.delete('/:id', protect, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM agents WHERE id = $1 AND workspace_id = $2 RETURNING id',
      [req.params.id, req.user.workspace_id || null]
    )
    if (result.rowCount === 0) {
      return res.status(404).json({ success: false, message: 'Agent not found' })
    }
    res.json({ success: true, message: 'Agent deleted' })
  } catch (err) {
    console.error('Delete agent error:', err)
    res.status(500).json({ success: false, message: 'Failed to delete agent' })
  }
})

export default router
