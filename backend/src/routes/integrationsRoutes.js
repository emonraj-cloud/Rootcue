import express from 'express'
import pool from '../config/database.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/', protect, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM integrations WHERE workspace_id = $1 ORDER BY created_at DESC',
      [req.user.workspace_id || null]
    )
    res.json({ success: true, integrations: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch integrations' })
  }
})

router.get('/types', protect, async (req, res) => {
  res.json({
    success: true,
    types: [
      { value: 'gmail', label: 'Gmail', icon: 'gmail' },
      { value: 'slack', label: 'Slack', icon: 'slack' },
      { value: 'discord', label: 'Discord', icon: 'discord' },
      { value: 'telegram', label: 'Telegram', icon: 'telegram' },
      { value: 'whatsapp', label: 'WhatsApp', icon: 'whatsapp' },
      { value: 'google-drive', label: 'Google Drive', icon: 'google-drive' },
      { value: 'github', label: 'GitHub', icon: 'github' },
      { value: 'rest-api', label: 'REST API', icon: 'code' },
    ]
  })
})

router.post('/', protect, async (req, res) => {
  try {
    const { name, description, type, config } = req.body
    const result = await pool.query(
      `INSERT INTO integrations (workspace_id, name, description, type, config, is_connected, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING *`,
      [req.user.workspace_id || null, name, description, type, config || {}, false, req.user.userId]
    )
    res.status(201).json({ success: true, integration: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create integration' })
  }
})

router.put('/:id/connect', protect, async (req, res) => {
  try {
    const { access_token, refresh_token } = req.body
    const result = await pool.query(
      `UPDATE integrations SET is_connected = true, access_token_encrypted = $1, refresh_token_encrypted = $2, updated_at = NOW()
       WHERE id = $3 AND workspace_id = $4 RETURNING *`,
      [Buffer.from(access_token || '').toString('base64'), Buffer.from(refresh_token || '').toString('base64'), req.params.id, req.user.workspace_id || null]
    )
    if (result.rows.length === 0) return res.status(404).json({ success: false, message: 'Integration not found' })
    res.json({ success: true, integration: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to connect integration' })
  }
})

export default router
