import express from 'express'
import pool from '../config/database.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/', protect, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT e.*, a.name as agent_name, w.name as workflow_name, c.name as conversation_name
       FROM executions e
       LEFT JOIN agents a ON e.agent_id = a.id
       LEFT JOIN workflows w ON e.workflow_id = w.id
       LEFT JOIN conversations c ON e.conversation_id = c.id
       WHERE e.workspace_id = $1 ORDER BY e.created_at DESC LIMIT 100`,
      [req.user.workspace_id || null]
    )
    res.json({ success: true, executions: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch executions' })
  }
})

router.get('/:id', protect, async (req, res) => {
  try {
    const execResult = await pool.query(
      `SELECT e.*, a.name as agent_name, w.name as workflow_name
       FROM executions e
       LEFT JOIN agents a ON e.agent_id = a.id
       LEFT JOIN workflows w ON e.workflow_id = w.id
       WHERE e.id = $1 AND e.workspace_id = $2`,
      [req.params.id, req.user.workspace_id || null]
    )
    if (execResult.rows.length === 0) return res.status(404).json({ success: false, message: 'Execution not found' })

    const stepsResult = await pool.query(
      'SELECT * FROM execution_steps WHERE execution_id = $1 ORDER BY created_at ASC',
      [req.params.id]
    )
    res.json({
      success: true,
      execution: execResult.rows[0],
      steps: stepsResult.rows
    })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch execution' })
  }
})

export default router
