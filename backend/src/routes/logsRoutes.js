import express from 'express'
import pool from '../config/database.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/', protect, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT l.*, u.name as user_name, a.name as agent_name
       FROM audit_logs l
       LEFT JOIN users u ON l.user_id = u.id
       LEFT JOIN agents a ON l.resource_id = a.id
       WHERE l.workspace_id = $1
       ORDER BY l.created_at DESC LIMIT 100`,
      [req.user.workspace_id || null]
    )
    res.json({ success: true, logs: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch logs' })
  }
})

export default router
