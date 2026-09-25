import express from 'express'
import pool from '../config/database.js'
import { protect } from '../middleware/authMiddleware.js'
import { visualUpload } from '../middleware/visualUploadMiddleware.js'
import { visualAgentHandler } from '../controllers/agentsController.js'

const router = express.Router()

router.post('/visual', protect, visualUpload.single('image'), visualAgentHandler)

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
    const result = await pool.query(
      `INSERT INTO agents (workspace_id, name, description, avatar_url, agent_type, model_config, instructions, personality, response_style, rules, tool_ids, knowledge_base_ids, guardrails, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
       RETURNING *`,
      [req.user.workspace_id || null, name, description, avatar_url, agent_type || 'general', model_config || {}, instructions, personality, response_style, rules, tool_ids || [], knowledge_base_ids || [], guardrails || {}, req.user.userId]
    )
    res.status(201).json({ success: true, agent: result.rows[0] })
  } catch (err) {
    console.error('Create agent error:', err)
    res.status(500).json({ success: false, message: 'Failed to create agent' })
  }
})

router.put('/:id', protect, async (req, res) => {
  try {
    const { name, description, avatar_url, status, agent_type, model_config, instructions, personality, response_style, rules, tool_ids, knowledge_base_ids, guardrails, is_active } = req.body
    const result = await pool.query(
      `UPDATE agents SET name=$1, description=$2, avatar_url=$3, status=$4, agent_type=$5, model_config=$6, instructions=$7, personality=$8, response_style=$9, rules=$10, tool_ids=$11, knowledge_base_ids=$12, guardrails=$13, is_active=$14, updated_at=NOW()
       WHERE id = $15 AND workspace_id = $16 RETURNING *`,
      [name, description, avatar_url, status, agent_type, model_config, instructions, personality, response_style, rules, tool_ids, knowledge_base_ids, guardrails, is_active, req.params.id, req.user.workspace_id || null]
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
