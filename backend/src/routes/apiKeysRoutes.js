import express from 'express'
import pool from '../config/database.js'
import { protect } from '../middleware/authMiddleware.js'
import crypto from 'crypto'

const router = express.Router()

router.get('/', protect, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, key_prefix, permissions, status, last_used_at, expires_at, created_by, created_at, updated_at FROM api_keys WHERE workspace_id = $1 ORDER BY created_at DESC',
      [req.user.workspace_id || null]
    )
    res.json({ success: true, api_keys: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch API keys' })
  }
})

router.post('/', protect, async (req, res) => {
  try {
    const { name, permissions, expires_at } = req.body
    const apiKey = 'sk-' + crypto.randomBytes(32).toString('hex')
    const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex')
    const keyPrefix = apiKey.substring(0, 10)
    const result = await pool.query(
      `INSERT INTO api_keys (workspace_id, name, key_hash, key_prefix, permissions, status, expires_at, created_by, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, 'active', $6, $7, NOW(), NOW()) RETURNING id, name, key_prefix, permissions, status, created_at`,
      [req.user.workspace_id || null, name, keyHash, keyPrefix, permissions || {}, expires_at, req.user.userId]
    )
    res.status(201).json({ success: true, api_key: result.rows[0], key: apiKey })
  } catch (err) {
    console.error('Create API key error:', err)
    res.status(500).json({ success: false, message: 'Failed to create API key' })
  }
})

router.delete('/:id', protect, async (req, res) => {
  try {
    const result = await pool.query(
      'UPDATE api_keys SET status = \'revoked\', updated_at = NOW() WHERE id = $1 AND workspace_id = $2 RETURNING id',
      [req.params.id, req.user.workspace_id || null]
    )
    if (result.rowCount === 0) return res.status(404).json({ success: false, message: 'API key not found' })
    res.json({ success: true, message: 'API key revoked' })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to revoke API key' })
  }
})

export default router
