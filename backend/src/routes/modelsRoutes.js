import express from 'express'
import pool from '../config/database.js'
import { protect } from '../middleware/authMiddleware.js'

const router = express.Router()

router.get('/', protect, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM models WHERE workspace_id = $1 ORDER BY created_at DESC',
      [req.user.workspace_id || null]
    )
    res.json({ success: true, models: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch models' })
  }
})

router.get('/providers', protect, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM providers WHERE workspace_id = $1 ORDER BY created_at DESC',
      [req.user.workspace_id || null]
    )
    res.json({ success: true, providers: result.rows })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch providers' })
  }
})

router.post('/providers', protect, async (req, res) => {
  try {
    const { name, type, base_url, api_key, config } = req.body
    const result = await pool.query(
      `INSERT INTO providers (workspace_id, name, type, base_url, is_connected, is_default, config, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING *`,
      [req.user.workspace_id || null, name, type, base_url, !!api_key, false, config || {}]
    )
    if (api_key) {
      await pool.query(
        'UPDATE providers SET api_key_encrypted = $1 WHERE id = $2',
        [Buffer.from(api_key).toString('base64'), result.rows[0].id]
      )
    }
    const updated = await pool.query('SELECT * FROM providers WHERE id = $1', [result.rows[0].id])
    res.status(201).json({ success: true, provider: updated.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create provider' })
  }
})

router.post('/', protect, async (req, res) => {
  try {
    const { provider_id, name, model_identifier, type, max_tokens, context_length, config } = req.body
    const result = await pool.query(
      `INSERT INTO models (workspace_id, provider_id, name, model_identifier, type, max_tokens, context_length, is_enabled, is_default, config, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()) RETURNING *`,
      [req.user.workspace_id || null, provider_id, name, model_identifier, type || 'llm', max_tokens, context_length, true, false, config || {}]
    )
    res.status(201).json({ success: true, model: result.rows[0] })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to create model' })
  }
})

export default router
