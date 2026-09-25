import express from 'express'
import pool from '../config/database.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/', protect, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM credentials WHERE workspace_id = $1 ORDER BY created_at DESC',
      [req.user.workspace_id || null]
    )
    res.json({ success: true, credentials: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch credentials' })
  }
})

router.post('/', protect, async (req, res) => {
  try {
    const { name, type, provider_id, secret, config } = req.body
    const result = await pool.query(
      `INSERT INTO credentials (workspace_id, name, type, provider_id, secret_encrypted, config, is_active, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) RETURNING *`,
      [req.user.workspace_id || null, name, type, provider_id, Buffer.from(secret).toString('base64'), config || {}, true, req.user.userId]
    )
    res.status(201).json({ success: true, credential: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create credential' })
  }
})

router.get('/types', protect, async (req, res) => {
  res.json({
    success: true,
    types: [
      { value: 'api_key', label: 'API Key' },
      { value: 'oauth', label: 'OAuth' },
      { value: 'basic', label: 'Basic Auth' },
      { value: 'bearer', label: 'Bearer Token' },
      { value: 'custom', label: 'Custom' },
    ]
  })
})

export default router
