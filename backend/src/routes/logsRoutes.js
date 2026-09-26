import express from 'express'
import pool from '../config/database.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/', protect, async (req, res) => {
  const { action, resourceType, search, limit } = req.query

  const filters = ['l.workspace_id = $1']
  const params = [req.user.workspace_id || null]

  if (action) {
    params.push(action)
    filters.push(`l.action = $${params.length}`)
  }
  if (resourceType) {
    params.push(resourceType)
    filters.push(`l.resource_type = $${params.length}`)
  }
  if (search) {
    params.push(`%${String(search).trim().toLowerCase()}%`)
    const p = `$${params.length}`
    filters.push(
      `(LOWER(l.action) LIKE ${p} OR LOWER(l.resource_type) LIKE ${p} OR LOWER(COALESCE(l.details::text, '')) LIKE ${p})`
    )
  }

  // Clamped so a query string cannot ask for the whole table.
  const rowLimit = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500)
  params.push(rowLimit)

  try {
    // The old query joined audit_logs.resource_id to agents.id unconditionally,
    // so any log whose resource happened to share an id printed an unrelated
    // agent name. The join is now restricted to agent entries.
    const result = await pool.query(
      `SELECT
         l.id,
         l.action,
         l.resource_type AS "resourceType",
         l.resource_id AS "resourceId",
         l.details,
         l.ip_address AS "ipAddress",
         l.user_agent AS "userAgent",
         l.user_id AS "userId",
         u.name AS "userName",
         u.email AS "userEmail",
         a.name AS "agentName",
         l.created_at AS "createdAt"
       FROM audit_logs l
       LEFT JOIN users u ON l.user_id = u.id
       LEFT JOIN agents a ON a.id = l.resource_id AND l.resource_type = 'agent'
       WHERE ${filters.join(' AND ')}
       ORDER BY l.created_at DESC
       LIMIT $${params.length}`,
      params
    )

    // The filter dropdowns are built from what actually exists rather than a
    // hardcoded list, so a new action shows up without a code change.
    const facets = await pool.query(
      `SELECT action, resource_type AS "resourceType", COUNT(*)::int AS count
       FROM audit_logs
       WHERE workspace_id = $1
       GROUP BY action, resource_type
       ORDER BY count DESC`,
      [req.user.workspace_id || null]
    )

    res.json({ success: true, logs: result.rows, facets: facets.rows })
  } catch (err) {
    console.error('Logs list error:', err.message)
    res.status(500).json({ success: false, message: 'Failed to fetch logs' })
  }
})

router.delete('/', protect, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM audit_logs WHERE workspace_id = $1 RETURNING id',
      [req.user.workspace_id || null]
    )
    res.json({ success: true, deleted: result.rowCount })
  } catch (err) {
    console.error('Logs clear error:', err.message)
    res.status(500).json({ success: false, message: 'Failed to clear logs' })
  }
})

export default router
