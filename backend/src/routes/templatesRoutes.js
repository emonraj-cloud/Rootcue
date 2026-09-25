import express from 'express'
import pool from '../config/database.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/', protect, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM templates ORDER BY is_featured DESC, usage_count DESC, created_at DESC'
    )
    res.json({ success: true, templates: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch templates' })
  }
})

router.get('/:id', protect, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM templates WHERE id = $1', [req.params.id])
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Template not found' })
    res.json({ success: true, template: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch template' })
  }
})

export default router
