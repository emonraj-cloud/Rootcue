import express from 'express'
import pool from '../config/database.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/', protect, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM tools WHERE workspace_id = $1 ORDER BY created_at DESC',
      [req.user.workspace_id || null]
    )
    res.json({ success: true, tools: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch tools' })
  }
})

router.get('/:id', protect, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM tools WHERE id = $1 AND workspace_id = $2',
      [req.params.id, req.user.workspace_id || null]
    )
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Tool not found' })
    res.json({ success: true, tool: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch tool' })
  }
})

router.post('/', protect, async (req, res) => {
  try {
    const { name, description, icon_url, category, type, integration_id, credential_id, config } = req.body
    const result = await pool.query(
      `INSERT INTO tools (workspace_id, name, description, icon_url, category, type, integration_id, credential_id, config, is_enabled, is_system, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()) RETURNING *`,
      [req.user.workspace_id || null, name, description, icon_url, category, type || 'builtin', integration_id, credential_id, config || {}, true, false, req.user.userId]
    )
    res.status(201).json({ success: true, tool: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create tool' })
  }
})

router.put('/:id', protect, async (req, res) => {
  try {
    const { name, description, icon_url, category, config, is_enabled } = req.body
    const result = await pool.query(
      `UPDATE tools SET name=$1, description=$2, icon_url=$3, category=$4, config=$5, is_enabled=$6, updated_at=NOW()
       WHERE id=$7 AND workspace_id=$8 RETURNING *`,
      [name, description, icon_url, category, config, is_enabled, req.params.id, req.user.workspace_id || null]
    )
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Tool not found' })
    res.json({ success: true, tool: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update tool' })
  }
})

router.delete('/:id', protect, async (req, res) => {
  try {
    const result = await pool.query(
      'DELETE FROM tools WHERE id = $1 AND workspace_id = $2 RETURNING id',
      [req.params.id, req.user.workspace_id || null]
    )
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'Tool not found' })
    res.json({ success: true, message: 'Tool deleted' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete tool' })
  }
})

export default router
