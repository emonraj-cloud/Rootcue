import express from 'express'
import pool from '../config/database.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/', protect, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30
    const result = await pool.query(
      `SELECT 
         COUNT(*) as total_executions,
         SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success_count,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed_count,
         SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running_count,
         AVG(duration_ms) as avg_duration_ms,
         COALESCE(SUM((token_usage->>'cost_usd')::numeric), 0) as total_cost
       FROM executions 
       WHERE workspace_id = $1 AND created_at >= NOW() - INTERVAL '1 day' * $2`,
      [req.user.workspace_id || null, days]
    )

    const dailyStats = await pool.query(
      `SELECT 
         DATE(created_at) as day,
         COUNT(*) as count,
         SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as success,
         SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
       FROM executions 
       WHERE workspace_id = $1 AND created_at >= NOW() - INTERVAL '1 day' * $2
       GROUP BY DATE(created_at)
       ORDER BY day`,
      [req.user.workspace_id || null, days]
    )

    const topAgents = await pool.query(
      `SELECT a.name, COUNT(e.id) as execution_count,
         SUM(CASE WHEN e.status = 'success' THEN 1 ELSE 0 END) as success_count
       FROM executions e
       JOIN agents a ON e.agent_id = a.id
       WHERE e.workspace_id = $1 AND e.created_at >= NOW() - INTERVAL '1 day' * $2
       GROUP BY a.id, a.name
       ORDER BY execution_count DESC LIMIT 10`,
      [req.user.workspace_id || null, days]
    )

    // Counts the Analytics page displays but that are not part of the
    // execution summary above.
    const counts = await pool.query(
      `SELECT
         (SELECT COUNT(*) FROM agents WHERE workspace_id = $1) AS total_agents,
         (SELECT COUNT(*) FROM conversations WHERE workspace_id = $1) AS total_conversations,
         (SELECT COALESCE(SUM(COALESCE((token_usage->>'total_tokens')::bigint, 0)), 0)
            FROM executions WHERE workspace_id = $1) AS total_tokens`,
      [req.user.workspace_id || null]
    )

    res.json({
      success: true,
      summary: result.rows[0],
      counts: counts.rows[0],
      daily: dailyStats.rows,
      topAgents: topAgents.rows
    })
  } catch (err) {
    console.error('Analytics error:', err)
    res.status(500).json({ success: false, message: 'Failed to fetch analytics' })
  }
})

router.get('/tool-usage', protect, async (req, require, next) => {
  try {
    const result = await pool.query(
      `SELECT es.step_type as tool_name, COUNT(*) as usage_count
       FROM execution_steps es
       JOIN executions e ON es.execution_id = e.id
       WHERE e.workspace_id = $1
       GROUP BY es.step_type
       ORDER BY usage_count DESC`,
      [req.user.workspace_id || null]
    )
    res.json({ success: true, tool_usage: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch tool usage' })
  }
})

export default router
