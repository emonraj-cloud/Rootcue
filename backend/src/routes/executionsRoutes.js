import express from 'express'
import pool from '../config/database.js'
import { protect } from '../middleware/authMiddleware.js'
import { runOrchestrator } from '../agents/orchestrator.js'

const router = express.Router()

// status is constrained by the schema to these five values. The old UI looked
// for 'completed', which the database cannot ever store, so every successful
// run fell through to the grey fallback badge.
const STATUSES = ['pending', 'running', 'success', 'failed', 'cancelled']

const STEP_QUERY = `
  SELECT
    id,
    execution_id AS "executionId",
    node_id AS "nodeId",
    step_type AS "stepType",
    name,
    input,
    output,
    status,
    error_message AS "errorMessage",
    started_at AS "startedAt",
    completed_at AS "completedAt",
    duration_ms AS "durationMs",
    created_at AS "createdAt"
  FROM execution_steps
  WHERE execution_id = $1
  ORDER BY created_at ASC
`

const LIST_COLUMNS = `
  e.id,
  e.agent_id AS "agentId",
  a.name AS "agentName",
  e.workflow_id AS "workflowId",
  w.name AS "workflowName",
  e.conversation_id AS "conversationId",
  c.name AS "conversationName",
  e.user_id AS "userId",
  u.name AS "userName",
  e.input,
  e.status,
  e.error_message AS "errorMessage",
  e.started_at AS "startedAt",
  e.completed_at AS "completedAt",
  e.duration_ms AS "durationMs",
  e.cost_cents AS "costCents",
  e.created_at AS "createdAt",
  COUNT(s.id)::int AS "stepCount"
`

// Runs an agent and records the whole thing. Nothing in the app wrote to this
// table, so the page could only ever be empty.
router.post('/', protect, async (req, res) => {
  const { agentId, problem, conversationId } = req.body || {}
  const text = typeof problem === 'string' ? problem.trim() : ''

  if (!text) {
    return res.status(400).json({ success: false, message: 'A problem or prompt is required' })
  }
  if (!agentId) {
    return res.status(400).json({ success: false, message: 'An agent is required' })
  }

  const workspaceId = req.user.workspace_id || null

  try {
    const agent = await pool.query(
      'SELECT id, name FROM agents WHERE id = $1 AND workspace_id = $2',
      [agentId, workspaceId]
    )
    if (agent.rows.length === 0) {
      return res.status(400).json({ success: false, message: 'That agent does not exist in this workspace' })
    }

    if (conversationId) {
      const conv = await pool.query(
        'SELECT id FROM conversations WHERE id = $1 AND workspace_id = $2',
        [conversationId, workspaceId]
      )
      if (conv.rows.length === 0) {
        return res.status(400).json({ success: false, message: 'That conversation does not exist in this workspace' })
      }
    }

    const execution = await pool.query(
      `INSERT INTO executions
         (workspace_id, agent_id, conversation_id, user_id, input, status, started_at, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'running', NOW(), NOW(), NOW())
       RETURNING id`,
      [workspaceId, agentId, conversationId || null, req.user.userId, { problem: text }]
    )
    const executionId = execution.rows[0].id

    const step = await pool.query(
      `INSERT INTO execution_steps
         (execution_id, node_id, step_type, name, input, status, started_at, created_at)
       VALUES ($1, 'agent', 'agent', $2, $3, 'running', NOW(), NOW())
       RETURNING id`,
      [executionId, agent.rows[0].name, { problem: text }]
    )

    const startedAt = Date.now()

    let output
    try {
      // Same routing the Diagnose tool uses, so a run started here produces the
      // same answer that page would.
      output = await runOrchestrator(text, req.user.userId)
    } catch (err) {
      const durationMs = Date.now() - startedAt

      await pool.query(
        `UPDATE executions SET status = 'failed', error_message = $1, completed_at = NOW(),
           duration_ms = $2, updated_at = NOW()
         WHERE id = $3`,
        [err.message, durationMs, executionId]
      )
      await pool.query(
        `UPDATE execution_steps SET status = 'failed', error_message = $1, completed_at = NOW(),
           duration_ms = $2
         WHERE id = $3`,
        [err.message, durationMs, step.rows[0].id]
      )

      const failed = await pool.query(
        `SELECT ${LIST_COLUMNS}
         FROM executions e
         LEFT JOIN agents a ON a.id = e.agent_id
         LEFT JOIN workflows w ON w.id = e.workflow_id
         LEFT JOIN conversations c ON c.id = e.conversation_id
         LEFT JOIN users u ON u.id = e.user_id
         LEFT JOIN execution_steps s ON s.execution_id = e.id
         WHERE e.id = $1
         GROUP BY e.id, a.name, w.name, c.name, u.name`,
        [executionId]
      )

      // The run is recorded and its failure is the answer, so this is a 200
      // with status 'failed' rather than an error response that hides the row.
      return res.status(201).json({ success: true, execution: failed.rows[0] })
    }

    const durationMs = Date.now() - startedAt

    await pool.query(
      `UPDATE executions SET status = 'success', output = $1, completed_at = NOW(),
         duration_ms = $2, updated_at = NOW()
       WHERE id = $3`,
      [JSON.stringify(output), durationMs, executionId]
    )
    await pool.query(
      `UPDATE execution_steps SET status = 'success', output = $1, completed_at = NOW(), duration_ms = $2
       WHERE id = $3`,
      [JSON.stringify(output), durationMs, step.rows[0].id]
    )

    const finished = await pool.query(
      `SELECT ${LIST_COLUMNS}
       FROM executions e
       LEFT JOIN agents a ON a.id = e.agent_id
       LEFT JOIN workflows w ON w.id = e.workflow_id
       LEFT JOIN conversations c ON c.id = e.conversation_id
       LEFT JOIN users u ON u.id = e.user_id
       LEFT JOIN execution_steps s ON s.execution_id = e.id
       WHERE e.id = $1
       GROUP BY e.id, a.name, w.name, c.name, u.name`,
      [executionId]
    )

    const steps = await pool.query(STEP_QUERY, [executionId])

    res.status(201).json({ success: true, execution: finished.rows[0], steps: steps.rows })
  } catch (err) {
    console.error('Execution run error:', err.message)
    res.status(500).json({ success: false, message: 'Failed to run the agent' })
  }
})

router.get('/', protect, async (req, res) => {
  const { status } = req.query
  const filters = ['e.workspace_id = $1']
  const params = [req.user.workspace_id || null]

  if (status) {
    if (!STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${STATUSES.join(', ')}`
      })
    }
    params.push(status)
    filters.push(`e.status = $${params.length}`)
  }

  try {
    const result = await pool.query(
      `SELECT ${LIST_COLUMNS}
       FROM executions e
       LEFT JOIN agents a ON a.id = e.agent_id
       LEFT JOIN workflows w ON w.id = e.workflow_id
       LEFT JOIN conversations c ON c.id = e.conversation_id
       LEFT JOIN users u ON u.id = e.user_id
       LEFT JOIN execution_steps s ON s.execution_id = e.id
       WHERE ${filters.join(' AND ')}
       GROUP BY e.id, a.name, w.name, c.name, u.name
       ORDER BY e.created_at DESC
       LIMIT 200`,
      params
    )
    res.json({ success: true, executions: result.rows })
  } catch (err) {
    console.error('Executions list error:', err.message)
    res.status(500).json({ success: false, message: 'Failed to fetch executions' })
  }
})

router.get('/:id', protect, async (req, res) => {
  try {
    const execResult = await pool.query(
      `SELECT ${LIST_COLUMNS}
       FROM executions e
       LEFT JOIN agents a ON a.id = e.agent_id
       LEFT JOIN workflows w ON w.id = e.workflow_id
       LEFT JOIN conversations c ON c.id = e.conversation_id
       LEFT JOIN users u ON u.id = e.user_id
       LEFT JOIN execution_steps s ON s.execution_id = e.id
       WHERE e.id = $1 AND e.workspace_id = $2
       GROUP BY e.id, a.name, w.name, c.name, u.name`,
      [req.params.id, req.user.workspace_id || null]
    )
    if (execResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Execution not found' })
    }

    const stepsResult = await pool.query(STEP_QUERY, [req.params.id])

    res.json({ success: true, execution: execResult.rows[0], steps: stepsResult.rows })
  } catch (err) {
    console.error('Execution detail error:', err.message)
    res.status(500).json({ success: false, message: 'Failed to fetch execution' })
  }
})

router.delete('/:id', protect, async (req, res) => {
  try {
    // execution_steps cascade from the parent row.
    const result = await pool.query(
      'DELETE FROM executions WHERE id = $1 AND workspace_id = $2 RETURNING id',
      [req.params.id, req.user.workspace_id || null]
    )
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Execution not found' })
    }
    res.json({ success: true })
  } catch (err) {
    console.error('Execution delete error:', err.message)
    res.status(500).json({ success: false, message: 'Failed to delete execution' })
  }
})

export default router
